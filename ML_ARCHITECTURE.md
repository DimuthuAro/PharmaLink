# PharmaLink ML Service Architecture

## Simple Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Web/Mobile)                       │
│                     React App (localhost:5173)                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS API GATEWAY                           │
│                     (localhost:3000)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Authentication & Validation                            │    │
│  │ • Rate Limiting & Security (Helmet)                      │    │
│  │ • Request Logging (Morgan)                               │    │
│  │ • Route: /api/ml/* → ML Service                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PYTHON ML SERVICE (FastAPI)                    │
│                     (localhost:8000)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Endpoints:                                               │    │
│  │ • POST /predict/interactions - Drug-drug interactions    │    │
│  │ • POST /predict/risk        - AI risk assessment         │    │
│  │ • POST /predict/food-drug   - Food-drug interactions     │    │
│  │ • GET  /health              - Service health check       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRETRAINED ML MODELS                          │
│                      (CPU / GPU)                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Drug Interaction Classifier (Random Forest/XGBoost)    │    │
│  │ • Risk Score Calculator (Neural Network)                 │    │
│  │ • Food-Drug Interaction Model (TF-IDF + ML)              │    │
│  │ • Model Manager (Lazy Loading Pattern)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Option 1: Run all services at once
./start-all.ps1

# Option 2: Run individually

# Terminal 1 - ML Service
cd ml_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Express Backend
cd backend
npm install
npm run dev

# Terminal 3 - React Frontend
cd frontend
npm install
npm run dev
```

## API Usage Examples

### 1. Check Drug Interactions
```javascript
// Frontend
import { mlService } from './utils/mlService';

const result = await mlService.checkInteractions(
    ['Warfarin', 'Aspirin', 'Metformin']
);
// Returns: { success, interactions, risk_score, processing_time_ms }
```

### 2. AI Risk Assessment
```javascript
const risk = await mlService.assessRisk(
    ['Warfarin', 'Aspirin'],
    65,  // patient age
    ['diabetes']  // conditions
);
// Returns: { overall_risk, risk_score, factors, recommendations }
```

### 3. Food-Drug Interactions
```javascript
const foodCheck = await mlService.checkFoodDrug(
    'Warfarin',
    ['spinach', 'apple', 'cranberry']
);
// Returns: { drug, interactions, safe_foods, avoid_foods }
```

## File Structure

```
PharmaLink/
├── frontend/              # React (Vite)
│   └── src/utils/mlService.js  # ML API client
├── backend/               # Express API Gateway
│   ├── server.js          # Main server
│   ├── routes/mlRoutes.js # ML API routes
│   └── services/mlServiceClient.js # Axios client
├── ml_service/            # Python FastAPI
│   ├── main.py           # FastAPI app
│   └── requirements.txt  # Python deps
└── start-all.ps1         # Start all services
```

## Environment Variables

```env
# Backend (.env)
ML_SERVICE_URL=http://localhost:8000
PORT=3000

# Frontend (.env)
VITE_API_BASE=http://localhost:3000
```
