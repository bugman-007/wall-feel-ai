"""
AI Wall Detector using OpenAI Vision API or Google Gemini API
For automatic wall detection and wallpaper mapping from room photos
"""

import os
import base64
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def encode_image_to_base64(image_url: str) -> str:
    """
    Download image from URL and encode to base64
    """
    import httpx

    response = httpx.get(image_url, timeout=30)
    response.raise_for_status()
    return base64.b64encode(response.content).decode('utf-8')


def detect_wall_with_openai(image_url: str, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Use OpenAI Vision API to detect the main wall in a room photo

    Args:
        image_url: URL of the room image
        api_key: OpenAI API key (falls back to env var)

    Returns:
        Wall mask data with segmentation polygon, or None if failed
    """
    try:
        import openai

        key = api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            logger.warning("OpenAI API key not configured")
            return None

        client = openai.OpenAI(api_key=key)

        # Download and encode image
        base64_image = encode_image_to_base64(image_url)

        # Prompt for wall detection
        prompt = """
Analyze this room photo and identify the main wall that would be best for wallpaper application.

Return ONLY a JSON object with this exact structure:
{
    "wall_detected": true,
    "wall_description": "Brief description of the wall",
    "bounding_box": {
        "x": 100,
        "y": 50,
        "width": 400,
        "height": 500
    },
    "segmentation": [
        [100, 50],
        [500, 50],
        [500, 550],
        [100, 550]
    ],
    "confidence": 0.95
}

The segmentation should be a polygon (array of [x,y] points) outlining the wall boundary.
If no clear wall is detected, return: {"wall_detected": false, "reason": "explanation"}
"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
        )

        # Parse response
        result_text = response.choices[0].message.content.strip()

        # Extract JSON from response
        import json
        import re

        # Try to find JSON in the response
        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if json_match:
            result = json.loads(json_match.group())

            if result.get("wall_detected"):
                # Convert to our wall mask format
                bbox = result.get("bounding_box", {})
                segmentation = result.get("segmentation", [])

                return {
                    "success": True,
                    "masks": [{
                        "id": "wall-1",
                        "area": (bbox.get("width", 0) * bbox.get("height", 0)) / (1000 * 1000),  # Normalized
                        "bbox": [
                            float(bbox.get("x", 0)),
                            float(bbox.get("y", 0)),
                            float(bbox.get("width", 0)),
                            float(bbox.get("height", 0))
                        ],
                        "segmentation": segmentation,
                        "confidence": result.get("confidence", 0.8),
                        "description": result.get("wall_description", "")
                    }],
                    "provider": "openai",
                    "model": "gpt-4o"
                }
            else:
                logger.warning(f"OpenAI did not detect a wall: {result.get('reason', 'Unknown')}")
                return None
        else:
            logger.error(f"Could not parse JSON from OpenAI response: {result_text}")
            return None

    except Exception as e:
        logger.error(f"OpenAI wall detection error: {str(e)}", exc_info=True)
        return None


def detect_wall_with_gemini(image_url: str, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Use Google Gemini Vision API to detect the main wall in a room photo

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
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Download and encode image
        base64_image = encode_image_to_base64(image_url)

        # Prompt for wall detection
        prompt = """
Analyze this room photo and identify the main wall that would be best for wallpaper application.

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
    "wall_detected": true,
    "wall_description": "Brief description of the wall",
    "bounding_box": {
        "x": 100,
        "y": 50,
        "width": 400,
        "height": 500
    },
    "segmentation": [
        [100, 50],
        [500, 50],
        [500, 550],
        [100, 550]
    ],
    "confidence": 0.95
}

The segmentation should be a polygon (array of [x,y] points) outlining the wall boundary.
If no clear wall is detected, return: {"wall_detected": false, "reason": "explanation"}
"""

        # Create image part for Gemini
        import base64
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

        # Extract JSON from response
        import json
        import re

        # Try to find JSON in the response
        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if json_match:
            result = json.loads(json_match.group())

            if result.get("wall_detected"):
                # Convert to our wall mask format
                bbox = result.get("bounding_box", {})
                segmentation = result.get("segmentation", [])

                return {
                    "success": True,
                    "masks": [{
                        "id": "wall-1",
                        "area": (bbox.get("width", 0) * bbox.get("height", 0)) / (1000 * 1000),
                        "bbox": [
                            float(bbox.get("x", 0)),
                            float(bbox.get("y", 0)),
                            float(bbox.get("width", 0)),
                            float(bbox.get("height", 0))
                        ],
                        "segmentation": segmentation,
                        "confidence": result.get("confidence", 0.8),
                        "description": result.get("wall_description", "")
                    }],
                    "provider": "gemini",
                    "model": "gemini-1.5-flash"
                }
            else:
                logger.warning(f"Gemini did not detect a wall: {result.get('reason', 'Unknown')}")
                return None
        else:
            logger.error(f"Could not parse JSON from Gemini response: {result_text}")
            return None

    except Exception as e:
        logger.error(f"Gemini wall detection error: {str(e)}", exc_info=True)
        return None


def detect_wall_ai(image_url: str, preferred_provider: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Detect wall using AI (OpenAI or Gemini)

    Args:
        image_url: URL of the room image
        preferred_provider: 'openai' or 'gemini' (falls back to env var, then tries both)

    Returns:
        Wall mask data, or None if all providers fail
    """
    provider = preferred_provider or os.getenv("AI_WALL_DETECTOR_PROVIDER", "openai")

    # Try preferred provider first
    if provider == "gemini":
        result = detect_wall_with_gemini(image_url)
        if result:
            return result
        # Fall back to OpenAI
        logger.info("Falling back to OpenAI")
        return detect_wall_with_openai(image_url)
    else:
        result = detect_wall_with_openai(image_url)
        if result:
            return result
        # Fall back to Gemini
        logger.info("Falling back to Gemini")
        return detect_wall_with_gemini(image_url)


def generate_wallpaper_preview_ai(
    image_url: str,
    wallpaper_url: str,
    wall_mask: Dict[str, Any],
    api_key: Optional[str] = None
) -> Optional[str]:
    """
    Use AI to generate a preview of wallpaper applied to the wall

    Args:
        image_url: Original room image URL
        wallpaper_url: Wallpaper pattern image URL
        wall_mask: Wall segmentation data
        api_key: API key (falls back to env var)

    Returns:
        URL of generated preview image, or None if failed
    """
    # For now, this is a placeholder
    # In production, you would use DALL-E 3, Stable Diffusion, or similar
    # to generate the actual preview

    logger.info("AI preview generation is a placeholder - using mock implementation")

    # Return a placeholder URL
    return "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=800&fit=crop"
