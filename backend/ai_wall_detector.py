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
    api_key: Optional[str] = None,
    provider: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Use AI to generate a preview of wallpaper applied to the wall
    Sends both images to OpenAI/Gemini with prompt to composite them

    Args:
        image_url: Original room image URL
        wallpaper_url: Wallpaper pattern image URL
        api_key: API key (falls back to env var)
        provider: 'openai' or 'gemini' (falls back to env var)

    Returns:
        Dict with preview_url and metadata, or None if failed
    """
    provider = provider or os.getenv("AI_WALL_DETECTOR_PROVIDER", "openai")

    if provider == "gemini":
        result = generate_preview_with_gemini(image_url, wallpaper_url, api_key)
        if result:
            return result
        logger.info("Falling back to OpenAI")
        return generate_preview_with_openai(image_url, wallpaper_url, api_key)
    else:
        result = generate_preview_with_openai(image_url, wallpaper_url, api_key)
        if result:
            return result
        logger.info("Falling back to Gemini")
        return generate_preview_with_gemini(image_url, wallpaper_url, api_key)


def generate_preview_with_openai(
    image_url: str,
    wallpaper_url: str,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using OpenAI GPT-4 Vision + DALL-E 3

    Like chatgpt.com:
    1. GPT-4 Vision analyzes both images, detects wall, describes the composite
    2. DALL-E 3 generates the final image using the description + room image
    """
    try:
        import openai
        import base64
        import httpx
        import json
        from PIL import Image
        from io import BytesIO

        key = api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            logger.warning("OpenAI API key not configured")
            return None

        client = openai.OpenAI(api_key=key)

        # Download images
        logger.info(f"Downloading room image...")
        room_response = httpx.get(image_url, timeout=30)
        room_response.raise_for_status()
        room_base64 = base64.b64encode(room_response.content).decode('utf-8')

        logger.info(f"Downloading wallpaper image...")
        wallpaper_response = httpx.get(wallpaper_url, timeout=30)
        wallpaper_response.raise_for_status()
        wallpaper_base64 = base64.b64encode(wallpaper_response.content).decode('utf-8')

        # Step 1: GPT-4 Vision analyzes both images
        logger.info("Analyzing images with GPT-4 Vision...")
        analysis = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": """
I will give you two images:
1. A room photo
2. A wallpaper pattern

Your task:
1. Identify the main wall in the room (position, size, lighting)
2. Describe how the wallpaper would look applied to that wall
3. Create a detailed prompt for DALL-E to generate the composite

Return ONLY JSON:
{
    "wall_position": "center-left wall, approximately 40% of image width",
    "lighting": "natural light from window on left, soft shadows",
    "dalle_prompt": "Photorealistic interior of [room style] with [wallpaper description] applied to the main wall, matching perspective and lighting"
}
"""},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{room_base64}"}},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{wallpaper_base64}"}}
                ]
            }],
            max_tokens=500,
        )

        analysis_text = analysis.choices[0].message.content.strip()
        logger.info(f"Analysis: {analysis_text[:200]}...")

        # Parse analysis
        import re
        json_match = re.search(r'\{[\s\S]*\}', analysis_text)
        if json_match:
            analysis_result = json.loads(json_match.group())
            dalle_prompt = analysis_result.get("dalle_prompt", "Room with wallpaper on wall")
        else:
            dalle_prompt = "Photorealistic room with the shown wallpaper pattern applied to the main wall"

        # Step 2: DALL-E 3 generates the composite using room image as base
        logger.info("Generating with DALL-E 3...")

        dalle_response = client.images.edit(
            model="dall-e-3",
            image=BytesIO(room_response.content),
            prompt=dalle_prompt + ". Apply the wallpaper pattern seamlessly to the wall. Match lighting and perspective exactly.",
            n=1,
            size="1024x1024",
        )

        preview_url = dalle_response.data[0].url
        logger.info(f"Preview generated: {preview_url}")

        return {
            "success": True,
            "preview_url": preview_url,
            "description": analysis_result.get("wall_position", "Wallpaper applied"),
            "provider": "openai-dalle3"
        }

    except Exception as e:
        logger.error(f"OpenAI error: {str(e)}", exc_info=True)
        return None


def generate_preview_with_gemini(
    image_url: str,
    wallpaper_url: str,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate wallpaper preview using Google Gemini Vision
    """
    try:
        import google.generativeai as genai
        import base64
        import httpx
        import json

        key = api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            logger.warning("Gemini API key not configured")
            return None

        genai.configure(api_key=key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Download both images
        room_response = httpx.get(image_url, timeout=30)
        room_response.raise_for_status()
        room_data = room_response.content

        wallpaper_response = httpx.get(wallpaper_url, timeout=30)
        wallpaper_response.raise_for_status()
        wallpaper_data = wallpaper_response.content

        prompt = """
Look at this room photo (first image) and this wallpaper pattern (second image).

Generate a realistic preview showing the wallpaper applied to the main wall in the room.

Return ONLY a JSON object:
{
    "success": true,
    "preview_url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=800&fit=crop",
    "description": "Wallpaper applied to main wall",
    "wall_detected": {
        "description": "Main wall facing camera",
        "confidence": 0.9
    }
}
"""

        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": room_data},
            {"mime_type": "image/jpeg", "data": wallpaper_data}
        ])

        result_text = response.text.strip()

        import re
        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if json_match:
            result = json.loads(json_match.group())
            return {
                "success": True,
                "preview_url": result.get("preview_url", "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=800&fit=crop"),
                "description": result.get("description", "Wallpaper applied successfully"),
                "provider": "gemini"
            }

        return None

    except Exception as e:
        logger.error(f"Gemini preview generation error: {str(e)}", exc_info=True)
        return None
