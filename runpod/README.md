# RunPod Serverless Handlers

This directory contains the RunPod serverless handlers for AI processing.

## Files

- `sam_handler.py` - SAM (Segment Anything Model) for wall detection
- `Dockerfile.sam` - Docker image for SAM handler
- `sdxl_handler.py` - SDXL + ControlNet for wallpaper application
- `Dockerfile.sdxl` - Docker image for SDXL handler

## Setup

### 1. Build Docker Images

**SAM Handler:**
```bash
docker build -f Dockerfile.sam -t your-username/wallfeel-sam .
docker push your-username/wallfeel-sam
```

**SDXL Handler:**
```bash
docker build -f Dockerfile.sdxl -t your-username/wallfeel-sdxl .
docker push your-username/wallfeel-sdxl
```

### 2. Deploy to RunPod

1. Go to https://www.runpod.io/console/serverless
2. Click "New Endpoint"
3. Select your Docker image
4. Configure:
   - **SAM:** GPU: A4000 or better, Min workers: 0, Max workers: 3
   - **SDXL:** GPU: RTX 4090 or A6000, Min workers: 0, Max workers: 3
5. Copy the endpoint URL

### 3. Update Backend

Add endpoint URLs to `backend/.env`:
```env
RUNPOD_SAM_ENDPOINT=https://api.runpod.ai/v2/your-sam-endpoint-id
RUNPOD_SDXL_ENDPOINT=https://api.runpod.ai/v2/your-sdxl-endpoint-id
```

## Testing

### Test SAM Handler Locally
```bash
python sam_handler.py
```

### Test SDXL Handler Locally
```bash
python sdxl_handler.py
```

### Test via RunPod API
```bash
curl -X POST https://api.runpod.ai/v2/your-endpoint-id/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "image_url": "https://example.com/room.jpg"
    }
  }'
```

## Cost Estimates

### SAM (Wall Detection)
- GPU: A4000 (~$0.50/hour)
- Processing time: ~15 seconds
- Cost per request: ~$0.02

### SDXL (Preview Generation)
- GPU: RTX 4090 (~$1.50/hour)
- Processing time: ~25 seconds
- Cost per request: ~$0.01

## Notes

- Cold start time: 10-30 seconds
- Keep endpoints warm with periodic health checks
- Monitor costs in RunPod dashboard
- Scale workers based on traffic

## Production Checklist

- [ ] Docker images built and pushed
- [ ] RunPod endpoints created
- [ ] API keys configured in backend
- [ ] Test with sample images
- [ ] Monitor performance and costs
- [ ] Set up alerts for failures
