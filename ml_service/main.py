"""
PharmaLink ML Service - FastAPI
Simple architecture: Client → Express API → Python ML Service → Pretrained Model
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import joblib
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# FastAPI App Setup
# ---------------------------------------------------------
app = FastAPI(
    title="PharmaLink ML Service",
    version="2.0.0",
    description="AI-powered drug interaction prediction service"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Model Loading (Lazy Loading Pattern)
# ---------------------------------------------------------
class ModelManager:
    """Singleton pattern for managing ML models"""
    _instance = None
    _models: Dict[str, Any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_model(self, name: str, path: Path):
        """Load a model if not already loaded"""
        if name not in self._models:
            try:
                self._models[name] = joblib.load(path)
                logger.info(f"Model '{name}' loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load model '{name}': {e}")
                self._models[name] = None
        return self._models.get(name)
    
    def get_model(self, name: str):
        return self._models.get(name)

model_manager = ModelManager()

# ---------------------------------------------------------
# Request/Response Models
# ---------------------------------------------------------
class DrugInteractionRequest(BaseModel):
    drugs: List[str]
    include_food: bool = False
    
class PredictionResult(BaseModel):
    drug_pair: List[str]
    severity: str
    confidence: float
    description: str

class DrugInteractionResponse(BaseModel):
    success: bool
    interactions: List[PredictionResult]
    risk_score: float
    processing_time_ms: float

class RiskAssessmentRequest(BaseModel):
    drugs: List[str]
    patient_age: Optional[int] = None
    conditions: Optional[List[str]] = []

class RiskAssessmentResponse(BaseModel):
    overall_risk: str
    risk_score: float
    factors: List[str]
    recommendations: List[str]

class FoodDrugRequest(BaseModel):
    drug: str
    foods: List[str]

class FoodDrugResponse(BaseModel):
    drug: str
    interactions: List[Dict[str, Any]]
    safe_foods: List[str]
    avoid_foods: List[str]

# ---------------------------------------------------------
# Mock ML Prediction Functions (Replace with actual models)
# ---------------------------------------------------------
def predict_drug_interaction(drug1: str, drug2: str) -> Dict:
    """
    Predict interaction between two drugs
    Replace with actual model inference
    """
    # Simulated prediction - replace with actual model
    interaction_db = {
        ("warfarin", "aspirin"): {"severity": "severe", "confidence": 0.95, "desc": "Increased bleeding risk"},
        ("metformin", "alcohol"): {"severity": "moderate", "confidence": 0.88, "desc": "Risk of lactic acidosis"},
        ("lisinopril", "potassium"): {"severity": "moderate", "confidence": 0.82, "desc": "Hyperkalemia risk"},
        ("simvastatin", "grapefruit"): {"severity": "severe", "confidence": 0.91, "desc": "Increased drug toxicity"},
    }
    
    key = tuple(sorted([drug1.lower(), drug2.lower()]))
    
    if key in interaction_db:
        result = interaction_db[key]
        return {
            "severity": result["severity"],
            "confidence": result["confidence"],
            "description": result["desc"]
        }
    
    # Default: no significant interaction
    return {
        "severity": "none",
        "confidence": 0.75,
        "description": "No significant interaction found"
    }

def calculate_risk_score(drugs: List[str], interactions: List[Dict]) -> float:
    """Calculate overall risk score based on interactions"""
    if not interactions:
        return 0.0
    
    severity_weights = {"severe": 1.0, "moderate": 0.5, "mild": 0.2, "none": 0.0}
    
    total_risk = sum(
        severity_weights.get(i.get("severity", "none"), 0) * i.get("confidence", 0.5)
        for i in interactions
    )
    
    # Normalize to 0-100 scale
    max_possible = len(interactions) * 1.0
    return min(100, (total_risk / max_possible) * 100) if max_possible > 0 else 0.0

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "PharmaLink ML Service", "status": "running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": list(model_manager._models.keys()),
        "gpu_available": False  # Set True if using GPU
    }

@app.post("/predict/interactions", response_model=DrugInteractionResponse)
async def predict_interactions(request: DrugInteractionRequest):
    """
    Predict drug-drug interactions
    """
    import time
    start_time = time.time()
    
    if len(request.drugs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 drugs required")
    
    interactions = []
    drugs = request.drugs
    
    # Check all pairs
    for i in range(len(drugs)):
        for j in range(i + 1, len(drugs)):
            result = predict_drug_interaction(drugs[i], drugs[j])
            if result["severity"] != "none":
                interactions.append(PredictionResult(
                    drug_pair=[drugs[i], drugs[j]],
                    severity=result["severity"],
                    confidence=result["confidence"],
                    description=result["description"]
                ))
    
    risk_score = calculate_risk_score(drugs, [i.dict() for i in interactions])
    processing_time = (time.time() - start_time) * 1000
    
    return DrugInteractionResponse(
        success=True,
        interactions=interactions,
        risk_score=risk_score,
        processing_time_ms=round(processing_time, 2)
    )

@app.post("/predict/risk", response_model=RiskAssessmentResponse)
async def assess_risk(request: RiskAssessmentRequest):
    """
    AI-powered risk assessment
    """
    factors = []
    recommendations = []
    base_risk = 0.0
    
    # Polypharmacy check
    if len(request.drugs) >= 5:
        factors.append("Polypharmacy detected (5+ medications)")
        base_risk += 30
        recommendations.append("Consider medication review with healthcare provider")
    elif len(request.drugs) >= 3:
        factors.append("Multiple medications in use")
        base_risk += 15
    
    # Age factor
    if request.patient_age and request.patient_age > 65:
        factors.append("Elderly patient - increased sensitivity")
        base_risk += 20
        recommendations.append("Monitor for adverse reactions more closely")
    
    # Check interactions
    for i in range(len(request.drugs)):
        for j in range(i + 1, len(request.drugs)):
            result = predict_drug_interaction(request.drugs[i], request.drugs[j])
            if result["severity"] == "severe":
                factors.append(f"Severe interaction: {request.drugs[i]} + {request.drugs[j]}")
                base_risk += 25
            elif result["severity"] == "moderate":
                factors.append(f"Moderate interaction: {request.drugs[i]} + {request.drugs[j]}")
                base_risk += 10
    
    # Determine risk level
    risk_score = min(100, base_risk)
    if risk_score >= 70:
        overall_risk = "High"
        recommendations.append("Immediate consultation with healthcare provider recommended")
    elif risk_score >= 40:
        overall_risk = "Moderate"
        recommendations.append("Discuss medications with pharmacist")
    elif risk_score >= 20:
        overall_risk = "Low"
        recommendations.append("Continue monitoring")
    else:
        overall_risk = "Minimal"
        recommendations.append("No immediate action required")
    
    return RiskAssessmentResponse(
        overall_risk=overall_risk,
        risk_score=risk_score,
        factors=factors if factors else ["No significant risk factors identified"],
        recommendations=recommendations
    )

@app.post("/predict/food-drug", response_model=FoodDrugResponse)
async def check_food_drug_interaction(request: FoodDrugRequest):
    """
    Check food-drug interactions
    """
    food_interactions_db = {
        "warfarin": {
            "avoid": ["leafy greens", "cranberry", "alcohol"],
            "reason": "Affects blood clotting - Vitamin K interaction"
        },
        "metformin": {
            "avoid": ["alcohol"],
            "reason": "Risk of lactic acidosis"
        },
        "simvastatin": {
            "avoid": ["grapefruit", "grapefruit juice"],
            "reason": "Increases drug concentration"
        },
        "levothyroxine": {
            "avoid": ["soy", "coffee", "calcium supplements"],
            "reason": "Reduces absorption"
        },
        "ciprofloxacin": {
            "avoid": ["dairy", "calcium-fortified foods"],
            "reason": "Reduces antibiotic absorption"
        }
    }
    
    drug_lower = request.drug.lower()
    interactions = []
    avoid_foods = []
    safe_foods = []
    
    if drug_lower in food_interactions_db:
        db_entry = food_interactions_db[drug_lower]
        avoid_list = db_entry["avoid"]
        
        for food in request.foods:
            food_lower = food.lower()
            if any(avoid in food_lower for avoid in avoid_list):
                interactions.append({
                    "food": food,
                    "severity": "moderate",
                    "warning": db_entry["reason"]
                })
                avoid_foods.append(food)
            else:
                safe_foods.append(food)
    else:
        safe_foods = request.foods
    
    return FoodDrugResponse(
        drug=request.drug,
        interactions=interactions,
        safe_foods=safe_foods,
        avoid_foods=avoid_foods
    )

# ---------------------------------------------------------
# Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ---------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
