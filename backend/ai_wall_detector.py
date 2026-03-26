"""
AI Wallpaper Preview Generator using Gemini 3.1 Flash Image
Single unified multimodal model for wallpaper application
"""

import io
import os
import logging
import time
import httpx
from typing import Optional, Dict, Any, Tuple, Literal
from collections import OrderedDict

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Default prompt for wallpaper application
DEFAULT_WALLPAPER_PROMPT = """Apply this wallpaper texture to all visible walls in the room photo.

CRITICAL REQUIREMENTS:
1. Apply wallpaper ONLY to wall surfaces - never to floor, ceiling, furniture, or objects
2. Match the perspective correctly - walls recede into the distance
3. Match lighting and shadows - darker areas of walls should have darker wallpaper
4. Tile the wallpaper naturally - no obvious repeating patterns
5. Keep all furniture, decorations, windows, doors exactly as they are
6. Blend edges seamlessly where walls meet ceiling, floor, and corners
7. Maintain photorealistic quality - this is a real room photo

The wallpaper image shows the exact pattern, color, and texture to apply.
"""

# Supported quality levels
QualityLevel = Literal["1k", "2k", "4k", "8k"]

# Quality presets: native Gemini output sizes
# Note: 8k is NOT natively supported - it's an upscale mode (4k output, locally upscaled)
GEMINI_IMAGE_SIZES = {
    '1k': '1K',    # Native: 1024px longest side
    '2k': '2K',    # Native: 2048px longest side
    '4k': '4K',    # Native: 4096px longest side
}

# Local resize dimensions for quality presets (fallback/override)
# For 8k, we generate at 4k and upscale locally
QUALITY_DIMENSIONS = {
    '1k': 1024,
    '2k': 2048,
    '4k': 4096,
    '8k': 7680,  # Upscale mode: generate at 4k, upscale to 8k
}


class LRUCache:
    """Simple LRU cache with max size and TTL support."""

    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        self._cache: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache, or None if not found/expired."""
        if key not in self._cache:
            return None
        value, timestamp = self._cache[key]
        if (time.time() - timestamp) >= self._ttl:
            del self._cache[key]
            return None
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        return value

    def set(self, key: str, value: Any) -> None:
        """Set value in cache, evicting oldest if at max size."""
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, time.time())
        # Evict oldest if over max size
        while len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()


# In-memory caches
_wallpaper_cache = LRUCache(max_size=50, ttl_seconds=3600)  # Up to 50 wallpapers, 1 hour TTL
_room_image_cache = LRUCache(max_size=100, ttl_seconds=300)  # Up to 100 room images, 5 min TTL


def _detect_mime_type(image_bytes: bytes) -> str:
    """
    Detect MIME type from image magic bytes.

    Args:
        image_bytes: Image data as bytes

    Returns:
        MIME type string (e.g., 'image/jpeg', 'image/png')
    """
    if len(image_bytes) < 8:
        return 'image/jpeg'  # Default fallback

    # JPEG magic bytes: FF D8 FF
    if image_bytes[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'

    # PNG magic bytes: 89 50 4E 47
    if image_bytes[:4] == b'\x89PNG':
        return 'image/png'

    # GIF magic bytes: 47 49 46 38
    if image_bytes[:4] == b'GIF8':
        return 'image/gif'

    # WebP magic bytes: RIFF....WEBP
    if image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return 'image/webp'

    return 'image/jpeg'  # Default fallback


def _download_image(image_url: str, timeout: int = 30) -> bytes:
    """Download image from URL and return as bytes."""
    with httpx.Client() as client:
        response = client.get(image_url, timeout=timeout)
        response.raise_for_status()
        return response.content


def _get_cached_wallpaper(wallpaper_url: str) -> Optional[bytes]:
    """Get wallpaper from cache if available and not expired."""
    cached = _wallpaper_cache.get(wallpaper_url)
    if cached is not None:
        logger.debug(f"Wallpaper cache hit: {wallpaper_url}")
        return cached
    return None


def _cache_wallpaper(wallpaper_url: str, image_bytes: bytes) -> None:
    """Cache wallpaper image in memory."""
    _wallpaper_cache.set(wallpaper_url, image_bytes)
    logger.debug(f"Wallpaper cached: {wallpaper_url}")


def _get_cached_room_image(image_url: str) -> Optional[bytes]:
    """Get room image from cache if available and not expired."""
    cached = _room_image_cache.get(image_url)
    if cached is not None:
        logger.debug(f"Room image cache hit: {image_url}")
        return cached
    return None


def _cache_room_image(image_url: str, image_bytes: bytes) -> None:
    """Cache room image in memory."""
    _room_image_cache.set(image_url, image_bytes)
    logger.debug(f"Room image cached: {image_url}")


def _extract_generated_image(response) -> Optional[bytes]:
    """Extract image bytes from Gemini API response."""
    if not response or not getattr(response, 'candidates', None):
        return None

    candidate = response.candidates[0]
    if not getattr(candidate, 'content', None):
        return None

    content = candidate.content
    if not getattr(content, 'parts', None):
        return None

    part = content.parts[0]
    if getattr(part, 'inline_data', None):
        return part.inline_data.data

    return None


def _resize_and_correct_image(
    image_bytes: bytes,
    target_width: int,
    target_height: int,
    output_format: str = 'webp',
    quality: int = 85
) -> bytes:
    """
    Resize image to target dimensions and correct EXIF orientation.

    Args:
        image_bytes: Input image as bytes
        target_width: Target width in pixels
        target_height: Target height in pixels
        output_format: Output format ('webp', 'jpeg', 'png') - default WebP for smaller files
        quality: Output quality (1-100) - default 85 for WebP/JPEG

    Returns:
        Resized and orientation-corrected image as bytes in specified format
    """
    from PIL import Image, ImageOps

    img = Image.open(io.BytesIO(image_bytes))

    # Correct EXIF orientation (auto-rotate based on camera metadata)
    img = ImageOps.exif_transpose(img)

    # Resize to target dimensions
    img_resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # Save in specified format
    output = io.BytesIO()
    if output_format == 'webp':
        img_resized.save(output, format='WEBP', quality=quality, method=6)
    elif output_format == 'jpeg':
        # Convert to RGB if necessary (JPEG doesn't support alpha)
        if img_resized.mode in ('RGBA', 'LA', 'P'):
            img_resized = img_resized.convert('RGB')
        img_resized.save(output, format='JPEG', quality=quality, optimize=True)
    else:
        # PNG fallback (lossless, larger files)
        img_resized.save(output, format='PNG', optimize=True)
    output.seek(0)

    return output.getvalue()


def generate_wallpaper_preview_gemini(
    image_url: str,
    wallpaper_url: str,
    prompt: Optional[str] = None,
    quality: QualityLevel = "1k",
    room_image_bytes: Optional[bytes] = None,
    room_mime_type: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini 3.1 Flash Image

    Single unified model flow:
    1. Send room image + wallpaper reference + prompt to Gemini
    2. Model applies wallpaper to walls automatically (no mask needed)
    3. Return final generated image

    Args:
        image_url: Room image URL (used for caching key, even if bytes provided)
        wallpaper_url: Wallpaper pattern URL
        prompt: Optional custom prompt (uses default if not provided)
        quality: Output quality preset (1k, 2k, 4k native; 8k is upscaled) - default 1k
        room_image_bytes: Optional pre-loaded room image bytes (skips download if provided)
        room_mime_type: Optional MIME type for room_image_bytes (auto-detected if not provided)

    Returns:
        Dict with preview_url, timing breakdown, and metadata
    """
    try:
        from google import genai
        from google.genai import types
        from r2_client import r2_client
        import uuid
        import concurrent.futures

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("Gemini API key not configured")
            return None

        client = genai.Client(api_key=api_key)

        # Track timing for performance monitoring
        start_time = time.time()
        download_start = time.time()
        download_elapsed = 0.0

        # Get room image bytes (from cache, parameter, or download)
        if room_image_bytes is not None:
            # Caller provided bytes directly (e.g., from upload endpoint)
            logger.info("Using provided room image bytes (no download needed)")
            # Still need to get wallpaper image
            wallpaper_image_bytes = _get_cached_wallpaper(wallpaper_url)
            if wallpaper_image_bytes is None:
                logger.info("Downloading wallpaper...")
                wallpaper_download_start = time.time()
                wallpaper_image_bytes = _download_image(wallpaper_url)
                _cache_wallpaper(wallpaper_url, wallpaper_image_bytes)
                download_elapsed = time.time() - wallpaper_download_start
            else:
                logger.info("Wallpaper served from cache")
        else:
            # Check room image cache first
            room_image_bytes = _get_cached_room_image(image_url)
            if room_image_bytes is None:
                # Download images concurrently using threads
                logger.info("Downloading images concurrently...")
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    room_future = executor.submit(_download_image, image_url)
                    wallpaper_future = executor.submit(_download_image, wallpaper_url)
                    room_image_bytes = room_future.result()
                    wallpaper_image_bytes = wallpaper_future.result()
                    # Cache wallpaper for future requests
                    _cache_wallpaper(wallpaper_url, wallpaper_image_bytes)
                # Cache room image for future requests
                _cache_room_image(image_url, room_image_bytes)
            else:
                # Room image was cached, still need wallpaper
                wallpaper_image_bytes = _get_cached_wallpaper(wallpaper_url)
                if wallpaper_image_bytes is None:
                    logger.info("Room image cached, downloading wallpaper...")
                    wallpaper_image_bytes = _download_image(wallpaper_url)
                    _cache_wallpaper(wallpaper_url, wallpaper_image_bytes)
                else:
                    logger.info("Both images served from cache")
            download_elapsed = time.time() - download_start

        logger.info(f"Image downloads completed in {download_elapsed:.2f}s")

        # Detect MIME types from magic bytes
        detected_room_mime = _detect_mime_type(room_image_bytes)
        wallpaper_mime_type = _detect_mime_type(wallpaper_image_bytes)
        # Use provided MIME type if available, otherwise use detected
        actual_room_mime = room_mime_type or detected_room_mime
        logger.info(f"Room image MIME: {actual_room_mime}, Wallpaper MIME: {wallpaper_mime_type}")

        # Get original image dimensions for aspect ratio preservation
        from PIL import Image as PILImage
        room_img = PILImage.open(io.BytesIO(room_image_bytes))
        original_width, original_height = room_img.size
        logger.info(f"Original image dimensions: {original_width}x{original_height}")

        # Create Image objects with correct MIME types
        room_image = types.Part.from_bytes(data=room_image_bytes, mime_type=actual_room_mime)
        wallpaper_image = types.Part.from_bytes(data=wallpaper_image_bytes, mime_type=wallpaper_mime_type)

        # Generate preview with AFC disabled
        generation_start = time.time()
        logger.info(f"Generating preview with Gemini 3.1 Flash Image (quality: {quality.upper()})...")

        # Determine if this is an upscale mode (8k = generate at 4k, upscale locally)
        is_upscale_mode = quality == '8k'
        native_quality = '4k' if is_upscale_mode else quality
        gemini_size = GEMINI_IMAGE_SIZES.get(native_quality, '1K')

        # Generate preview with AFC disabled
        # Note: Native image_size config not available in current SDK version; we handle resize locally
        response = client.models.generate_content(
            # model='gemini-3-pro-image-preview',
            # model='gemini-2.5-flash-image',
            model='gemini-3.1-flash-image-preview',
            contents=[
                prompt or DEFAULT_WALLPAPER_PROMPT,
                room_image,
                wallpaper_image
            ],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE'],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                )
            )
        )

        generation_elapsed = time.time() - generation_start
        logger.info(f"Gemini generation completed in {generation_elapsed:.2f}s")

        # Extract generated image
        image_bytes = _extract_generated_image(response)
        if not image_bytes:
            logger.warning("Gemini did not return a valid image")
            return None

        # Calculate target dimensions based on quality setting (preserve aspect ratio)
        target_dimension = QUALITY_DIMENSIONS.get(quality, 1024)
        aspect_ratio = original_width / original_height
        if aspect_ratio > 1:
            target_width = target_dimension
            target_height = int(target_dimension / aspect_ratio)
        else:
            target_height = target_dimension
            target_width = int(target_dimension * aspect_ratio)

        # Resize/correct generated image and convert to WebP
        logger.info(f"Post-processing: resizing to {target_width}x{target_height} (WebP)")
        postprocess_start = time.time()
        image_bytes = _resize_and_correct_image(
            image_bytes, target_width, target_height,
            output_format='webp', quality=85
        )
        postprocess_elapsed = time.time() - postprocess_start
        logger.info(f"Post-processing completed in {postprocess_elapsed:.2f}s")

        # Upload to R2
        upload_start = time.time()
        preview_filename = f"previews/{uuid.uuid4()}.webp"
        _, preview_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=image_bytes,
            filename=preview_filename,
            content_type='image/webp',
            expiration=7200
        )
        upload_elapsed = time.time() - upload_start
        logger.info(f"R2 upload completed in {upload_elapsed:.2f}s")

        total_elapsed = time.time() - start_time
        logger.info(f"Preview generated successfully in {total_elapsed:.2f}s total")

        return {
            "success": True,
            "preview_url": preview_presigned_url,
            "provider": "google",
            "model": "gemini-3.1-flash-image-preview",
            "quality": quality,
            "native_size": gemini_size,
            "is_upscale_mode": is_upscale_mode,
            "output_dimensions": f"{target_width}x{target_height}",
            "timing": {
                "download_time": round(download_elapsed, 2),
                "generation_time": round(generation_elapsed, 2),
                "postprocess_time": round(postprocess_elapsed, 2),
                "upload_time": round(upload_elapsed, 2),
                "total_time": round(total_elapsed, 2)
            }
        }

    except Exception as e:
        logger.error(f"Preview generation error: {str(e)}", exc_info=True)
        return None


def generate_wallpaper_preview_ai(
    image_url: str,
    wallpaper_url: str,
    quality: QualityLevel = "1k",
    segmentation: Optional[list] = None,
    room_image_bytes: Optional[bytes] = None,
    room_mime_type: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini 3.1 Flash Image

    Supported quality levels:
    - 1k: Native 1K output
    - 2k: Native 2K output
    - 4k: Native 4K output
    - 8k: 4K native + local upscale

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL
        quality: Output quality preset (1k, 2k, 4k, 8k) - default 1k
        segmentation: Deprecated - not used in new flow
        room_image_bytes: Optional pre-loaded room image bytes (skips download)
        room_mime_type: Optional MIME type for room_image_bytes

    Returns:
        Dict with preview_url, timing breakdown, and metadata
    """
    _ = segmentation  # Mark as intentionally unused
    return generate_wallpaper_preview_gemini(
        image_url, wallpaper_url, quality=quality,
        room_image_bytes=room_image_bytes, room_mime_type=room_mime_type
    )
