"""
AI Wallpaper Preview Generator using Gemini 3 Pro Image (Nano Banana)
Single unified multimodal model for wallpaper application
"""

import os
import logging
import io
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def generate_wallpaper_preview_gemini(
    image_url: str,
    wallpaper_url: str
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

    Returns:
        Dict with preview_url and metadata
    """
    try:
        import google.generativeai as genai
        from PIL import Image
        import httpx

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("Gemini API key not configured")
            return None

        genai.configure(api_key=api_key)

        # Use Gemini 3 Pro Image (Nano Banana) - the professional image editing model
        model = genai.GenerativeModel('gemini-3-pro-image-preview')

        # Download room image
        logger.info("Downloading room image...")
        room_response = httpx.get(image_url, timeout=30)
        room_response.raise_for_status()
        room_image = Image.open(io.BytesIO(room_response.content))

        # Download wallpaper image
        logger.info("Downloading wallpaper reference...")
        wallpaper_response = httpx.get(wallpaper_url, timeout=30)
        wallpaper_response.raise_for_status()
        wallpaper_image = Image.open(io.BytesIO(wallpaper_response.content))

        # Prompt for wallpaper application
        prompt = """Apply this wallpaper texture to all visible walls in the room photo.

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

        logger.info("Generating preview with Gemini 3 Pro Image...")

        # Generate with both images and prompt
        response = model.generate_content([
            prompt,
            room_image,
            wallpaper_image
        ])

        # Get the generated image
        if response and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                # Extract image from response
                generated_image = candidate.content.parts[0].image
                if generated_image:
                    # Convert to bytes
                    output = io.BytesIO()
                    generated_image.save(output, format='PNG')
                    output.seek(0)
                    image_bytes = output.getvalue()

                    # Upload to R2 and get presigned URL
                    from r2_client import r2_client
                    import uuid

                    preview_filename = f"previews/{uuid.uuid4()}.png"
                    _, preview_presigned_url = r2_client.upload_file_with_presigned_url(
                        file_data=image_bytes,
                        filename=preview_filename,
                        content_type='image/png',
                        expiration=7200
                    )

                    logger.info(f"Preview generated successfully")

                    return {
                        "success": True,
                        "preview_url": preview_presigned_url,
                        "provider": "gemini-3-pro-image",
                        "model": "gemini-3-pro-image-preview",
                        "description": "Wallpaper applied using Gemini Pro Image"
                    }

        logger.warning("Gemini Pro Image did not return a valid image")
        return None

    except Exception as e:
        logger.error(f"Preview generation error: {str(e)}", exc_info=True)
        return None


def generate_wallpaper_preview_ai(
    image_url: str,
    wallpaper_url: str,
    segmentation: Optional[list] = None  # Deprecated - not used
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
