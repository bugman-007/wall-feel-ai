import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
import os
import json
import uuid
import asyncio
import logging
import httpx
from pathlib import Path
from dotenv import load_dotenv
from r2_client import r2_client
from ai_wall_detector import generate_wallpaper_preview_ai, QualityLevel
from typing import List, Dict, Any, Optional, Literal
import time
from middleware import RateLimitMiddleware, SecurityHeadersMiddleware

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Wallfeel API",
    description="AI-powered wallpaper visualization API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

@app.get("/")
def read_root():
    return {
        "message": "Wallfeel API is running",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "wallfeel-api"
    }


@app.get("/api/download-preview")
async def download_preview(url: str, quality: str = "1k"):
    """
    Proxy endpoint to download preview image and avoid CORS issues.
    Fetches the image from R2 and returns it with proper headers for download.

    Args:
        url: Presigned R2 URL of the preview image
        quality: Quality level (1k, 2k, 4k, 8k) - used in filename
    """
    try:
        # Fetch image from R2
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30)
            response.raise_for_status()

            # Return with download headers (PNG format)
            filename = f"wallfeel-preview-{quality.lower()}.png"
            return StreamingResponse(
                io.BytesIO(response.content),
                media_type="image/png",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
    except Exception as e:
        logger.error(f"Download proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download image: {str(e)}")

# Cache for catalog data (performance optimization)
_catalog_cache: Optional[Dict] = None
_catalog_cache_timestamp: float = 0
_CATALOG_CACHE_TTL = 300  # 5 minutes cache TTL


def _get_catalog() -> Dict:
    """
    Get wallpaper catalog with caching.
    Used by both /api/catalog and /api/ai-generate-preview endpoints.
    """
    global _catalog_cache, _catalog_cache_timestamp

    current_time = time.time()

    # Return cached catalog if still valid
    if _catalog_cache is not None and (current_time - _catalog_cache_timestamp) < _CATALOG_CACHE_TTL:
        return _catalog_cache

    try:
        catalog_path = Path(__file__).parent / "catalog.json"
        with open(catalog_path, 'r') as f:
            catalog = json.load(f)

        # Update cache
        _catalog_cache = catalog
        _catalog_cache_timestamp = current_time

        return catalog
    except FileNotFoundError:
        return {"designs": []}
    except Exception as e:
        logger.error(f"Error loading catalog: {e}")
        return {"designs": []}


@app.get("/api/catalog")
def get_catalog():
    """
    Get wallpaper catalog
    Returns list of available wallpaper designs

    Performance: Catalog is cached for 5 minutes to reduce file I/O
    """
    return _get_catalog()

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload room image to R2 storage

    Args:
        file: Image file (JPEG or PNG)

    Returns:
        {
            "success": true,
            "url": "https://...",
            "filename": "...",
            "size": 12345,
            "content_type": "image/jpeg"
        }
    """
    # Validate file type
    if file.content_type not in ['image/jpeg', 'image/png']:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG and PNG images are allowed."
        )

    # Read file content
    try:
        file_content = await file.read()
        file_size = len(file_content)

        # Security: Validate file content using magic bytes (not just extension)
        # JPEG magic bytes: FF D8 FF
        # PNG magic bytes: 89 50 4E 47
        if len(file_content) < 8:
            raise HTTPException(
                status_code=400,
                detail="Invalid image file: file too small"
            )

        is_jpeg = file_content[:3] == b'\xff\xd8\xff'
        is_png = file_content[:4] == b'\x89PNG'

        if not (is_jpeg or is_png):
            logger.warning(f"Potentially malicious file upload attempt: {file.filename}, content_type: {file.content_type}")
            raise HTTPException(
                status_code=400,
                detail="Invalid image content: file does not match claimed type"
            )

        # Determine actual MIME type from magic bytes
        actual_content_type = 'image/jpeg' if is_jpeg else 'image/png'

        # Validate file size (10MB max)
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size / 1024 / 1024}MB."
            )

        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ('jpg' if is_jpeg else 'png')
        unique_filename = f"uploads/{uuid.uuid4()}.{file_extension}"

        # Upload to R2
        try:
            r2_client.upload_file(
                file_data=file_content,
                filename=unique_filename,
                content_type=actual_content_type
            )

            # Generate presigned URL for AI access (private buckets)
            presigned_url = r2_client.get_presigned_url(
                filename=unique_filename,
                expiration=7200  # 2 hours
            )

            # Cache the image bytes in memory to avoid re-download during preview generation
            # Use the presigned URL as the cache key (same URL that will be passed to generate endpoint)
            from ai_wall_detector import _cache_room_image
            _cache_room_image(presigned_url, file_content)
            logger.info(f"Room image cached for preview generation: {presigned_url}")

            return {
                "success": True,
                "url": presigned_url,
                "public_url": f"https://pub-{r2_client.account_id}.r2.dev/{unique_filename}",
                "filename": unique_filename,
                "size": file_size,
                "content_type": actual_content_type
            }

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to storage: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )



class DirectPreviewRequest(BaseModel):
    """Request for direct wallpaper preview generation"""
    image_url: str
    wallpaper_id: str
    quality: Literal["1k", "2k", "4k", "8k"] = "1k"

    model_config = {
        "json_schema_extra": {
            "example": {
                "image_url": "https://pub-xxx.r2.dev/uploads/image.jpg",
                "wallpaper_id": "floral-001",
                "quality": "2k"
            }
        }
    }

class CreateOrderRequest(BaseModel):
    preview_image_url: str
    original_image_url: str
    wallpaper_id: str
    wallpaper_name: str
    width: float = Field(gt=0, le=10, description="Wall width in meters")
    height: float = Field(gt=0, le=10, description="Wall height in meters")
    material: str = Field(pattern="^(peel_stick|traditional|premium)$")
    price: float = Field(gt=0, description="Total price in GBP")
    customer_email: EmailStr

    model_config = {
        "json_schema_extra": {
            "example": {
                "preview_image_url": "https://...",
                "original_image_url": "https://...",
                "wallpaper_id": "floral-001",
                "wallpaper_name": "Botanical Garden",
                "width": 3.2,
                "height": 2.4,
                "material": "peel_stick",
                "price": 799.20,
                "customer_email": "customer@example.com"
            }
        }
    }



@app.post("/api/ai-generate-preview")
async def ai_generate_preview(request: DirectPreviewRequest):
    """
    Generate wallpaper preview using Gemini 3.1 Flash Image

    Flow:
    1. User uploads room photo + selects wallpaper
    2. Gemini applies wallpaper to walls automatically
    3. Returns final preview image with timing breakdown

    Quality levels:
    - 1k: Native 1K output (fastest, recommended for mobile) - 30-40 seconds
    - 2k: Native 2K output (balanced quality/speed) - 35-45 seconds
    - 4k: Native 4K output (high quality for desktop) - ~1 minute
    - 8k: 4K native + local upscale (maximum quality, slowest) - > 1 minute

    Actual generation time varies based on image complexity, network conditions, and server load.

    Args:
        request: {
            image_url: string (room photo presigned URL from /api/upload),
            wallpaper_id: string (design ID from /api/catalog),
            quality: "1k"|"2k"|"4k"|"8k" (default: "1k")
        }

    Returns:
        On success:
        {
            "success": true,
            "preview_url": "https://...",
            "provider": "google",
            "model": "gemini-3.1-flash-image-preview",
            "quality": "2k",
            "native_size": "2K",
            "output_dimensions": "2048x1536",
            "timing": {
                "download_time": 0.5,
                "generation_time": 8.2,
                "postprocess_time": 1.1,
                "upload_time": 0.8,
                "total_time": 10.6
            }
        }

        On failure (fallback):
        {
            "success": false,
            "fallback": true,
            "preview_url": "https://...",
            "provider": "mock",
            "error": "Error details here"
        }
    """
    try:
        logger.info(f"AI preview generation requested: wallpaper={request.wallpaper_id}, quality={request.quality}")

        # Get wallpaper from catalog using shared cached loader
        catalog = _get_catalog()

        wallpaper = next((w for w in catalog['designs'] if w['id'] == request.wallpaper_id), None)
        if not wallpaper:
            raise HTTPException(status_code=404, detail="Wallpaper not found")

        wallpaper_url = wallpaper['full_url']

        # Get cached room image bytes (cached during upload)
        from ai_wall_detector import _get_cached_room_image
        room_image_bytes = _get_cached_room_image(request.image_url)

        if room_image_bytes is not None:
            logger.info(f"Room image found in cache, skipping download")

        # Run blocking generation in thread pool to avoid blocking event loop
        logger.info("Starting preview generation in worker thread...")
        result = await asyncio.to_thread(
            generate_wallpaper_preview_ai,
            image_url=request.image_url,
            wallpaper_url=wallpaper_url,
            quality=request.quality,
            room_image_bytes=room_image_bytes
        )

        if result and result.get("success"):
            logger.info(f"Preview generated: provider={result.get('provider')}, total_time={result.get('timing', {}).get('total_time', 'N/A')}s")
            return result
        else:
            # Fall back to mock - return success=false to indicate this is NOT a real AI result
            logger.warning("AI preview generation failed, using mock fallback")

            # Extract user-friendly error message if available
            error_msg = result.get("user_message") if result else None
            if not error_msg:
                raw_error = result.get("error", "AI service temporarily unavailable") if result else "AI generation failed"
                # Check for 503 or UNAVAILABLE in raw error
                if "503" in raw_error or "UNAVAILABLE" in raw_error:
                    error_msg = "AI service is currently busy due to high demand. Please try again in a few moments."
                else:
                    error_msg = raw_error

            return {
                "success": False,
                "fallback": True,
                "preview_url": None,  # No mock image - force error display
                "description": "AI preview generation failed",
                "provider": "mock",
                "error": error_msg,
                "timing": {
                    "download_time": 0,
                    "generation_time": 0,
                    "postprocess_time": 0,
                    "upload_time": 0,
                    "total_time": 0
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        logger.error(f"AI preview generation error: {error_message}", exc_info=True)

        # Generate user-friendly error message
        user_message = error_message  # Default to raw error
        if "503" in error_message or "UNAVAILABLE" in error_message:
            user_message = "AI service is currently busy due to high demand. Please try again in a few moments."
        elif "429" in error_message:
            user_message = "Too many requests. Please wait a moment and try again."
        elif "timeout" in error_message.lower():
            user_message = "Request timed out. Please check your connection and try again."

        return {
            "success": False,
            "fallback": True,
            "preview_url": None,
            "description": "AI preview generation failed",
            "provider": "mock",
            "error": user_message,
            "timing": {
                "download_time": 0,
                "generation_time": 0,
                "postprocess_time": 0,
                "upload_time": 0,
                "total_time": 0
            }
        }


@app.post("/api/shopify/create-order")
async def create_shopify_order(request: CreateOrderRequest):
    """
    Create Shopify draft order

    NOTE: This is currently a MOCK implementation.
    Real Shopify integration will be added in production.

    Args:
        request: Order details including images, dimensions, material, price

    Returns:
        {
            "success": true,
            "order_id": "mock-order-123",
            "checkout_url": "https://...",
            "mock": true
        }
    """
    try:
        logger.info(f"Order creation requested for {request.customer_email}")

        # Validate email format
        if not request.customer_email or '@' not in request.customer_email:
            raise HTTPException(
                status_code=400,
                detail="Valid email address is required"
            )

        # Validate dimensions
        if request.width <= 0 or request.height <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid dimensions"
            )

        # TODO: Replace with real Shopify API call
        # For now, return mock order data

        # Simulate API call (non-blocking)
        await asyncio.sleep(1)

        # Generate mock order ID
        order_id = f"WF-{uuid.uuid4().hex[:8].upper()}"

        # Mock checkout URL
        mock_checkout_url = f"https://wallfeel.myshopify.com/checkout/{order_id}"

        logger.info(f"Mock order created: {order_id}")

        return {
            "success": True,
            "order_id": order_id,
            "checkout_url": mock_checkout_url,
            "order_details": {
                "dimensions": f"{request.width}m × {request.height}m",
                "material": request.material,
                "price": request.price,
                "wallpaper": request.wallpaper_name
            },
            "mock": True,
            "message": "Using mock order creation. Real Shopify integration pending."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order creation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Order creation failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
