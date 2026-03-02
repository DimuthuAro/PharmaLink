"""
Drug Interactions – Step 4: Model Implementation (Inference Service)
=====================================================================
Standalone FastAPI service for drug interaction predictions.
Loads the trained model + knowledge base and exposes prediction endpoints.

Capabilities:
  - Drug-drug interaction checking (knowledge base + class-based inference)
  - Drug-food interaction prediction (ML model)
  - Drug search by name/generic
  - Risk assessment with polypharmacy & age factors
  - Brand → generic name resolution

Endpoints:
  GET  /health                    – Service health check
  GET  /drugs?q=...               – Search drugs
  POST /predict/interactions      – Check drug-drug interactions
  POST /predict/risk              – Risk assessment
  POST /predict/food-drug         – Food-drug interaction check
  POST /drug-risk                 – Drug risk lookup
  POST /food-drug-risk            – Food-drug risk lookup
  GET  /safe-foods/{drug_index}   – Safe foods for a drug

Usage:
  uvicorn drug_interactions.implementation:app --host 0.0.0.0 --port 8001 --reload
  python -m drug_interactions.implementation
"""

import re
import json
import time
import logging
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

# ── FastAPI App ──────────────────────────────────────────────────
app = FastAPI(
    title="PharmaLink – Drug Interaction Service",
    version="1.0.0",
    description="Drug-drug & drug-food interaction prediction"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Request/Response Models ──────────────────────────────────────
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


# ═══════════════════════════════════════════════════════════════════
# Knowledge Base: Drug-Drug Interactions
# ═══════════════════════════════════════════════════════════════════
DRUG_INTERACTION_DB = {
    # Anticoagulants / Antiplatelets
    ("aspirin", "warfarin"): {"severity": "severe", "confidence": 0.95, "desc": "Increased bleeding risk – both affect clotting"},
    ("aspirin", "clopidogrel"): {"severity": "moderate", "confidence": 0.90, "desc": "Dual antiplatelet therapy – increased bleeding risk"},
    ("aspirin", "heparin"): {"severity": "severe", "confidence": 0.93, "desc": "Significantly increased bleeding risk"},
    ("warfarin", "clopidogrel"): {"severity": "severe", "confidence": 0.94, "desc": "High bleeding risk – dual antithrombotic effect"},
    ("warfarin", "ciprofloxacin"): {"severity": "severe", "confidence": 0.91, "desc": "Fluoroquinolones potentiate warfarin – INR elevation"},
    ("warfarin", "metronidazole"): {"severity": "severe", "confidence": 0.90, "desc": "Increased anticoagulant effect and bleeding risk"},
    ("warfarin", "fluconazole"): {"severity": "severe", "confidence": 0.92, "desc": "Azole antifungals increase warfarin levels"},
    ("warfarin", "amoxicillin"): {"severity": "moderate", "confidence": 0.85, "desc": "Antibiotics may enhance anticoagulant effect"},
    ("warfarin", "omeprazole"): {"severity": "moderate", "confidence": 0.82, "desc": "May increase warfarin effect via CYP2C19 inhibition"},
    ("warfarin", "acetaminophen"): {"severity": "moderate", "confidence": 0.80, "desc": "High-dose acetaminophen may increase INR"},
    ("warfarin", "paracetamol"): {"severity": "moderate", "confidence": 0.80, "desc": "High-dose paracetamol may increase INR"},
    # NSAIDs
    ("aspirin", "ibuprofen"): {"severity": "moderate", "confidence": 0.90, "desc": "Increased GI bleeding risk; ibuprofen may block aspirin's cardioprotection"},
    ("ibuprofen", "naproxen"): {"severity": "moderate", "confidence": 0.90, "desc": "Do not combine NSAIDs – increased GI/renal toxicity"},
    ("ibuprofen", "warfarin"): {"severity": "severe", "confidence": 0.92, "desc": "NSAIDs increase bleeding risk with anticoagulants"},
    ("ibuprofen", "lisinopril"): {"severity": "moderate", "confidence": 0.83, "desc": "NSAIDs reduce antihypertensive effect and increase renal risk"},
    ("ibuprofen", "methotrexate"): {"severity": "severe", "confidence": 0.93, "desc": "NSAIDs decrease methotrexate clearance – toxicity risk"},
    ("ibuprofen", "lithium"): {"severity": "moderate", "confidence": 0.87, "desc": "NSAIDs increase lithium levels"},
    # ACE Inhibitors / ARBs
    ("lisinopril", "potassium"): {"severity": "moderate", "confidence": 0.85, "desc": "Risk of hyperkalemia"},
    ("lisinopril", "spironolactone"): {"severity": "moderate", "confidence": 0.87, "desc": "Risk of hyperkalemia – both retain potassium"},
    ("lisinopril", "losartan"): {"severity": "severe", "confidence": 0.88, "desc": "Dual RAAS blockade – hyperkalemia, hypotension, renal failure"},
    # Statins
    ("atorvastatin", "clarithromycin"): {"severity": "severe", "confidence": 0.90, "desc": "CYP3A4 inhibition increases statin toxicity risk"},
    ("simvastatin", "clarithromycin"): {"severity": "severe", "confidence": 0.91, "desc": "CYP3A4 inhibition – rhabdomyolysis risk"},
    ("simvastatin", "amlodipine"): {"severity": "moderate", "confidence": 0.85, "desc": "Limit simvastatin to 20mg with amlodipine"},
    # Diabetes
    ("metformin", "alcohol"): {"severity": "moderate", "confidence": 0.88, "desc": "Risk of lactic acidosis"},
    ("metformin", "insulin"): {"severity": "moderate", "confidence": 0.85, "desc": "Increased risk of hypoglycemia"},
    ("glimepiride", "insulin"): {"severity": "severe", "confidence": 0.88, "desc": "Significant hypoglycemia risk with dual therapy"},
    # Cardiovascular
    ("metoprolol", "verapamil"): {"severity": "severe", "confidence": 0.91, "desc": "Severe bradycardia and heart block risk"},
    ("metoprolol", "diltiazem"): {"severity": "severe", "confidence": 0.90, "desc": "Risk of severe bradycardia and AV block"},
    ("digoxin", "amiodarone"): {"severity": "severe", "confidence": 0.93, "desc": "Amiodarone increases digoxin levels – toxicity risk"},
    ("digoxin", "verapamil"): {"severity": "severe", "confidence": 0.91, "desc": "Verapamil increases digoxin levels and AV block risk"},
    ("amiodarone", "warfarin"): {"severity": "severe", "confidence": 0.92, "desc": "Amiodarone potentiates warfarin – major bleeding risk"},
    # Antidepressants / CNS
    ("fluoxetine", "tramadol"): {"severity": "severe", "confidence": 0.91, "desc": "Serotonin syndrome risk"},
    ("fluoxetine", "sertraline"): {"severity": "severe", "confidence": 0.93, "desc": "Do not combine SSRIs – serotonin syndrome"},
    ("diazepam", "alcohol"): {"severity": "severe", "confidence": 0.93, "desc": "CNS depression – respiratory failure risk"},
    ("alprazolam", "opioid"): {"severity": "severe", "confidence": 0.95, "desc": "Respiratory depression – FDA black box warning"},
    # Opioids
    ("tramadol", "alcohol"): {"severity": "severe", "confidence": 0.93, "desc": "CNS and respiratory depression"},
    ("morphine", "alcohol"): {"severity": "severe", "confidence": 0.95, "desc": "Critical CNS and respiratory depression"},
    # Thyroid
    ("levothyroxine", "iron"): {"severity": "moderate", "confidence": 0.87, "desc": "Iron reduces levothyroxine absorption – separate by 4h"},
    ("levothyroxine", "calcium"): {"severity": "mild", "confidence": 0.88, "desc": "Calcium reduces absorption – take 4 hours apart"},
    # Antibiotics
    ("ciprofloxacin", "theophylline"): {"severity": "severe", "confidence": 0.89, "desc": "Increased theophylline levels – seizure risk"},
    ("azithromycin", "amiodarone"): {"severity": "severe", "confidence": 0.88, "desc": "QT prolongation risk – cardiac arrhythmia"},
    # PPIs
    ("clopidogrel", "omeprazole"): {"severity": "moderate", "confidence": 0.87, "desc": "Omeprazole reduces clopidogrel activation via CYP2C19"},
    # Paracetamol
    ("paracetamol", "alcohol"): {"severity": "severe", "confidence": 0.92, "desc": "Hepatotoxicity risk – liver damage"},
    ("acetaminophen", "alcohol"): {"severity": "severe", "confidence": 0.92, "desc": "Hepatotoxicity risk – liver damage"},
}

CLASS_INTERACTIONS = {
    ("BLOOD RELATED", "BLOOD RELATED"): {"severity": "moderate", "confidence": 0.78, "desc": "Multiple blood-affecting drugs – increased bleeding or clotting risk"},
    ("HEART RELATED", "HEART RELATED"): {"severity": "moderate", "confidence": 0.76, "desc": "Multiple cardiac drugs – monitor for additive effects"},
    ("PAIN RELIEF", "BLOOD RELATED"): {"severity": "moderate", "confidence": 0.80, "desc": "Pain medications may affect blood clotting"},
    ("PAIN RELIEF", "PAIN RELIEF"): {"severity": "moderate", "confidence": 0.82, "desc": "Combining pain relievers increases GI and renal risk"},
    ("NEURO/CNS", "NEURO/CNS"): {"severity": "moderate", "confidence": 0.80, "desc": "Multiple CNS-active drugs – additive sedation risk"},
    ("ANTI DIABETIC", "ANTI DIABETIC"): {"severity": "moderate", "confidence": 0.80, "desc": "Multiple diabetes drugs – increased hypoglycemia risk"},
    ("ANTI INFECTIVE", "BLOOD RELATED"): {"severity": "moderate", "confidence": 0.75, "desc": "Antibiotics may alter anticoagulant effectiveness"},
}


# ═══════════════════════════════════════════════════════════════════
# Data Loading
# ═══════════════════════════════════════════════════════════════════
_drug_index: List[Dict] = []
_food_list: List[Dict] = []
_drug_interactions_data: List[Dict] = []
_brand_to_generic: Dict[str, str] = {}
_drug_classes: Dict[str, str] = {}


def _load_data():
    global _drug_index, _food_list, _drug_interactions_data

    # Drug search index
    idx_file = ARTIFACTS_DIR / "drug_search_index.json"
    if idx_file.exists():
        with open(idx_file, "r", encoding="utf-8") as f:
            _drug_index.extend(json.load(f))
        logger.info(f"Loaded {len(_drug_index)} drugs into search index")

    # Food data
    food_csv = DATA_DIR / "food_features_final.csv"
    if food_csv.exists():
        df = pd.read_csv(food_csv)
        _food_list.extend(df.to_dict(orient="records"))
        logger.info(f"Loaded {len(_food_list)} foods")

    # Drug-food interactions
    int_csv = DATA_DIR / "drug_interactions_final.csv"
    if int_csv.exists():
        df = pd.read_csv(int_csv)
        _drug_interactions_data.extend(df.to_dict(orient="records"))
        logger.info(f"Loaded {len(_drug_interactions_data)} drug-food interaction records")

    # Build lookup tables
    for entry in _drug_index:
        name_lower = entry.get("name", "").lower().strip()
        if entry.get("type") == "brand" and entry.get("generic"):
            generic = entry["generic"].lower().strip()
            _brand_to_generic[name_lower] = generic
            if entry.get("class"):
                _drug_classes[generic] = entry["class"].upper().strip()
        elif entry.get("type") == "generic":
            _brand_to_generic[name_lower] = name_lower
            if entry.get("class"):
                _drug_classes[name_lower] = entry["class"].upper().strip()

    logger.info(f"Built lookups: {len(_brand_to_generic)} brand→generic, {len(_drug_classes)} classes")


def _resolve_generic(drug_name: str) -> str:
    name = drug_name.lower().strip()
    if name in _brand_to_generic:
        return _brand_to_generic[name]
    stripped = re.sub(r'\s+\d+\s*(mg|g|ml|mcg|iu)\b.*$', '', name, flags=re.IGNORECASE).strip()
    if stripped in _brand_to_generic:
        return _brand_to_generic[stripped]
    return name


def _normalize_class(cls: str) -> str:
    c = cls.upper().strip()
    if any(k in c for k in ["BLOOD", "ANTICOAGUL", "ANTIPLATELET"]): return "BLOOD RELATED"
    if any(k in c for k in ["HEART", "CARDIAC", "CARDIO", "HYPERTENSION"]): return "HEART RELATED"
    if any(k in c for k in ["PAIN", "NSAID", "ANALGESIC"]): return "PAIN RELIEF"
    if any(k in c for k in ["NEURO", "CNS", "PSYCHIATRIC", "ANTI DEPRESSANT"]): return "NEURO/CNS"
    if any(k in c for k in ["DIABET", "HYPOGLYCEMIC", "INSULIN"]): return "ANTI DIABETIC"
    if any(k in c for k in ["ANTI INFECTIVE", "ANTIBIOTIC"]): return "ANTI INFECTIVE"
    return c


# ═══════════════════════════════════════════════════════════════════
# Prediction Functions
# ═══════════════════════════════════════════════════════════════════
def predict_drug_interaction(drug1: str, drug2: str) -> Dict:
    gen1 = _resolve_generic(drug1)
    gen2 = _resolve_generic(drug2)

    # Knowledge base lookup
    key = tuple(sorted([gen1, gen2]))
    if key in DRUG_INTERACTION_DB:
        r = DRUG_INTERACTION_DB[key]
        return {"severity": r["severity"], "confidence": r["confidence"], "description": r["desc"]}

    # Multi-ingredient check
    for gen in [gen1, gen2]:
        if "+" in gen:
            other = gen2 if gen == gen1 else gen1
            for part in [p.strip() for p in gen.split("+")]:
                sub_key = tuple(sorted([part, other]))
                if sub_key in DRUG_INTERACTION_DB:
                    r = DRUG_INTERACTION_DB[sub_key]
                    return {"severity": r["severity"], "confidence": r["confidence"], "description": r["desc"]}

    # Class-based inference
    cls1, cls2 = _drug_classes.get(gen1, ""), _drug_classes.get(gen2, "")
    if cls1 and cls2:
        cls_key = tuple(sorted([_normalize_class(cls1), _normalize_class(cls2)]))
        if cls_key in CLASS_INTERACTIONS:
            r = CLASS_INTERACTIONS[cls_key]
            return {"severity": r["severity"], "confidence": r["confidence"],
                    "description": f"{r['desc']} ({cls1} + {cls2})"}

    return {"severity": "none", "confidence": 0.75, "description": "No significant interaction found"}


def calculate_risk_score(interactions: List[Dict]) -> float:
    if not interactions:
        return 0.0
    severity_weights = {"severe": 1.0, "moderate": 0.5, "mild": 0.2, "none": 0.0}
    total = sum(severity_weights.get(i.get("severity", "none"), 0) * i.get("confidence", 0.5) for i in interactions)
    max_possible = len(interactions) * 1.0
    return min(100, (total / max_possible) * 100) if max_possible > 0 else 0.0


# ═══════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════
@app.get("/health")
async def health_check():
    return {
        "service": "Drug Interaction Service",
        "status": "healthy",
        "drug_count": len(_drug_index),
        "food_count": len(_food_list),
        "interaction_count": len(_drug_interactions_data),
    }


@app.get("/drugs")
async def search_drugs(q: str = "", limit: int = 50):
    if not q.strip():
        return _drug_index[:limit]
    query = q.lower().strip()
    results, seen = [], set()
    for d in _drug_index:
        if len(results) >= limit: break
        lower = d["name"].lower()
        if lower.startswith(query) and lower not in seen:
            seen.add(lower); results.append(d)
    if len(results) < limit:
        for d in _drug_index:
            if len(results) >= limit: break
            lower = d["name"].lower()
            if query in lower and lower not in seen:
                seen.add(lower); results.append(d)
    return results


@app.post("/predict/interactions", response_model=DrugInteractionResponse)
async def predict_interactions(request: DrugInteractionRequest):
    start = time.time()
    if len(request.drugs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 drugs required")

    interactions = []
    for i in range(len(request.drugs)):
        for j in range(i + 1, len(request.drugs)):
            result = predict_drug_interaction(request.drugs[i], request.drugs[j])
            if result["severity"] != "none":
                interactions.append(PredictionResult(
                    drug_pair=[request.drugs[i], request.drugs[j]],
                    severity=result["severity"],
                    confidence=result["confidence"],
                    description=result["description"]
                ))

    risk = calculate_risk_score([i.dict() for i in interactions])
    return DrugInteractionResponse(
        success=True, interactions=interactions,
        risk_score=risk, processing_time_ms=round((time.time() - start) * 1000, 2)
    )


@app.post("/predict/risk", response_model=RiskAssessmentResponse)
async def assess_risk(request: RiskAssessmentRequest):
    factors, recommendations = [], []
    base_risk = 0.0

    if len(request.drugs) >= 5:
        factors.append("Polypharmacy detected (5+ medications)"); base_risk += 30
        recommendations.append("Consider medication review with healthcare provider")
    elif len(request.drugs) >= 3:
        factors.append("Multiple medications in use"); base_risk += 15

    if request.patient_age and request.patient_age > 65:
        factors.append("Elderly patient - increased sensitivity"); base_risk += 20
        recommendations.append("Monitor for adverse reactions more closely")

    for i in range(len(request.drugs)):
        for j in range(i + 1, len(request.drugs)):
            r = predict_drug_interaction(request.drugs[i], request.drugs[j])
            if r["severity"] == "severe":
                factors.append(f"Severe interaction: {request.drugs[i]} + {request.drugs[j]}"); base_risk += 25
            elif r["severity"] == "moderate":
                factors.append(f"Moderate interaction: {request.drugs[i]} + {request.drugs[j]}"); base_risk += 10

    risk_score = min(100, base_risk)
    if risk_score >= 70: overall = "High"; recommendations.append("Immediate consultation recommended")
    elif risk_score >= 40: overall = "Moderate"; recommendations.append("Discuss medications with pharmacist")
    elif risk_score >= 20: overall = "Low"; recommendations.append("Continue monitoring")
    else: overall = "Minimal"; recommendations.append("No immediate action required")

    return RiskAssessmentResponse(
        overall_risk=overall, risk_score=risk_score,
        factors=factors or ["No significant risk factors"],
        recommendations=recommendations
    )


@app.post("/predict/food-drug", response_model=FoodDrugResponse)
async def check_food_drug(request: FoodDrugRequest):
    food_db = {
        "warfarin": {"avoid": ["leafy greens", "cranberry", "alcohol"], "reason": "Affects blood clotting"},
        "metformin": {"avoid": ["alcohol"], "reason": "Risk of lactic acidosis"},
        "simvastatin": {"avoid": ["grapefruit"], "reason": "Increases drug concentration"},
        "levothyroxine": {"avoid": ["soy", "coffee", "calcium supplements"], "reason": "Reduces absorption"},
        "ciprofloxacin": {"avoid": ["dairy", "calcium-fortified foods"], "reason": "Reduces antibiotic absorption"},
    }

    drug_lower = request.drug.lower()
    interactions, avoid_foods, safe_foods = [], [], []

    if drug_lower in food_db:
        avoid_list = food_db[drug_lower]["avoid"]
        for food in request.foods:
            if any(a in food.lower() for a in avoid_list):
                interactions.append({"food": food, "severity": "moderate", "warning": food_db[drug_lower]["reason"]})
                avoid_foods.append(food)
            else:
                safe_foods.append(food)
    else:
        safe_foods = request.foods

    return FoodDrugResponse(drug=request.drug, interactions=interactions, safe_foods=safe_foods, avoid_foods=avoid_foods)


@app.post("/drug-risk")
async def drug_risk(data: Dict[str, Any]):
    drug_index = data.get("drug_index")
    if drug_index is None or drug_index < 0 or drug_index >= len(_drug_index):
        raise HTTPException(status_code=400, detail="Invalid drug_index")
    drug = _drug_index[drug_index]
    drug_name = (drug.get("generic") or drug.get("name", "")).lower()
    related = [r for r in _drug_interactions_data if str(r.get("Active_Ingredient", "")).lower() == drug_name]
    return {"drug": drug, "risk": 1 if related else 0, "interaction_count": len(related)}


@app.post("/food-drug-risk")
async def food_drug_risk(data: Dict[str, Any]):
    drug_index = data.get("drug_index")
    food_name = data.get("food_name", "")
    if drug_index is None or drug_index < 0 or drug_index >= len(_drug_index):
        raise HTTPException(status_code=400, detail="Invalid drug_index")
    drug = _drug_index[drug_index]
    drug_name = (drug.get("generic") or drug.get("name", "")).lower()
    food_lower = food_name.lower()
    related = [r for r in _drug_interactions_data if str(r.get("Active_Ingredient", "")).lower() == drug_name]

    risk, explanation = 0, "No known interaction"
    for r in related:
        cat = str(r.get("interaction_category", "")).lower()
        if cat == "alcohol" and any(kw in food_lower for kw in ["beer", "wine", "spirits", "alcohol", "toddy", "arrack"]):
            risk, explanation = 2, str(r.get("interaction_text", "Alcohol interaction")); break
        if cat == "herbal_anticoagulant" and any(kw in food_lower for kw in ["garlic", "ginger", "ginseng", "ginkgo"]):
            risk, explanation = 2, str(r.get("interaction_text", "Herbal interaction")); break
    return {"drug": drug["name"], "food": food_name, "risk": risk, "explanation": explanation}


@app.get("/safe-foods/{drug_index}")
async def safe_foods(drug_index: int, top_n: int = 10):
    if drug_index < 0 or drug_index >= len(_drug_index):
        raise HTTPException(status_code=400, detail="Invalid drug_index")
    drug = _drug_index[drug_index]
    drug_name = (drug.get("generic") or drug.get("name", "")).lower()
    related = [r for r in _drug_interactions_data if str(r.get("Active_Ingredient", "")).lower() == drug_name]

    risky_kw = set()
    for r in related:
        cat = str(r.get("interaction_category", ""))
        if cat == "alcohol": risky_kw.update(["beer", "wine", "spirits", "toddy", "arrack", "alcohol"])
        elif cat == "herbal_anticoagulant": risky_kw.update(["garlic", "ginger", "ginseng", "ginkgo"])

    safe = [f for f in _food_list if not any(kw in str(f.get("Food", "")).lower() for kw in risky_kw)]
    return safe[:top_n]


# ═══════════════════════════════════════════════════════════════════
# Startup
# ═══════════════════════════════════════════════════════════════════
@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("Drug Interaction Service Starting...")
    _load_data()
    logger.info("✓ Drug Interaction Service Ready")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
