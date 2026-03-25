"""
AI Wall Detector using Gemini 2.0 Flash + Replicate SDXL
For automatic wall detection and wallpaper inpainting
"""

import os
import base64
import logging
import io
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
        model = genai.GenerativeModel('gemini-3-flash-preview')

        # Download and encode image
        base64_image = encode_image_to_base64(image_url)

        # Prompt for wall detection - requests FULL wall rectangle (Issue 1 fix - REVISED)
        prompt = """You are a wall detection AI from input image.

        INPUT:
        room image that contains one or more walls

        CRITICAL RULES:
        1. most of case, the main wall is placed on center of the image, and has largest area in the image
        2. the main wall's all 4 corners are visible
        3. the segmentation MUST contains full wall, and can be a RECTANGLE, parallelogram, circle, trapezoid, etc.
        4. the main wall can behind of some furniture, TV, pictures, etc. must contain/include those areas also
        5. ignore all furniture, TV, pictures, things etc in front of wall

        EXPECTED OUTPUT:
        you should find the main wall and return only valid JSON(no markdown):
        {
                    "wall_detected": true,
                    "wall_description": "Full back wall",
                    "bounding_box": {"x": 0, "y": 0, "width": 890, "height": 480},
                    "segmentation": [[0,0], [890,0], [890,480], [0,480]],
                    "confidence": 0.95
        }

        If no wall visible: {"wall_detected": false, "reason": "no clear wall"}
        """

        # Create image part for Gemini and get dimensions
        image_data = base64.b64decode(base64_image)

        # Get image dimensions for area normalization (Issue 5 fix)
        from PIL import Image
        from io import BytesIO
        img = Image.open(BytesIO(image_data))
        image_width, image_height = img.size

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

                # Calculate area (normalized 0-1) - Issue 5 fix
                width = bbox.get("width", 0)
                height = bbox.get("height", 0)
                # Use actual image dimensions instead of hardcoded 1000x1000
                area = (width * height) / (image_width * image_height) if image_width and image_height else 0.5

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
                    "model": "gemini-2.5-pro"
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


def generate_wallpaper_preview_gemini(
    image_url: str,
    wallpaper_url: str,
    segmentation: Optional[List[List[float]]] = None  # Manual or auto-detect segmentation
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini + Replicate SDXL inpainting

    Flow:
    1. Gemini detects wall and returns segmentation (OR use provided segmentation)
    2. Create mask image from segmentation
    3. Upload room image and mask to R2
    4. SDXL inpainting applies wallpaper pattern to wall region
    5. Return final generated image

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL
        segmentation: Optional pre-computed segmentation points [[x1,y1], [x2,y2], ...]
                     If provided, skips Gemini wall detection

    Returns:
        Dict with preview_url and metadata
    """
    try:
        import httpx
        from PIL import Image
        from io import BytesIO
        import uuid
        from r2_client import r2_client

        # Step 1: Use provided segmentation OR Gemini detects wall
        if segmentation:
            logger.info("Step 1: Using provided segmentation (manual/auto)")
            wall_result = None
        else:
            logger.info("Step 1: Detecting wall with Gemini 2.0 Flash...")
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

        # Get room image
        room_response = httpx.get(image_url, timeout=30)
        room_response.raise_for_status()
        room_image_bytes = room_response.content

        # Get image dimensions for mask creation
        room_image = Image.open(BytesIO(room_image_bytes))
        room_w, room_h = room_image.size

        # Step 2: Create mask image
        logger.info("Step 2: Creating mask image...")
        mask_bytes = create_mask_image(segmentation, room_w, room_h)

        # Step 3: Download wallpaper to analyze pattern for prompt
        logger.info("Step 3: Analyzing wallpaper pattern...")
        wallpaper_response = httpx.get(wallpaper_url, timeout=30)
        wallpaper_response.raise_for_status()
        wallpaper_image = Image.open(BytesIO(wallpaper_response.content))
        wallpaper_w, wallpaper_h = wallpaper_image.size
        logger.info(f"Wallpaper dimensions: {wallpaper_w}x{wallpaper_h}")

        # Step 4: Upload room image and mask to R2
        # Upload room image (get presigned URL for AI access)
        room_filename = f"rooms/{uuid.uuid4()}.png"
        _, room_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=room_image_bytes,
            filename=room_filename,
            content_type='image/png',
            expiration=7200
        )

        # Upload mask for Replicate SDXL
        # IMPORTANT: Invert mask - Replicate expects black=keep, white=inpaint
        # Our mask is white=wall, black=rest, so we need to invert it
        from PIL import Image, ImageOps
        mask_image = Image.open(BytesIO(mask_bytes))
        inverted_mask_image = ImageOps.invert(mask_image)
        inverted_mask_bytes = io.BytesIO()
        inverted_mask_image.save(inverted_mask_bytes, format='PNG')
        inverted_mask_bytes.seek(0)

        mask_filename = f"masks/{uuid.uuid4()}.png"
        _, mask_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=inverted_mask_bytes.getvalue(),
            filename=mask_filename,
            content_type='image/png',
            expiration=7200
        )

        logger.info(f"Room image and mask uploaded (presigned URLs for AI access)")

        # Step 5: SDXL inpainting - apply wallpaper pattern to wall
        logger.info("Step 4: Generating preview with SDXL inpainting...")
        prompt = f"""Apply this wallpaper pattern to the wall area: {wallpaper_url}
Photorealistic room photo with wallpaper applied to wall.
Match perspective, lighting, and shadows naturally.
Keep furniture, floor, ceiling unchanged.
Seamless blend at edges.
"""

        from replicate_client import replicate_client
        import base64

        result = replicate_client.generate_inpainting(
            image_url=room_presigned_url,  # Use original room image
            mask_url=mask_presigned_url,
            prompt=prompt,
            strength=0.75  # Higher strength to fully apply wallpaper pattern
        )

        if result and result.get("success"):
            # Decode base64 image
            image_bytes = base64.b64decode(result["image_base64"])

            # Upload to R2 and get presigned URL for frontend
            preview_filename = f"previews/{uuid.uuid4()}.png"
            _, preview_presigned_url = r2_client.upload_file_with_presigned_url(
                file_data=image_bytes,
                filename=preview_filename,
                content_type='image/png',
                expiration=7200
            )

            logger.info(f"Final preview generated (presigned URL for frontend)")

            return {
                "success": True,
                "preview_url": preview_presigned_url,
                "provider": "replicate-sdxl",
                "description": "Wallpaper applied to wall using SDXL inpainting"
            }

        logger.warning("SDXL inpainting failed")
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
    wallpaper_url: str,
    segmentation: Optional[List[List[float]]] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini + Replicate SDXL

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL
        segmentation: Optional pre-computed segmentation points (manual or auto-detect)

    Returns:
        Dict with preview_url and metadata
    """
    return generate_wallpaper_preview_gemini(image_url, wallpaper_url, segmentation)
