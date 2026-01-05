# PharmaLink - Start All Services
# Run this script to start the entire architecture

Write-Host "🚀 Starting PharmaLink Services..." -ForegroundColor Cyan

# Start ML Service (Python FastAPI)
Write-Host "`n📊 Starting ML Service (FastAPI)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd ml_service && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Seconds 3

# Start Backend (Express API)
Write-Host "🔧 Starting Backend (Express)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd backend && npm install && npm run dev"

Start-Sleep -Seconds 3

# Start Frontend (Vite React)
Write-Host "🎨 Starting Frontend (Vite)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd frontend && npm install && npm run dev"

Write-Host "`n✅ All services starting!" -ForegroundColor Green
Write-Host @"

Architecture Running:
====================
🌐 Frontend (React):    http://localhost:5173
🔧 Express API:         http://localhost:3000
📊 ML Service (FastAPI): http://localhost:8000

API Endpoints:
- POST /api/ml/interactions  - Drug interaction prediction
- POST /api/ml/risk          - AI risk assessment  
- POST /api/ml/food-drug     - Food-drug interactions
- GET  /api/ml/health        - ML service health check

"@ -ForegroundColor Cyan
