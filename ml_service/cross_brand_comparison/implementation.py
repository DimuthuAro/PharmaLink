"""
Cross-Brand Comparison – Step 4: Implementation (FastAPI Service)
=================================================================
Standalone FastAPI microservice for brand comparison, pricing, and
interchangeability. Loads the trained brand-comparison model and
knowledge-base JSONs built in previous steps.

Endpoints:
  GET  /health                     → Service health check
  POST /compare                    → Compare brands for a generic drug
  GET  /price-history/{brand}      → Simulated price history
  POST /cheapest                   → Find cheapest alternatives
  POST /insurance-coverage         → Compare insurance coverage
  POST /pharmacy-pricing           → Pharmacy-specific pricing
  POST /predict/interchangeability → ML-based brand interchangeability score

Usage:
  python -m cross_brand_comparison.implementation
  uvicorn cross_brand_comparison.implementation:app --port 8002
"""

import json
import random
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

# ── Console Helpers ──────────────────────────────────────────────
class C:
    RESET = "\033[0m"; BOLD = "\033[1m"; DIM = "\033[2m"
    GREEN = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"
    CYAN = "\033[96m"; WHITE = "\033[97m"; BLUE = "\033[94m"

def ok(msg):   print(f"  {C.GREEN}✔{C.RESET}  {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def fail(msg): print(f"  {C.RED}✖{C.RESET}  {msg}")


# ── Knowledge Base ───────────────────────────────────────────────
GENERIC_TO_BRANDS = {}
BRAND_COMPARISON_DB = {}
BRAND_SIMILARITY_INDEX = {}
BRAND_MODEL = None


def load_knowledge_base():
    """Load all JSON knowledge-base files into memory."""
    global GENERIC_TO_BRANDS, BRAND_COMPARISON_DB, BRAND_SIMILARITY_INDEX, BRAND_MODEL

    # Generic-to-brands mapping
    g2b = ARTIFACTS_DIR / "generic_to_brands.json"
    if g2b.exists():
        with open(g2b, "r", encoding="utf-8") as f:
            GENERIC_TO_BRANDS = json.load(f)
        ok(f"generic_to_brands: {len(GENERIC_TO_BRANDS)} generics")
    else:
        warn("generic_to_brands.json not found – comparison will use simulated data")

    # Comparison database
    comp = ARTIFACTS_DIR / "brand_comparison_database.json"
    if comp.exists():
        with open(comp, "r", encoding="utf-8") as f:
            BRAND_COMPARISON_DB = json.load(f)
        ok(f"brand_comparison_database: {len(BRAND_COMPARISON_DB)} entries")
    else:
        warn("brand_comparison_database.json not found")

    # Similarity index
    sim = ARTIFACTS_DIR / "brand_similarity_index.json"
    if sim.exists():
        with open(sim, "r", encoding="utf-8") as f:
            BRAND_SIMILARITY_INDEX = json.load(f)
        ok(f"brand_similarity_index: {len(BRAND_SIMILARITY_INDEX)} entries")
    else:
        warn("brand_similarity_index.json not found")

    # Trained model
    model_path = MODEL_DIR / "brand_comparison_model.pkl"
    if model_path.exists():
        BRAND_MODEL = joblib.load(model_path)
        ok("brand_comparison_model.pkl loaded")
    else:
        warn("brand_comparison_model.pkl not found – ML scoring unavailable")


# ── Pydantic Schemas ─────────────────────────────────────────────
class CompareRequest(BaseModel):
    genericName: str
    location: Optional[str] = None
    insuranceInfo: Optional[dict] = None

class CheapestRequest(BaseModel):
    genericName: str
    maxDistance: Optional[float] = 10.0
    insuranceInfo: Optional[dict] = None

class InsuranceCoverageRequest(BaseModel):
    genericName: str
    insurancePlans: List[str]

class PharmacyPricingRequest(BaseModel):
    genericName: str
    pharmacyChain: Optional[str] = None
    location: Optional[str] = None

class InterchangeabilityRequest(BaseModel):
    genericName: str
    brandA: str
    brandB: str


# ── App ──────────────────────────────────────────────────────────
app = FastAPI(title="Cross-Brand Comparison Service", version="1.0.0")


@app.on_event("startup")
async def startup():
    print(f"\n{C.CYAN}{'='*60}{C.RESET}")
    print(f"{C.BOLD}{C.WHITE}  Cross-Brand Comparison Service – Starting{C.RESET}")
    print(f"{C.CYAN}{'='*60}{C.RESET}\n")
    load_knowledge_base()
    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}  Service ready!{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


# ── Helper Functions ─────────────────────────────────────────────
def _lookup_brands(generic_name: str) -> list:
    """Look up brands for a generic drug name."""
    key = generic_name.strip().upper()
    brands = GENERIC_TO_BRANDS.get(key, [])

    # Fallback: try partial match
    if not brands:
        for g, b_list in GENERIC_TO_BRANDS.items():
            if key in g or g in key:
                brands = b_list
                break

    return brands


def _simulate_brand_comparison(generic_name: str, insurance_info: dict = None) -> dict:
    """Generate comparison from knowledge base or simulate."""
    brands = _lookup_brands(generic_name)

    if brands:
        result = []
        for b in brands[:10]:
            base_price = random.uniform(15, 120)
            result.append({
                "brandName": b.get("brand_name", "Unknown"),
                "manufacturer": b.get("manufacturer", "Unknown"),
                "price": round(base_price, 2),
                "dosageForm": b.get("form", "tablet"),
                "strength": b.get("strength", "10mg"),
                "packageSize": 30,
                "availability": random.choice(["in-stock", "in-stock", "limited"]),
                "rating": round(random.uniform(3.0, 5.0), 1),
                "therapeuticClass": b.get("therapeutic_class", "Unknown"),
                "insuranceCovered": bool(insurance_info) and random.random() > 0.3,
                "copay": round(random.uniform(5, 25), 2) if insurance_info else None,
            })
    else:
        result = [
            {
                "brandName": f"Brand A {generic_name}",
                "manufacturer": "Pharma Corp A",
                "price": round(random.uniform(30, 120), 2),
                "dosageForm": "tablet", "strength": "10mg", "packageSize": 30,
                "availability": "in-stock",
                "rating": round(random.uniform(3, 5), 1),
                "therapeuticClass": "General",
                "insuranceCovered": bool(insurance_info) and random.random() > 0.3,
                "copay": round(random.uniform(5, 20), 2) if insurance_info else None,
            },
            {
                "brandName": f"Generic {generic_name}",
                "manufacturer": "Generic Pharma",
                "price": round(random.uniform(10, 50), 2),
                "dosageForm": "tablet", "strength": "10mg", "packageSize": 30,
                "availability": "in-stock",
                "rating": round(random.uniform(3, 5), 1),
                "therapeuticClass": "General",
                "insuranceCovered": bool(insurance_info) and random.random() > 0.2,
                "copay": round(random.uniform(3, 15), 2) if insurance_info else None,
            },
        ]

    result.sort(key=lambda b: b["price"])

    prices = [b["price"] for b in result]
    return {
        "totalBrandsFound": len(result),
        "brands": result,
        "priceRange": {"min": min(prices), "max": max(prices)},
        "averagePrice": round(sum(prices) / len(prices), 2),
    }


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "service": "Cross-Brand Comparison ML Service",
        "status": "OK",
        "knowledgeBase": {
            "generics": len(GENERIC_TO_BRANDS),
            "comparisons": len(BRAND_COMPARISON_DB),
            "modelLoaded": BRAND_MODEL is not None,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/compare")
async def compare_brands(req: CompareRequest):
    comparison = _simulate_brand_comparison(req.genericName, req.insuranceInfo)
    return {
        "genericName": req.genericName,
        "comparison": comparison,
        "location": req.location,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/price-history/{brand_name}")
async def price_history(brand_name: str, timeframe: str = "6months"):
    months = 12 if timeframe == "1year" else 6
    history = []
    base_price = random.uniform(50, 130)

    for i in range(months, -1, -1):
        dt = datetime.utcnow() - timedelta(days=30 * i)
        base_price += random.uniform(-5, 5)
        base_price = max(base_price, 20)
        history.append({"date": dt.strftime("%Y-%m-%d"), "price": round(base_price, 2)})

    return {
        "brandName": brand_name,
        "timeframe": timeframe,
        "priceHistory": history,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/cheapest")
async def cheapest_options(req: CheapestRequest):
    brands = _lookup_brands(req.genericName)
    options = []

    pharmacies = ["CityPharma", "HealthMart", "MedPlus", "PharmaCare"]
    for pharm in pharmacies[:3]:
        brand_pick = brands[0]["brand_name"] if brands else f"Generic {req.genericName}"
        price = round(random.uniform(10, 60), 2)
        covered = bool(req.insuranceInfo) and random.random() > 0.3
        options.append({
            "pharmacy": pharm,
            "address": f"{random.randint(100,999)} Main St",
            "distance": round(random.uniform(0.5, req.maxDistance), 1),
            "brandName": brand_pick,
            "price": price,
            "insuranceCovered": covered,
            "finalPrice": round(random.uniform(5, 15), 2) if covered else price,
            "discountsAvailable": ["Loyalty program"],
        })

    options.sort(key=lambda o: o["finalPrice"])

    return {
        "genericName": req.genericName,
        "cheapestOptions": options,
        "searchRadius": req.maxDistance,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/insurance-coverage")
async def insurance_coverage(req: InsuranceCoverageRequest):
    coverage = []
    for plan in req.insurancePlans:
        coverage.append({
            "planName": plan,
            "covered": random.random() > 0.2,
            "tier": random.randint(1, 4),
            "copay": round(random.uniform(5, 30), 2),
            "coinsurance": round(random.uniform(0.1, 0.3), 2),
            "deductibleApplies": random.random() > 0.6,
            "priorAuthRequired": random.random() > 0.8,
            "quantityLimits": "30-day supply" if random.random() > 0.7 else None,
        })

    return {
        "genericName": req.genericName,
        "coverageComparison": coverage,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/pharmacy-pricing")
async def pharmacy_pricing(req: PharmacyPricingRequest):
    base = round(random.uniform(30, 110), 2)
    return {
        "genericName": req.genericName,
        "pharmacyChain": req.pharmacyChain,
        "pricing": {
            "retailPrice": base,
            "memberPrice": round(base * 0.9, 2),
            "cashDiscount": round(base * 0.85, 2),
            "priceMatchPolicy": random.random() > 0.5,
            "discountPrograms": ["Rewards", "Generic discount", "Senior discount"],
            "estimatedSavings": round(random.uniform(5, 20), 2),
            "lastUpdated": datetime.utcnow().isoformat(),
        },
        "location": req.location,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/predict/interchangeability")
async def predict_interchangeability(req: InterchangeabilityRequest):
    """ML-based brand interchangeability scoring."""
    if BRAND_MODEL is None:
        raise HTTPException(status_code=503, detail="Brand comparison model not loaded. Train the model first.")

    # Lookup both brands in the knowledge base
    brands = _lookup_brands(req.genericName)
    brand_a_info = next((b for b in brands if b.get("brand_name", "").upper() == req.brandA.upper()), None)
    brand_b_info = next((b for b in brands if b.get("brand_name", "").upper() == req.brandB.upper()), None)

    same_form = 1 if (brand_a_info and brand_b_info and brand_a_info.get("form") == brand_b_info.get("form")) else 0
    same_class = 1 if (brand_a_info and brand_b_info and brand_a_info.get("therapeutic_class") == brand_b_info.get("therapeutic_class")) else 0
    same_action = 1 if (brand_a_info and brand_b_info and brand_a_info.get("action_class") == brand_b_info.get("action_class")) else 0
    brand_count = len(brands) if brands else 1
    therapeutic_class = brand_a_info.get("therapeutic_class", "Unknown") if brand_a_info else "Unknown"

    features = pd.DataFrame([{
        "same_form": same_form,
        "same_class": same_class,
        "same_action": same_action,
        "brand_count": brand_count,
        "therapeutic_class": therapeutic_class,
    }])

    prediction = int(BRAND_MODEL.predict(features)[0])
    probabilities = BRAND_MODEL.predict_proba(features)[0].tolist()

    return {
        "genericName": req.genericName,
        "brandA": req.brandA,
        "brandB": req.brandB,
        "interchangeable": bool(prediction),
        "confidence": round(max(probabilities) * 100, 1),
        "probabilities": {
            "notInterchangeable": round(probabilities[0] * 100, 1),
            "interchangeable": round(probabilities[1] * 100, 1),
        },
        "features": {
            "sameForm": bool(same_form),
            "sameClass": bool(same_class),
            "sameAction": bool(same_action),
            "brandCount": brand_count,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Run ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print(f"\n{C.CYAN}Starting Cross-Brand Comparison Service on port 8002 ...{C.RESET}\n")
    uvicorn.run("cross_brand_comparison.implementation:app", host="0.0.0.0", port=8002, reload=True)
