# Wallfeel AI Visualizer

AI-powered wallpaper visualization platform that lets customers see wallpaper designs on their walls before purchasing.

## Features

- 📸 Upload room photos
- 🤖 AI-powered wall detection
- 🎨 Interactive wall selection
- 🖼️ Wallpaper catalog with 8+ designs
- ✨ Realistic preview generation
- 💰 Automatic pricing calculation
- 🛒 Shopify checkout integration

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Git

### Installation

**Option 1: Automated Setup (Recommended)**

Windows:
```bash
setup.bat
```

macOS/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

**Option 2: Manual Setup**

1. **Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

2. **Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

3. **Open:** http://localhost:3000

## Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```env
# Required
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=wallfeel-uploads

# Optional (for production AI)
RUNPOD_API_KEY=your_api_key
RUNPOD_SAM_ENDPOINT=https://api.runpod.ai/v2/xxx
RUNPOD_SDXL_ENDPOINT=https://api.runpod.ai/v2/xxx

# Optional (for production checkout)
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx
```

## Project Structure

```
wallfeel-ai/
├── frontend/          # Next.js app
├── backend/           # FastAPI app
├── runpod/           # AI handlers
├── setup.sh          # Setup script
└── README.md         # This file
```

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python 3.10+
- **Storage:** Cloudflare R2
- **AI:** RunPod (SAM + SDXL)
- **Commerce:** Shopify

## Development

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && python main.py

# API Docs
http://localhost:8000/docs
```

## Deployment

See deployment guides in the docs folder for:
- Vercel (Frontend)
- Railway (Backend)
- RunPod (AI Processing)

## License

Private project. All rights reserved.

## Support

For issues or questions, check the documentation or contact the development team.
