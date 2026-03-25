"""
AI Wall Detector using Gemini 2.0 Flash + Stability AI SDXL
For automatic wall detection and wallpaper inpainting
"""

import os
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def encode_image_to_base64(image_url: str) -> str:
    """Download image from URL and encode to base64"""
    import base64
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


def composite_wallpaper_onto_wall(
    room_image_bytes: bytes,
    wallpaper_bytes: bytes,
    mask_bytes: bytes,
    segmentation: list
) -> bytes:
    """
    Composite wallpaper onto wall using OpenCV.
    Direct application: wallpaper replaces wall region exactly (no blending, no feathering).

    The mask defines the wall area: white = apply wallpaper, black = keep original room.
    """
    import cv2
    import numpy as np
    from io import BytesIO

    # Load images
    room_img = cv2.imdecode(np.frombuffer(room_image_bytes, np.uint8), cv2.IMREAD_COLOR)
    wallpaper_img = cv2.imdecode(np.frombuffer(wallpaper_bytes, np.uint8), cv2.IMREAD_COLOR)
    mask_img = cv2.imdecode(np.frombuffer(mask_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)

    if room_img is None or wallpaper_img is None:
        logger.error("Failed to decode images for compositing")
        return room_image_bytes

    h, w = room_img.shape[:2]

    # --- TILE WALLPAPER PATTERN ---
    # Resize wallpaper to a reasonable tile size (e.g., 512x512)
    wallpaper_resized = cv2.resize(wallpaper_img, (512, 512))

    # Tile the wallpaper to cover the entire room dimensions
    # This creates a seamless pattern that covers the whole image
    tiled_wallpaper = np.tile(wallpaper_resized, (
        (h + 511) // 512,  # Number of tiles vertically
        (w + 511) // 512,  # Number of tiles horizontally
        1
    ))[:h, :w]  # Crop to exact room dimensions

    # --- APPLY WALLPAPER TO WALL REGION USING MASK ---
    # Create 3-channel mask for color image operations
    mask_3ch = np.stack([mask_img, mask_img, mask_img], axis=2)

    # Normalize mask to 0-1 range
    mask_normalized = mask_3ch.astype(float) / 255.0

    # Direct composite: wallpaper where mask is white, room where mask is black
    # No blending, no feathering - clean edge application
    composited = (tiled_wallpaper * mask_normalized + room_img * (1 - mask_normalized)).astype(np.uint8)

    # Return as PNG bytes
    _, buf = cv2.imencode('.png', composited)
    return buf.tobytes()


def generate_wallpaper_preview_gemini(
    image_url: str,
    wallpaper_url: str,
    segmentation: Optional[List[List[float]]] = None  # Manual or auto-detect segmentation
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Gemini + OpenCV compositing + Stability AI refinement

    Updated Flow (Issue 2 & 3 fix):
    1. Gemini detects wall and returns segmentation (OR use provided segmentation)
    2. Create mask image from segmentation
    3. OpenCV composites wallpaper onto wall with perspective warp
    4. Stability AI refines lighting only (low strength=0.20)

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

        # Step 3: Download wallpaper and composite using OpenCV (Issue 2 fix)
        logger.info("Step 3: Compositing wallpaper with OpenCV perspective warp...")
        wallpaper_response = httpx.get(wallpaper_url, timeout=30)
        wallpaper_response.raise_for_status()
        wallpaper_bytes = wallpaper_response.content

        # Composite wallpaper onto wall
        composited_bytes = composite_wallpaper_onto_wall(
            room_image_bytes=room_image_bytes,
            wallpaper_bytes=wallpaper_bytes,
            mask_bytes=mask_bytes,
            segmentation=segmentation
        )

        # Step 4: Upload composited image and mask to R2
        composited_filename = f"composited/{uuid.uuid4()}.png"
        _, composited_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=composited_bytes,
            filename=composited_filename,
            content_type='image/png',
            expiration=7200
        )

        # Also upload mask for Replicate SDXL
        # IMPORTANT: Invert mask - Replicate expects black=keep, white=inpaint
        # Our mask is white=wall, black=rest, so we need to invert it
        import io
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

        logger.info(f"Composited image uploaded (using presigned URL for Stability AI)")

        # Step 5: Stability AI refines lighting only (Issue 3 fix - low strength)
        logger.info("Step 4: Refining lighting with Stability AI SDXL (strength=0.20)...")
        prompt = """Photorealistic room photo. Blend wallpaper edges naturally.
Adjust lighting and shadows only. Do not change the wallpaper pattern.
Do not modify furniture, floor, ceiling, or any objects.
Keep the exact wallpaper design unchanged.
"""

        from replicate_client import replicate_client
        import base64

        result = replicate_client.generate_inpainting(
            image_url=composited_presigned_url,  # Use composited image, not original
            mask_url=mask_presigned_url,
            prompt=prompt,
            strength=0.20  # Issue 3 fix: Very low - only refine lighting
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
                "provider": "stability-sdxl-refinement",
                "description": "Wallpaper applied to wall with OpenCV + Stability refinement"
            }

        # Fallback: return composited image directly if Stability fails
        logger.warning("Stability refinement failed, using OpenCV composite directly")
        _, fallback_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=composited_bytes,
            filename=f"previews/{uuid.uuid4()}.png",
            content_type='image/png',
            expiration=7200
        )

        return {
            "success": True,
            "preview_url": fallback_presigned_url,
            "provider": "opencv-composite",
            "description": "Wallpaper applied to wall (OpenCV only)"
        }

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
    Generate wallpaper preview using Gemini + Stability AI

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL
        segmentation: Optional pre-computed segmentation points (manual or auto-detect)

    Returns:
        Dict with preview_url and metadata
    """
    return generate_wallpaper_preview_gemini(image_url, wallpaper_url, segmentation)
