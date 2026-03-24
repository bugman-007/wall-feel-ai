"""
AI Wall Detector using Gemini 2.0 Flash + Stability AI SDXL
For automatic wall detection and wallpaper inpainting
"""

import os
import base64
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def encode_image_to_base64(image_url: str) -> str:
    """Download image from URL and encode to base64"""
    import httpx

    response = httpx.get(image_url, timeout=30)
    response.raise_for_status()
    return base64.b64encode(response.content).decode('utf-8')


def detect_wall_with_gemini(image_url: str, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Use Google Gemini 2.0 Flash to detect the main wall in a room photo

    Args:
        image_url: URL of the room image
        api_key: Google API key (falls back to env var)

    Returns:
        Wall mask data with segmentation polygon, or None if failed
    """
    try:
        import google.generativeai as genai

        key = api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            logger.warning("Gemini API key not configured")
            return None

        genai.configure(api_key=key)
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Download and encode image
        base64_image = encode_image_to_base64(image_url)

        # Prompt for wall detection - optimized for JSON output with better accuracy
        prompt = """You are an expert interior design AI analyzing room photos for wallpaper application.

TASK: Identify the MAIN wall that would be best for applying wallpaper.

GUIDELINES FOR WALL SELECTION:
1. Choose the largest, most prominent wall visible in the image
2. Prefer walls that are mostly flat and unobstructed (minimal furniture blocking)
3. Typically this is the back wall facing the camera, or the largest side wall
4. DO NOT include windows, doors, or furniture in the wall area
5. The wall should be a rectangular surface from floor to ceiling

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
    "wall_detected": true,
    "wall_description": "Main wall facing camera, behind the sofa",
    "bounding_box": {
        "x": 100,
        "y": 80,
        "width": 500,
        "height": 400
    },
    "segmentation": [
        [100, 80],
        [600, 80],
        [600, 480],
        [100, 480]
    ],
    "confidence": 0.92
}

IMPORTANT RULES:
- Segmentation must be a 4-point polygon outlining ONLY the wall surface (not furniture/objects)
- Coordinates are in pixels from top-left (0,0)
- Be precise: the polygon should trace the actual visible wall boundaries
- If the wall is partially blocked, outline only the visible portion
- If no clear wall is visible, return: {"wall_detected": false, "reason": "explanation"}
"""

        # Create image part for Gemini
        image_data = base64.b64decode(base64_image)

        response = model.generate_content([
            prompt,
            {
                "mime_type": "image/jpeg",
                "data": image_data
            }
        ])

        # Parse response
        result_text = response.text.strip()
        logger.info(f"Gemini response: {result_text[:200]}...")

        # Extract JSON from response
        import json
        import re

        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if json_match:
            result = json.loads(json_match.group())

            if result.get("wall_detected"):
                bbox = result.get("bounding_box", {})
                segmentation = result.get("segmentation", [])

                # Calculate area (normalized 0-1)
                width = bbox.get("width", 0)
                height = bbox.get("height", 0)
                area = (width * height) / (1000 * 1000)  # Normalize

                return {
                    "success": True,
                    "masks": [{
                        "id": "wall-1",
                        "area": area,
                        "bbox": [
                            float(bbox.get("x", 0)),
                            float(bbox.get("y", 0)),
                            float(width),
                            float(height)
                        ],
                        "segmentation": segmentation,
                        "confidence": result.get("confidence", 0.8),
                        "description": result.get("wall_description", "Main wall")
                    }],
                    "provider": "gemini",
                    "model": "gemini-2.0-flash"
                }
            else:
                logger.warning(f"Gemini did not detect wall: {result.get('reason', 'Unknown')}")
                return None
        else:
            logger.error(f"Could not parse JSON from Gemini response")
            return None

    except Exception as e:
        logger.error(f"Gemini wall detection error: {str(e)}", exc_info=True)
        return None


def create_mask_image(segmentation: List[List[float]], image_width: int, image_height: int) -> bytes:
    """
    Create a binary mask image from segmentation polygon

    Args:
        segmentation: Polygon points [[x1,y1], [x2,y2], ...]
        image_width: Width of the original image
        image_height: Height of the original image

    Returns:
        Mask image as PNG bytes (white = wall region, black = rest)
    """
    from PIL import Image, ImageDraw
    import io

    # Create black image
    mask = Image.new('L', (image_width, image_height), 0)
    draw = ImageDraw.Draw(mask)

    # Draw white polygon for wall region
    if segmentation:
        # Flatten polygon points
        flat_points = [point for sublist in segmentation for point in sublist]
        draw.polygon(flat_points, fill=255)

    # Save as PNG bytes
    output = io.BytesIO()
    mask.save(output, format='PNG')
    output.seek(0)

    return output.getvalue()


def generate_preview_with_stability(
    image_url: str,
    mask_bytes: bytes,
    wallpaper_url: str,
    prompt: str
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Stability AI SDXL inpainting

    Args:
        image_url: Original room image URL
        mask_bytes: Mask image as PNG bytes (white=wall, black=rest)
        wallpaper_url: Wallpaper pattern URL
        prompt: Inpainting prompt

    Returns:
        Dict with preview_url and metadata, or None if failed
    """
    try:
        from stability_client import stability_client
        import base64
        import httpx
        from PIL import Image
        from io import BytesIO
        import uuid
        from r2_client import r2_client

        if not stability_client.is_configured():
            logger.warning("Stability AI not configured")
            return None

        # Download wallpaper to get dimensions
        wallpaper_response = httpx.get(wallpaper_url, timeout=30)
        wallpaper_response.raise_for_status()
        wallpaper_image = Image.open(BytesIO(wallpaper_response.content))

        # Download room image to get dimensions
        room_response = httpx.get(image_url, timeout=30)
        room_response.raise_for_status()
        room_image = Image.open(BytesIO(room_response.content))
        room_w, room_h = room_image.size

        # Create mask URL with presigned URL for private bucket access
        mask_filename = f"masks/{uuid.uuid4()}.png"
        public_url, presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=mask_bytes,
            filename=mask_filename,
            content_type='image/png',
            expiration=7200  # 2 hours
        )

        logger.info(f"Mask uploaded: {public_url} (using presigned URL for AI access)")

        # Call Stability AI inpainting with presigned URL
        result = stability_client.generate_inpainting(
            image_url=image_url,
            mask_url=presigned_url,
            prompt=prompt,
            strength=0.75
        )

        if result and result.get("success"):
            # Decode base64 image
            image_bytes = base64.b64decode(result["image_base64"])

            # Upload to R2 and get presigned URL for frontend access
            preview_filename = f"previews/{uuid.uuid4()}.png"
            public_url, presigned_url = r2_client.upload_file_with_presigned_url(
                file_data=image_bytes,
                filename=preview_filename,
                content_type='image/png',
                expiration=7200  # 2 hours
            )

            logger.info(f"Preview generated: {public_url} (using presigned URL for frontend)")

            return {
                "success": True,
                "preview_url": presigned_url,  # Return presigned URL for frontend
                "provider": "stability-sdxl",
                "description": "Wallpaper applied to wall"
            }

        return None

    except Exception as e:
        logger.error(f"Stability AI preview error: {str(e)}", exc_info=True)
        return None


def generate_wallpaper_preview_gemini(
    image_url: str,
    wallpaper_url: str
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini 1.5 Flash + Stability AI SDXL

    Flow:
    1. Gemini detects wall and returns segmentation
    2. Create mask image from segmentation
    3. SDXL inpaints wallpaper onto wall

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL

    Returns:
        Dict with preview_url and metadata
    """
    try:
        # Step 1: Gemini detects wall
        logger.info("Step 1: Detecting wall with Gemini 1.5 Flash...")
        wall_result = detect_wall_with_gemini(image_url)

        if not wall_result or not wall_result.get("masks"):
            logger.warning("Gemini wall detection failed")
            return None

        wall_mask = wall_result["masks"][0]
        segmentation = wall_mask.get("segmentation", [])

        if not segmentation:
            logger.warning("No segmentation data from Gemini")
            return None

        logger.info(f"Wall detected: {wall_mask.get('description')}")

        # Get image dimensions for mask creation
        import httpx
        from PIL import Image
        from io import BytesIO

        room_response = httpx.get(image_url, timeout=30)
        room_response.raise_for_status()
        room_image = Image.open(BytesIO(room_response.content))
        room_w, room_h = room_image.size

        # Step 2: Create mask image
        logger.info("Step 2: Creating mask image...")
        mask_bytes = create_mask_image(segmentation, room_w, room_h)

        # Step 3: SDXL inpainting with improved prompt
        logger.info("Step 3: Generating preview with Stability AI SDXL...")
        prompt = f"""Photorealistic wallpaper application. Apply the wallpaper pattern seamlessly to the wall surface only.
- Match the room's lighting direction and intensity
- Apply natural perspective and depth
- Keep realistic shadows and highlights
- Blend edges naturally with surrounding walls
- Maintain the wallpaper pattern's scale and clarity
- Do not modify furniture, floors, ceiling, or other objects

Wallpaper pattern to apply: {wallpaper_url}
Target wall: {wall_mask.get('description', 'main wall')}
"""

        preview_result = generate_preview_with_stability(
            image_url=image_url,
            mask_bytes=mask_bytes,
            wallpaper_url=wallpaper_url,
            prompt=prompt
        )

        if preview_result:
            return preview_result

        logger.warning("Stability AI inpainting failed")
        return None

    except Exception as e:
        logger.error(f"Preview generation error: {str(e)}", exc_info=True)
        return None


def detect_wall_ai(image_url: str) -> Optional[Dict[str, Any]]:
    """
    Detect wall using Gemini 1.5 Flash

    Args:
        image_url: URL of the room image

    Returns:
        Wall mask data, or None if fails
    """
    return detect_wall_with_gemini(image_url)


def generate_wallpaper_preview_ai(
    image_url: str,
    wallpaper_url: str
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini + Stability AI

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL

    Returns:
        Dict with preview_url and metadata
    """
    return generate_wallpaper_preview_gemini(image_url, wallpaper_url)
