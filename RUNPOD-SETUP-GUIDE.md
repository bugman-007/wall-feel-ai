# Complete RunPod Setup Guide for Wallfeel AI

This guide walks you through setting up RunPod serverless endpoints for AI processing (wall detection and wallpaper preview generation).

**Time Required:** 1-2 hours
**Cost:** ~$0.03 per user request (SAM + SDXL combined)
**Prerequisites:** Docker installed, RunPod account with credits

---

## Table of Contents

1. [RunPod Account Setup](#1-runpod-account-setup)
2. [Understanding Serverless Endpoints](#2-understanding-serverless-endpoints)
3. [Preparing Docker Images](#3-preparing-docker-images)
4. [Creating SAM Endpoint (Wall Detection)](#4-creating-sam-endpoint-wall-detection)
5. [Creating SDXL Endpoint (Preview Generation)](#5-creating-sdxl-endpoint-preview-generation)
6. [Getting API Keys and Endpoint URLs](#6-getting-api-keys-and-endpoint-urls)
7. [Configuring Backend](#7-configuring-backend)
8. [Testing Endpoints](#8-testing-endpoints)
9. [Monitoring and Costs](#9-monitoring-and-costs)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. RunPod Account Setup

### Step 1.1: Create Account

1. Go to https://www.runpod.io
2. Click **"Sign Up"** (top right)
3. Sign up with:
   - Email + Password, OR
   - Google account, OR
   - GitHub account
4. Verify your email address

### Step 1.2: Add Credits

1. After login, click your profile icon (top right)
2. Click **"Billing"**
3. Click **"Add Credits"**
4. Choose amount (recommended: $20-50 for testing)
5. Complete payment
6. Verify credits appear in your balance

### Step 1.3: Navigate to Serverless

1. From the main dashboard, click **"Serverless"** in the left sidebar
2. You'll see the Serverless dashboard (empty if first time)
3. This is where you'll create your endpoints

---

## 2. Understanding Serverless Endpoints

### What is a Serverless Endpoint?

- **Serverless** = Pay only when your code runs (no idle costs)
- **Endpoint** = A URL you call to run your AI model
- **Cold Start** = First request takes 10-30 seconds (loading model)
- **Warm** = Subsequent requests are fast (2-15 seconds)

### Our Two Endpoints

1. **SAM Endpoint** (Wall Detection)
   - Model: Segment Anything Model (SAM)
   - GPU: NVIDIA A4000 or better
   - Processing time: ~15 seconds
   - Cost: ~$0.02 per request

2. **SDXL Endpoint** (Preview Generation)
   - Model: Stable Diffusion XL + ControlNet
   - GPU: NVIDIA RTX 4090 or A6000
   - Processing time: ~25 seconds
   - Cost: ~$0.01 per request

---

## 3. Preparing Docker Images

You have two options:

### Option A: Use Pre-built Images (Recommended for Beginners)

I'll provide pre-built Docker images you can use directly:
- `your-dockerhub-username/wallfeel-sam:latest`
- `your-dockerhub-username/wallfeel-sdxl:latest`

**Skip to Section 4 if using pre-built images.**

### Option B: Build Your Own Images

#### Step 3.1: Install Docker

**Windows:**
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install and restart computer
3. Open Docker Desktop and wait for it to start

**Mac:**
1. Download Docker Desktop for Mac
2. Install and open Docker Desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### Step 3.2: Create Docker Hub Account

1. Go to https://hub.docker.com
2. Sign up for free account
3. Verify email
4. Remember your username (you'll need it)

#### Step 3.3: Login to Docker Hub

Open terminal/command prompt:
```bash
docker login
```
Enter your Docker Hub username and password.

#### Step 3.4: Build SAM Image

Navigate to your project:
```bash
cd d:\Drive_E\git_repository\wallfeel-ai\runpod
```

Build the SAM image (replace `YOUR_USERNAME` with your Docker Hub username):
```bash
docker build -f Dockerfile.sam -t YOUR_USERNAME/wallfeel-sam:latest .
```

This will take 10-20 minutes. You'll see:
- Downloading base image
- Installing dependencies
- Downloading SAM model weights (2.4GB)

#### Step 3.5: Push SAM Image

```bash
docker push YOUR_USERNAME/wallfeel-sam:latest
```

This uploads to Docker Hub (takes 5-10 minutes).

#### Step 3.6: Build SDXL Image

```bash
docker build -f Dockerfile.sdxl -t YOUR_USERNAME/wallfeel-sdxl:latest .
```

This takes 15-25 minutes.

#### Step 3.7: Push SDXL Image

```bash
docker push YOUR_USERNAME/wallfeel-sdxl:latest
```

This takes 10-15 minutes.

---

## 4. Creating SAM Endpoint (Wall Detection)

### Step 4.1: Start Creating Endpoint

1. Go to RunPod Serverless dashboard: https://www.runpod.io/console/serverless
2. Click **"+ New Endpoint"** button (top right)
3. You'll see the endpoint creation form

### Step 4.2: Basic Configuration

**Endpoint Name:**
```
wallfeel-sam-wall-detection
```

**Docker Image:**
```
YOUR_USERNAME/wallfeel-sam:latest
```
(Replace with your Docker Hub username, or use pre-built image)

### Step 4.3: GPU Configuration

**GPU Type:** Select one of these (in order of preference):
1. **NVIDIA A4000** (16GB VRAM) - Recommended, ~$0.50/hour
2. **NVIDIA A5000** (24GB VRAM) - Good, ~$0.70/hour
3. **NVIDIA RTX 3090** (24GB VRAM) - Budget option, ~$0.40/hour

**Container Disk:** `20 GB` (default is fine)

**Volume Disk:** `0 GB` (not needed)

### Step 4.4: Scaling Configuration

**Min Workers:** `0`
- This means no idle costs
- Endpoint will scale to 0 when not in use

**Max Workers:** `3`
- Maximum concurrent requests
- Increase if you expect high traffic

**Idle Timeout:** `5 seconds`
- How long to wait before scaling down
- Keep default

**Execution Timeout:** `300 seconds` (5 minutes)
- Maximum time for one request
- SAM typically takes 15 seconds

### Step 4.5: Advanced Settings (Optional)

**Environment Variables:** Leave empty (none needed)

**FlashBoot:** Enable if available (faster cold starts)

### Step 4.6: Create Endpoint

1. Review all settings
2. Click **"Create Endpoint"** button (bottom right)
3. Wait 30-60 seconds for endpoint to initialize
4. You'll see the endpoint in your dashboard with status "Ready"

### Step 4.7: Get Endpoint ID

1. Click on your endpoint name
2. You'll see the endpoint details page
3. Copy the **Endpoint ID** (looks like: `abc123def456`)
4. Your endpoint URL will be:
   ```
   https://api.runpod.ai/v2/abc123def456
   ```

**Save this URL - you'll need it later!**

---

## 5. Creating SDXL Endpoint (Preview Generation)

### Step 5.1: Start Creating Endpoint

1. Go back to Serverless dashboard
2. Click **"+ New Endpoint"** again

### Step 5.2: Basic Configuration

**Endpoint Name:**
```
wallfeel-sdxl-preview
```

**Docker Image:**
```
YOUR_USERNAME/wallfeel-sdxl:latest
```

### Step 5.3: GPU Configuration

**GPU Type:** Select one of these (in order of preference):
1. **NVIDIA RTX 4090** (24GB VRAM) - Recommended, ~$1.50/hour
2. **NVIDIA A6000** (48GB VRAM) - Premium, ~$2.00/hour
3. **NVIDIA A5000** (24GB VRAM) - Budget, ~$0.70/hour

**Container Disk:** `30 GB` (SDXL models are larger)

**Volume Disk:** `0 GB`

### Step 5.4: Scaling Configuration

Same as SAM:
- **Min Workers:** `0`
- **Max Workers:** `3`
- **Idle Timeout:** `5 seconds`
- **Execution Timeout:** `600 seconds` (10 minutes)

### Step 5.5: Create Endpoint

1. Click **"Create Endpoint"**
2. Wait for initialization
3. Copy the **Endpoint ID**
4. Your SDXL endpoint URL:
   ```
   https://api.runpod.ai/v2/xyz789abc123
   ```

**Save this URL too!**

---

## 6. Getting API Keys and Endpoint URLs

### Step 6.1: Get RunPod API Key

1. Click your profile icon (top right)
2. Click **"Settings"**
3. Scroll to **"API Keys"** section
4. Click **"+ Create API Key"**
5. Name it: `wallfeel-backend`
6. Click **"Create"**
7. **IMPORTANT:** Copy the API key immediately (you can't see it again!)
8. It looks like: `ABCDEF123456789GHIJKLMNOP`

### Step 6.2: Verify Endpoint URLs

You should now have:

1. **SAM Endpoint URL:**
   ```
   https://api.runpod.ai/v2/YOUR_SAM_ENDPOINT_ID
   ```

2. **SDXL Endpoint URL:**
   ```
   https://api.runpod.ai/v2/YOUR_SDXL_ENDPOINT_ID
   ```

3. **API Key:**
   ```
   YOUR_RUNPOD_API_KEY
   ```

---

## 7. Configuring Backend

### Step 7.1: Open Backend .env File

Navigate to your project:
```bash
cd d:\Drive_E\git_repository\wallfeel-ai\backend
```

Open `.env` file in a text editor.

### Step 7.2: Add RunPod Configuration

Add these lines to your `.env` file:

```env
# RunPod Configuration
RUNPOD_API_KEY=YOUR_RUNPOD_API_KEY
RUNPOD_SAM_ENDPOINT=https://api.runpod.ai/v2/YOUR_SAM_ENDPOINT_ID
RUNPOD_SDXL_ENDPOINT=https://api.runpod.ai/v2/YOUR_SDXL_ENDPOINT_ID
```

Replace:
- `YOUR_RUNPOD_API_KEY` with your actual API key
- `YOUR_SAM_ENDPOINT_ID` with your SAM endpoint ID
- `YOUR_SDXL_ENDPOINT_ID` with your SDXL endpoint ID

### Step 7.3: Save and Verify

1. Save the `.env` file
2. Verify the values are correct (no extra spaces)
3. Keep this file secure (never commit to git)

---

## 8. Testing Endpoints

### Step 8.1: Test SAM Endpoint via RunPod Dashboard

1. Go to your SAM endpoint in RunPod dashboard
2. Click **"Test"** tab
3. Enter test input:
   ```json
   {
     "input": {
       "image_url": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800"
     }
   }
   ```
4. Click **"Run"**
5. Wait 15-30 seconds (cold start)
6. You should see output with wall masks:
   ```json
   {
     "success": true,
     "masks": [
       {
         "id": "wall-1",
         "area": 0.28,
         "bbox": [50, 100, 350, 450],
         "segmentation": [[50,100], [400,100], ...]
       }
     ]
   }
   ```

### Step 8.2: Test SDXL Endpoint

1. Go to your SDXL endpoint
2. Click **"Test"** tab
3. Enter test input:
   ```json
   {
     "input": {
       "image_url": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800",
       "wall_mask_id": "wall-1",
       "wallpaper_id": "floral-001"
     }
   }
   ```
4. Click **"Run"**
5. Wait 25-40 seconds (cold start)
6. You should see output with preview URL

### Step 8.3: Test via Backend API

1. Start your backend server:
   ```bash
   cd backend
   python main.py
   ```

2. Test wall detection:
   ```bash
   curl -X POST http://localhost:8000/api/segment \
     -H "Content-Type: application/json" \
     -d '{"image_url": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800"}'
   ```

3. Test preview generation:
   ```bash
   curl -X POST http://localhost:8000/api/apply-wallpaper \
     -H "Content-Type: application/json" \
     -d '{
       "image_url": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800",
       "wall_mask_id": "wall-1",
       "wallpaper_id": "floral-001"
     }'
   ```

### Step 8.4: Test Full Application Flow

1. Start backend: `cd backend && python main.py`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:3000
4. Upload a room image
5. Click "Detect Walls with AI" (should take 15-30 seconds first time)
6. Select a wall
7. Choose wallpaper
8. Click "Generate Preview" (should take 25-40 seconds first time)
9. Verify preview appears

---

## 9. Monitoring and Costs

### Step 9.1: Monitor Usage

1. Go to RunPod dashboard
2. Click **"Analytics"** in left sidebar
3. View:
   - Total requests
   - Average execution time
   - Total cost
   - GPU utilization

### Step 9.2: Monitor Specific Endpoints

1. Click on an endpoint
2. Click **"Logs"** tab to see request logs
3. Click **"Metrics"** tab to see performance graphs

### Step 9.3: Cost Breakdown

**Per Request Costs:**
- SAM (Wall Detection): ~$0.02 per request
- SDXL (Preview): ~$0.01 per request
- **Total per user:** ~$0.03

**Monthly Estimates:**
- 100 users/month: ~$3
- 500 users/month: ~$15
- 1,000 users/month: ~$30
- 5,000 users/month: ~$150

**Cost Optimization Tips:**
1. Use cheaper GPUs for testing
2. Set aggressive idle timeouts
3. Monitor and adjust max workers
4. Consider caching results for popular images

---

## 10. Troubleshooting

### Issue: Endpoint shows "Error" status

**Solution:**
1. Check Docker image exists on Docker Hub
2. Verify image name is correct (case-sensitive)
3. Check RunPod logs for error messages
4. Try rebuilding and pushing Docker image

### Issue: Cold start takes too long (>60 seconds)

**Solution:**
1. Enable FlashBoot if available
2. Use faster GPU type
3. Optimize Docker image size
4. Consider keeping 1 worker warm (costs more)

### Issue: "Out of Memory" errors

**Solution:**
1. Use GPU with more VRAM
2. Reduce batch size in handler code
3. Optimize model loading

### Issue: Requests timing out

**Solution:**
1. Increase execution timeout
2. Check image URL is accessible
3. Verify handler code is correct
4. Check RunPod logs for errors

### Issue: High costs

**Solution:**
1. Verify min workers is set to 0
2. Check idle timeout is low (5 seconds)
3. Monitor for stuck workers
4. Consider cheaper GPU types

### Issue: Backend can't connect to RunPod

**Solution:**
1. Verify API key is correct in `.env`
2. Check endpoint URLs are correct
3. Ensure no extra spaces in `.env` values
4. Restart backend server after changing `.env`
5. Check firewall isn't blocking RunPod API

---

## Quick Reference

### RunPod Dashboard URLs

- **Main Dashboard:** https://www.runpod.io/console
- **Serverless:** https://www.runpod.io/console/serverless
- **Billing:** https://www.runpod.io/console/user/billing
- **API Keys:** https://www.runpod.io/console/user/settings

### Recommended GPU Types

**SAM (Wall Detection):**
- Best: NVIDIA A4000 (16GB)
- Alternative: NVIDIA RTX 3090 (24GB)

**SDXL (Preview):**
- Best: NVIDIA RTX 4090 (24GB)
- Alternative: NVIDIA A5000 (24GB)

### Environment Variables

```env
RUNPOD_API_KEY=your_api_key_here
RUNPOD_SAM_ENDPOINT=https://api.runpod.ai/v2/your_sam_endpoint_id
RUNPOD_SDXL_ENDPOINT=https://api.runpod.ai/v2/your_sdxl_endpoint_id
```

---

## Next Steps

After completing this setup:

1. ✅ Test both endpoints thoroughly
2. ✅ Monitor costs for first week
3. ✅ Adjust scaling settings based on usage
4. ✅ Set up alerts for failures
5. ✅ Document your endpoint IDs securely
6. ✅ Consider setting up staging endpoints for testing

---

## Support

**RunPod Support:**
- Discord: https://discord.gg/runpod
- Docs: https://docs.runpod.io
- Email: support@runpod.io

**Wallfeel AI Issues:**
- Check backend logs: `cd backend && python main.py`
- Check frontend console: Browser DevTools → Console
- Review this guide's troubleshooting section

---

**Congratulations!** Your RunPod serverless endpoints are now set up and ready to process real AI requests. 🎉
