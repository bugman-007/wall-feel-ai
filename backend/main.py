from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import uuid
from pathlib import Path
from dotenv import load_dotenv
from r2_client import r2_client
from typing import List, Dict, Any

load_dotenv()

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

class SegmentRequest(BaseModel):
    image_url: str

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
            public_url = r2_client.upload_file(
                file_data=file_content,
                filename=unique_filename,
                content_type=file.content_type
            )

            return {
                "success": True,
                "url": public_url,
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
    # TODO: Replace with real SAM API call to RunPod
    # For now, return mock wall masks for development

    import time
    import random

    # Simulate processing time
    time.sleep(2)  # SAM typically takes 10-15 seconds

    # Generate mock wall masks
    # These represent typical walls in a room photo
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

    return {
        "success": True,
        "masks": mock_masks,
        "processing_time": 2.0,
        "mock": True,
        "message": "Using mock wall detection. Real SAM integration pending."
    }

class ApplyWallpaperRequest(BaseModel):
    image_url: str
    wall_mask_id: str
    wallpaper_id: str

class CreateOrderRequest(BaseModel):
    preview_image_url: str
    original_image_url: str
    wallpaper_id: str
    wallpaper_name: str
    width: float
    height: float
    material: str
    price: float
    customer_email: str

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
    # TODO: Replace with real SDXL API call to RunPod
    # For now, return mock preview URL

    import time

    # Simulate SDXL processing time (typically 20-30 seconds)
    time.sleep(3)  # Shortened for development

    # Return a placeholder preview image
    # In production, this would be the SDXL-generated image
    mock_preview_url = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=800&fit=crop"

    return {
        "success": True,
        "preview_url": mock_preview_url,
        "original_url": request.image_url,
        "processing_time": 3.0,
        "mock": True,
        "message": "Using mock preview generation. Real SDXL integration pending."
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
    # TODO: Replace with real Shopify API call
    # For now, return mock order data

    import time
    import uuid

    # Simulate API call
    time.sleep(1)

    # Generate mock order ID
    order_id = f"WF-{uuid.uuid4().hex[:8].upper()}"

    # Mock checkout URL
    mock_checkout_url = f"https://wallfeel.myshopify.com/checkout/{order_id}"

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
