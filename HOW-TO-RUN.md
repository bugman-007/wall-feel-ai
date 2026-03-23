# How to Run - 5 Minutes

## Step 1: Setup (2 minutes)

**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

## Step 2: Configure (1 minute)

Edit `backend/.env`:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=wallfeel-uploads
```

Get R2 credentials from: https://dash.cloudflare.com/

## Step 3: Start Backend (30 seconds)

```bash
cd backend
python main.py
```

Should see: `Uvicorn running on http://0.0.0.0:8000`

## Step 4: Start Frontend (30 seconds)

Open new terminal:
```bash
cd frontend
npm run dev
```

Should see: `Ready on http://localhost:3000`

## Step 5: Test (1 minute)

1. Open http://localhost:3000
2. Upload any image
3. Click "Detect Walls with AI"
4. Click on a wall
5. Select a wallpaper
6. Click "Generate Preview"
7. Drag the slider
8. Click "Continue to Pricing"
9. Enter 3.2 × 2.4
10. Click "Proceed to Checkout"
11. Enter email
12. Click "Complete Order"

✅ **Done!** Everything works.

## Troubleshooting

**Backend won't start:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend won't start:**
```bash
cd frontend
npm install
npm run dev
```

**CORS errors:**
- Make sure both servers are running
- Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`

## What's Working

- ✅ Image upload to R2
- ✅ Wall detection (mock - 2 seconds)
- ✅ Wall selection (interactive)
- ✅ Wallpaper catalog (8 designs)
- ✅ Preview generation (mock - 3 seconds)
- ✅ Pricing calculation (real)
- ✅ Checkout (mock)

## Next Steps

**For Production:**
1. Deploy RunPod handlers (see `runpod/README.md`)
2. Deploy to Vercel + Railway
3. Replace mock endpoints with real AI

**For Development:**
- API docs: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
