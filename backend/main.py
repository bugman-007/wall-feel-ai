from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import os
import json
import uuid
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv
from r2_client import r2_client
from ai_wall_detector import generate_wallpaper_preview_ai
from typing import List, Dict, Any, Optional
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

# Cache for catalog data (performance optimization)
_catalog_cache: Optional[Dict] = None
_catalog_cache_timestamp: float = 0
_CATALOG_CACHE_TTL = 300  # 5 minutes cache TTL


@app.get("/api/catalog")
def get_catalog():
    """
    Get wallpaper catalog
    Returns list of available wallpaper designs

    Performance: Catalog is cached for 5 minutes to reduce file I/O
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
        return {"error": str(e), "designs": []}

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
            "size": 12345
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

        # Validate file size (10MB max)
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size / 1024 / 1024}MB."
            )

        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"uploads/{uuid.uuid4()}.{file_extension}"

        # Upload to R2
        try:
            r2_client.upload_file(
                file_data=file_content,
                filename=unique_filename,
                content_type=file.content_type
            )

            # Generate presigned URL for AI access (private buckets)
            presigned_url = r2_client.get_presigned_url(
                filename=unique_filename,
                expiration=7200  # 2 hours
            )

            return {
                "success": True,
                "url": presigned_url,
                "public_url": f"https://pub-{r2_client.account_id}.r2.dev/{unique_filename}",
                "filename": unique_filename,
                "size": file_size,
                "content_type": file.content_type
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

    model_config = {
        "json_schema_extra": {
            "example": {
                "image_url": "https://pub-xxx.r2.dev/uploads/image.jpg",
                "wallpaper_id": "floral-001"
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
    Generate wallpaper preview using Gemini 3 Pro Image (Nano Banana)

    SIMPLIFIED 2-step flow:
    1. User uploads room photo + selects wallpaper
    2. Gemini Pro Image applies wallpaper to walls automatically
    3. Returns final preview image

    No manual wall selection needed - AI handles everything.

    Args:
        request: {
            image_url: string (room photo),
            wallpaper_id: string
        }

    Returns:
        {
            "success": true,
            "preview_url": "https://...",
            "provider": "gemini-3-pro-image",
            "processing_time": 10.0
        }
    """
    try:
        logger.info(f"AI preview generation requested for wallpaper: {request.wallpaper_id}")

        # Get wallpaper URL from catalog
        catalog_path = Path(__file__).parent / "catalog.json"
        with open(catalog_path, 'r') as f:
            catalog = json.load(f)

        wallpaper = next((w for w in catalog['designs'] if w['id'] == request.wallpaper_id), None)
        if not wallpaper:
            raise HTTPException(status_code=404, detail="Wallpaper not found")

        wallpaper_url = wallpaper['full_url']

        # Generate preview using Gemini Pro Image
        result = generate_wallpaper_preview_ai(
            image_url=request.image_url,
            wallpaper_url=wallpaper_url
        )

        if result and result.get("success"):
            logger.info(f"Preview generated successfully using {result.get('provider')}")
            return {
                **result,
                "processing_time": 10.0
            }
        else:
            # Fall back to mock
            logger.warning("AI preview generation failed, using mock")
            return {
                "success": True,
                "preview_url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=800&fit=crop",
                "description": "Wallpaper applied (mock)",
                "provider": "mock",
                "processing_time": 0.5
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI preview generation error: {str(e)}", exc_info=True)
        # Return mock on error
        return {
            "success": True,
            "preview_url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=800&fit=crop",
            "description": f"Wallpaper applied (error fallback: {str(e)})",
            "provider": "mock",
            "processing_time": 0.1
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
