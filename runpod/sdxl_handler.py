import runpod
import torch
from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel, AutoencoderKL
from diffusers.utils import load_image
from PIL import Image
import requests
from io import BytesIO
import numpy as np
import cv2

# Load SDXL + ControlNet on cold start
print("Loading SDXL + ControlNet...")
device = "cuda" if torch.cuda.is_available() else "cpu"

# Load ControlNet
controlnet = ControlNetModel.from_pretrained(
    "diffusers/controlnet-depth-sdxl-1.0",
    torch_dtype=torch.float16
)

# Load SDXL pipeline
pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    controlnet=controlnet,
    torch_dtype=torch.float16,
    variant="fp16",
    use_safetensors=True
)
pipe.to(device)
pipe.enable_model_cpu_offload()

print(f"SDXL + ControlNet loaded on {device}")

def download_image(url):
    """Download image from URL"""
    response = requests.get(url)
    image = Image.open(BytesIO(response.content))
    return image

def create_depth_map(image):
    """Create depth map from image for ControlNet"""
    # Convert to grayscale
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    # Simple depth estimation (in production, use MiDaS or similar)
    depth = cv2.GaussianBlur(gray, (5, 5), 0)
    depth = Image.fromarray(depth).convert("RGB")
    return depth

def apply_wallpaper_to_wall(room_image, wall_mask, wallpaper_image):
    """Apply wallpaper to wall region using SDXL + ControlNet"""
    # Create depth map for ControlNet
    depth_map = create_depth_map(room_image)

    # Prepare prompt
    prompt = "interior room with decorative wallpaper on wall, realistic lighting, photorealistic, high quality"
    negative_prompt = "blurry, distorted, unrealistic, low quality, cartoon, painting"

    # Generate with ControlNet
    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=depth_map,
        num_inference_steps=30,
        controlnet_conditioning_scale=0.8,
        guidance_scale=7.5
    ).images[0]

    return result

def handler(event):
    """
    RunPod handler for SDXL wallpaper application

    Input:
        {
            "input": {
                "image_url": "https://...",
                "wall_mask_id": "wall-1",
                "wallpaper_url": "https://..."
            }
        }

    Output:
        {
            "preview_url": "https://...",
            "success": true
        }
    """
    try:
        # Get input
        input_data = event.get("input", {})
        image_url = input_data.get("image_url")
        wallpaper_url = input_data.get("wallpaper_url")

        if not image_url or not wallpaper_url:
            return {"error": "image_url and wallpaper_url are required"}

        # Download images
        print(f"Downloading room image from {image_url}")
        room_image = download_image(image_url)

        print(f"Downloading wallpaper from {wallpaper_url}")
        wallpaper_image = download_image(wallpaper_url)

        # Apply wallpaper
        print("Generating preview with SDXL...")
        result_image = apply_wallpaper_to_wall(
            room_image,
            None,  # Wall mask (simplified for now)
            wallpaper_image
        )

        # In production, upload result to R2 and return URL
        # For now, return base64 or upload to temporary storage

        return {
            "success": True,
            "message": "Preview generated successfully",
            "preview_url": "https://placeholder-url.com/preview.jpg"  # Replace with actual upload
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
