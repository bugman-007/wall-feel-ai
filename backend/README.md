# Wallfeel AI Visualizer - Backend

FastAPI backend for the Wallfeel AI Visualizer.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
```

2. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create .env file:
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. Run development server:
```bash
python main.py
# Or
uvicorn main:app --reload
```

6. Visit API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
