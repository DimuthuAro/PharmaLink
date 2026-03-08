"""
Prescription Interpreter – Lightweight Implementation (FastAPI Service)
=======================================================================
Rewritten pipeline that replaces broken Donut+BERT with:
  - EasyOCR only (more robust for poor-quality scans)
  - Text cleaning module (fixes OCR gibberish)
  - Rule-based drug extractor (fuzzy matching against 148K drug database)
  - Optional lightweight DistilBERT NER (when trained)

Pipeline:
  Image → Preprocessing → EasyOCR → Text Cleaning → Rule Extraction
  (+ optional NER) → Structured Output

Endpoints (unchanged API contract):
  GET  /health                      → Service health check
  POST /prescription/ocr            → OCR + extraction
  POST /prescription/interpret      → Full pipeline
  POST /prescription/enhance        → Image preprocessing
  POST /prescription/analyze-text   → Text-only analysis
  POST /prescription/validate       → Validate prescription data

Usage:
  python -m prescription_interpreter.implementation
  uvicorn prescription_interpreter.implementation:app --port 8003
"""

import io
import re
import json
import time
import base64
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from PIL import Image

import cv2

# ── Local modules ────────────────────────────────────────────────
from .text_cleaner import clean_prescription_text, compute_text_quality_score
from .rule_extractor import (
    extract_medications_from_text,
    extract_all_dosages,
    extract_all_frequencies,
    extract_all_durations,
    ABBREVIATION_MAP,
)

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Console Helpers ──────────────────────────────────────────────
class C:
    RESET = "\033[0m"; BOLD = "\033[1m"; DIM = "\033[2m"
    GREEN = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"
    CYAN = "\033[96m"; WHITE = "\033[97m"; BLUE = "\033[94m"

def ok(msg):   print(f"  {C.GREEN}✔{C.RESET}  {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def fail(msg): print(f"  {C.RED}✖{C.RESET}  {msg}")


# ── Feature flags ────────────────────────────────────────────────
EASYOCR_AVAILABLE = False

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    logger.warning("EasyOCR not found – OCR from images will be unavailable")

# Optional: lightweight NER model
NER_AVAILABLE = False
ner_predictor = None
try:
    from .train_lightweight_ner import LightweightNERPredictor
    ner_predictor = LightweightNERPredictor()
except ImportError:
    pass


# ══════════════════════════════════════════════════════════════════
# OCR Engine (EasyOCR only – simpler, more robust)
# ══════════════════════════════════════════════════════════════════
class OCREngine:
    """Manages EasyOCR for text extraction from prescription images."""

    def __init__(self):
        self._reader = None

    def _load(self):
        if self._reader is not None:
            return
        if not EASYOCR_AVAILABLE:
            return
        try:
            logger.info("Loading EasyOCR model ...")
            self._reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            logger.info("EasyOCR loaded")
        except Exception as e:
            logger.error(f"EasyOCR init failed: {e}")

    def extract_text(self, image_array: np.ndarray) -> Dict[str, Any]:
        """
        Run OCR on image array and return extracted text with confidence.
        Returns {"text": str, "confidence": float, "line_details": list}
        """
        self._load()
        if self._reader is None:
            return {"text": "", "confidence": 0.0, "line_details": [], "error": "EasyOCR not available"}

        try:
            results = self._reader.readtext(image_array)
            lines = []
            confidences = []
            line_details = []

            for bbox, text_seg, conf in results:
                text_seg = text_seg.strip()
                if text_seg:
                    lines.append(text_seg)
                    confidences.append(conf)
                    line_details.append({
                        "text": text_seg,
                        "confidence": round(conf, 3),
                    })

            full_text = "\n".join(lines)
            avg_conf = float(np.mean(confidences)) if confidences else 0.0

            return {
                "text": full_text,
                "confidence": round(avg_conf, 3),
                "line_details": line_details,
            }
        except Exception as e:
            logger.error(f"OCR error: {e}")
            return {"text": "", "confidence": 0.0, "line_details": [], "error": str(e)}


# ══════════════════════════════════════════════════════════════════
# Image Preprocessor
# ══════════════════════════════════════════════════════════════════
class MedicalImagePreprocessor:
    @staticmethod
    def preprocess(image: np.ndarray, enhance_mode: str = "medical") -> np.ndarray:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
        if enhance_mode == "handwritten":
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            denoised = cv2.fastNlMeansDenoising(enhanced, None, 15, 7, 21)
            _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return binary
        elif enhance_mode == "medical":
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            return cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        else:
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return binary


# ══════════════════════════════════════════════════════════════════
# Interpretation Pipeline
# ══════════════════════════════════════════════════════════════════
def interpret_text(raw_text: str) -> Dict[str, Any]:
    """
    Core interpretation pipeline:
      1. Clean OCR text
      2. Extract medications (rule-based + optional NER)
      3. Extract dosages, frequencies, durations
      4. Generate warnings
      5. Return structured result
    """
    # Step 1: Clean text
    cleaned_text = clean_prescription_text(raw_text)
    quality_score = compute_text_quality_score(cleaned_text)

    # Step 2: Rule-based extraction
    medications = extract_medications_from_text(cleaned_text)

    # Step 3: Optional NER augmentation
    ner_entities = {}
    if ner_predictor and ner_predictor.is_available:
        ner_entities = ner_predictor.predict(cleaned_text)
        # Merge NER results that aren't already found
        seen_names = {m["name"].lower() for m in medications}
        for ner_med in ner_entities.get("medications", []):
            name = ner_med.get("text", "")
            if name and name.lower() not in seen_names:
                seen_names.add(name.lower())
                medications.append({
                    "name": name,
                    "dosage": "",
                    "frequency": "",
                    "duration": "",
                    "confidence": round(ner_med.get("score", 0.7) * 100, 1),
                    "match_type": "ner_model",
                })

    # Step 4: Extract standalone entities
    all_dosages = extract_all_dosages(cleaned_text)
    all_frequencies = extract_all_frequencies(cleaned_text)
    all_durations = extract_all_durations(cleaned_text)

    # Step 5: Generate warnings
    warnings = _generate_warnings(medications, cleaned_text)

    # Calculate overall confidence
    if medications:
        avg_med_conf = sum(m.get("confidence", 0) for m in medications) / len(medications)
    else:
        avg_med_conf = 0.0

    overall_confidence = min(100, (quality_score * 0.3) + (avg_med_conf * 0.7))

    return {
        "rawText": raw_text,
        "cleanedText": cleaned_text,
        "medications": medications[:10],
        "dosages": [d["text"] for d in all_dosages],
        "frequencies": [f["text"] for f in all_frequencies],
        "durations": [d["text"] for d in all_durations],
        "instructions": _extract_instructions(cleaned_text),
        "warnings": warnings,
        "confidence": round(overall_confidence, 2),
        "textQuality": round(quality_score, 2),
        "ner_entities": ner_entities,
    }


def _extract_instructions(text: str) -> List[str]:
    """Extract instruction phrases from text."""
    patterns = [
        r'(take\s+(?:with|before|after)\s+(?:food|meals?|water|breakfast|lunch|dinner))',
        r'(avoid\s+(?:alcohol|driving|sunlight|dairy|grapefruit)[\w\s]*)',
        r'(do\s+not\s+[\w\s]+)',
        r'(complete\s+(?:the\s+)?full\s+course[\w\s]*)',
    ]
    results = []
    for p in patterns:
        for m in re.findall(p, text, re.IGNORECASE):
            val = m.strip()
            if val and val not in results:
                results.append(val)
    return results


def _generate_warnings(medications: List[Dict], text: str) -> List[str]:
    """Generate clinical warnings based on extracted medications."""
    warnings = []
    med_names = [m["name"].lower() for m in medications]

    if any("warfarin" in n for n in med_names):
        warnings.append("Warfarin detected – monitor INR, avoid Vitamin K-rich foods")
    if any("metformin" in n for n in med_names):
        warnings.append("Metformin detected – avoid alcohol, monitor kidney function")
    if any("aspirin" in n or "asa" in n for n in med_names):
        if any("warfarin" in n for n in med_names):
            warnings.append("⚠ Aspirin + Warfarin: increased bleeding risk")

    for m in medications:
        if not m.get("dosage"):
            warnings.append(f"Dosage missing for {m['name']} – verify with prescriber")

    # Check for duplicates
    seen = set()
    for n in med_names:
        if n in seen:
            warnings.append(f"Possible duplicate medication: {n}")
        seen.add(n)

    # Low confidence warning
    low_conf = [m for m in medications if m.get("confidence", 0) < 60]
    if low_conf:
        names = ", ".join(m["name"] for m in low_conf)
        warnings.append(f"Low confidence extraction for: {names} – manual review recommended")

    return warnings


# ══════════════════════════════════════════════════════════════════
# Globals
# ══════════════════════════════════════════════════════════════════
ocr_engine = OCREngine()
abbreviations = {}


def load_resources():
    global abbreviations

    # Abbreviation map
    abbrev_path = ARTIFACTS_DIR / "medical_abbreviations.json"
    if abbrev_path.exists():
        with open(abbrev_path, "r", encoding="utf-8") as f:
            abbreviations = json.load(f)
        ok(f"Loaded {len(abbreviations)} abbreviation mappings")

    # Pre-load drug index
    from .rule_extractor import _drug_index
    _drug_index.load()
    ok(f"Drug search index loaded")

    # Check NER model
    if ner_predictor:
        ner_predictor.load()
        if ner_predictor.is_available:
            ok("Lightweight NER model loaded")
        else:
            warn("Lightweight NER model not available – using rule-based extraction only")


# ══════════════════════════════════════════════════════════════════
# FastAPI App
# ══════════════════════════════════════════════════════════════════
app = FastAPI(title="Prescription Interpreter Service", version="2.0.0")


@app.on_event("startup")
async def startup():
    print(f"\n{C.CYAN}{'='*60}{C.RESET}")
    print(f"{C.BOLD}{C.WHITE}  Prescription Interpreter Service v2 – Starting{C.RESET}")
    print(f"{C.CYAN}{'='*60}{C.RESET}\n")
    load_resources()
    print(f"\n  Pipeline: EasyOCR → Text Cleaning → Rule Extraction")
    print(f"    EasyOCR      : {'available' if EASYOCR_AVAILABLE else 'not available'}")
    ner_status = 'available' if (ner_predictor and ner_predictor.is_available) else 'not available (rule-based fallback)'
    print(f"    NER model    : {ner_status}")
    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}  Service ready!{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "service": "Prescription Interpreter ML Service",
        "version": "2.0.0",
        "status": "OK",
        "engines": {
            "easyocr_available": EASYOCR_AVAILABLE,
            "ner_model_available": ner_predictor.is_available if ner_predictor else False,
            "rule_extractor": True,
        },
        "pipeline": "EasyOCR → TextCleaner → RuleExtractor (+ optional NER)",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/prescription/ocr")
async def ocr_prescription(
    file: UploadFile = File(...),
    engine: str = Form(default="auto"),
    enhance_mode: str = Form(default="medical"),
):
    """OCR + extraction from a prescription image."""
    start_time = time.time()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)

        logger.info(f"Processing image: {file.filename}, size: {pil_image.size}")

        # Step 1: Preprocess image
        preprocessor = MedicalImagePreprocessor()
        enhanced = preprocessor.preprocess(image_array, enhance_mode)

        # Step 2: Run OCR
        ocr_result = ocr_engine.extract_text(image_array)
        raw_text = ocr_result.get("text", "")
        ocr_confidence = ocr_result.get("confidence", 0.0)

        if not raw_text.strip():
            # Try on enhanced image
            ocr_result = ocr_engine.extract_text(enhanced)
            raw_text = ocr_result.get("text", "")
            ocr_confidence = ocr_result.get("confidence", 0.0)

        if not raw_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from the image. Please upload a clearer image."
            )

        # Step 3: Interpret extracted text
        interpretation = interpret_text(raw_text)

        processing_time = time.time() - start_time

        return {
            "success": True,
            "interpretation": {
                "rawText": raw_text,
                "cleanedText": interpretation["cleanedText"],
                "medications": interpretation["medications"],
                "dosages": interpretation["dosages"],
                "instructions": interpretation["instructions"],
                "frequencies": interpretation["frequencies"],
                "durations": interpretation["durations"],
                "warnings": interpretation["warnings"],
                "interactions": [],
                "confidence": interpretation["confidence"],
                "imageQuality": min(100, max(0, int(ocr_confidence * 100))),
                "textQuality": interpretation["textQuality"],
            },
            "ner_entities": interpretation["ner_entities"],
            "metadata": {
                "engine": "EasyOCR",
                "enhanceMode": enhance_mode,
                "processingTime": round(processing_time, 3),
                "imageSize": f"{pil_image.size[0]}x{pil_image.size[1]}",
                "fileName": file.filename,
                "pipeline": "EasyOCR → TextCleaner → RuleExtractor",
                "timestamp": datetime.utcnow().isoformat(),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/prescription/interpret")
async def interpret_prescription(
    file: UploadFile = File(...),
    engine: str = Form(default="auto"),
    enhance_mode: str = Form(default="medical"),
):
    """Full pipeline: Image → OCR → Clean → Extract → Warnings."""
    start_time = time.time()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)

        # Step 1: Preprocess
        preprocessor = MedicalImagePreprocessor()
        enhanced = preprocessor.preprocess(image_array, enhance_mode)

        # Step 2: OCR (try original first, then enhanced)
        ocr_result = ocr_engine.extract_text(image_array)
        raw_text = ocr_result.get("text", "")
        ocr_confidence = ocr_result.get("confidence", 0.0)

        if not raw_text.strip() or ocr_confidence < 0.3:
            ocr_result_enhanced = ocr_engine.extract_text(enhanced)
            enhanced_text = ocr_result_enhanced.get("text", "")
            enhanced_conf = ocr_result_enhanced.get("confidence", 0.0)
            if enhanced_conf > ocr_confidence:
                raw_text = enhanced_text
                ocr_confidence = enhanced_conf

        if not raw_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from the image. Please provide a clearer image or enter text manually."
            )

        # Step 3: Interpret
        interpretation = interpret_text(raw_text)

        processing_time = time.time() - start_time

        return {
            "success": True,
            "interpretation": {
                "rawText": raw_text,
                "cleanedText": interpretation["cleanedText"],
                "medications": interpretation["medications"],
                "dosages": interpretation["dosages"],
                "instructions": interpretation["instructions"],
                "frequencies": interpretation["frequencies"],
                "durations": interpretation["durations"],
                "warnings": interpretation["warnings"],
                "interactions": [],
                "confidence": interpretation["confidence"],
                "imageQuality": min(100, max(0, int(ocr_confidence * 100))),
                "textQuality": interpretation["textQuality"],
            },
            "ner_entities": interpretation["ner_entities"],
            "metadata": {
                "engine": "EasyOCR",
                "enhanceMode": enhance_mode,
                "processingTime": round(processing_time, 3),
                "imageSize": f"{pil_image.size[0]}x{pil_image.size[1]}",
                "fileName": file.filename,
                "pipeline": "EasyOCR → TextCleaner → RuleExtractor",
                "models": {
                    "ocr": "EasyOCR v1.7",
                    "ner": "lightweight_distilbert" if (ner_predictor and ner_predictor.is_available) else "rule-based",
                },
                "timestamp": datetime.utcnow().isoformat(),
            },
            "disclaimer": (
                "This tool is for research and educational purposes only. "
                "It is NOT validated for clinical use."
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Interpret error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")


@app.post("/prescription/enhance")
async def enhance_image(
    file: UploadFile = File(...),
    mode: str = Form(default="medical"),
):
    """Enhance prescription image quality."""
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)

        preprocessor = MedicalImagePreprocessor()
        enhanced = preprocessor.preprocess(image_array, enhance_mode=mode)

        enhanced_pil = Image.fromarray(enhanced)
        buf = io.BytesIO()
        enhanced_pil.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "success": True,
            "enhanced_image": f"data:image/png;base64,{b64}",
            "enhancements_applied": [
                "contrast_adjustment", "noise_reduction",
                "adaptive_threshold" if mode == "medical" else "otsu_threshold",
            ],
            "mode": mode,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


class AnalyzeTextRequest(BaseModel):
    prescriptionText: str
    patientInfo: Optional[Dict[str, Any]] = None

@app.post("/prescription/analyze-text")
async def analyze_text(req: AnalyzeTextRequest):
    """Analyze manually-typed prescription text (no image)."""
    interpretation = interpret_text(req.prescriptionText)

    return {
        "inputText": req.prescriptionText,
        "analysis": {
            "medications": interpretation["medications"],
            "dosages": interpretation["dosages"],
            "frequencies": interpretation["frequencies"],
            "durations": interpretation["durations"],
            "instructions": interpretation["instructions"],
            "warnings": interpretation["warnings"],
            "totalMedications": len(interpretation["medications"]),
        },
        "ner_entities": interpretation["ner_entities"],
        "timestamp": datetime.utcnow().isoformat(),
    }


class ValidateRequest(BaseModel):
    prescriptionData: Dict[str, Any]

@app.post("/prescription/validate")
async def validate_prescription(req: ValidateRequest):
    """Validate prescription data structure."""
    data = req.prescriptionData
    result = {"isValid": True, "errors": [], "warnings": [], "score": 100}

    medications = data.get("medications", [])
    if not medications:
        result["errors"].append("No medications specified")
        result["isValid"] = False
        result["score"] -= 30

    if len(medications) > 1:
        result["warnings"].append("Multiple medications – check for interactions")
        result["score"] -= 5

    for med in medications:
        if not med.get("dosage") or not med.get("frequency"):
            result["warnings"].append(f"Incomplete info for {med.get('name', 'unknown')}")
            result["score"] -= 10

    return {
        "prescriptionData": data,
        "validation": result,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Run ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print(f"\n{C.CYAN}Starting Prescription Interpreter Service v2 on port 8003 ...{C.RESET}\n")
    uvicorn.run("prescription_interpreter.implementation:app", host="0.0.0.0", port=8003, reload=True)
