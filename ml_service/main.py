# ml_service/main.py - FINAL VERSION WITH REAL MODEL
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from datetime import datetime
import json

# Import REAL model
from models.drug_interaction_model import get_model

app = FastAPI(
    title="Drug Interaction ML Service",
    description="Real ML model for drug interaction prediction using TwoSIDES data",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize REAL model
print("="*60)
print("🚀 INITIALIZING DRUG INTERACTION ML SERVICE")
print("="*60)
model = get_model()
print("="*60)

# Request models
class DrugInteractionRequest(BaseModel):
    drugs: List[str]
    include_food: bool = False
    patient_info: Optional[dict] = None

class RiskAssessmentRequest(BaseModel):
    drugs: List[str]
    patient_age: Optional[int] = None
    conditions: Optional[List[str]] = None
    weight: Optional[float] = None
    liver_function: Optional[str] = None  # normal, impaired
    kidney_function: Optional[str] = None  # normal, impaired

class FoodDrugRequest(BaseModel):
    drug: str
    foods: List[str]

# Response models
class InteractionResponse(BaseModel):
    drug_pair: List[str]
    interaction: bool
    probability: float
    severity: str
    description: str
    confidence: str
    source: str
    recommendations: List[str]

class BatchInteractionResponse(BaseModel):
    request_id: str
    timestamp: str
    drugs: List[str]
    interactions: List[InteractionResponse]
    summary: dict
    model_info: dict

@app.get("/")
async def root():
    """Root endpoint with service info"""
    model_info = model.get_model_info()
    
    return {
        "service": "Drug Interaction ML Service",
        "version": "2.0.0",
        "status": "operational",
        "model": {
            "loaded": model.loaded,
            "type": model_info.get("model_type"),
            "drugs_encoded": model_info.get("drug_count"),
            "version": model_info.get("metadata", {}).get("version", "1.0"),
            "performance": model_info.get("performance", {})
        },
        "endpoints": [
            {"path": "/", "method": "GET", "description": "Service info"},
            {"path": "/health", "method": "GET", "description": "Health check"},
            {"path": "/predict/interactions", "method": "POST", "description": "Predict drug interactions"},
            {"path": "/predict/risk", "method": "POST", "description": "Risk assessment"},
            {"path": "/predict/food-drug", "method": "POST", "description": "Food-drug interactions"},
            {"path": "/model/info", "method": "GET", "description": "Model information"}
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    model_info = model.get_model_info()
    
    return {
        "status": "healthy" if model.loaded else "degraded",
        "service": "drug-interaction-ml",
        "model": {
            "loaded": model.loaded,
            "status": "operational" if model.loaded else "unavailable",
            "drugs": model_info.get("drug_count", 0),
            "version": model_info.get("metadata", {}).get("version", "1.0"),
            "training_date": model_info.get("metadata", {}).get("training_date", "unknown")
        },
        "timestamp": datetime.now().isoformat(),
        "response_time": "OK"
    }

@app.get("/model/info")
async def model_info():
    """Get detailed model information"""
    info = model.get_model_info()
    
    return {
        "model": info,
        "capabilities": {
            "drug_drug_interactions": True,
            "severity_prediction": True,
            "probability_scores": True,
            "confidence_levels": True,
            "batch_processing": True
        },
        "data_source": "TwoSIDES Database",
        "last_updated": info.get("metadata", {}).get("training_date", "unknown")
    }

@app.post("/predict/interactions", response_model=BatchInteractionResponse)
async def predict_interactions(request: DrugInteractionRequest):
    """
    Predict drug-drug interactions using REAL ML model
    
    Example request:
    {
        "drugs": ["Aspirin", "Warfarin", "Metformin"],
        "include_food": false
    }
    """
    try:
        if not request.drugs or len(request.drugs) < 2:
            raise HTTPException(status_code=400, detail="At least 2 drugs required")
        
        # Get predictions from REAL model
        predictions = model.batch_predict(request.drugs)
        
        # Format response
        interactions = []
        for pred in predictions:
            # Generate recommendations based on prediction
            recommendations = []
            if pred['interaction']:
                if pred['severity'] == 'high':
                    recommendations = [
                        "AVOID COMBINATION - High risk of adverse effects",
                        "Consult healthcare provider immediately",
                        "Consider alternative medications",
                        "Monitor for bleeding, bruising, or other serious side effects"
                    ]
                elif pred['severity'] == 'medium':
                    recommendations = [
                        "Use with caution",
                        "Monitor for side effects",
                        "Consider dosage adjustment",
                        "Regular check-ups recommended"
                    ]
                else:
                    recommendations = [
                        "Proceed with caution",
                        "Monitor for mild side effects",
                        "Inform your doctor about this combination"
                    ]
            else:
                recommendations = [
                    "No significant interaction detected",
                    "Continue medications as prescribed",
                    "Routine monitoring is sufficient"
                ]
            
            interaction_response = InteractionResponse(
                drug_pair=[pred['drug1'], pred['drug2']],
                interaction=pred['interaction'],
                probability=pred['probability'],
                severity=pred['severity'],
                description=pred['description'],
                confidence=pred['confidence'],
                source=pred['source'],
                recommendations=recommendations
            )
            interactions.append(interaction_response)
        
        # Create summary
        total_pairs = len(interactions)
        interacting_pairs = sum(1 for i in interactions if i.interaction)
        high_risk_pairs = sum(1 for i in interactions if i.severity == 'high')
        
        return BatchInteractionResponse(
            request_id=f"req_{datetime.now().timestamp()}",
            timestamp=datetime.now().isoformat(),
            drugs=request.drugs,
            interactions=interactions,
            summary={
                "total_pairs": total_pairs,
                "interacting_pairs": interacting_pairs,
                "high_risk_pairs": high_risk_pairs,
                "interaction_rate": f"{interacting_pairs/total_pairs:.1%}" if total_pairs > 0 else "0%"
            },
            model_info=model.get_model_info()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/predict/risk")
async def predict_risk(request: RiskAssessmentRequest):
    """Risk assessment with patient factors"""
    try:
        # Base risk from drug interactions
        drug_interactions = []
        overall_risk = 0.0
        
        if request.drugs and len(request.drugs) >= 2:
            predictions = model.batch_predict(request.drugs)
            drug_interactions = predictions
            
            # Calculate overall risk score
            for pred in predictions:
                if pred['interaction']:
                    if pred['severity'] == 'high':
                        overall_risk += 0.3
                    elif pred['severity'] == 'medium':
                        overall_risk += 0.15
                    else:
                        overall_risk += 0.05
        
        # Adjust for patient factors
        factors = []
        
        if request.patient_age:
            if request.patient_age > 65:
                overall_risk += 0.2
                factors.append(f"Age >65 (+0.2)")
            elif request.patient_age > 50:
                overall_risk += 0.1
                factors.append(f"Age >50 (+0.1)")
        
        if request.conditions:
            overall_risk += len(request.conditions) * 0.1
            factors.append(f"{len(request.conditions)} conditions (+{len(request.conditions)*0.1})")
        
        if request.liver_function == 'impaired':
            overall_risk += 0.15
            factors.append("Liver impairment (+0.15)")
        
        if request.kidney_function == 'impaired':
            overall_risk += 0.15
            factors.append("Kidney impairment (+0.15)")
        
        # Cap at 1.0
        overall_risk = min(1.0, overall_risk)
        
        # Determine risk level
        if overall_risk > 0.7:
            risk_level = "HIGH"
            action = "Immediate intervention required"
        elif overall_risk > 0.4:
            risk_level = "MODERATE"
            action = "Close monitoring and consultation"
        else:
            risk_level = "LOW"
            action = "Routine monitoring"
        
        return {
            "patient_summary": {
                "age": request.patient_age,
                "conditions": request.conditions or [],
                "additional_factors": factors
            },
            "drug_interactions": drug_interactions,
            "risk_assessment": {
                "overall_risk_score": overall_risk,
                "risk_level": risk_level,
                "risk_factors": factors,
                "recommended_action": action
            },
            "recommendations": [
                "Review medication list with healthcare provider",
                "Consider alternative medications if high risk",
                "Regular monitoring of liver/kidney function if impaired",
                "Patient education on potential side effects"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk assessment error: {str(e)}")

@app.post("/predict/food-drug")
async def predict_food_drug(request: FoodDrugRequest):
    """Food-drug interactions"""
    try:
        # Known food-drug interactions
        known_interactions = {
            "grapefruit": {
                "drugs": ["simvastatin", "atorvastatin", "lovastatin", "felodipine", "nifedipine"],
                "severity": "high",
                "description": "Grapefruit inhibits CYP3A4 enzyme, increasing drug levels"
            },
            "alcohol": {
                "drugs": ["metronidazole", "disulfiram", "warfarin", "acetaminophen", "antidepressants"],
                "severity": "high",
                "description": "Alcohol can increase sedative effects or cause adverse reactions"
            },
            "dairy": {
                "drugs": ["tetracycline", "doxycycline", "ciprofloxacin", "levofloxacin"],
                "severity": "medium",
                "description": "Calcium in dairy products can bind to antibiotics"
            },
            "leafy_greens": {
                "drugs": ["warfarin"],
                "severity": "medium",
                "description": "Vitamin K in greens can reduce warfarin effectiveness"
            },
            "licorice": {
                "drugs": ["digoxin", "diuretics", "blood_pressure_medications"],
                "severity": "medium",
                "description": "Can cause potassium loss and blood pressure changes"
            }
        }
        
        interactions = []
        
        for food in request.foods:
            food_lower = food.lower()
            interaction_found = False
            
            for food_type, info in known_interactions.items():
                if food_type in food_lower or any(food_lower in item for item in info["drugs"]):
                    # Check if the drug is in the list
                    for drug_keyword in info["drugs"]:
                        if drug_keyword in request.drug.lower():
                            interactions.append({
                                "food": food,
                                "drug": request.drug,
                                "interaction": True,
                                "severity": info["severity"],
                                "description": info["description"],
                                "recommendation": f"Avoid {food} while taking {request.drug}"
                            })
                            interaction_found = True
                            break
                    
                    if interaction_found:
                        break
            
            if not interaction_found:
                interactions.append({
                    "food": food,
                    "drug": request.drug,
                    "interaction": False,
                    "severity": "none",
                    "description": "No significant interaction expected",
                    "recommendation": "Normal consumption is acceptable"
                })
        
        return {
            "food_drug_interactions": interactions,
            "summary": {
                "total_foods": len(request.foods),
                "interacting_foods": sum(1 for i in interactions if i["interaction"]),
                "high_risk_foods": sum(1 for i in interactions if i["severity"] == "high")
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Food-drug prediction error: {str(e)}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("✅ ML SERVICE READY")
    print(f"📡 Endpoint: http://localhost:8000")
    print(f"📊 Documentation: http://localhost:8000/docs")
    print("="*60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)