"""
Stability AI API client for SDXL inpainting
"""
import os
import requests
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class StabilityClient:
    """Client for Stability AI SDXL inpainting API"""

    def __init__(self):
        self.api_key = os.getenv("STABILITY_API_KEY")
        self.base_url = "https://api.stability.ai/v2beta"

        if not self.api_key:
            logger.warning("STABILITY_API_KEY not configured - Stability AI features disabled")

    def is_configured(self) -> bool:
        """Check if Stability AI is properly configured"""
        return bool(self.api_key)

    def _resize_for_stability(self, image_data: bytes, max_size: int = 1024) -> bytes:
        """
        Resize image to max dimension while keeping aspect ratio.
        Issue 6 fix: Stability AI works best at ~1024px, dimensions must be divisible by 64.

        Args:
            image_data: Image bytes
            max_size: Maximum dimension (default 1024)

        Returns:
            Resized image bytes (PNG format)
        """
        from PIL import Image
        from io import BytesIO

        img = Image.open(BytesIO(image_data))
        w, h = img.size

        # Resize if larger than max_size
        if max(w, h) > max_size:
            ratio = max_size / max(w, h)
            new_w = int(w * ratio)
            new_h = int(h * ratio)
            # Make dimensions divisible by 64 (SDXL requirement)
            new_w = (new_w // 64) * 64
            new_h = (new_h // 64) * 64
            # Ensure at least 64x64
            new_w = max(64, new_w)
            new_h = max(64, new_h)
            img = img.resize((new_w, new_h), Image.LANCZOS)
            logger.info(f"Resized image from {w}x{h} to {new_w}x{new_h}")

        buf = BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()

    def generate_inpainting(
        self,
        image_url: str,
        mask_url: str,
        prompt: str,
        strength: float = 0.20  # Issue 3 fix: Default low strength for lighting refinement only
    ) -> Dict[str, Any]:
        """
        Generate inpainted image using SDXL

        Args:
            image_url: URL of the original image
            mask_url: URL of the mask image (white = edit, black = keep)
            prompt: Text prompt describing the edit
            strength: Inpainting strength (0.0-1.0)

        Returns:
            {
                "success": true,
                "image_url": "https://...",
                "provider": "stability-sdxl"
            }
        """
        if not self.api_key:
            raise ValueError("Stability AI API key not configured")

        logger.info(f"Calling Stability AI SDXL inpainting endpoint")

        # Download images
        import httpx
        try:
            image_response = httpx.get(image_url, timeout=30)
            image_response.raise_for_status()
            image_data = image_response.content

            mask_response = httpx.get(mask_url, timeout=30)
            mask_response.raise_for_status()
            mask_data = mask_response.content
        except Exception as e:
            logger.error(f"Failed to download images: {str(e)}")
            raise ValueError(f"Failed to download images: {str(e)}")

        # Issue 6 fix: Resize images for Stability AI (optimal: 1024px, divisible by 64)
        image_data = self._resize_for_stability(image_data, max_size=1024)
        mask_data = self._resize_for_stability(mask_data, max_size=1024)

        # Call Stability AI API
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "image/*"
        }

        # Stability AI v2beta API expects specific field names
        files = {
            "image": ("image.png", image_data, "image/png"),
            "mask": ("mask.png", mask_data, "image/png"),
        }

        data = {
            "prompt": prompt,
            "mode": "mask",  # Required when using a mask
            "output_format": "png"  # or jpeg/webp
        }

        try:
            response = requests.post(
                f"{self.base_url}/stable-image/edit/inpaint",
                headers=headers,
                files=files,
                data=data,
                timeout=60
            )
            response.raise_for_status()

            # Return image as base64
            import base64
            image_base64 = base64.b64encode(response.content).decode('utf-8')

            return {
                "success": True,
                "image_base64": image_base64,
                "provider": "stability-sdxl",
                "content_type": "image/png"
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Stability AI API error: {str(e)}")
            raise Exception(f"Stability AI API error: {str(e)}")


# Singleton instance
stability_client = StabilityClient()
