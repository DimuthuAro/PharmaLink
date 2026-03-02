"""
Treatment Identifier – Step 4: Model Implementation (Inference Service)
=========================================================================
Standalone FastAPI service for identifying treatments/conditions from
prescription text or a list of medications.

Uses a three-tier approach:
  1. Curated knowledge base lookup (highest confidence)
  2. ML model prediction (multi-label classifier)
  3. Drug suffix pattern matching (fallback)

Capabilities:
  - Identify treatments/conditions from medication names
  - Parse prescription text and extract medications + conditions
  - Provide treatment area classification
  - Multi-medication analysis with combined condition summary

Endpoints:
  GET  /health                      – Service health check
  POST /identify                    – Identify treatments from medication list
  POST /identify-from-text          – Parse prescription text & identify treatments
  POST /medication-conditions       – Get conditions for a single medication
  GET  /supported-conditions        – List all supported conditions

Usage:
  uvicorn treatment_identifier.implementation:app --host 0.0.0.0 --port 8004 --reload
  python -m treatment_identifier.implementation
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
    title="PharmaLink – Treatment Identifier Service",
    version="1.0.0",
    description="Identify treatments and conditions from prescription medications",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


# ── Request/Response Models ──────────────────────────────────────
class IdentifyRequest(BaseModel):
    medications: List[str]

class IdentifyFromTextRequest(BaseModel):
    prescription_text: str

class MedicationConditionRequest(BaseModel):
    medication: str

class ConditionResult(BaseModel):
    condition: str
    confidence: float
    treatment_area: str

class MedicationResult(BaseModel):
    medication: str
    generic_name: str
    conditions: List[ConditionResult]
    source: str

class IdentifyResponse(BaseModel):
    success: bool
    medications: List[MedicationResult]
    combined_conditions: List[ConditionResult]
    likely_treatment_summary: str
    processing_time_ms: float

class IdentifyFromTextResponse(BaseModel):
    success: bool
    extracted_medications: List[str]
    medications: List[MedicationResult]
    combined_conditions: List[ConditionResult]
    likely_treatment_summary: str
    processing_time_ms: float


# ═══════════════════════════════════════════════════════════════════
# Drug Suffix Pattern Knowledge Base (fallback)
# ═══════════════════════════════════════════════════════════════════
SUFFIX_PATTERNS = {
    r"cillin$": {"conditions": ["Bacterial Infection"], "area": "Infectious Disease"},
    r"mycin$": {"conditions": ["Bacterial Infection"], "area": "Infectious Disease"},
    r"floxacin$": {"conditions": ["Bacterial Infection", "UTI"], "area": "Infectious Disease"},
    r"cycline$": {"conditions": ["Bacterial Infection", "Acne"], "area": "Infectious Disease"},
    r"azole$": {"conditions": ["Fungal Infection"], "area": "Infectious Disease"},
    r"statin$": {"conditions": ["Hyperlipidemia", "High Cholesterol"], "area": "Cardiovascular"},
    r"sartan$": {"conditions": ["Hypertension"], "area": "Cardiovascular"},
    r"pril$": {"conditions": ["Hypertension", "Heart Failure"], "area": "Cardiovascular"},
    r"olol$": {"conditions": ["Hypertension", "Angina"], "area": "Cardiovascular"},
    r"dipine$": {"conditions": ["Hypertension", "Angina"], "area": "Cardiovascular"},
    r"prazole$": {"conditions": ["GERD", "Peptic Ulcer"], "area": "Gastroenterology"},
    r"tidine$": {"conditions": ["GERD", "Peptic Ulcer"], "area": "Gastroenterology"},
    r"gliptin$": {"conditions": ["Type 2 Diabetes"], "area": "Endocrinology"},
    r"gliflozin$": {"conditions": ["Type 2 Diabetes"], "area": "Endocrinology"},
    r"formin$": {"conditions": ["Type 2 Diabetes"], "area": "Endocrinology"},
    r"setron$": {"conditions": ["Nausea", "Vomiting"], "area": "Gastroenterology"},
    r"triptan$": {"conditions": ["Migraine"], "area": "Neurology"},
    r"pam$": {"conditions": ["Anxiety", "Insomnia"], "area": "Psychiatry"},
    r"zepine$": {"conditions": ["Epilepsy", "Bipolar Disorder"], "area": "Neurology"},
    r"vir$|ciclovir$": {"conditions": ["Viral Infection", "Herpes"], "area": "Infectious Disease"},
    r"mab$": {"conditions": ["Autoimmune Disease", "Cancer"], "area": "Oncology / Immunology"},
    r"nib$": {"conditions": ["Cancer"], "area": "Oncology"},
    r"sone$|solone$": {"conditions": ["Inflammation", "Autoimmune Disease"], "area": "Rheumatology"},
    r"coxib$": {"conditions": ["Arthritis", "Pain"], "area": "Pain Management"},
    r"profen$": {"conditions": ["Pain", "Inflammation", "Fever"], "area": "Pain Management"},
    r"phylline$": {"conditions": ["Asthma", "COPD"], "area": "Respiratory"},
    r"lukast$": {"conditions": ["Asthma", "Allergic Rhinitis"], "area": "Respiratory"},
    r"zine$": {"conditions": ["Allergy", "Allergic Rhinitis"], "area": "Respiratory"},
    r"semide$": {"conditions": ["Edema", "Heart Failure"], "area": "Cardiovascular"},
}

# Common medication keywords for text extraction
MEDICATION_REGEX = re.compile(
    r'\b([A-Z][a-z]{2,}(?:\s+(?:SR|CR|ER|XR|XL|LA|MD|DT|OD|PR|MR|DS|CV|OZ|SP|HP))?'
    r'(?:\s+\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|iu|%|units?))?)\b'
)


# ═══════════════════════════════════════════════════════════════════
# Data Loading
# ═══════════════════════════════════════════════════════════════════
_knowledge_base: Dict[str, Dict] = {}
_drug_index: List[Dict] = []
_brand_to_generic: Dict[str, str] = {}
_ml_model = None
_label_encoder = None
_feature_transformers = None
_supported_conditions: List[str] = []


def _load_data():
    global _knowledge_base, _drug_index, _brand_to_generic
    global _ml_model, _label_encoder, _feature_transformers, _supported_conditions

    # Load knowledge base
    kb_file = ARTIFACTS_DIR / "treatment_knowledge_base.json"
    if kb_file.exists():
        with open(kb_file, "r", encoding="utf-8") as f:
            _knowledge_base.update(json.load(f))
        logger.info(f"Loaded treatment knowledge base: {len(_knowledge_base)} entries")

    # Load drug search index for brand→generic resolution
    idx_file = ARTIFACTS_DIR / "drug_search_index.json"
    if idx_file.exists():
        with open(idx_file, "r", encoding="utf-8") as f:
            _drug_index.extend(json.load(f))
        logger.info(f"Loaded drug index: {len(_drug_index)} entries")

    # Build brand→generic lookup
    for entry in _drug_index:
        name_lower = entry.get("name", "").lower().strip()
        if entry.get("type") == "brand" and entry.get("generic"):
            _brand_to_generic[name_lower] = entry["generic"].lower().strip()
        elif entry.get("type") == "generic":
            _brand_to_generic[name_lower] = name_lower
    logger.info(f"Built brand→generic lookup: {len(_brand_to_generic)} entries")

    # Load ML model
    model_path = MODEL_DIR / "treatment_identifier_model.pkl"
    if model_path.exists():
        _ml_model = joblib.load(model_path)
        logger.info("Loaded treatment identifier ML model")

    encoder_path = MODEL_DIR / "treatment_label_encoder.pkl"
    if encoder_path.exists():
        _label_encoder = joblib.load(encoder_path)
        _supported_conditions = list(_label_encoder.classes_)
        logger.info(f"Loaded label encoder: {len(_supported_conditions)} conditions")

    transformers_path = MODEL_DIR / "treatment_feature_transformers.pkl"
    if transformers_path.exists():
        _feature_transformers = joblib.load(transformers_path)
        logger.info("Loaded feature transformers")

    # Load metadata for supported conditions (fallback if no label encoder)
    if not _supported_conditions:
        meta_path = MODEL_DIR / "treatment_identifier_metadata.json"
        if meta_path.exists():
            with open(meta_path, "r") as f:
                meta = json.load(f)
                _supported_conditions = meta.get("conditions", [])


# ═══════════════════════════════════════════════════════════════════
# Resolution & Prediction Functions
# ═══════════════════════════════════════════════════════════════════
def _resolve_generic(drug_name: str) -> str:
    """Resolve a drug name (brand or generic) to its generic name."""
    name = drug_name.lower().strip()
    if name in _brand_to_generic:
        return _brand_to_generic[name]
    # Try stripping dosage info
    stripped = re.sub(r'\s+\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|iu)\b.*$', '', name, flags=re.IGNORECASE).strip()
    if stripped in _brand_to_generic:
        return _brand_to_generic[stripped]
    # Try stripping suffixes like SR, CR, etc.
    stripped2 = re.sub(r'\s+(?:SR|CR|ER|XR|XL|LA|MD|DT|OD|PR|MR|DS|CV|OZ|SP)$', '', stripped, flags=re.IGNORECASE).strip()
    if stripped2 in _brand_to_generic:
        return _brand_to_generic[stripped2]
    return name


def _get_drug_class(generic: str) -> tuple:
    """Get therapeutic and action class for a generic drug."""
    for entry in _drug_index:
        entry_generic = entry.get("generic", "").lower().strip()
        entry_name = entry.get("name", "").lower().strip()
        if entry_generic == generic or entry_name == generic:
            return (
                entry.get("class", "Unknown"),
                entry.get("class", "Unknown"),  # action class from same field
            )
    return ("Unknown", "Unknown")


def identify_conditions_for_drug(drug_name: str) -> MedicationResult:
    """Identify conditions/treatments for a single medication."""
    generic = _resolve_generic(drug_name)
    conditions = []
    source = "none"

    # Tier 1: Knowledge base lookup (highest confidence)
    if generic in _knowledge_base:
        kb_entry = _knowledge_base[generic]
        source = kb_entry.get("source", "knowledge_base")
        confidence = kb_entry.get("confidence", 0.90)
        treatment_area = kb_entry.get("treatment_area", "General Medicine")
        for cond in kb_entry.get("conditions", []):
            conditions.append(ConditionResult(
                condition=cond,
                confidence=confidence,
                treatment_area=treatment_area,
            ))

    # Tier 2: ML model prediction (if no knowledge base hit)
    if not conditions and _ml_model and _feature_transformers and _label_encoder:
        try:
            from scipy.sparse import hstack
            tfidf = _feature_transformers["tfidf"]
            tc_encoder = _feature_transformers["tc_encoder"]
            ac_encoder = _feature_transformers["ac_encoder"]

            tc, ac = _get_drug_class(generic)
            X_name = tfidf.transform([generic])
            X_tc = tc_encoder.transform(pd.DataFrame({"therapeutic_class": [tc]}))
            X_ac = ac_encoder.transform(pd.DataFrame({"action_class": [ac]}))
            X = hstack([X_name, X_tc, X_ac])

            pred_proba = []
            for estimator in _ml_model.estimators_:
                if hasattr(estimator, "predict_proba"):
                    prob = estimator.predict_proba(X)[0]
                    pred_proba.append(prob[1] if len(prob) > 1 else prob[0])
                else:
                    pred_proba.append(float(estimator.predict(X)[0]))

            for i, prob in enumerate(pred_proba):
                if prob >= 0.3 and i < len(_label_encoder.classes_):
                    conditions.append(ConditionResult(
                        condition=_label_encoder.classes_[i],
                        confidence=round(float(prob), 3),
                        treatment_area=_infer_area(_label_encoder.classes_[i]),
                    ))

            if conditions:
                source = "ml_model"
                conditions.sort(key=lambda x: x.confidence, reverse=True)
        except Exception as e:
            logger.warning(f"ML prediction failed for {generic}: {e}")

    # Tier 3: Suffix pattern matching (fallback)
    if not conditions:
        for pattern, info in SUFFIX_PATTERNS.items():
            if re.search(pattern, generic, re.IGNORECASE):
                source = "suffix_pattern"
                for cond in info["conditions"]:
                    conditions.append(ConditionResult(
                        condition=cond,
                        confidence=0.60,
                        treatment_area=info.get("area", "General Medicine"),
                    ))
                break

    # Fallback: try to use the drug class from search index
    if not conditions:
        tc, _ = _get_drug_class(generic)
        if tc and tc != "Unknown":
            from .extract_data import THERAPEUTIC_CLASS_CONDITIONS
            tc_upper = tc.upper().strip()
            if tc_upper in THERAPEUTIC_CLASS_CONDITIONS:
                source = "drug_class"
                tc_info = THERAPEUTIC_CLASS_CONDITIONS[tc_upper]
                for cond in tc_info["conditions"]:
                    conditions.append(ConditionResult(
                        condition=cond,
                        confidence=0.70,
                        treatment_area=tc_info["treatment_area"],
                    ))

    return MedicationResult(
        medication=drug_name,
        generic_name=generic,
        conditions=conditions,
        source=source,
    )


def _infer_area(condition: str) -> str:
    """Infer treatment area from condition name."""
    area_map = {
        "diabetes": "Endocrinology", "hypertension": "Cardiovascular",
        "infection": "Infectious Disease", "pain": "Pain Management",
        "epilepsy": "Neurology", "anxiety": "Psychiatry",
        "asthma": "Respiratory", "gerd": "Gastroenterology",
        "cancer": "Oncology", "anemia": "Hematology",
        "arthritis": "Rheumatology", "depression": "Psychiatry",
        "heart": "Cardiovascular", "fungal": "Infectious Disease",
        "allergy": "Allergy / Immunology", "ulcer": "Gastroenterology",
        "migraine": "Neurology", "insomnia": "Psychiatry",
        "cholesterol": "Cardiovascular", "fever": "General Medicine",
    }
    cond_lower = condition.lower()
    for keyword, area in area_map.items():
        if keyword in cond_lower:
            return area
    return "General Medicine"


def _build_treatment_summary(combined: List[ConditionResult]) -> str:
    """Build a human-readable treatment summary from combined conditions."""
    if not combined:
        return "Unable to determine treatment from the provided medications."

    # Group by treatment area
    areas = {}
    for c in combined:
        area = c.treatment_area
        if area not in areas:
            areas[area] = []
        areas[area].append(c.condition)

    parts = []
    for area, conds in sorted(areas.items(), key=lambda x: -len(x[1])):
        unique_conds = list(dict.fromkeys(conds))  # preserve order, remove dupes
        if len(unique_conds) == 1:
            parts.append(f"{area}: {unique_conds[0]}")
        else:
            parts.append(f"{area}: {', '.join(unique_conds[:3])}")

    return "Likely treatment areas – " + "; ".join(parts)


def extract_medications_from_text(text: str) -> List[str]:
    """Extract medication names from prescription text."""
    medications = []
    seen = set()

    # Try to match against known drugs in the index
    text_lower = text.lower()
    for entry in _drug_index:
        name = entry.get("name", "")
        name_lower = name.lower()
        if len(name_lower) >= 3 and name_lower in text_lower and name_lower not in seen:
            seen.add(name_lower)
            medications.append(name)

    # If no matches from index, try regex-based extraction
    if not medications:
        # Split by common delimiters
        lines = re.split(r'[\n,;]+', text)
        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue
            # Extract the drug name part (before dosage)
            m = re.match(r'^([A-Za-z][A-Za-z\s\-]+?)(?:\s+\d|\s*$)', line)
            if m:
                drug_candidate = m.group(1).strip()
                if len(drug_candidate) >= 3 and drug_candidate.lower() not in seen:
                    seen.add(drug_candidate.lower())
                    medications.append(drug_candidate)

    return medications[:20]  # Cap at 20 medications


# ═══════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════
@app.get("/health")
async def health_check():
    return {
        "service": "Treatment Identifier Service",
        "status": "healthy",
        "knowledge_base_size": len(_knowledge_base),
        "drug_index_size": len(_drug_index),
        "ml_model_loaded": _ml_model is not None,
        "supported_conditions": len(_supported_conditions),
    }


@app.post("/identify", response_model=IdentifyResponse)
async def identify_treatments(request: IdentifyRequest):
    """Identify treatments/conditions from a list of medication names."""
    start = time.time()

    if not request.medications:
        raise HTTPException(status_code=400, detail="At least 1 medication is required")

    results = []
    all_conditions = []

    for med in request.medications:
        result = identify_conditions_for_drug(med)
        results.append(result)
        all_conditions.extend(result.conditions)

    # Deduplicate and rank combined conditions
    combined = _dedupe_conditions(all_conditions)
    summary = _build_treatment_summary(combined)

    return IdentifyResponse(
        success=True,
        medications=results,
        combined_conditions=combined,
        likely_treatment_summary=summary,
        processing_time_ms=round((time.time() - start) * 1000, 2),
    )


@app.post("/identify-from-text", response_model=IdentifyFromTextResponse)
async def identify_from_text(request: IdentifyFromTextRequest):
    """Parse prescription text, extract medications, and identify treatments."""
    start = time.time()

    if not request.prescription_text.strip():
        raise HTTPException(status_code=400, detail="Prescription text is required")

    extracted = extract_medications_from_text(request.prescription_text)

    results = []
    all_conditions = []

    for med in extracted:
        result = identify_conditions_for_drug(med)
        results.append(result)
        all_conditions.extend(result.conditions)

    combined = _dedupe_conditions(all_conditions)
    summary = _build_treatment_summary(combined)

    return IdentifyFromTextResponse(
        success=True,
        extracted_medications=extracted,
        medications=results,
        combined_conditions=combined,
        likely_treatment_summary=summary,
        processing_time_ms=round((time.time() - start) * 1000, 2),
    )


@app.post("/medication-conditions")
async def medication_conditions(request: MedicationConditionRequest):
    """Get conditions for a single medication."""
    result = identify_conditions_for_drug(request.medication)
    return {
        "medication": result.medication,
        "generic_name": result.generic_name,
        "conditions": [c.dict() for c in result.conditions],
        "source": result.source,
    }


@app.get("/supported-conditions")
async def supported_conditions():
    """List all conditions the service can identify."""
    # Gather from knowledge base
    all_conditions = set()
    for entry in _knowledge_base.values():
        for cond in entry.get("conditions", []):
            all_conditions.add(cond)

    # Also from ML model if available
    all_conditions.update(_supported_conditions)

    return {
        "total": len(all_conditions),
        "conditions": sorted(all_conditions),
    }


def _dedupe_conditions(conditions: List[ConditionResult]) -> List[ConditionResult]:
    """Deduplicate conditions, keeping highest confidence for each."""
    best = {}
    for c in conditions:
        key = c.condition.lower()
        if key not in best or c.confidence > best[key].confidence:
            best[key] = c

    return sorted(best.values(), key=lambda x: x.confidence, reverse=True)


# ═══════════════════════════════════════════════════════════════════
# Startup
# ═══════════════════════════════════════════════════════════════════
@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("Treatment Identifier Service Starting...")
    _load_data()
    logger.info("✓ Treatment Identifier Service Ready")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
