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

### 2. Configure Environment Variables

Edit `backend/.env` and add your credentials:

```env
# R2 Storage (required)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=wallfeel-uploads

# Gemini 1.5 Flash (required - for wall detection)
GEMINI_API_KEY=your_gemini_api_key

# Stability AI SDXL (required - for preview generation)
STABILITY_API_KEY=your_stability_api_key
```

**Get R2 credentials:**
1. Go to https://dash.cloudflare.com
2. Navigate to R2 → Create bucket
3. Create bucket named `wallfeel-uploads`
4. Go to Manage R2 API Tokens
5. Create API token with "Edit" permissions

**Get Gemini API key:**
1. Go to https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

**Get Stability AI API key:**
1. Go to https://platform.stability.ai/account/keys
2. Sign up or log in
3. Create a new API key
4. Copy the key

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
3. Scroll down and select a wallpaper design
4. Click "Generate Preview with AI" (takes 5-10 seconds)
5. Drag the slider to compare before/after
6. Click "Continue to Pricing"
7. Enter dimensions (e.g., 3.2m × 2.4m)
8. Select a material (e.g., Peel & Stick)
9. Click "Proceed to Checkout"
10. Enter your email
11. Click "Complete Order via Shopify"

✅ **Success!** You've completed the full user flow.

## What's Working

- ✅ Image upload to cloud storage (R2)
- ✅ AI wall detection (Gemini 1.5 Flash)
- ✅ AI preview generation (Stability AI SDXL)
- ✅ Interactive wall selection (fallback)
- ✅ Wallpaper catalog (8 designs)
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

### AI Configuration

The AI integration is already implemented using:
- **Gemini 1.5 Flash** for wall detection
- **Stability AI SDXL** for wallpaper inpainting

Just add your API keys to `backend/.env` to enable real AI features.

## API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Support

- **Quick Start:** This file
- **Detailed Setup:** README.md
- **Project Status:** STATUS.md

## Success Checklist

- [ ] Setup script completed
- [ ] R2 credentials added
- [ ] Gemini API key added
- [ ] Stability AI API key added
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can upload images
- [ ] Can detect walls (Gemini)
- [ ] Can generate preview (SDXL)
- [ ] Can choose wallpaper
- [ ] Can calculate pricing
- [ ] Can complete checkout

If all checked, you're ready to go! 🎉
