"""
RunPod API client for serverless endpoint calls
"""
import os
import requests
import time
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class RunPodClient:
    """Client for calling RunPod serverless endpoints"""

    def __init__(self):
        self.api_key = os.getenv("RUNPOD_API_KEY")
        self.sam_endpoint = os.getenv("RUNPOD_SAM_ENDPOINT")
        self.sdxl_endpoint = os.getenv("RUNPOD_SDXL_ENDPOINT")

        if not self.api_key:
            logger.warning("RUNPOD_API_KEY not configured - RunPod features disabled")

    def is_configured(self) -> bool:
        """Check if RunPod is properly configured"""
        return bool(self.api_key and self.sam_endpoint and self.sdxl_endpoint)

    def _call_endpoint(
        self,
        endpoint_url: str,
        input_data: Dict[str, Any],
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Call a RunPod serverless endpoint

        Args:
            endpoint_url: Full endpoint URL
            input_data: Input data for the endpoint
            timeout: Maximum wait time in seconds

        Returns:
            Response data from endpoint

        Raises:
            Exception: If request fails or times out
        """
        if not self.api_key:
            raise ValueError("RunPod API key not configured")

        # Start the job
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {"input": input_data}

        logger.info(f"Starting RunPod job at {endpoint_url}")
        response = requests.post(
            f"{endpoint_url}/run",
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()

        job_data = response.json()
        job_id = job_data.get("id")

        if not job_id:
            raise ValueError("No job ID returned from RunPod")

        logger.info(f"RunPod job started: {job_id}")

        # Poll for results
        start_time = time.time()
        while time.time() - start_time < timeout:
            status_response = requests.get(
                f"{endpoint_url}/status/{job_id}",
                headers=headers,
                timeout=10
            )
            status_response.raise_for_status()

            status_data = status_response.json()
            status = status_data.get("status")

            logger.debug(f"Job {job_id} status: {status}")

            if status == "COMPLETED":
                output = status_data.get("output")
                logger.info(f"Job {job_id} completed successfully")
                return output

            elif status == "FAILED":
                error = status_data.get("error", "Unknown error")
                logger.error(f"Job {job_id} failed: {error}")
                raise Exception(f"RunPod job failed: {error}")

            elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                # Still processing, wait and retry
                time.sleep(2)
                continue

            else:
                logger.warning(f"Unknown job status: {status}")
                time.sleep(2)

        raise TimeoutError(f"RunPod job {job_id} timed out after {timeout} seconds")

    def detect_walls(self, image_url: str) -> Dict[str, Any]:
        """
        Detect walls in image using SAM endpoint

        Args:
            image_url: URL of the image to process

        Returns:
            {
                "success": true,
                "masks": [
                    {
                        "id": "wall-1",
                        "area": 0.25,
                        "bbox": [x, y, w, h],
                        "segmentation": [[x1,y1], [x2,y2], ...]
                    }
                ]
            }
        """
        if not self.sam_endpoint:
            raise ValueError("SAM endpoint not configured")

        logger.info(f"Calling SAM endpoint for wall detection: {image_url}")

        input_data = {"image_url": image_url}
        result = self._call_endpoint(self.sam_endpoint, input_data, timeout=300)

        return result

    def generate_preview(
        self,
        image_url: str,
        wall_mask_id: str,
        wallpaper_id: str
    ) -> Dict[str, Any]:
        """
        Generate wallpaper preview using SDXL endpoint

        Args:
            image_url: URL of the original room image
            wall_mask_id: ID of the selected wall mask
            wallpaper_id: ID of the wallpaper design

        Returns:
            {
                "success": true,
                "preview_url": "https://...",
                "processing_time": 25.0
            }
        """
        if not self.sdxl_endpoint:
            raise ValueError("SDXL endpoint not configured")

        logger.info(f"Calling SDXL endpoint for preview generation")

        input_data = {
            "image_url": image_url,
            "wall_mask_id": wall_mask_id,
            "wallpaper_id": wallpaper_id
        }

        result = self._call_endpoint(self.sdxl_endpoint, input_data, timeout=600)

        return result


# Singleton instance
runpod_client = RunPodClient()
