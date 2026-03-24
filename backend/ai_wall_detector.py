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

        # Prompt for wall detection - requests FULL wall rectangle (Issue 1 fix - REVISED)
        prompt = """You are a wall detection AI for wallpaper application.

TASK: Find the MAIN wall and return its FULL rectangular boundary.

CRITICAL RULES:
1. The segmentation MUST be a RECTANGLE (4 corners only)
2. The rectangle must span WALL-TO-WALL (left corner to right corner)
3. The rectangle must span FLOOR-TO-CEILING
4. IGNORE all furniture, TV, pictures, shelves in front of the wall
5. The wall EXISTS BEHIND furniture - include those areas

EXAMPLE - If wall is 890x480 pixels:
- CORRECT: segmentation [[0,0], [890,0], [890,480], [0,480]] (full rectangle)
- WRONG: segmentation that cuts around TV or furniture

Return ONLY valid JSON (no markdown):
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


def composite_wallpaper_onto_wall(
    room_image_bytes: bytes,
    wallpaper_bytes: bytes,
    mask_bytes: bytes,
    segmentation: list
) -> bytes:
    """
    Composite wallpaper onto wall using OpenCV perspective warp.
    Returns composited image for Stability AI to refine lighting only.

    Issue 2 fix: Pass actual wallpaper image instead of just URL in text prompt.
    """
    import cv2
    import numpy as np
    from PIL import Image
    from io import BytesIO

    # Load images
    room_img = cv2.imdecode(np.frombuffer(room_image_bytes, np.uint8), cv2.IMREAD_COLOR)
    wallpaper_img = cv2.imdecode(np.frombuffer(wallpaper_bytes, np.uint8), cv2.IMREAD_COLOR)
    mask_img = cv2.imdecode(np.frombuffer(mask_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)

    if room_img is None or wallpaper_img is None:
        logger.error("Failed to decode images for compositing")
        return room_image_bytes

    h, w = room_img.shape[:2]

    # Resize wallpaper to room dimensions for tiling
    wallpaper_resized = cv2.resize(wallpaper_img, (w, h))

    # --- PERSPECTIVE WARP ---
    # Get wall quad from segmentation (4 corners)
    pts = np.array(segmentation, dtype=np.float32)

    if len(pts) == 4:
        # Source: wallpaper corners (full image)
        src_pts = np.array([
            [0, 0],
            [w, 0],
            [w, h],
            [0, h]
        ], dtype=np.float32)

        # Destination: wall quad corners from Gemini
        dst_pts = pts

        # Compute perspective transform
        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        warped_wallpaper = cv2.warpPerspective(wallpaper_resized, M, (w, h))
    else:
        # Fallback: just resize if segmentation is invalid
        logger.warning(f"Invalid segmentation points ({len(pts)}), using fallback")
        warped_wallpaper = wallpaper_resized

    # --- LIGHTING BLEND ---
    # Extract original wall luminance to preserve room lighting
    wall_region = cv2.bitwise_and(room_img, room_img, mask=mask_img)
    gray = cv2.cvtColor(wall_region, cv2.COLOR_BGR2GRAY)
    luminance = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR).astype(float) / 255.0

    # Blend wallpaper with luminance (80% wallpaper, 20% luminance for realism)
    wp_float = warped_wallpaper.astype(float) / 255.0
    blended = np.clip(wp_float * 0.80 + luminance * 0.20, 0, 1)
    blended = (blended * 255).astype(np.uint8)

    # --- FEATHER MASK EDGES ---
    mask_blurred = cv2.GaussianBlur(mask_img, (31, 31), 0)
    alpha = mask_blurred.astype(float) / 255.0
    alpha_3ch = np.stack([alpha, alpha, alpha], axis=2)

    # --- COMPOSITE onto room ---
    room_float = room_img.astype(float)
    blended_float = blended.astype(float)
    composited = (blended_float * alpha_3ch + room_float * (1 - alpha_3ch)).astype(np.uint8)

    # Return as PNG bytes
    _, buf = cv2.imencode('.png', composited)
    return buf.tobytes()


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
    Generate wallpaper preview using Gemini + OpenCV compositing + Stability AI refinement

    Updated Flow (Issue 2 & 3 fix):
    1. Gemini detects wall and returns segmentation
    2. Create mask image from segmentation
    3. OpenCV composites wallpaper onto wall with perspective warp
    4. Stability AI refines lighting only (low strength=0.20)

    Args:
        image_url: Room image URL
        wallpaper_url: Wallpaper pattern URL

    Returns:
        Dict with preview_url and metadata
    """
    try:
        import httpx
        from PIL import Image
        from io import BytesIO
        import uuid
        from r2_client import r2_client

        # Step 1: Gemini detects wall
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

        # Also upload mask for Stability AI
        mask_filename = f"masks/{uuid.uuid4()}.png"
        _, mask_presigned_url = r2_client.upload_file_with_presigned_url(
            file_data=mask_bytes,
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

        from stability_client import stability_client
        import base64

        result = stability_client.generate_inpainting(
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
