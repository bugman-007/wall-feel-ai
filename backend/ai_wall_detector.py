"""
AI Wallpaper Preview Generator using Gemini 3.1 Flash Image
Single unified multimodal model for wallpaper application

Includes retry logic with exponential backoff for transient failures.
"""

import io
import os
import logging
import time
import httpx
import asyncio
from typing import Optional, Dict, Any, Tuple, Literal
from collections import OrderedDict

from dotenv import load_dotenv

load_dotenv()

# Import retry wrapper
from retry_wrapper import retry_async, is_transient_error, calculate_backoff_delay, MAX_RETRIES

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

# Style inspiration prompts for custom design generation
STYLE_INSPIRATION_PROMPTS = {
    "Tropical Paradise": "vibrant tropical paradise with lush palm leaves, monstera, and exotic flowers in emerald green, coral pink, and golden yellow tones",
    "Warm Minimal Texture": "minimalist textured wall in warm beige and cream tones with subtle linen-like pattern, soft natural lighting",
    "Luxury Marble Pattern": "elegant white marble with subtle gold veining, Carrara marble texture, luxurious and sophisticated",
    "Organic Botanical": "deep forest green botanical wallpaper with large tropical leaves, natural organic patterns, biophilic design",
}

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

        # Generate preview
        # Note: Native image_size config not available in current SDK version; we handle resize locally
        # Note: AFC is disabled by default for image generation models
        response = client.models.generate_content(
            model='gemini-3.1-flash-image-preview',
            contents=[
                prompt or DEFAULT_WALLPAPER_PROMPT,
                room_image,
                wallpaper_image
            ],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE']
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
        error_message = str(e)
        logger.error(f"Preview generation error: {error_message}", exc_info=True)

        # Return structured error information for better user messaging
        error_info = {
            "error": error_message,
            "error_type": type(e).__name__
        }

        # Detect specific error types for better user messaging
        if "503" in error_message or "UNAVAILABLE" in error_message:
            error_info["user_message"] = "AI service is temporarily busy due to high demand. Please try again in a few moments."
        elif "429" in error_message:
            error_info["user_message"] = "Too many requests. Please wait a moment and try again."
        elif "401" in error_message or "API key" in error_message:
            error_info["user_message"] = "Authentication error. Please check your API configuration."
        elif "timeout" in error_message.lower() or "timed out" in error_message.lower():
            error_info["user_message"] = "Request timed out. Please check your connection and try again."

        return error_info


def _build_enhanced_prompt(
    prompt: str,
    style_inspirations: list[str] = None
) -> str:
    """
    Build enhanced prompt from user prompt and style inspirations.

    Args:
        prompt: User's base prompt
        style_inspirations: Optional list of style inspiration names

    Returns:
        Enhanced prompt with style elements incorporated
    """
    style_prompts = []
    if style_inspirations:
        for style_name in style_inspirations:
            if style_name in STYLE_INSPIRATION_PROMPTS:
                style_prompts.append(STYLE_INSPIRATION_PROMPTS[style_name])

    if style_prompts:
        enhanced_prompt = f"{prompt}. Style elements: {'; '.join(style_prompts)}"
    else:
        enhanced_prompt = prompt

    # Ensure prompt is descriptive enough
    if len(enhanced_prompt) < 20:
        enhanced_prompt = f"Generate a beautiful wallpaper pattern with: {enhanced_prompt}"

    return enhanced_prompt


def _build_reference_edit_prompt(
    prompt: str,
    style_inspirations: list[str] = None
) -> str:
    """
    Build an editing prompt for uploaded wallpaper artwork.

    This path should preserve the source design and only make targeted changes
    requested by the user, rather than inventing a new unrelated pattern.
    """
    cleaned_prompt = (prompt or "").strip()
    style_prompts = []
    if style_inspirations:
        for style_name in style_inspirations:
            if style_name in STYLE_INSPIRATION_PROMPTS:
                style_prompts.append(STYLE_INSPIRATION_PROMPTS[style_name])

    prompt_parts = [
        "Edit the uploaded wallpaper design rather than replacing it with a new unrelated concept.",
        "Preserve the original composition, layout, focal subjects, decorative structure, and recognizable visual identity unless the user explicitly asks to change them.",
        "Make only the requested modifications and keep the result clearly derived from the uploaded design.",
        "Return a flat wallpaper artwork only, suitable for wall application.",
    ]

    if cleaned_prompt:
        prompt_parts.append(f"Requested edit: {cleaned_prompt}")
    else:
        prompt_parts.append("Requested edit: Refine the uploaded design into a polished premium wallpaper while keeping it recognizably the same artwork.")

    if style_prompts:
        prompt_parts.append(f"Optional style accents: {'; '.join(style_prompts)}")

    return " ".join(prompt_parts)


def _generate_texture_bytes(
    client,
    enhanced_prompt: str,
    model_name: str = 'gemini-2.5-flash-image',
    reference_image_bytes: Optional[bytes] = None,
    reference_image_mime_type: Optional[str] = None
) -> tuple[Optional[bytes], float]:
    """
    Generate wallpaper texture bytes using Gemini 2.5 Flash.

    Args:
        client: Gemini API client
        enhanced_prompt: Prompt for texture generation

    Returns:
        Tuple of (wallpaper_bytes, generation_elapsed)
    """
    from google.genai import types

    logger.info("Generating wallpaper texture with Gemini 2.5 Flash...")
    generation_start = time.time()

    if reference_image_bytes is not None:
        actual_reference_mime = reference_image_mime_type or _detect_mime_type(reference_image_bytes)
        reference_image = types.Part.from_bytes(
            data=reference_image_bytes,
            mime_type=actual_reference_mime
        )
        contents = [
            enhanced_prompt,
            reference_image,
            (
                "Important: keep the output visibly based on the uploaded design. "
                "Do not ignore the source artwork and do not replace it with a different composition."
            ),
            (
                "Return a single edited wallpaper artwork only. "
                "Do not create a room mockup, product shot, invitation, poster, or unrelated scene."
            ),
        ]
    else:
        contents = [
            f"Generate a seamless wallpaper texture pattern. {enhanced_prompt}",
            "Create a high-quality, tileable wallpaper pattern. The pattern should be photorealistic and suitable for interior design.",
        ]

    texture_response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=['IMAGE'],
        )
    )

    generation_elapsed = time.time() - generation_start
    logger.info(f"Texture generation completed in {generation_elapsed:.2f}s")

    wallpaper_bytes = _extract_generated_image(texture_response)
    if not wallpaper_bytes:
        logger.warning("Gemini did not return a valid wallpaper texture")
        return None, generation_elapsed

    return wallpaper_bytes, generation_elapsed


def generate_wallpaper_texture(
    prompt: str,
    style_inspirations: list[str] = None,
    reference_image_url: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper texture only from text prompt using Gemini 2.5 Flash Image

    This is for the two-step flow:
    1. Generate texture -> user reviews/confirms
    2. Apply texture to room

    Args:
        prompt: User's text prompt describing desired wallpaper
        style_inspirations: Optional list of style inspiration names

    Returns:
        Dict with wallpaper_url and timing
    """
    try:
        from google import genai
        from r2_client import r2_client
        import uuid

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("Gemini API key not configured")
            return None

        client = genai.Client(api_key=api_key)
        start_time = time.time()

        reference_image_bytes: Optional[bytes] = None
        reference_image_mime_type: Optional[str] = None
        if reference_image_url:
            reference_image_bytes = _get_cached_room_image(reference_image_url)
            if reference_image_bytes is None:
                logger.info("Downloading uploaded design reference image...")
                reference_image_bytes = _download_image(reference_image_url)
                _cache_room_image(reference_image_url, reference_image_bytes)
            reference_image_mime_type = _detect_mime_type(reference_image_bytes)
            logger.info(f"Using uploaded design reference image ({reference_image_mime_type})")

        cleaned_prompt = (prompt or "").strip()
        if reference_image_bytes is not None:
            enhanced_prompt = _build_reference_edit_prompt(cleaned_prompt, style_inspirations)
            texture_model = 'gemini-3.1-flash-image-preview'
        else:
            has_text_direction = bool(cleaned_prompt or style_inspirations)
            enhanced_prompt = (
                _build_enhanced_prompt(cleaned_prompt, style_inspirations)
                if has_text_direction
                else "Develop this uploaded artwork into a polished, premium wallpaper collection while preserving its core visual identity."
            )
            texture_model = 'gemini-2.5-flash-image'

        logger.info(
            "Texture generation request: prompt='%s...', reference_image=%s, model=%s",
            enhanced_prompt[:100],
            "yes" if reference_image_bytes is not None else "no",
            texture_model
        )

        variation_briefs = [
            (
                "Create the flagship option. Keep it the closest to the uploaded design and make only the essential requested edits."
                if reference_image_bytes is not None else
                "Create the flagship option with a balanced motif scale and a polished luxury rhythm."
            ),
            (
                "Create a second option that keeps the same composition and key elements, but refines the requested edits with a softer premium finish."
                if reference_image_bytes is not None else
                "Create a second option with a calmer composition, softer spacing, and a more understated pattern density."
            ),
            (
                "Create a third option that still preserves the uploaded design's layout and identity, but explores a slightly more expressive styling of the requested edit."
                if reference_image_bytes is not None else
                "Create a third option with a bolder statement, richer contrast, and slightly more expressive motif movement."
            ),
        ]

        wallpaper_urls: list[str] = []
        public_urls: list[str] = []
        generation_elapsed_total = 0.0
        upload_elapsed_total = 0.0

        for variation_index, variation_brief in enumerate(variation_briefs, start=1):
            variant_prompt = (
                f"{enhanced_prompt}\n\n"
                f"Variation {variation_index} of {len(variation_briefs)}. "
                f"{variation_brief}"
            )

            wallpaper_bytes, generation_elapsed = _generate_texture_bytes(
                client,
                variant_prompt,
                model_name=texture_model,
                reference_image_bytes=reference_image_bytes,
                reference_image_mime_type=reference_image_mime_type,
            )
            generation_elapsed_total += generation_elapsed

            if not wallpaper_bytes:
                logger.warning(f"Wallpaper texture variation {variation_index} did not return a valid image")
                continue

            upload_start = time.time()
            wallpaper_filename = f"wallpapers/custom-{uuid.uuid4()}.webp"
            _, wallpaper_presigned_url = r2_client.upload_file_with_presigned_url(
                file_data=wallpaper_bytes,
                filename=wallpaper_filename,
                content_type='image/webp',
                expiration=7200
            )
            upload_elapsed_total += time.time() - upload_start

            wallpaper_urls.append(wallpaper_presigned_url)
            public_urls.append(f"https://pub-{r2_client.account_id}.r2.dev/{wallpaper_filename}")

        if not wallpaper_urls:
            return None

        total_elapsed = time.time() - start_time

        logger.info(
            f"Wallpaper texture generated successfully in {total_elapsed:.2f}s "
            f"with {len(wallpaper_urls)} option(s)"
        )

        return {
            "success": True,
            "wallpaper_url": wallpaper_urls[0],
            "public_url": public_urls[0],
            "wallpaper_urls": wallpaper_urls,
            "public_urls": public_urls,
            "variants": len(wallpaper_urls),
            "provider": "google",
            "model": texture_model,
            "timing": {
                "generation_time": round(generation_elapsed_total, 2),
                "upload_time": round(upload_elapsed_total, 2),
                "total_time": round(total_elapsed, 2)
            }
        }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Texture generation error: {error_message}", exc_info=True)

        error_info = {
            "error": error_message,
            "error_type": type(e).__name__
        }

        if "503" in error_message or "UNAVAILABLE" in error_message:
            error_info["user_message"] = "AI service is currently busy due to high demand. Please try again in a few moments."
        elif "429" in error_message:
            error_info["user_message"] = "Too many requests. Please wait a moment and try again."
        elif "401" in error_message or "API key" in error_message:
            error_info["user_message"] = "Authentication error. Please check your API configuration."
        elif "timeout" in error_message.lower() or "timed out" in error_message.lower():
            error_info["user_message"] = "Request timed out. Please check your connection and try again."

        return error_info


def generate_wallpaper_preview_ai(
    image_url: str,
    wallpaper_url: str,
    quality: QualityLevel = "1k",
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
        room_image_bytes: Optional pre-loaded room image bytes (skips download)
        room_mime_type: Optional MIME type for room_image_bytes

    Returns:
        Dict with preview_url, timing breakdown, and metadata
    """
    return generate_wallpaper_preview_gemini(
        image_url, wallpaper_url, quality=quality,
        room_image_bytes=room_image_bytes, room_mime_type=room_mime_type
    )


def generate_custom_wallpaper_ai(
    image_url: str,
    prompt: str,
    style_inspirations: list[str] = None,
    quality: QualityLevel = "1k",
    room_image_bytes: Optional[bytes] = None,
    room_mime_type: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate custom wallpaper from text prompt using Gemini AI

    Flow:
    1. Build enhanced prompt from user prompt + style inspirations
    2. Generate wallpaper texture using Gemini 2.5 Flash (fast generation)
    3. Apply generated wallpaper to room using Gemini 3.1 Flash Image
    4. Return final preview

    This function composes _generate_texture_bytes and generate_wallpaper_preview_gemini
    to avoid code duplication.

    Args:
        image_url: Room image URL (used for caching key)
        prompt: User's text prompt describing desired wallpaper
        style_inspirations: Optional list of style inspiration names
        quality: Output quality preset (1k, 2k, 4k, 8k) - default 1k for speed
        room_image_bytes: Optional pre-loaded room image bytes
        room_mime_type: Optional MIME type for room_image_bytes

    Returns:
        Dict with preview_url, timing breakdown, and metadata
    """
    try:
        from google import genai
        from google.genai import types
        from r2_client import r2_client
        import uuid
        import io
        from PIL import Image as PILImage

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("Gemini API key not configured")
            return None

        client = genai.Client(api_key=api_key)
        start_time = time.time()

        # Build enhanced prompt
        enhanced_prompt = _build_enhanced_prompt(prompt, style_inspirations)
        logger.info(f"Custom design request: prompt='{enhanced_prompt[:100]}...', style_count={len(style_inspirations or [])}")

        # Track timing
        download_start = time.time()
        download_elapsed = 0.0

        # Get room image bytes
        if room_image_bytes is not None:
            logger.info("Using provided room image bytes (no download needed)")
            download_elapsed = 0.0
        else:
            room_image_bytes = _get_cached_room_image(image_url)
            if room_image_bytes is None:
                logger.info("Downloading room image...")
                room_image_bytes = _download_image(image_url)
                _cache_room_image(image_url, room_image_bytes)
            download_elapsed = time.time() - download_start

        # Detect MIME type
        detected_room_mime = _detect_mime_type(room_image_bytes)
        actual_room_mime = room_mime_type or detected_room_mime

        # Get original dimensions for aspect ratio
        room_img = PILImage.open(io.BytesIO(room_image_bytes))
        original_width, original_height = room_img.size

        # ========== STEP 1: Generate wallpaper texture using Gemini 2.5 Flash ==========
        logger.info("Step 1: Generating wallpaper texture with Gemini 2.5 Flash (fast)...")
        texture_generation_start = time.time()

        # Generate texture bytes using shared helper
        wallpaper_bytes, texture_generation_elapsed = _generate_texture_bytes(client, enhanced_prompt)
        if not wallpaper_bytes:
            return None

        # Create wallpaper image object
        wallpaper_mime = _detect_mime_type(wallpaper_bytes)
        wallpaper_image = types.Part.from_bytes(data=wallpaper_bytes, mime_type=wallpaper_mime)

        # ========== STEP 2: Apply wallpaper to room using Gemini 3.1 Flash Image ==========
        logger.info("Step 2: Applying wallpaper to room with Gemini 3.1 Flash Image...")
        apply_generation_start = time.time()

        # Create room image object
        room_image = types.Part.from_bytes(data=room_image_bytes, mime_type=actual_room_mime)

        # Apply wallpaper to room using shared Gemini call logic
        apply_response = client.models.generate_content(
            model='gemini-3.1-flash-image-preview',
            contents=[
                DEFAULT_WALLPAPER_PROMPT,
                room_image,
                wallpaper_image
            ],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE']
            )
        )

        apply_generation_elapsed = time.time() - apply_generation_start
        logger.info(f"Wallpaper application completed in {apply_generation_elapsed:.2f}s")

        # Extract final preview image
        image_bytes = _extract_generated_image(apply_response)
        if not image_bytes:
            logger.warning("Gemini did not return a valid preview image")
            return None

        # Calculate target dimensions
        target_dimension = QUALITY_DIMENSIONS.get(quality, 1024)
        aspect_ratio = original_width / original_height
        if aspect_ratio > 1:
            target_width = target_dimension
            target_height = int(target_dimension / aspect_ratio)
        else:
            target_height = target_dimension
            target_width = int(target_dimension * aspect_ratio)

        # Post-process: resize and convert to WebP
        logger.info(f"Post-processing: resizing to {target_width}x{target_height} (WebP)")
        postprocess_start = time.time()
        image_bytes = _resize_and_correct_image(
            image_bytes, target_width, target_height,
            output_format='webp', quality=85
        )
        postprocess_elapsed = time.time() - postprocess_start

        # Upload to R2
        upload_start = time.time()
        preview_filename = f"previews/custom-{uuid.uuid4()}.webp"
        _, preview_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=image_bytes,
            filename=preview_filename,
            content_type='image/webp',
            expiration=7200
        )
        upload_elapsed = time.time() - upload_start

        total_elapsed = time.time() - start_time

        logger.info(f"Custom design generated successfully in {total_elapsed:.2f}s total")

        return {
            "success": True,
            "preview_url": preview_presigned_url,
            "provider": "google",
            "model": "gemini-2.5-flash-image-preview + gemini-3.1-flash-image-preview",
            "quality": quality,
            "output_dimensions": f"{target_width}x{target_height}",
            "timing": {
                "download_time": round(download_elapsed, 2),
                "texture_generation_time": round(texture_generation_elapsed, 2),
                "apply_generation_time": round(apply_generation_elapsed, 2),
                "postprocess_time": round(postprocess_elapsed, 2),
                "upload_time": round(upload_elapsed, 2),
                "total_time": round(total_elapsed, 2)
            }
        }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Custom design generation error: {error_message}", exc_info=True)

        error_info = {
            "error": error_message,
            "error_type": type(e).__name__
        }

        if "503" in error_message or "UNAVAILABLE" in error_message:
            error_info["user_message"] = "AI service is currently busy due to high demand. Please try again in a few moments."
        elif "429" in error_message:
            error_info["user_message"] = "Too many requests. Please wait a moment and try again."
        elif "401" in error_message or "API key" in error_message:
            error_info["user_message"] = "Authentication error. Please check your API configuration."
        elif "timeout" in error_message.lower() or "timed out" in error_message.lower():
            error_info["user_message"] = "Request timed out. Please check your connection and try again."

        return error_info


# =============================================================================
# Async Generation Functions with Retry Support
# =============================================================================
# These functions wrap the sync generation functions with retry logic
# and are designed to be used with the job queue system


async def generate_wallpaper_preview_async(
    image_url: str,
    wallpaper_url: str,
    quality: QualityLevel = "1k",
    room_image_bytes: Optional[bytes] = None,
    room_mime_type: Optional[str] = None,
    max_retries: int = 3
) -> Optional[Dict[str, Any]]:
    """
    Async wrapper for wallpaper preview generation with retry support.

    This function runs the blocking generation in a thread pool and applies
    retry logic with exponential backoff for transient failures.

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL
        quality: Output quality preset
        room_image_bytes: Optional pre-loaded room image bytes
        room_mime_type: Optional MIME type for room_image_bytes
        max_retries: Maximum retry attempts (default: 3)

    Returns:
        Dict with preview_url, timing, and metadata on success
        Dict with error info on failure
    """

    async def _generate_with_retry():
        """Internal async function for retry wrapper."""
        # Run blocking generation in thread pool
        result = await asyncio.to_thread(
            generate_wallpaper_preview_ai,
            image_url=image_url,
            wallpaper_url=wallpaper_url,
            quality=quality,
            room_image_bytes=room_image_bytes,
            room_mime_type=room_mime_type
        )

        # Check if result indicates failure with retryable error
        if result and not result.get("success"):
            error = result.get("error", "")
            error_type = result.get("error_type", "")

            # Check if this is a transient error that should be retried
            if is_transient_error(Exception(error)):
                # Raise exception to trigger retry
                raise Exception(f"Transient error during generation: {error}")

            # Non-retryable error - return as-is
            return result

        if result is None:
            raise Exception("Generation returned None")

        return result

    try:
        return await retry_async(
            _generate_with_retry,
            max_retries=max_retries,
            base_delay=2.0
        )
    except Exception as e:
        # All retries exhausted or non-retryable error
        logger.error(f"Preview generation failed after retries: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "user_message": "AI preview generation failed after multiple attempts. Please try again."
        }


async def generate_wallpaper_texture_async(
    prompt: str,
    style_inspirations: list[str] = None,
    reference_image_url: Optional[str] = None,
    max_retries: int = 3
) -> Optional[Dict[str, Any]]:
    """
    Async wrapper for wallpaper texture generation with retry support.

    Args:
        prompt: User's text prompt describing desired wallpaper
        style_inspirations: Optional list of style inspiration names
        max_retries: Maximum retry attempts (default: 3)

    Returns:
        Dict with wallpaper_url and timing on success
        Dict with error info on failure
    """

    async def _generate_with_retry():
        """Internal async function for retry wrapper."""
        result = await asyncio.to_thread(
            generate_wallpaper_texture,
            prompt=prompt,
            style_inspirations=style_inspirations,
            reference_image_url=reference_image_url
        )

        # Check if result indicates failure with retryable error
        if result and not result.get("success"):
            error = result.get("error", "")
            if is_transient_error(Exception(error)):
                raise Exception(f"Transient error during texture generation: {error}")
            return result

        if result is None:
            raise Exception("Texture generation returned None")

        return result

    try:
        return await retry_async(
            _generate_with_retry,
            max_retries=max_retries,
            base_delay=2.0
        )
    except Exception as e:
        logger.error(f"Texture generation failed after retries: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "user_message": "Wallpaper texture generation failed after multiple attempts. Please try again."
        }
