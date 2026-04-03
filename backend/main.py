import io
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
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
from ai_wall_detector import (
    generate_wallpaper_preview_ai,
    generate_custom_wallpaper_ai,
    generate_wallpaper_texture,
    generate_wallpaper_preview_async,
    generate_wallpaper_texture_async,
    QualityLevel
)
from retry_wrapper import is_transient_error
from job_queue import job_queue, get_job_queue, JobType, JobStatus
from typing import List, Dict, Any, Optional, Literal
import time
from middleware import RateLimitMiddleware, SecurityHeadersMiddleware
from shopify_client import get_shopify_client, close_shopify_client
from catalog_normalizer import (
    normalize_product,
    normalize_collection,
    product_to_dict,
    build_category_groups,
    normalize_collection as normalize_shopify_collection
)

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


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up Shopify client on shutdown."""
    await close_shopify_client()


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

# Cache for Shopify data (separate from static catalog)
_shopify_catalog_cache: Optional[Dict] = None
_shopify_catalog_timestamp: float = 0
_SHOPIFY_CACHE_TTL = 300  # 5 minutes cache TTL

# Cache for category groups
_category_groups_cache: Optional[List] = None
_category_groups_timestamp: float = 0
_CATEGORY_GROUPS_CACHE_TTL = 600  # 10 minutes - categories change less often


def _get_catalog() -> Dict:
    """
    Get wallpaper catalog with caching.
    Used by both /api/catalog and /api/ai-generate-preview endpoints.

    Tries to fetch from Shopify first, falls back to static catalog.json.
    """
    global _catalog_cache, _catalog_cache_timestamp

    current_time = time.time()

    # Return cached catalog if still valid
    if _catalog_cache is not None and (current_time - _catalog_cache_timestamp) < _CATALOG_CACHE_TTL:
        return _catalog_cache

    # Try Shopify first
    try:
        import asyncio
        from shopify_client import get_shopify_client
        from catalog_normalizer import normalize_product, product_to_dict

        client = get_shopify_client()

        # Check if Shopify is configured
        if client.config.store_url and client.config.access_token:
            # Fetch products from Shopify
            products = asyncio.run(client.get_all_products(products_per_page=50, variants_first=250))

            if products:
                # Normalize to legacy format for backwards compatibility
                designs = []
                for product in products:
                    normalized = normalize_product(product)
                    if normalized.image:  # Only include products with images
                        designs.append({
                            "id": normalized.handle,  # Use handle as ID for compatibility
                            "name": normalized.title,
                            "category": normalized.app_categories[0] if normalized.app_categories else "default",
                            "thumbnail_url": normalized.image,
                            "full_url": normalized.image,  # Same URL, backend can resize if needed
                            "description": normalized.description or "",
                            # Shopify-specific data
                            "shopify_id": normalized.id,
                            "handle": normalized.handle,
                            "materials": [
                                {
                                    "variantId": m.variant_id,
                                    "name": m.name,
                                    "price": m.price,
                                    "currency": m.currency,
                                    "available": m.available
                                }
                                for m in normalized.materials
                            ]
                        })

                if designs:
                    _catalog_cache = {"designs": designs}
                    _catalog_cache_timestamp = current_time
                    logger.info(f"Loaded {len(designs)} products from Shopify")
                    return _catalog_cache

    except Exception as e:
        logger.warning(f"Shopify catalog fetch failed, falling back to static: {e}")
        # Continue to static catalog fallback

    # Fallback to static catalog.json
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

    NOTE: This endpoint now returns Shopify data if available,
    falling back to static catalog.json if Shopify is not configured.
    """
    return _get_catalog()


# ============== Shopify Catalog Endpoints ==============

@app.get("/api/catalog/groups")
async def get_category_groups():
    """
    Get the original-site catalog taxonomy for browsing.

    Returns explicit parent categories and ordered subcategories with
    stable display titles and Shopify collection handles.

    Cache: 10 minutes (categories change infrequently)
    """
    global _category_groups_cache, _category_groups_timestamp

    current_time = time.time()

    # Return cached groups if still valid
    if _category_groups_cache is not None and (current_time - _category_groups_timestamp) < _CATEGORY_GROUPS_CACHE_TTL:
        return {"groups": _category_groups_cache}

    try:
        groups = build_category_groups()
        _category_groups_cache = groups
        _category_groups_timestamp = current_time

        return {"groups": groups}

    except Exception as e:
        logger.error(f"Error fetching category groups: {e}", exc_info=True)
        # Return empty groups on error (frontend will handle gracefully)
        return {"groups": []}


@app.get("/api/catalog/collections")
async def get_collections():
    """
    Get all Shopify collections (flat list).

    Returns basic collection info for filter UI.
    Cache: 5 minutes
    """
    try:
        client = get_shopify_client()
        collections = await client.get_collections(first=250)

        # Normalize collections
        normalized = [normalize_shopify_collection(c) for c in collections]

        return {"collections": normalized}

    except Exception as e:
        logger.error(f"Error fetching collections: {e}", exc_info=True)
        return {"collections": []}


@app.get("/api/catalog/products")
async def get_products(
    collection: Optional[str] = None,
    category: Optional[str] = None,
    style: Optional[List[str]] = Query(default=None),
    feel: Optional[List[str]] = Query(default=None),
    limit: int = 50
):
    """
    Get products with optional filtering.

    Query params:
    - collection: Filter by Shopify collection handle (e.g., "modern")
    - category: Filter by app category (matches Style, Space, etc.)
    - style: Filter by style labels (can specify multiple: ?style=Modern&style=Luxury)
    - feel: Filter by feel labels (can specify multiple: ?feel=Elegant&feel=Calm)
    - limit: Max products to return (default 50)

    Returns normalized product data ready for frontend display.
    Cache: 5 minutes

    Filter logic:
    - Products match if they contain ANY of the specified style labels
    - Products match if they contain ANY of the specified feel labels
    - If both style and feel are provided, products must match BOTH dimensions
    """
    try:
        client = get_shopify_client()

        if collection:
            # Fetch products from specific collection
            products = await client.get_collection_products_paginated(
                handle=collection,
                products_per_page=limit,
                variants_first=250
            )
        elif category:
            # Fetch all products and filter by category
            # This is less efficient but necessary for cross-collection categories
            all_products = await client.get_all_products(
                products_per_page=100,
                variants_first=250
            )
            # Filter by category (check tags and collections)
            category_lower = category.lower()
            products = [
                p for p in all_products
                if category_lower in [t.lower() for t in p.get("tags", [])]
                or category_lower in [c.get("handle", "").lower() for c in p.get("collections", [])]
            ][:limit]
        else:
            # Fetch all products
            products = await client.get_all_products(
                products_per_page=limit,
                variants_first=250
            )

        # Normalize products
        normalized = [normalize_product(p) for p in products]

        # Apply style filter if provided
        if style:
            style_lower = [s.lower() for s in style]
            normalized = [
                p for p in normalized
                if any(s.lower() in style_lower for s in p.style_labels)
            ]

        # Apply feel filter if provided
        if feel:
            feel_lower = [f.lower() for f in feel]
            normalized = [
                p for p in normalized
                if any(f.lower() in feel_lower for f in p.feel_labels)
            ]

        # Apply limit after filtering
        normalized = normalized[:limit]

        product_dicts = [product_to_dict(p) for p in normalized]

        # Add collection handles to each product for filtering
        if collection and products:
            # Fetch collection info to include handles
            collection_data = await client.get_collection_by_handle(collection)
            if collection_data:
                for product_dict in product_dicts:
                    if "shopifyCollections" not in product_dict:
                        product_dict["shopifyCollections"] = []
                    if collection not in product_dict["shopifyCollections"]:
                        product_dict["shopifyCollections"].append(collection)

        return {"products": product_dicts}

    except Exception as e:
        logger.error(f"Error fetching products: {e}", exc_info=True)
        return {"products": []}


@app.get("/api/catalog/product/{handle}")
async def get_product(handle: str):
    """
    Get single product by handle.

    Returns full product details including all variants/materials.
    Used for product detail views and AI preview generation.
    """
    try:
        client = get_shopify_client()
        product = await client.get_product_by_handle(handle)

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        normalized = normalize_product(product)
        return product_to_dict(normalized)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product {handle}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch product: {str(e)}")


@app.get("/api/catalog/labels")
async def get_classification_labels():
    """
    Get all available style and feel labels for filtering UI.

    Returns:
    {
        "styles": ["Minimal", "Modern", "Luxury", ...],
        "feels": ["Calm", "Warm", "Statement", ...]
    }
    """
    try:
        from classification_rules import get_all_style_labels, get_all_feel_labels

        return {
            "styles": get_all_style_labels(),
            "feels": get_all_feel_labels()
        }
    except Exception as e:
        logger.error(f"Error fetching classification labels: {e}", exc_info=True)
        return {"styles": [], "feels": []}


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


class CustomDesignRequest(BaseModel):
    """Request for custom AI wallpaper texture generation from text prompt"""
    prompt: str = ""
    style_inspirations: list[str] = []
    reference_image_url: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "prompt": "Luxurious warm and elegant wallpaper with subtle texture",
                "style_inspirations": ["Tropical Paradise", "Warm Minimal Texture"],
                "reference_image_url": "https://pub-xxx.r2.dev/uploads/design.png"
            }
        }
    }


class ApplyCustomWallpaperRequest(BaseModel):
    """Request to apply a generated/custom wallpaper to room"""
    image_url: str
    wallpaper_url: str
    quality: Literal["1k", "2k", "4k", "8k"] = "1k"

    model_config = {
        "json_schema_extra": {
            "example": {
                "image_url": "https://pub-xxx.r2.dev/uploads/room.jpg",
                "wallpaper_url": "https://pub-xxx.r2.dev/previews/custom-wallpaper.jpg",
                "quality": "1k"
            }
        }
    }


class PreviewJobCreate(BaseModel):
    """Request to create a preview generation job."""
    type: Literal["room_preview", "wallpaper_texture"]
    # For room_preview
    image_url: Optional[str] = None
    wallpaper_id: Optional[str] = None
    wallpaper_url: Optional[str] = None
    quality: Literal["1k", "2k", "4k", "8k"] = "1k"
    # For wallpaper_texture
    prompt: Optional[str] = None
    style_inspirations: list[str] = []
    reference_image_url: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "type": "room_preview",
                "image_url": "https://pub-xxx.r2.dev/uploads/room.jpg",
                "wallpaper_id": "modern-001",
                "quality": "1k"
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

        wallpaper_url = None

        # Always try Shopify first by handle
        try:
            client = get_shopify_client()
            # Use asyncio.wait_for to add timeout (10 seconds for single product lookup)
            product = await asyncio.wait_for(
                client.get_product_by_handle(request.wallpaper_id),
                timeout=10.0
            )
            if product:
                normalized = normalize_product(product)
                wallpaper_url = normalized.image
                logger.info(f"Found Shopify product by handle: {request.wallpaper_id}")
            else:
                logger.warning(f"Shopify product not found: {request.wallpaper_id}")
        except asyncio.TimeoutError:
            logger.warning(f"Shopify lookup timed out for {request.wallpaper_id} (10s limit)")
        except Exception as e:
            logger.error(f"Shopify lookup failed for {request.wallpaper_id}: {e}", exc_info=True)

        # Fallback to cached catalog (populated from Shopify) if direct lookup didn't find it
        if not wallpaper_url:
            logger.info(f"Trying fallback to cached catalog for: {request.wallpaper_id}")
            # Use _get_catalog() which returns cached Shopify data if available, or static catalog.json
            catalog = _get_catalog()

            wallpaper = next((w for w in catalog.get("designs", []) if w["id"] == request.wallpaper_id), None)
            if not wallpaper:
                logger.error(f"Wallpaper not found in any source: {request.wallpaper_id}")
                raise HTTPException(status_code=404, detail=f"Wallpaper '{request.wallpaper_id}' not found")

            wallpaper_url = wallpaper["full_url"]
            logger.info(f"Found wallpaper in cached catalog: {request.wallpaper_id}")

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


@app.post("/api/ai-generate-wallpaper")
async def ai_generate_wallpaper_texture(request: CustomDesignRequest):
    """
    Step 1: Generate custom wallpaper texture from text prompt

    Flow:
    1. User provides text prompt describing desired wallpaper
    2. Optional style inspirations can be selected to enhance the prompt
    3. Gemini 2.5 Flash generates wallpaper texture (fast generation)
    4. Returns wallpaper texture URL for user review

    User then reviews the wallpaper and confirms before applying to room.

    Args:
        request: {
            prompt: string (text description of desired wallpaper),
            style_inspirations: list[string] (optional style names to enhance prompt)
        }

    Returns:
        On success:
        {
            "success": true,
            "wallpaper_url": "https://...",
            "public_url": "https://...",
            "provider": "google",
            "model": "gemini-2.5-flash-image",
            "timing": {
                "generation_time": 5.0,
                "upload_time": 0.8,
                "total_time": 5.8
            }
        }

        On failure:
        {
            "success": false,
            "error": "Error details",
            "user_message": "User-friendly error message"
        }
    """
    try:
        logger.info(f"Wallpaper texture generation requested: styles={len(request.style_inspirations)}")

        # Validate prompt
        if (not request.prompt or len(request.prompt.strip()) == 0) and len(request.style_inspirations) == 0 and not request.reference_image_url:
            raise HTTPException(status_code=400, detail="Prompt, style inspirations, or a reference image must be provided")

        # Run blocking generation in thread pool
        logger.info("Starting wallpaper texture generation...")
        result = await asyncio.to_thread(
            generate_wallpaper_texture,
            prompt=request.prompt,
            style_inspirations=request.style_inspirations,
            reference_image_url=request.reference_image_url
        )

        if result and result.get("success"):
            logger.info(f"Wallpaper texture generated: total_time={result.get('timing', {}).get('total_time', 'N/A')}s")
            return result
        else:
            error_msg = result.get("user_message") if result else "Wallpaper generation failed"
            raw_error = result.get("error", "AI service temporarily unavailable") if result else "AI generation failed"

            if not error_msg or error_msg == raw_error:
                if "503" in raw_error or "UNAVAILABLE" in raw_error:
                    error_msg = "AI service is currently busy. Please try again in a few moments."
                elif "429" in raw_error:
                    error_msg = "Too many requests. Please wait and try again."

            return {
                "success": False,
                "error": raw_error,
                "user_message": error_msg,
                "wallpaper_url": None
            }

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        logger.error(f"Wallpaper generation error: {error_message}", exc_info=True)

        user_message = error_message
        if "503" in error_message or "UNAVAILABLE" in error_message:
            user_message = "AI service is currently busy. Please try again in a few moments."
        elif "429" in error_message:
            user_message = "Too many requests. Please wait and try again."
        elif "timeout" in error_message.lower():
            user_message = "Request timed out. Please check your connection and try again."

        return {
            "success": False,
            "error": error_message,
            "user_message": user_message,
            "wallpaper_url": None
        }


@app.post("/api/ai-apply-wallpaper")
async def ai_apply_custom_wallpaper(request: ApplyCustomWallpaperRequest):
    """
    Step 2: Apply custom wallpaper texture to room photo

    Flow:
    1. User has already generated/reviewed wallpaper texture
    2. User confirms and applies wallpaper to their room
    3. Gemini 3.1 Flash applies wallpaper to room walls
    4. Returns final preview image

    Args:
        request: {
            image_url: string (room photo presigned URL),
            wallpaper_url: string (generated wallpaper texture URL),
            quality: "1k"|"2k"|"4k"|"8k" (default: "1k")
        }

    Returns:
        On success:
        {
            "success": true,
            "preview_url": "https://...",
            "provider": "google",
            "model": "gemini-3.1-flash-image-preview",
            "quality": "1k",
            "timing": {
                "download_time": 0.5,
                "generation_time": 8.0,
                "postprocess_time": 1.0,
                "upload_time": 0.8,
                "total_time": 10.3
            }
        }

        On failure:
        {
            "success": false,
            "error": "Error details",
            "user_message": "User-friendly error message"
        }
    """
    try:
        logger.info(f"Applying custom wallpaper to room: quality={request.quality}")

        # Get cached room image bytes
        from ai_wall_detector import _get_cached_room_image
        room_image_bytes = _get_cached_room_image(request.image_url)

        if room_image_bytes is not None:
            logger.info("Room image found in cache")

        # Run blocking generation in thread pool
        logger.info("Starting wallpaper application...")
        result = await asyncio.to_thread(
            generate_wallpaper_preview_ai,
            image_url=request.image_url,
            wallpaper_url=request.wallpaper_url,
            quality=request.quality,
            room_image_bytes=room_image_bytes
        )

        if result and result.get("success"):
            logger.info(f"Wallpaper applied: total_time={result.get('timing', {}).get('total_time', 'N/A')}s")
            return result
        else:
            error_msg = result.get("user_message") if result else "Failed to apply wallpaper"
            raw_error = result.get("error", "AI service unavailable") if result else "AI generation failed"

            if not error_msg or error_msg == raw_error:
                if "503" in raw_error or "UNAVAILABLE" in raw_error:
                    error_msg = "AI service is currently busy. Please try again in a few moments."
                elif "429" in raw_error:
                    error_msg = "Too many requests. Please wait and try again."

            return {
                "success": False,
                "error": raw_error,
                "user_message": error_msg,
                "preview_url": None
            }

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        logger.error(f"Wallpaper application error: {error_message}", exc_info=True)

        user_message = error_message
        if "503" in error_message or "UNAVAILABLE" in error_message:
            user_message = "AI service is currently busy. Please try again in a few moments."
        elif "429" in error_message:
            user_message = "Too many requests. Please wait and try again."
        elif "timeout" in error_message.lower():
            user_message = "Request timed out. Please check your connection and try again."

        return {
            "success": False,
            "error": error_message,
            "user_message": user_message,
            "preview_url": None
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


# =============================================================================
# Preview Job Queue Endpoints
# =============================================================================
# These endpoints provide a job-based flow for preview generation:
# 1. POST /api/preview-jobs - Create a job, get job_id
# 2. GET /api/preview-jobs/{job_id} - Poll for status and result
#
# Benefits:
# - No long-running HTTP requests
# - Built-in retry with exponential backoff
# - Concurrency control to prevent Gemini overload
# - Better UX with progressive status updates


@app.post("/api/preview-jobs")
async def create_preview_job(request: PreviewJobCreate):
    """
    Create a preview generation job.

    This endpoint creates a job and returns immediately with a job_id.
    The client should poll GET /api/preview-jobs/{job_id} to check status.

    Job flow:
    1. queued - Waiting for available slot
    2. processing - Currently generating
    3. completed - Success, result includes preview_url
    4. failed - Error, includes safe user-facing message

    Args:
        request: Job details including type, image_url, wallpaper info

    Returns:
        {
            "job_id": "...",
            "status": "queued",
            "type": "room_preview"
        }
    """
    try:
        # Get job queue
        queue = await get_job_queue()

        # Build input payload based on job type
        if request.type == "room_preview":
            if not request.image_url or (not request.wallpaper_id and not request.wallpaper_url):
                raise HTTPException(status_code=400, detail="image_url and wallpaper_id or wallpaper_url required for room_preview")

            input_payload = {
                "image_url": request.image_url,
                "wallpaper_id": request.wallpaper_id,
                "wallpaper_url": request.wallpaper_url,
                "quality": request.quality
            }
            job_type = JobType.ROOM_PREVIEW

        else:  # wallpaper_texture
            if not (request.prompt and request.prompt.strip()) and not request.style_inspirations and not request.reference_image_url:
                raise HTTPException(status_code=400, detail="prompt, style_inspirations, or reference_image_url required for wallpaper_texture")

            input_payload = {
                "prompt": request.prompt,
                "style_inspirations": request.style_inspirations,
                "reference_image_url": request.reference_image_url
            }
            job_type = JobType.WALLPAPER_TEXTURE

        # Create job
        job = queue.create_job(job_type=job_type, input_payload=input_payload)

        # Start background processing
        task = asyncio.create_task(_process_job(job.id))
        queue.register_task(job.id, task)

        logger.info(f"Created preview job {job.id} type={job_type.value}")

        return {
            "job_id": job.id,
            "status": "queued",
            "type": job_type.value
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating preview job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")


@app.get("/api/preview-jobs/{job_id}")
async def get_preview_job(job_id: str):
    """
    Get preview job status and result.

    Poll this endpoint every 2-3 seconds after creating a job.

    Returns:
        {
            "id": "...",
            "type": "room_preview",
            "status": "processing",  # queued | processing | completed | failed | cancelled
            "retry_count": 0,
            "result": { ... }  # Only when status=completed
            "error_message": "..."  # Only when status=failed/cancelled
        }
    """
    queue = await get_job_queue()
    job = queue.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    response = job.to_dict()

    # Add estimated wait time if queued
    if job.status == JobStatus.QUEUED:
        concurrency = queue.get_concurrency_limiter()
        # Rough estimate based on job type
        if job.type == JobType.ROOM_PREVIEW:
            response["estimated_wait_seconds"] = 30  # ~30s for room preview
        else:
            response["estimated_wait_seconds"] = 10  # ~10s for texture

    return response


@app.delete("/api/preview-jobs/{job_id}")
async def cancel_preview_job(job_id: str):
    """
    Cancel a queued or processing preview job.

    Used by the frontend when the user changes catalog selection, wallpaper
    choice, or otherwise abandons the current generation.
    """
    queue = await get_job_queue()
    job = queue.cancel_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job.to_dict()


async def _process_job(job_id: str):
    """
    Background task to process a preview job.

    Handles:
    - Acquiring concurrency slot
    - Running generation with retry
    - Updating job status
    - Safe error handling
    """
    queue = await get_job_queue()
    job = queue.get_job(job_id)

    if not job:
        logger.error(f"Job {job_id} not found for processing")
        return

    concurrency = queue.get_concurrency_limiter()
    slot_acquired = False

    try:
        if job.status == JobStatus.CANCELLED:
            logger.info(f"Job {job_id} was cancelled before processing started")
            return

        # Wait in queued status until a slot is available.
        await concurrency.acquire(job.type)
        slot_acquired = True

        current_job = queue.get_job(job_id)
        if not current_job or current_job.status == JobStatus.CANCELLED:
            logger.info(f"Job {job_id} was cancelled before generation began")
            return

        # Only mark the job as processing once it can actually start work.
        queue.update_job_status(job_id, JobStatus.PROCESSING)
        logger.info(f"Job {job_id} acquired concurrency slot, starting generation")

        if job.type == JobType.ROOM_PREVIEW:
            result = await _process_room_preview_job(job)
        else:  # WALLPAPER_TEXTURE
            result = await _process_texture_job(job)

        # Handle result
        current_job = queue.get_job(job_id)
        if not current_job or current_job.status == JobStatus.CANCELLED:
            logger.info(f"Job {job_id} was cancelled after generation result returned")
            return

        if result and result.get("success"):
            queue.update_job_status(
                job_id,
                JobStatus.COMPLETED,
                result=result
            )
            logger.info(f"Job {job_id} completed successfully")
        else:
            # Generation failed
            error_msg = result.get("user_message", "AI preview generation failed") if result else "AI preview generation failed"
            raw_error = result.get("error", "Unknown error") if result else "Unknown error"

            queue.update_job_status(
                job_id,
                JobStatus.FAILED,
                error_message=error_msg,
                raw_error=raw_error
            )
            logger.warning(f"Job {job_id} failed: {error_msg}")

    except asyncio.CancelledError:
        logger.info(f"Job {job_id} cancelled during processing")
        current_job = queue.get_job(job_id)
        if current_job and current_job.status != JobStatus.CANCELLED:
            queue.update_job_status(
                job_id,
                JobStatus.CANCELLED,
                error_message="Generation cancelled.",
                raw_error="Cancelled by client",
            )
    except Exception as e:
        logger.error(f"Job {job_id} processing error: {e}", exc_info=True)

        # Safe error message for user
        error_str = str(e)
        if is_transient_error(e):
            error_msg = "AI service is temporarily unavailable. Please try again in a moment."
        else:
            error_msg = "Preview generation failed. Please try again."

        queue.update_job_status(
            job_id,
            JobStatus.FAILED,
            error_message=error_msg,
            raw_error=error_str
        )
    finally:
        queue.clear_task(job_id)
        if slot_acquired:
            concurrency.release(job.type)


async def _process_room_preview_job(job) -> Optional[Dict[str, Any]]:
    """
    Process a room preview generation job.

    Handles wallpaper lookup and calls the async generation function.
    """
    input_data = job.input_payload
    image_url = input_data.get("image_url")
    wallpaper_id = input_data.get("wallpaper_id")
    wallpaper_url = input_data.get("wallpaper_url")
    quality = input_data.get("quality", "1k")

    # Resolve wallpaper URL if only ID provided
    if wallpaper_id and not wallpaper_url:
        try:
            client = get_shopify_client()
            product = await asyncio.wait_for(
                client.get_product_by_handle(wallpaper_id),
                timeout=10.0
            )
            if product:
                from catalog_normalizer import normalize_product
                normalized = normalize_product(product)
                wallpaper_url = normalized.image
                logger.info(f"Resolved wallpaper_id {wallpaper_id} to URL")
            else:
                logger.warning(f"Wallpaper not found: {wallpaper_id}")
        except asyncio.TimeoutError:
            logger.warning(f"Shopify lookup timeout for {wallpaper_id}")
        except Exception as e:
            logger.error(f"Shopify lookup error: {e}")

        # Fallback to catalog
        if not wallpaper_url:
            catalog = _get_catalog()
            wallpaper = next((w for w in catalog.get("designs", []) if w["id"] == wallpaper_id), None)
            if wallpaper:
                wallpaper_url = wallpaper["full_url"]
                logger.info(f"Found wallpaper in catalog: {wallpaper_id}")

    if not wallpaper_url:
        return {
            "success": False,
            "error": "Wallpaper not found",
            "user_message": "Selected wallpaper is not available. Please choose another design."
        }

    # Get cached room image
    from ai_wall_detector import _get_cached_room_image
    room_image_bytes = _get_cached_room_image(image_url)

    # Call async generation with retry
    result = await generate_wallpaper_preview_async(
        image_url=image_url,
        wallpaper_url=wallpaper_url,
        quality=quality,
        room_image_bytes=room_image_bytes,
        max_retries=3
    )

    return result


async def _process_texture_job(job) -> Optional[Dict[str, Any]]:
    """
    Process a wallpaper texture generation job.
    """
    input_data = job.input_payload
    prompt = input_data.get("prompt", "")
    style_inspirations = input_data.get("style_inspirations", [])
    reference_image_url = input_data.get("reference_image_url")

    # Call async generation with retry
    result = await generate_wallpaper_texture_async(
        prompt=prompt,
        style_inspirations=style_inspirations,
        reference_image_url=reference_image_url,
        max_retries=3
    )

    return result


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
