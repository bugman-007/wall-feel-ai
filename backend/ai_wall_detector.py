"""
AI Wallpaper Preview Generator using Gemini 3 Pro Image (Nano Banana)
Single unified multimodal model for wallpaper application
"""

import io
import os
import logging
from typing import Optional, Dict, Any

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

# Maximum dimension for output images (performance & quality balance)
MAX_OUTPUT_DIMENSION = 2048


def _download_image(image_url: str, timeout: int = 30) -> bytes:
    """Download image from URL and return as bytes."""
    import httpx
    response = httpx.get(image_url, timeout=timeout)
    response.raise_for_status()
    return response.content


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


def _resize_and_correct_image(image_bytes: bytes, target_width: int, target_height: int) -> bytes:
    """
    Resize image to target dimensions and correct EXIF orientation.

    Args:
        image_bytes: Input image as bytes
        target_width: Target width in pixels
        target_height: Target height in pixels

    Returns:
        Resized and orientation-corrected image as PNG bytes
    """
    from PIL import Image, ImageOps

    img = Image.open(io.BytesIO(image_bytes))

    # Correct EXIF orientation (auto-rotate based on camera metadata)
    img = ImageOps.exif_transpose(img)

    # Resize to target dimensions (match original room image aspect ratio)
    img_resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # Save as PNG
    output = io.BytesIO()
    img_resized.save(output, format='PNG', quality=95)
    output.seek(0)

    return output.getvalue()


def generate_wallpaper_preview_gemini(
    image_url: str,
    wallpaper_url: str,
    prompt: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini 3 Pro Image (Nano Banana)

    Single unified model flow:
    1. Send room image + wallpaper reference + prompt to Gemini Pro Image
    2. Model applies wallpaper to walls automatically (no mask needed)
    3. Return final generated image

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL
        prompt: Optional custom prompt (uses default if not provided)

    Returns:
        Dict with preview_url and metadata, or None if failed
    """
    try:
        from google import genai
        from google.genai import types
        from r2_client import r2_client
        import uuid

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("Gemini API key not configured")
            return None

        client = genai.Client(api_key=api_key)

        # Download images
        logger.info("Downloading room image...")
        room_image_bytes = _download_image(image_url)

        logger.info("Downloading wallpaper reference...")
        wallpaper_image_bytes = _download_image(wallpaper_url)

        # Get original image dimensions for aspect ratio preservation
        from PIL import Image as PILImage
        room_img = PILImage.open(io.BytesIO(room_image_bytes))
        original_width, original_height = room_img.size
        logger.info(f"Original image dimensions: {original_width}x{original_height}")

        # Create Image objects (required by new API)
        room_image = types.Part.from_bytes(data=room_image_bytes, mime_type='image/jpeg')
        wallpaper_image = types.Part.from_bytes(data=wallpaper_image_bytes, mime_type='image/jpeg')

        logger.info("Generating preview with Gemini 3 Pro Image...")

        # Generate preview
        response = client.models.generate_content(
            model='gemini-3-pro-image-preview',
            contents=[
                prompt or DEFAULT_WALLPAPER_PROMPT,
                room_image,
                wallpaper_image
            ],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE']
            )
        )

        # Extract generated image
        image_bytes = _extract_generated_image(response)
        if not image_bytes:
            logger.warning("Gemini Pro Image did not return a valid image")
            return None

        # Resize generated image to match original aspect ratio and correct EXIF orientation
        logger.info(f"Resizing generated image to match original: {original_width}x{original_height}")
        image_bytes = _resize_and_correct_image(image_bytes, original_width, original_height)

        # Upload to R2
        preview_filename = f"previews/{uuid.uuid4()}.png"
        _, preview_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=image_bytes,
            filename=preview_filename,
            content_type='image/png',
            expiration=7200
        )

        logger.info("Preview generated successfully")

        return {
            "success": True,
            "preview_url": preview_presigned_url,
            "provider": "gemini-3-pro-image",
            "model": "gemini-3-pro-image-preview",
            "description": "Wallpaper applied using Gemini Pro Image"
        }

    except Exception as e:
        logger.error(f"Preview generation error: {str(e)}", exc_info=True)
        return None


def generate_wallpaper_preview_ai(
    image_url: str,
    wallpaper_url: str,
    segmentation: Optional[list] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini Pro Image

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL
        segmentation: Deprecated - not used in new flow

    Returns:
        Dict with preview_url and metadata
    """
    _ = segmentation  # Mark as intentionally unused
    return generate_wallpaper_preview_gemini(image_url, wallpaper_url)
