# Get Started in 5 Minutes

## Prerequisites

- Node.js 18+ installed
- Python 3.10+ installed
- Git installed

## Installation

### 1. Run Setup Script

**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Install all Node.js dependencies
- Create Python virtual environment
- Install all Python dependencies
- Create environment file templates

### 2. Configure R2 Storage

Edit `backend/.env` and add your Cloudflare R2 credentials:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=wallfeel-uploads
```

**Get R2 credentials:**
1. Go to https://dash.cloudflare.com
2. Navigate to R2 → Create bucket
3. Create bucket named `wallfeel-uploads`
4. Go to Manage R2 API Tokens
5. Create API token with "Edit" permissions
6. Copy Account ID, Access Key ID, and Secret Access Key

### 3. Start Backend

Open terminal:
```bash
cd backend
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4. Start Frontend

Open new terminal:
```bash
cd frontend
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

### 5. Test the Application

1. Open http://localhost:3000 in your browser
2. Upload a room photo (any image works)
3. Click "Detect Walls with AI" (takes 2 seconds)
4. Click on a wall to select it
5. Scroll down and select a wallpaper design
6. Click "Generate Preview with AI" (takes 3 seconds)
7. Drag the slider to compare before/after
8. Click "Continue to Pricing"
9. Enter dimensions (e.g., 3.2m × 2.4m)
10. Select a material (e.g., Peel & Stick)
11. Click "Proceed to Checkout"
12. Enter your email
13. Click "Complete Order via Shopify"

✅ **Success!** You've completed the full user flow.

## What's Working

- ✅ Image upload to cloud storage (R2)
- ✅ AI wall detection (mock - 2 seconds)
- ✅ Interactive wall selection
- ✅ Wallpaper catalog (8 designs)
- ✅ AI preview generation (mock - 3 seconds)
- ✅ Real pricing calculations
- ✅ Checkout flow (mock)

## Troubleshooting

### Backend won't start

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend won't start

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### CORS errors

Make sure:
1. Both servers are running
2. `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Backend CORS is configured (already done)

## Next Steps

### For Production Deployment

1. **Deploy Frontend to Vercel:**
   ```bash
   cd frontend
   vercel --prod
   ```

2. **Deploy Backend to Railway:**
   ```bash
   cd backend
   railway up
   ```

3. **Deploy AI Handlers to RunPod:**
   See `runpod/README.md` for instructions

### For Real AI Integration

Replace mock implementations with real AI:
1. Deploy SAM handler to RunPod (wall detection)
2. Deploy SDXL handler to RunPod (preview generation)
3. Update `backend/.env` with RunPod endpoint URLs

See `runpod/README.md` for detailed instructions.

## API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Support

- **Quick Start:** This file
- **Detailed Setup:** README.md
- **RunPod Deployment:** runpod/README.md
- **Project Status:** STATUS.md

## Success Checklist

- [ ] Setup script completed
- [ ] R2 credentials added
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can upload images
- [ ] Can detect walls
- [ ] Can select walls
- [ ] Can choose wallpaper
- [ ] Can generate preview
- [ ] Can calculate pricing
- [ ] Can complete checkout

If all checked, you're ready to go! 🎉
