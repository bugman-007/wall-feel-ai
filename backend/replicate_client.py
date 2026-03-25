"""
Replicate API client for SDXL inpainting using lucataco/sdxl-inpainting
Uses raw HTTP requests to avoid Python 3.14 compatibility issues with replicate library
"""
import os
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class ReplicateClient:
    """Client for Replicate SDXL inpainting API"""

    def __init__(self):
        self.api_key = os.getenv("REPLICATE_API_KEY")
        self.model = "lucataco/sdxl-inpainting"
        self.api_base = "https://api.replicate.com/v1"

        if not self.api_key:
            logger.warning("REPLICATE_API_KEY not configured - Replicate features disabled")

    def is_configured(self) -> bool:
        """Check if Replicate is properly configured"""
        return bool(self.api_key)

    def _wait_for_prediction(self, prediction_url: str, timeout: int = 300) -> Dict[str, Any]:
        """Poll Replicate API until prediction is complete"""
        import httpx

        start_time = time.time()

        while time.time() - start_time < timeout:
            response = httpx.get(
                prediction_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=30
            )
            response.raise_for_status()
            prediction = response.json()

            status = prediction.get("status")
            logger.info(f"Prediction status: {status}")

            if status == "succeeded":
                return prediction
            elif status in ["failed", "canceled"]:
                raise Exception(f"Prediction {status}: {prediction.get('error', 'Unknown error')}")

            time.sleep(2)  # Poll every 2 seconds

        raise Exception("Prediction timed out")

    def generate_inpainting(
        self,
        image_url: str,
        mask_url: str,
        prompt: str,
        strength: float = 0.20  # Low strength for lighting refinement only
    ) -> Dict[str, Any]:
        """
        Generate inpainted image using SDXL via Replicate

        Args:
            image_url: URL of the original image
            mask_url: URL of the mask image (white = edit area, black = keep)
            prompt: Text prompt describing the edit
            strength: Inpainting strength (0.0-1.0)

        Returns:
            {
                "success": true,
                "image_url": "https://...",
                "provider": "replicate-sdxl"
            }
        """
        if not self.api_key:
            raise ValueError("Replicate API key not configured")

        logger.info(f"Calling Replicate SDXL inpainting endpoint")

        try:
            import httpx
            import base64

            # Create prediction
            response = httpx.post(
                f"{self.api_base}/predictions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "Prefer": "wait"  # Ask Replicate to wait for completion
                },
                json={
                    "version": "a5b13068cc81a89a4fbeefeccc774869fcb34df4dbc92c1555e0f2771d49dde7",
                    "input": {
                        "image": image_url,
                        "mask": mask_url,
                        "prompt": prompt,
                        "strength": strength,
                        "num_outputs": 1,
                        "guidance_scale": 7.5,
                        "num_inference_steps": 20
                    }
                },
                timeout=300  # 5 minute timeout
            )

            response.raise_for_status()
            prediction = response.json()

            # Check if completed synchronously (with Prefer: wait)
            if prediction.get("status") == "succeeded":
                output = prediction.get("output", [])
            else:
                # Poll for completion
                prediction_url = prediction.get("urls", {}).get("get")
                if not prediction_url:
                    raise Exception("No prediction URL in response")

                completed_prediction = self._wait_for_prediction(prediction_url)
                output = completed_prediction.get("output", [])

            # Output is a list with a single image URL
            if output and len(output) > 0:
                result_image_url = output[0]
                logger.info(f"Replicate generated image: {result_image_url}")

                # Download the image and convert to base64
                image_response = httpx.get(result_image_url, timeout=30)
                image_response.raise_for_status()
                image_base64 = base64.b64encode(image_response.content).decode('utf-8')

                return {
                    "success": True,
                    "image_base64": image_base64,
                    "image_url": result_image_url,
                    "provider": "replicate-sdxl",
                    "content_type": "image/png"
                }
            else:
                logger.error("Replicate returned empty output")
                raise Exception("Replicate returned empty output")

        except httpx.HTTPStatusError as e:
            logger.error(f"Replicate HTTP error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Replicate HTTP error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Replicate API error: {str(e)}")
            raise Exception(f"Replicate API error: {str(e)}")


# Singleton instance
replicate_client = ReplicateClient()
