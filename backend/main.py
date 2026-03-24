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
from ai_wall_detector import detect_wall_ai, generate_wallpaper_preview_ai
from typing import List, Dict, Any, Optional
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

class SegmentRequest(BaseModel):
    image_url: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "image_url": "https://pub-xxx.r2.dev/uploads/image.jpg"
            }
        }
    }

class WallMask(BaseModel):
    id: str
    area: float
    bbox: List[float]  # [x, y, width, height]
    segmentation: List[List[float]]  # Polygon points

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

@app.get("/api/catalog")
def get_catalog():
    """
    Get wallpaper catalog
    Returns list of available wallpaper designs
    """
    try:
        catalog_path = Path(__file__).parent / "catalog.json"
        with open(catalog_path, 'r') as f:
            catalog = json.load(f)
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

@app.post("/api/segment")
async def segment_walls(request: SegmentRequest):
    """
    Detect walls in room image using SAM

    NOTE: This is currently a MOCK implementation.
    Real SAM integration will be added in production.

    Args:
        request: { image_url: string }

    Returns:
        {
            "success": true,
            "masks": [
                {
                    "id": "wall-1",
                    "area": 0.25,
                    "bbox": [100, 50, 400, 500],
                    "segmentation": [[x1,y1], [x2,y2], ...]
                }
            ],
            "processing_time": 2.5,
            "mock": true
        }
    """
    try:
        logger.info(f"Wall detection requested for image: {request.image_url}")

        # Mock implementation (for development)
        logger.info("Using mock wall detection")
        await asyncio.sleep(2)  # Simulate processing time

        # Generate mock wall masks
        mock_masks = [
            {
                "id": "wall-1",
                "area": 0.28,
                "bbox": [50, 100, 350, 450],  # Left wall
                "segmentation": [
                    [50, 100], [400, 100], [400, 550], [50, 550]
                ]
            },
            {
                "id": "wall-2",
                "area": 0.32,
                "bbox": [420, 80, 380, 480],  # Back wall
                "segmentation": [
                    [420, 80], [800, 80], [800, 560], [420, 560]
                ]
            },
            {
                "id": "wall-3",
                "area": 0.22,
                "bbox": [820, 120, 300, 420],  # Right wall
                "segmentation": [
                    [820, 120], [1120, 120], [1120, 540], [820, 540]
                ]
            }
        ]

        logger.info(f"Generated {len(mock_masks)} mock wall masks")

        return {
            "success": True,
            "masks": mock_masks,
            "processing_time": 2.0,
            "mock": True,
            "message": "Using mock wall detection. Real SAM integration pending."
        }

    except Exception as e:
        logger.error(f"Wall detection error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Wall detection failed: {str(e)}"
        )


class AIWallDetectRequest(BaseModel):
    image_url: str
    wallpaper_id: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "image_url": "https://pub-xxx.r2.dev/uploads/image.jpg",
                "wallpaper_id": "floral-001"
            }
        }
    }


@app.post("/api/ai-detect-wall")
async def ai_detect_wall(request: AIWallDetectRequest):
    """
    Detect the main wall in a room photo using AI (OpenAI or Gemini)

    This is the SIMPLIFIED flow endpoint:
    1. User uploads photo
    2. AI detects the main wall automatically
    3. AI can optionally map wallpaper pattern

    Args:
        request: {
            image_url: string,
            wallpaper_id: string (optional)
        }

    Returns:
        {
            "success": true,
            "wall": {
                "id": "wall-1",
                "area": 0.25,
                "bbox": [100, 50, 400, 500],
                "segmentation": [[x1,y1], [x2,y2], ...],
                "description": "Main wall facing the camera",
                "confidence": 0.95
            },
            "provider": "openai" | "gemini",
            "processing_time": 3.5
        }
    """
    try:
        logger.info(f"AI wall detection requested for image: {request.image_url}")

        # Use AI to detect wall (OpenAI or Gemini)
        result = detect_wall_ai(request.image_url)

        if result and result.get("success"):
            logger.info(f"AI wall detection successful using {result.get('provider')}")
            return {
                **result,
                "processing_time": 3.5,  # Approximate AI processing time
            }
        else:
            # Fall back to mock data
            logger.warning("AI wall detection failed, using mock data")

            mock_wall = {
                "id": "wall-1",
                "area": 0.35,
                "bbox": [100, 80, 600, 450],
                "segmentation": [
                    [100, 80],
                    [700, 80],
                    [700, 530],
                    [100, 530]
                ],
                "description": "Main wall (mock fallback)",
                "confidence": 0.5
            }

            return {
                "success": True,
                "wall": mock_wall,
                "provider": "mock",
                "processing_time": 0.5,
                "message": "AI detection unavailable, using mock wall"
            }

    except Exception as e:
        logger.error(f"AI wall detection error: {str(e)}", exc_info=True)

        # Return mock data on error
        mock_wall = {
            "id": "wall-1",
            "area": 0.35,
            "bbox": [100, 80, 600, 450],
            "segmentation": [
                [100, 80],
                [700, 80],
                [700, 530],
                [100, 530]
            ],
            "description": "Main wall (error fallback)",
            "confidence": 0.3
        }

        return {
            "success": True,
            "wall": mock_wall,
            "provider": "mock",
            "processing_time": 0.1,
            "error": str(e),
            "message": "AI detection error, using mock wall"
        }

class ApplyWallpaperRequest(BaseModel):
    image_url: str
    wall_mask_id: str
    wallpaper_id: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "image_url": "https://pub-xxx.r2.dev/uploads/image.jpg",
                "wall_mask_id": "wall-1",
                "wallpaper_id": "floral-001"
            }
        }
    }


class DirectPreviewRequest(BaseModel):
    """Request for direct wallpaper preview generation without wall mask"""
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

@app.post("/api/apply-wallpaper")
async def apply_wallpaper(request: ApplyWallpaperRequest):
    """
    Apply wallpaper to selected wall using SDXL

    NOTE: This is currently a MOCK implementation.
    Real SDXL integration will be added in production.

    Args:
        request: {
            image_url: string,
            wall_mask_id: string,
            wallpaper_id: string
        }

    Returns:
        {
            "success": true,
            "preview_url": "https://...",
            "processing_time": 25.0,
            "mock": true
        }
    """
    try:
        logger.info(f"Preview generation requested for wall: {request.wall_mask_id}, wallpaper: {request.wallpaper_id}")

        # Mock implementation (for development)
        logger.info("Using mock preview generation")
        await asyncio.sleep(3)  # Simulate processing time

        # Return a placeholder preview image
        mock_preview_url = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=800&fit=crop"

        logger.info("Mock preview generated successfully")

        return {
            "success": True,
            "preview_url": mock_preview_url,
            "original_url": request.image_url,
            "processing_time": 3.0,
            "mock": True,
            "message": "Using mock preview generation. Real SDXL integration pending."
        }

    except Exception as e:
        logger.error(f"Preview generation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Preview generation failed: {str(e)}"
        )


@app.post("/api/ai-generate-preview")
async def ai_generate_preview(request: DirectPreviewRequest):
    """
    Generate wallpaper preview directly using AI (OpenAI/Gemini)

    SIMPLIFIED flow endpoint:
    1. User uploads room photo
    2. User selects wallpaper
    3. AI composites both images with prompt "apply wallpaper to wall"
    4. Returns final preview image

    No wall mask needed - AI handles everything!

    Args:
        request: {
            image_url: string (room photo),
            wallpaper_id: string
        }

    Returns:
        {
            "success": true,
            "preview_url": "https://...",
            "description": "Wallpaper applied to main wall",
            "provider": "openai" | "gemini",
            "processing_time": 5.0
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

        # Use AI to generate preview
        result = generate_wallpaper_preview_ai(
            image_url=request.image_url,
            wallpaper_url=wallpaper_url
        )

        if result and result.get("success"):
            logger.info(f"AI preview generated successfully using {result.get('provider')}")
            return {
                **result,
                "processing_time": 5.0
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
