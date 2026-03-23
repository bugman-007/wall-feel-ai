import runpod
import torch
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator
import numpy as np
from PIL import Image
import requests
from io import BytesIO
import json

# Load SAM model on cold start
print("Loading SAM model...")
sam_checkpoint = "sam_vit_h_4b8939.pth"
model_type = "vit_h"
device = "cuda" if torch.cuda.is_available() else "cpu"

sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
sam.to(device=device)
sam.eval()

mask_generator = SamAutomaticMaskGenerator(sam)
print(f"SAM model loaded on {device}")

def download_image(url):
    """Download image from URL"""
    response = requests.get(url)
    image = Image.open(BytesIO(response.content))
    return np.array(image.convert("RGB"))

def filter_wall_masks(masks, image_shape):
    """Filter masks to keep only wall-like regions"""
    height, width = image_shape[:2]
    wall_masks = []

    for mask in masks:
        area = mask['area']
        bbox = mask['bbox']  # [x, y, width, height]

        # Filter criteria for walls
        is_large = area > (width * height * 0.05)  # >5% of image
        is_vertical = bbox[3] > bbox[2]  # Height > width
        is_not_floor = bbox[1] > height * 0.1  # Not at top
        is_not_ceiling = bbox[1] + bbox[3] < height * 0.9  # Not at bottom

        if is_large and is_vertical and is_not_floor and is_not_ceiling:
            wall_masks.append(mask)

    return wall_masks

def handler(event):
    """
    RunPod handler for SAM wall detection

    Input:
        {
            "input": {
                "image_url": "https://..."
            }
        }

    Output:
        {
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
    try:
        # Get input
        input_data = event.get("input", {})
        image_url = input_data.get("image_url")

        if not image_url:
            return {"error": "image_url is required"}

        # Download and process image
        print(f"Downloading image from {image_url}")
        image = download_image(image_url)

        # Generate masks
        print("Generating masks with SAM...")
        masks = mask_generator.generate(image)

        # Filter for walls
        print(f"Generated {len(masks)} masks, filtering for walls...")
        wall_masks = filter_wall_masks(masks, image.shape)
        print(f"Found {len(wall_masks)} wall-like masks")

        # Format output
        output_masks = []
        for i, mask in enumerate(wall_masks[:5]):  # Limit to 5 walls
            # Convert segmentation to polygon points
            segmentation = mask['segmentation']
            # Find contours and convert to points
            points = []
            # Simplified: use bounding box as polygon
            x, y, w, h = mask['bbox']
            points = [
                [x, y],
                [x + w, y],
                [x + w, y + h],
                [x, y + h]
            ]

            output_masks.append({
                "id": f"wall-{i+1}",
                "area": float(mask['area']) / (image.shape[0] * image.shape[1]),
                "bbox": [float(x) for x in mask['bbox']],
                "segmentation": points
            })

        return {
            "success": True,
            "masks": output_masks,
            "total_masks_generated": len(masks),
            "wall_masks_found": len(wall_masks)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
