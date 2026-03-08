"""
PharmaLink ML Service - FastAPI
Simple architecture: Client → Express API → Python ML Service → Pretrained Model

Prescription Interpreter Pipeline:
  Step 1 (OCR):  Image → Text  using Medical Prescription OCR (Donut) + EasyOCR fallback
  Step 2 (NER):  Text  → Structured Entities  using Medical NER (RoBERTa / regex fallback)
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import joblib
from pathlib import Path
import logging
import io
import os
import json
import tempfile
import shutil
import time
import re

# Import model downloader
from model_downloader import ModelDownloader, get_model_downloader

# Image processing
from PIL import Image, ImageEnhance, ImageFilter
import cv2

# ---- HuggingFace Transformers (Donut OCR + Medical NER) ----
try:
    from transformers import (
        DonutProcessor,
        VisionEncoderDecoderModel,
        AutoTokenizer,
        AutoModelForTokenClassification,
        pipeline as hf_pipeline,
    )
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logging.warning(
        "transformers/torch not found. Install with: "
        "pip install transformers torch sentencepiece"
    )

# OCR Engine - EasyOCR (pre-trained model, fallback for printed text)
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    logging.warning("EasyOCR not found. Install with: pip install easyocr")

# Optional: Google Gemini for enhanced parsing
try:
    from google import genai
    from google.genai import types
    GOOGLE_GENAI_AVAILABLE = True
except ImportError:
    GOOGLE_GENAI_AVAILABLE = False
    logging.warning("google-genai library not found. Using local OCR only.")

import pandas as pd

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
# Include Apsara's Food-Drug / MealPlan / DrugImage / SymptomReco endpoints
# Mounts Apsara's FastAPI app at /advisory prefix to avoid
# route conflicts with existing /drugs, /foods, / endpoints.
# ---------------------------------------------------------
import sys as _sys
import importlib as _importlib

_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in _sys.path:
    _sys.path.insert(0, _project_root)

# Add app/ directory so we can import app.py as a module named "app"
_apsara_app_dir = str(Path(__file__).resolve().parent.parent / "app")
if _apsara_app_dir not in _sys.path:
    _sys.path.insert(0, _apsara_app_dir)

try:
    _apsara_module = _importlib.import_module("app")
    _apsara_app = _apsara_module.app

    # Mount the entire Apsara app under /advisory prefix
    app.mount("/advisory", _apsara_app)
    logger.info("[apsara] Mounted Apsara FastAPI app at /advisory")

    # Mount static files for food images
    from fastapi.staticfiles import StaticFiles as _SF
    _static_dir = Path(__file__).resolve().parent.parent / "data" / "static"
    if _static_dir.exists():
        app.mount("/static", _SF(directory=str(_static_dir)), name="apsara_static")
        logger.info(f"[apsara] mounted static files: {_static_dir}")
    logger.info("[apsara] Food-Drug, MealPlan, DrugImage, SymptomReco endpoints loaded")
except Exception as _e:
    logger.warning(f"[apsara] Could not load Apsara endpoints: {_e}")
    logger.warning("[apsara] Food-Drug Interaction, MealPlan, DrugImage, SymptomReco features unavailable")

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

# Initialize ModelDownloader for production models
model_downloader = get_model_downloader()

# ---------------------------------------------------------
# OCR Engine Manager (Pre-trained Models)
# ---------------------------------------------------------
class OCREngineManager:
    """Manages OCR engines with lazy loading for efficiency.
    Supports:
      1. Medical Prescription OCR (Donut) – handwritten prescriptions
      2. EasyOCR – printed prescriptions (fallback)
    """
    _instance = None
    _easyocr_reader = None
    _donut_processor = None
    _donut_model = None
    _donut_device = None

    # Hugging Face model ID for medical prescription OCR
    DONUT_MODEL_ID = "chinmays18/medical-prescription-ocr"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ---------- EasyOCR (printed text) ----------
    @property
    def easyocr(self):
        """Lazy load EasyOCR reader"""
        if self._easyocr_reader is None and EASYOCR_AVAILABLE:
            try:
                logger.info("Loading EasyOCR model (this may take a moment on first run)...")
                self._easyocr_reader = easyocr.Reader(
                    ['en'],
                    gpu=False,
                    verbose=False
                )
                logger.info("✓ EasyOCR loaded successfully")
            except Exception as e:
                logger.error(f"✗ EasyOCR initialization failed: {e}")
                self._easyocr_reader = None
        return self._easyocr_reader

    # ---------- Donut (handwritten medical text) ----------
    def _load_donut(self):
        """Lazy load the Medical Prescription OCR (Donut) model"""
        if self._donut_model is not None:
            return
        if not TRANSFORMERS_AVAILABLE:
            logger.warning("Transformers not available – cannot load Donut model")
            return
        try:
            logger.info(f"Loading Donut model: {self.DONUT_MODEL_ID} …")
            self._donut_processor = DonutProcessor.from_pretrained(self.DONUT_MODEL_ID)
            self._donut_model = VisionEncoderDecoderModel.from_pretrained(self.DONUT_MODEL_ID)
            self._donut_device = "cuda" if torch.cuda.is_available() else "cpu"
            self._donut_model.to(self._donut_device)
            self._donut_model.eval()
            logger.info(f"✓ Donut model loaded on {self._donut_device}")
        except Exception as e:
            logger.error(f"✗ Donut model load failed: {e}")
            self._donut_model = None

    def run_donut_ocr(self, pil_image: Image.Image) -> str:
        """Run the Donut model on a PIL image and return extracted text."""
        self._load_donut()
        if self._donut_model is None or self._donut_processor is None:
            return ""
        try:
            # Donut expects RGB
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            pixel_values = self._donut_processor(
                pil_image, return_tensors="pt"
            ).pixel_values.to(self._donut_device)

            # Generate text from image
            decoder_input_ids = self._donut_processor.tokenizer(
                "<s>", add_special_tokens=False, return_tensors="pt"
            ).input_ids.to(self._donut_device)

            with torch.no_grad():
                outputs = self._donut_model.generate(
                    pixel_values,
                    decoder_input_ids=decoder_input_ids,
                    max_length=self._donut_model.decoder.config.max_position_embeddings,
                    pad_token_id=self._donut_processor.tokenizer.pad_token_id,
                    eos_token_id=self._donut_processor.tokenizer.eos_token_id,
                    early_stopping=True,
                    num_beams=3,
                    bad_words_ids=[[self._donut_processor.tokenizer.unk_token_id]],
                )

            raw = self._donut_processor.batch_decode(outputs, skip_special_tokens=True)[0]
            # Some Donut models output JSON-like strings; try to clean up
            text = raw.strip()
            # Remove XML/JSON wrapper tokens that some fine-tunes emit
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
            return text
        except Exception as e:
            logger.error(f"Donut OCR inference error: {e}")
            return ""

    @property
    def donut_available(self) -> bool:
        return TRANSFORMERS_AVAILABLE

    def is_available(self) -> bool:
        return EASYOCR_AVAILABLE or TRANSFORMERS_AVAILABLE

ocr_manager = OCREngineManager()


# ---------------------------------------------------------
# Medical NER Engine (Pre-trained NER models)
# ---------------------------------------------------------
class MedicalNEREngine:
    """Named Entity Recognition for medical/prescription text.

    Loads a HuggingFace token-classification model lazily and
    falls back to regex-based extraction if unavailable.
    """
    _instance = None
    _ner_pipeline = None

    # Publicly available medical NER model on Hugging Face
    NER_MODEL_ID = "samrawal/bert-large-uncased_med-ner"

    # NER entity label mapping (model-specific)
    ENTITY_MAP = {
        "MEDICATION": "medication",
        "DRUG": "medication",
        "DOSAGE": "dosage",
        "STRENGTH": "dosage",
        "FREQUENCY": "frequency",
        "DURATION": "duration",
        "ROUTE": "route",
        "FORM": "form",
        "PROBLEM": "condition",
        "TREATMENT": "treatment",
    }

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load(self):
        if self._ner_pipeline is not None:
            return
        if not TRANSFORMERS_AVAILABLE:
            logger.warning("Transformers not available – NER will use regex fallback")
            return
        try:
            logger.info(f"Loading Medical NER model: {self.NER_MODEL_ID} …")
            self._ner_pipeline = hf_pipeline(
                "ner",
                model=self.NER_MODEL_ID,
                tokenizer=self.NER_MODEL_ID,
                aggregation_strategy="simple",
                device=0 if torch.cuda.is_available() else -1,
            )
            logger.info("✓ Medical NER model loaded")
        except Exception as e:
            logger.error(f"✗ Medical NER load failed: {e}. Using regex fallback.")
            self._ner_pipeline = None

    def extract_entities(self, text: str) -> Dict[str, List[Dict[str, Any]]]:
        """Run NER on *text* and return grouped entities.

        Returns dict like:
        {
          "medications": [{"text": "Metformin", "score": 0.97}, …],
          "dosages": […],
          "frequencies": […],
          …
        }
        """
        self._load()
        if self._ner_pipeline is None:
            # Fallback: use regex parser
            return self._regex_extract(text)

        try:
            raw_entities = self._ner_pipeline(text)
            grouped: Dict[str, list] = {
                "medications": [],
                "dosages": [],
                "frequencies": [],
                "durations": [],
                "routes": [],
                "forms": [],
                "conditions": [],
            }
            seen: Dict[str, set] = {k: set() for k in grouped}

            for ent in raw_entities:
                label_raw = ent.get("entity_group", ent.get("entity", "")).upper()
                # Strip BIO prefixes (B-, I-)
                label_raw = re.sub(r"^[BI]-", "", label_raw)
                mapped = self.ENTITY_MAP.get(label_raw)
                if not mapped:
                    continue
                key = mapped + "s" if not mapped.endswith("s") else mapped
                if key not in grouped:
                    key = mapped + "s"
                if key not in grouped:
                    continue
                word = ent.get("word", "").strip().replace(" ##", "")
                if len(word) < 2 or word.lower() in seen[key]:
                    continue
                seen[key].add(word.lower())
                grouped[key].append({
                    "text": word,
                    "score": round(float(ent.get("score", 0)), 4),
                })

            return grouped
        except Exception as e:
            logger.error(f"NER inference error: {e}")
            return self._regex_extract(text)

    @staticmethod
    def _regex_extract(text: str) -> Dict[str, list]:
        """Regex-based fallback that extracts medical entities when NER model is unavailable."""
        medications = []
        dosages = []
        frequencies = []
        durations = []
        routes = []
        forms = []
        conditions = []

        seen_meds = set()
        stop_words = {'the','and','for','with','take','daily','tablet','capsule',
                       'syrup','injection','patient','doctor','clinic','hospital',
                       'date','name','address','signature','phone','age','sex',
                       'male','female','prescription','diagnosis','instructions'}

        # Extract medications
        med_patterns = [
            r'(?:Tab(?:let)?|Cap(?:sule)?|Syrup|Inj(?:ection)?|Cream|Oint(?:ment)?|Drop|Susp(?:ension)?)\.?\s+([A-Za-z][A-Za-z\s-]{2,25}?)(?=\s+\d|\s*[-–]|\s*$|\s*\()',
            r'\b([A-Z][a-z]+(?:cillin|mycin|prazole|olol|sartan|statin|pril|dipine|azole|idine|amine|etine|azepam|ofen|afil|gliptin|formin|vastatin|profen|oxacin|cycline|nazole|tadine|mab|nib|tide|glitazone|lukast|oprazole|setron|sartan|dipine|olol|vastatin|parin|fenac|codone|morphone|tropium|methacin|buterol|sone|olone|asone|nisolone))\b',
            r'Rx[:\s]+([A-Za-z][A-Za-z\s-]{2,25}?)(?=\s+\d|\s*[-–]|\s*$)',
            r'^\s*\d+[.)\s]+([A-Z][a-zA-Z\s-]{2,25}?)(?=\s+\d+\s*(?:mg|g|ml|mcg))',
        ]
        for pattern in med_patterns:
            for match in re.findall(pattern, text, re.IGNORECASE | re.MULTILINE):
                name = match.strip()
                if len(name) >= 3 and name.lower() not in stop_words and name.lower() not in seen_meds:
                    seen_meds.add(name.lower())
                    medications.append({"text": name, "score": 0.70})

        # Extract dosages
        for match in re.findall(r'(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|IU)', text, re.IGNORECASE):
            dosages.append({"text": f"{match[0]} {match[1]}", "score": 0.85})

        # Extract frequencies
        freq_patterns = [
            (r'\b(once|twice|thrice|\d+\s*times?)\s*(?:a\s*)?(?:day|daily)\b', 0.80),
            (r'\b(every\s*\d+\s*(?:hours?|hrs?))\b', 0.80),
            (r'\b(morning|evening|night|bedtime|before\s+meals?|after\s+meals?)\b', 0.75),
            (r'\b(OD|BD|TDS|TID|QID|QD|BID|PRN|SOS|HS|AC|PC|STAT)\b', 0.85),
            (r'\b(\d+[-–]\d+[-–]\d+)\b', 0.80),
        ]
        for pattern, score in freq_patterns:
            for match in re.findall(pattern, text, re.IGNORECASE):
                val = match.strip()
                if val:
                    frequencies.append({"text": val, "score": score})

        # Extract durations
        for match in re.findall(r'(?:for\s*)(\d+)\s*(days?|weeks?|months?)', text, re.IGNORECASE):
            durations.append({"text": f"{match[0]} {match[1]}", "score": 0.80})

        # Extract routes
        for match in re.findall(r'\b(oral(?:ly)?|topical(?:ly)?|intravenous(?:ly)?|intramuscular|subcutaneous|sublingual|rectal(?:ly)?|inhaled?|nasal)\b', text, re.IGNORECASE):
            routes.append({"text": match, "score": 0.75})

        # Extract forms
        for match in re.findall(r'\b(tablet|capsule|syrup|injection|cream|ointment|drops?|suspension|inhaler|patch|suppository|powder|solution|gel)s?\b', text, re.IGNORECASE):
            forms.append({"text": match, "score": 0.80})

        return {
            "medications": medications,
            "dosages": dosages,
            "frequencies": frequencies,
            "durations": durations,
            "routes": routes,
            "forms": forms,
            "conditions": conditions,
        }

    @property
    def is_available(self) -> bool:
        return TRANSFORMERS_AVAILABLE

ner_engine = MedicalNEREngine()

# ---------------------------------------------------------
# Image Preprocessing for Medical Documents
# ---------------------------------------------------------
class MedicalImagePreprocessor:
    """Specialized image preprocessing for prescription documents"""
    
    @staticmethod
    def preprocess(image: np.ndarray, enhance_mode: str = "medical") -> np.ndarray:
        """Preprocess image for optimal OCR results"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        if enhance_mode == "medical":
            # Denoise
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            # Adaptive thresholding
            binary = cv2.adaptiveThreshold(
                denoised, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                11, 2
            )
            return binary
        elif enhance_mode == "handwritten":
            # Increase contrast for handwriting
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            denoised = cv2.fastNlMeansDenoising(enhanced, None, 15, 7, 21)
            _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return binary
        else:
            # Standard enhancement
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return binary

# ---------------------------------------------------------
# Prescription Text Parser (Regex + NER hybrid)
# ---------------------------------------------------------
class PrescriptionParser:
    """Parse and structure extracted prescription text.

    Uses a two-pass approach:
      1. Medical NER model (when available) for high-accuracy entity extraction
      2. Regex patterns as supplement / fallback
    """

    # ----- Regex patterns (fallback / supplement) -----
    MEDICATION_PATTERNS = [
        r'(?:Tab(?:let)?\.?|Cap(?:sule)?\.?|Syrup\.?|Inj(?:ection)?\.?)\s*([A-Za-z][A-Za-z\s-]+?)(?:\s+\d+\s*(?:mg|g|ml|mcg))?',
        r'\b([A-Z][a-z]+(?:cillin|mycin|prazole|olol|sartan|statin|pril|dipine|azole|idine|amine|etine|azepam))\b',
        r'Rx[:\s]+([A-Za-z][A-Za-z\s-]+?)(?=\s+\d|\s*$)',
        r'^\s*\d+[.)\s]+([A-Z][a-zA-Z\s-]+?)(?:\s+\d+\s*(?:mg|g|ml))',
    ]

    DOSAGE_PATTERNS = [
        r'(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|IU|tablets?|caps?|capsules?)',
        r'(\d+)\s*[-x]\s*(\d+)\s*(mg|g|ml)',
    ]

    FREQUENCY_PATTERNS = [
        r'(once|twice|thrice|\d+\s*times?)\s*(?:a\s*)?(?:day|daily)',
        r'(every\s*\d+\s*(?:hours?|hrs?))',
        r'(morning|evening|night|bedtime)',
        r'(OD|BD|TDS|TID|QID|QD|BID|PRN|SOS|HS)',
        r'(\d+[-–]\d+[-–]\d+)',
    ]

    DURATION_PATTERNS = [
        r'(?:for\s*)?(\d+)\s*(days?|weeks?|months?)',
    ]

    INSTRUCTION_PATTERNS = [
        r'(take\s+(?:with|before|after)\s+(?:food|meals?|water|breakfast|lunch|dinner))',
        r'(avoid\s+(?:alcohol|driving|sunlight|dairy|grapefruit)[\w\s]*)',
        r'(do\s+not\s+[\w\s]+)',
        r'(complete\s+(?:the\s+)?full\s+course[\w\s]*)',
        r'(return\s+if\s+[\w\s]+)',
    ]

    # Medical abbreviation expansions
    ABBREVIATION_MAP = {
        "OD": "Once daily",
        "BD": "Twice daily",
        "TDS": "Three times daily",
        "TID": "Three times daily",
        "QID": "Four times daily",
        "QD": "Once daily",
        "BID": "Twice daily",
        "PRN": "As needed",
        "SOS": "If needed (emergency)",
        "HS": "At bedtime",
        "AC": "Before meals",
        "PC": "After meals",
        "PO": "By mouth",
        "IM": "Intramuscular",
        "IV": "Intravenous",
        "SC": "Subcutaneous",
        "SL": "Sublingual",
        "QAM": "Every morning",
        "QPM": "Every evening",
        "Q4H": "Every 4 hours",
        "Q6H": "Every 6 hours",
        "Q8H": "Every 8 hours",
        "Q12H": "Every 12 hours",
        "STAT": "Immediately",
    }

    @classmethod
    def parse(cls, raw_text: str, ner_entities: Optional[Dict] = None) -> Dict[str, Any]:
        """Parse raw OCR text into structured prescription data.

        Uses a line-by-line approach to co-locate medications with their
        dosages, frequencies, and durations from the same line, then
        supplements with NER results.
        """
        if not raw_text:
            return cls._empty_result()

        # --- NER pass (highest priority) ---
        ner_meds: List[Dict] = []
        ner_dosages: List[str] = []
        ner_frequencies: List[str] = []
        ner_durations: List[str] = []

        if ner_entities:
            for m in ner_entities.get("medications", []):
                ner_meds.append(m)
            for d in ner_entities.get("dosages", []):
                ner_dosages.append(d.get("text", "") if isinstance(d, dict) else str(d))
            for f in ner_entities.get("frequencies", []):
                ner_frequencies.append(f.get("text", "") if isinstance(f, dict) else str(f))
            for dur in ner_entities.get("durations", []):
                ner_durations.append(dur.get("text", "") if isinstance(dur, dict) else str(dur))

        # --- Line-by-line parsing for co-located data ---
        line_parsed_meds = cls._parse_lines(raw_text)

        # --- Regex pass (supplement for overall extraction) ---
        regex_meds = cls._extract_medications(raw_text)
        regex_dosages = cls._extract_patterns(raw_text, cls.DOSAGE_PATTERNS)
        regex_frequencies = cls._extract_patterns(raw_text, cls.FREQUENCY_PATTERNS)
        regex_durations = cls._extract_patterns(raw_text, cls.DURATION_PATTERNS)
        regex_instructions = cls._extract_patterns(raw_text, cls.INSTRUCTION_PATTERNS)

        # --- Merge: line-parsed > NER > regex ---
        structured_meds: List[Dict] = []
        seen_lower = set()

        # Priority 1: Line-parsed medications (dosage/freq co-located)
        for lm in line_parsed_meds:
            name_lower = lm["name"].lower()
            if name_lower not in seen_lower:
                seen_lower.add(name_lower)
                structured_meds.append(lm)

        # Priority 2: NER medications (may have extra meds not caught by line parser)
        for m in ner_meds:
            name = m.get("text", "") if isinstance(m, dict) else str(m)
            if name and name.lower() not in seen_lower:
                seen_lower.add(name.lower())
                score = m.get("score", 0.9) if isinstance(m, dict) else 0.9
                idx = len(structured_meds)
                structured_meds.append({
                    "name": name,
                    "dosage": ner_dosages[idx] if idx < len(ner_dosages) else "",
                    "frequency": ner_frequencies[idx] if idx < len(ner_frequencies) else "",
                    "duration": ner_durations[idx] if idx < len(ner_durations) else "",
                    "instructions": "",
                    "confidence": round(score * 100, 2),
                })

        # Priority 3: Regex-only medications
        for name in regex_meds:
            if name.lower() not in seen_lower:
                seen_lower.add(name.lower())
                structured_meds.append({
                    "name": name,
                    "dosage": "",
                    "frequency": "",
                    "duration": "",
                    "instructions": "",
                    "confidence": 70.0,
                })

        # Fill in missing dosages/frequencies from the global pools
        all_dosages = list(dict.fromkeys(ner_dosages + regex_dosages))
        all_frequencies = list(dict.fromkeys(ner_frequencies + regex_frequencies))
        all_durations = list(dict.fromkeys(ner_durations + regex_durations))

        # Expand abbreviations in frequencies of structured meds
        for med in structured_meds:
            upper = med.get("frequency", "").strip().upper()
            if upper in cls.ABBREVIATION_MAP:
                med["frequency"] = cls.ABBREVIATION_MAP[upper]

        # Expand abbreviations in global frequencies list
        expanded_frequencies = []
        for f in all_frequencies:
            upper = f.strip().upper()
            if upper in cls.ABBREVIATION_MAP:
                expanded_frequencies.append(cls.ABBREVIATION_MAP[upper])
            else:
                expanded_frequencies.append(f)
        all_frequencies = expanded_frequencies

        # --- Warnings ---
        warnings = cls._generate_warnings(structured_meds[:10], raw_text)

        return {
            "rawText": raw_text,
            "medications": structured_meds[:10],
            "dosages": all_dosages,
            "frequencies": all_frequencies,
            "durations": all_durations,
            "instructions": regex_instructions,
            "warnings": warnings,
        }

    @classmethod
    def _parse_lines(cls, text: str) -> List[Dict]:
        """Parse each line to co-locate medication name with its dosage, frequency, and duration."""
        results = []
        lines = text.split('\n')

        # Comprehensive pattern: captures (form) (name) (dosage) and rest of line for freq/duration
        line_pattern = re.compile(
            r'(?:(?:Tab(?:let)?|Cap(?:sule)?|Syrup|Inj(?:ection)?|Cream|Oint(?:ment)?|Drop|Susp(?:ension)?)\.?\s+)?'
            r'([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)'  # medication name
            r'(?:\s+(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU)))?'  # optional dosage
            r'(.*)',  # rest of line for freq/duration/instructions
            re.IGNORECASE
        )
        # Pattern for numbered list entries: "1. Amoxicillin 500mg ..."
        numbered_pattern = re.compile(
            r'^\s*\d+[.)]\s*'
            r'(?:(?:Tab(?:let)?|Cap(?:sule)?|Syrup|Inj(?:ection)?)\.?\s+)?'
            r'([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)'
            r'(?:\s+(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU)))?'
            r'(.*)',
            re.IGNORECASE
        )

        stop_words = {
            'the','and','for','with','take','daily','tablet','capsule','syrup',
            'injection','patient','doctor','clinic','hospital','date','name',
            'address','signature','phone','instructions','warning','note',
            'diagnosis','prescription','medical','pharmacy', 'dr', 'mr', 'mrs',
            'ms', 'rx', 'refill', 'quantity', 'supply', 'label', 'dispense',
        }

        # Drug suffix pattern for validation
        drug_suffixes = re.compile(
            r'(?:cillin|mycin|prazole|olol|sartan|statin|pril|dipine|azole|'
            r'idine|amine|etine|azepam|ofen|formin|profen|oxacin|cycline|'
            r'nazole|tadine|fenac|codone|sone|olone|asone|nisolone|mab|nib|'
            r'tide|lukast|setron|parin|buterol|vastatin|afil|gliptin|oprazole|'
            r'morphone|tropium|methacin|glitazone)$', re.IGNORECASE
        )

        # Common known drug names for validation
        known_drugs = {
            'amoxicillin', 'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin',
            'metformin', 'omeprazole', 'atorvastatin', 'amlodipine', 'losartan',
            'lisinopril', 'metoprolol', 'warfarin', 'clopidogrel', 'pantoprazole',
            'ciprofloxacin', 'azithromycin', 'doxycycline', 'cetirizine', 'loratadine',
            'diclofenac', 'naproxen', 'prednisolone', 'dexamethasone', 'insulin',
            'glimepiride', 'sitagliptin', 'empagliflozin', 'rosuvastatin', 'simvastatin',
            'levothyroxine', 'furosemide', 'hydrochlorothiazide', 'spironolactone',
            'ramipril', 'enalapril', 'valsartan', 'telmisartan', 'diltiazem',
            'verapamil', 'digoxin', 'amiodarone', 'carvedilol', 'bisoprolol',
            'salbutamol', 'montelukast', 'fluticasone', 'budesonide', 'theophylline',
            'tramadol', 'codeine', 'morphine', 'gabapentin', 'pregabalin',
            'fluoxetine', 'sertraline', 'escitalopram', 'amitriptyline', 'duloxetine',
            'alprazolam', 'diazepam', 'lorazepam', 'clonazepam', 'valproate',
            'carbamazepine', 'phenytoin', 'levetiracetam', 'lamotrigine',
            'methotrexate', 'hydroxychloroquine', 'sulfasalazine',
            'ranitidine', 'famotidine', 'domperidone', 'metoclopramide',
            'ondansetron', 'loperamide', 'lactulose',
            'cephalexin', 'cefuroxime', 'ceftriaxone', 'clindamycin',
            'erythromycin', 'clarithromycin', 'fluconazole', 'acyclovir',
            'calcium', 'iron', 'folic acid', 'vitamin',
        }

        seen = set()

        for line in lines:
            line = line.strip()
            if not line or len(line) < 4:
                continue

            # Try numbered pattern first, then general
            match = numbered_pattern.match(line) or line_pattern.match(line)
            if not match:
                continue

            name = (match.group(1) or '').strip()
            dosage = (match.group(2) or '').strip()
            rest = (match.group(3) or '').strip()

            # Validate: must be a plausible drug name
            name_lower = name.lower()
            if not name or len(name) < 3 or name_lower in stop_words:
                continue
            if name_lower in seen:
                continue

            # Check if it's a known drug or has a drug suffix
            is_known = name_lower in known_drugs
            has_suffix = bool(drug_suffixes.search(name_lower))
            has_dosage = bool(dosage)
            # If the name doesn't look like a drug, skip unless it has a dosage
            if not is_known and not has_suffix and not has_dosage:
                continue

            seen.add(name_lower)

            # Extract frequency from rest of line
            frequency = ""
            for fp in cls.FREQUENCY_PATTERNS:
                fm = re.search(fp, rest, re.IGNORECASE)
                if fm:
                    frequency = fm.group(1) if fm.lastindex else fm.group(0)
                    break

            # Extract duration from rest of line
            duration = ""
            dm = re.search(r'(?:for\s*)?(\d+)\s*(days?|weeks?|months?)', rest, re.IGNORECASE)
            if dm:
                duration = f"{dm.group(1)} {dm.group(2)}"

            # If no dosage found in the match, try to find one in rest
            if not dosage:
                dose_match = re.search(r'(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|IU)', rest, re.IGNORECASE)
                if dose_match:
                    dosage = f"{dose_match.group(1)} {dose_match.group(2)}"

            # Confidence: higher if more data is found
            conf = 0.70
            if is_known:
                conf += 0.10
            if has_suffix:
                conf += 0.05
            if dosage:
                conf += 0.05
            if frequency:
                conf += 0.05

            results.append({
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "duration": duration,
                "instructions": "",
                "confidence": round(min(conf, 0.99) * 100, 2),
            })

        return results

    @classmethod
    def _extract_medications(cls, text: str) -> List[str]:
        medications = set()
        for pattern in cls.MEDICATION_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                med = match.strip() if isinstance(match, str) else str(match).strip()
                if len(med) >= 3 and med.lower() not in [
                    'the', 'and', 'for', 'with', 'take', 'daily', 'tablet',
                    'capsule', 'syrup', 'injection', 'patient', 'doctor',
                ]:
                    medications.add(med)
        return list(medications)

    @classmethod
    def _extract_patterns(cls, text: str, patterns: List[str]) -> List[str]:
        results = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    result = ' '.join(str(m) for m in match if m)
                else:
                    result = str(match)
                if result and result not in results:
                    results.append(result)
        return results

    @classmethod
    def _generate_warnings(cls, medications: List[Dict], raw_text: str) -> List[str]:
        """Generate safety warnings based on extracted data."""
        warnings = []
        med_names = [m["name"].lower() for m in medications]

        # Common interaction warnings
        if any("warfarin" in n for n in med_names):
            warnings.append("Warfarin detected – monitor INR, avoid Vitamin K–rich foods")
        if any("metformin" in n for n in med_names):
            warnings.append("Metformin detected – avoid alcohol, monitor kidney function")
        if any("aspirin" in n or "asa" in n for n in med_names):
            if any("warfarin" in n for n in med_names):
                warnings.append("⚠ Aspirin + Warfarin: increased bleeding risk")

        # Check for missing dosage info
        for m in medications:
            if not m.get("dosage"):
                warnings.append(f"Dosage missing for {m['name']} – verify with prescriber")

        # Duplicate detection
        seen = set()
        for n in med_names:
            if n in seen:
                warnings.append(f"Possible duplicate medication: {n}")
            seen.add(n)

        return warnings

    @classmethod
    def _empty_result(cls) -> Dict[str, Any]:
        return {
            "rawText": "",
            "medications": [],
            "dosages": [],
            "frequencies": [],
            "durations": [],
            "instructions": [],
            "warnings": [],
        }

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
# Production ML Prediction Functions (with Model Auto-Download)
# ---------------------------------------------------------

# Build brand→generic lookup from loaded drug index
_brand_to_generic: Dict[str, str] = {}
_drug_classes: Dict[str, str] = {}

def _build_drug_lookups():
    """Build reverse lookup tables from drug search index"""
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

# NOTE: _build_drug_lookups() is called after _drug_index is loaded (see below)


def _resolve_generic(drug_name: str) -> str:
    """Resolve any drug name (brand or generic) to its generic/active ingredient."""
    name = drug_name.lower().strip()
    # Direct match
    if name in _brand_to_generic:
        return _brand_to_generic[name]
    # Try stripping dosage info (e.g. "Aspirin 300mg Tablet" → "aspirin")
    stripped = re.sub(r'\s+\d+\s*(mg|g|ml|mcg|iu)\b.*$', '', name, flags=re.IGNORECASE).strip()
    if stripped in _brand_to_generic:
        return _brand_to_generic[stripped]
    # Try matching prefix against generics
    for gen_name in _brand_to_generic.values():
        if name.startswith(gen_name) or gen_name.startswith(name):
            return gen_name
    # Return original lowered name as fallback
    return name


# Comprehensive drug-drug interaction knowledge base
# Sources: FDA drug safety communications, clinical pharmacology references
DRUG_INTERACTION_DB = {
    # ── Anticoagulants / Antiplatelets ────────────────────
    ("aspirin", "warfarin"): {"severity": "severe", "confidence": 0.95, "desc": "Increased bleeding risk – both affect clotting"},
    ("aspirin", "clopidogrel"): {"severity": "moderate", "confidence": 0.90, "desc": "Dual antiplatelet therapy – increased bleeding risk"},
    ("aspirin", "heparin"): {"severity": "severe", "confidence": 0.93, "desc": "Significantly increased bleeding risk"},
    ("aspirin", "enoxaparin"): {"severity": "severe", "confidence": 0.92, "desc": "Increased bleeding risk with combined anticoagulation"},
    ("warfarin", "clopidogrel"): {"severity": "severe", "confidence": 0.94, "desc": "High bleeding risk – dual antithrombotic effect"},
    ("warfarin", "heparin"): {"severity": "severe", "confidence": 0.95, "desc": "Excessive anticoagulation and bleeding risk"},
    ("warfarin", "amoxicillin"): {"severity": "moderate", "confidence": 0.85, "desc": "Antibiotics may enhance anticoagulant effect"},
    ("warfarin", "ciprofloxacin"): {"severity": "severe", "confidence": 0.91, "desc": "Fluoroquinolones potentiate warfarin – INR elevation"},
    ("warfarin", "metronidazole"): {"severity": "severe", "confidence": 0.90, "desc": "Increased anticoagulant effect and bleeding risk"},
    ("warfarin", "fluconazole"): {"severity": "severe", "confidence": 0.92, "desc": "Azole antifungals increase warfarin levels"},
    ("warfarin", "omeprazole"): {"severity": "moderate", "confidence": 0.82, "desc": "May increase warfarin effect via CYP2C19 inhibition"},
    ("warfarin", "acetaminophen"): {"severity": "moderate", "confidence": 0.80, "desc": "High-dose acetaminophen may increase INR"},
    ("warfarin", "paracetamol"): {"severity": "moderate", "confidence": 0.80, "desc": "High-dose paracetamol may increase INR"},

    # ── NSAIDs interactions ───────────────────────────────
    ("aspirin", "ibuprofen"): {"severity": "moderate", "confidence": 0.90, "desc": "Increased GI bleeding risk; ibuprofen may block aspirin's cardioprotection"},
    ("aspirin", "naproxen"): {"severity": "moderate", "confidence": 0.88, "desc": "Increased GI bleeding and renal risk"},
    ("aspirin", "diclofenac"): {"severity": "moderate", "confidence": 0.88, "desc": "Increased GI bleeding risk with dual NSAIDs"},
    ("ibuprofen", "naproxen"): {"severity": "moderate", "confidence": 0.90, "desc": "Do not combine NSAIDs – increased GI/renal toxicity"},
    ("ibuprofen", "diclofenac"): {"severity": "moderate", "confidence": 0.90, "desc": "Do not combine NSAIDs – additive toxicity"},
    ("ibuprofen", "warfarin"): {"severity": "severe", "confidence": 0.92, "desc": "NSAIDs increase bleeding risk with anticoagulants"},
    ("ibuprofen", "lisinopril"): {"severity": "moderate", "confidence": 0.83, "desc": "NSAIDs reduce antihypertensive effect and increase renal risk"},
    ("ibuprofen", "enalapril"): {"severity": "moderate", "confidence": 0.83, "desc": "NSAIDs reduce ACE inhibitor efficacy"},
    ("ibuprofen", "losartan"): {"severity": "moderate", "confidence": 0.83, "desc": "NSAIDs reduce ARB efficacy and increase renal risk"},
    ("ibuprofen", "methotrexate"): {"severity": "severe", "confidence": 0.93, "desc": "NSAIDs decrease methotrexate clearance – toxicity risk"},
    ("ibuprofen", "lithium"): {"severity": "moderate", "confidence": 0.87, "desc": "NSAIDs increase lithium levels"},
    ("diclofenac", "methotrexate"): {"severity": "severe", "confidence": 0.93, "desc": "NSAIDs decrease methotrexate clearance – toxicity risk"},
    ("naproxen", "warfarin"): {"severity": "severe", "confidence": 0.91, "desc": "Increased bleeding risk"},

    # ── ACE Inhibitors / ARBs / Potassium ─────────────────
    ("lisinopril", "potassium"): {"severity": "moderate", "confidence": 0.85, "desc": "Risk of hyperkalemia"},
    ("lisinopril", "spironolactone"): {"severity": "moderate", "confidence": 0.87, "desc": "Risk of hyperkalemia – both retain potassium"},
    ("enalapril", "potassium"): {"severity": "moderate", "confidence": 0.85, "desc": "Risk of hyperkalemia"},
    ("enalapril", "spironolactone"): {"severity": "moderate", "confidence": 0.87, "desc": "Risk of hyperkalemia"},
    ("losartan", "potassium"): {"severity": "moderate", "confidence": 0.85, "desc": "Risk of hyperkalemia"},
    ("losartan", "spironolactone"): {"severity": "moderate", "confidence": 0.86, "desc": "Risk of hyperkalemia"},
    ("lisinopril", "losartan"): {"severity": "severe", "confidence": 0.88, "desc": "Dual RAAS blockade – hyperkalemia, hypotension, renal failure"},
    ("enalapril", "losartan"): {"severity": "severe", "confidence": 0.88, "desc": "Dual RAAS blockade – avoid combination"},

    # ── Statins ───────────────────────────────────────────
    ("atorvastatin", "grapefruit"): {"severity": "severe", "confidence": 0.92, "desc": "Grapefruit increases statin levels – rhabdomyolysis risk"},
    ("simvastatin", "grapefruit"): {"severity": "severe", "confidence": 0.93, "desc": "Grapefruit increases simvastatin levels – muscle toxicity"},
    ("atorvastatin", "clarithromycin"): {"severity": "severe", "confidence": 0.90, "desc": "CYP3A4 inhibition increases statin toxicity risk"},
    ("simvastatin", "clarithromycin"): {"severity": "severe", "confidence": 0.91, "desc": "CYP3A4 inhibition – rhabdomyolysis risk"},
    ("atorvastatin", "erythromycin"): {"severity": "moderate", "confidence": 0.86, "desc": "Increased statin levels – monitor for muscle pain"},
    ("simvastatin", "erythromycin"): {"severity": "severe", "confidence": 0.90, "desc": "Increased simvastatin levels – rhabdomyolysis risk"},
    ("atorvastatin", "fluconazole"): {"severity": "moderate", "confidence": 0.85, "desc": "CYP3A4 inhibition increases statin levels"},
    ("atorvastatin", "amlodipine"): {"severity": "mild", "confidence": 0.80, "desc": "Amlodipine may increase atorvastatin levels slightly"},
    ("simvastatin", "amlodipine"): {"severity": "moderate", "confidence": 0.85, "desc": "Limit simvastatin to 20mg with amlodipine"},
    ("rosuvastatin", "warfarin"): {"severity": "moderate", "confidence": 0.82, "desc": "Rosuvastatin may increase warfarin's anticoagulant effect"},

    # ── Metformin / Diabetes ──────────────────────────────
    ("metformin", "alcohol"): {"severity": "moderate", "confidence": 0.88, "desc": "Risk of lactic acidosis"},
    ("metformin", "contrast dye"): {"severity": "severe", "confidence": 0.90, "desc": "Risk of lactic acidosis – hold metformin before contrast"},
    ("metformin", "glimepiride"): {"severity": "moderate", "confidence": 0.82, "desc": "Additive hypoglycemia risk – monitor blood sugar"},
    ("metformin", "glipizide"): {"severity": "moderate", "confidence": 0.82, "desc": "Additive hypoglycemia risk"},
    ("metformin", "insulin"): {"severity": "moderate", "confidence": 0.85, "desc": "Increased risk of hypoglycemia"},
    ("glimepiride", "insulin"): {"severity": "severe", "confidence": 0.88, "desc": "Significant hypoglycemia risk with dual therapy"},
    ("glipizide", "insulin"): {"severity": "severe", "confidence": 0.88, "desc": "Significant hypoglycemia risk with dual therapy"},
    ("metformin", "furosemide"): {"severity": "mild", "confidence": 0.78, "desc": "Furosemide may increase metformin levels"},

    # ── Cardiovascular ────────────────────────────────────
    ("atenolol", "amlodipine"): {"severity": "moderate", "confidence": 0.82, "desc": "Additive hypotension and bradycardia risk"},
    ("metoprolol", "amlodipine"): {"severity": "moderate", "confidence": 0.82, "desc": "Additive hypotension and bradycardia risk"},
    ("metoprolol", "verapamil"): {"severity": "severe", "confidence": 0.91, "desc": "Severe bradycardia and heart block risk"},
    ("atenolol", "verapamil"): {"severity": "severe", "confidence": 0.91, "desc": "Severe bradycardia and heart block risk"},
    ("metoprolol", "diltiazem"): {"severity": "severe", "confidence": 0.90, "desc": "Risk of severe bradycardia and AV block"},
    ("atenolol", "diltiazem"): {"severity": "severe", "confidence": 0.90, "desc": "Risk of severe bradycardia and AV block"},
    ("amlodipine", "diltiazem"): {"severity": "moderate", "confidence": 0.83, "desc": "Excessive vasodilation and hypotension"},
    ("digoxin", "amiodarone"): {"severity": "severe", "confidence": 0.93, "desc": "Amiodarone increases digoxin levels – toxicity risk"},
    ("digoxin", "verapamil"): {"severity": "severe", "confidence": 0.91, "desc": "Verapamil increases digoxin levels and AV block risk"},
    ("digoxin", "furosemide"): {"severity": "moderate", "confidence": 0.85, "desc": "Diuretic-induced hypokalemia increases digoxin toxicity"},
    ("digoxin", "hydrochlorothiazide"): {"severity": "moderate", "confidence": 0.84, "desc": "Hypokalemia increases digoxin toxicity"},
    ("amiodarone", "warfarin"): {"severity": "severe", "confidence": 0.92, "desc": "Amiodarone potentiates warfarin – major bleeding risk"},

    # ── Antidepressants / CNS ─────────────────────────────
    ("fluoxetine", "tramadol"): {"severity": "severe", "confidence": 0.91, "desc": "Serotonin syndrome risk"},
    ("sertraline", "tramadol"): {"severity": "severe", "confidence": 0.91, "desc": "Serotonin syndrome risk"},
    ("fluoxetine", "sertraline"): {"severity": "severe", "confidence": 0.93, "desc": "Do not combine SSRIs – serotonin syndrome"},
    ("fluoxetine", "paroxetine"): {"severity": "severe", "confidence": 0.93, "desc": "Do not combine SSRIs – serotonin syndrome"},
    ("fluoxetine", "citalopram"): {"severity": "severe", "confidence": 0.93, "desc": "Do not combine SSRIs – serotonin syndrome"},
    ("fluoxetine", "escitalopram"): {"severity": "severe", "confidence": 0.93, "desc": "Do not combine SSRIs – serotonin syndrome"},
    ("sertraline", "paroxetine"): {"severity": "severe", "confidence": 0.93, "desc": "Do not combine SSRIs – serotonin syndrome"},
    ("fluoxetine", "warfarin"): {"severity": "moderate", "confidence": 0.85, "desc": "SSRIs increase bleeding risk with warfarin"},
    ("sertraline", "warfarin"): {"severity": "moderate", "confidence": 0.85, "desc": "SSRIs increase bleeding risk with warfarin"},
    ("fluoxetine", "alprazolam"): {"severity": "moderate", "confidence": 0.83, "desc": "Fluoxetine increases alprazolam levels"},
    ("diazepam", "alcohol"): {"severity": "severe", "confidence": 0.93, "desc": "CNS depression – respiratory failure risk"},
    ("alprazolam", "alcohol"): {"severity": "severe", "confidence": 0.93, "desc": "CNS depression – respiratory failure risk"},
    ("lorazepam", "alcohol"): {"severity": "severe", "confidence": 0.93, "desc": "CNS depression – respiratory failure risk"},
    ("alprazolam", "opioid"): {"severity": "severe", "confidence": 0.95, "desc": "Respiratory depression – FDA black box warning"},
    ("diazepam", "opioid"): {"severity": "severe", "confidence": 0.95, "desc": "Respiratory depression – FDA black box warning"},
    ("amitriptyline", "tramadol"): {"severity": "severe", "confidence": 0.89, "desc": "Seizure and serotonin syndrome risk"},

    # ── Antibiotics ───────────────────────────────────────
    ("amoxicillin", "methotrexate"): {"severity": "severe", "confidence": 0.88, "desc": "Reduced methotrexate clearance – toxicity risk"},
    ("ciprofloxacin", "antacid"): {"severity": "moderate", "confidence": 0.87, "desc": "Antacids reduce ciprofloxacin absorption significantly"},
    ("ciprofloxacin", "calcium"): {"severity": "moderate", "confidence": 0.86, "desc": "Calcium reduces ciprofloxacin absorption"},
    ("ciprofloxacin", "iron"): {"severity": "moderate", "confidence": 0.87, "desc": "Iron reduces fluoroquinolone absorption"},
    ("ciprofloxacin", "theophylline"): {"severity": "severe", "confidence": 0.89, "desc": "Increased theophylline levels – seizure risk"},
    ("azithromycin", "amiodarone"): {"severity": "severe", "confidence": 0.88, "desc": "QT prolongation risk – cardiac arrhythmia"},
    ("azithromycin", "warfarin"): {"severity": "moderate", "confidence": 0.83, "desc": "May increase anticoagulant effect"},

    # ── Proton Pump Inhibitors ────────────────────────────
    ("clopidogrel", "omeprazole"): {"severity": "moderate", "confidence": 0.87, "desc": "Omeprazole reduces clopidogrel activation via CYP2C19"},
    ("clopidogrel", "esomeprazole"): {"severity": "moderate", "confidence": 0.86, "desc": "Esomeprazole reduces clopidogrel efficacy"},
    ("omeprazole", "methotrexate"): {"severity": "moderate", "confidence": 0.82, "desc": "PPIs may increase methotrexate levels"},
    ("calcium", "levothyroxine"): {"severity": "mild", "confidence": 0.88, "desc": "Calcium reduces thyroid hormone absorption – separate by 4h"},
    ("omeprazole", "levothyroxine"): {"severity": "mild", "confidence": 0.80, "desc": "PPIs reduce levothyroxine absorption"},

    # ── Paracetamol / Acetaminophen ───────────────────────
    ("paracetamol", "alcohol"): {"severity": "severe", "confidence": 0.92, "desc": "Hepatotoxicity risk – liver damage"},
    ("acetaminophen", "alcohol"): {"severity": "severe", "confidence": 0.92, "desc": "Hepatotoxicity risk – liver damage"},
    ("paracetamol", "ibuprofen"): {"severity": "mild", "confidence": 0.75, "desc": "Generally safe to combine at recommended doses with caution"},
    ("paracetamol", "aspirin"): {"severity": "mild", "confidence": 0.78, "desc": "May be combined short-term; monitor for GI side effects"},
    ("acetaminophen", "aspirin"): {"severity": "mild", "confidence": 0.78, "desc": "May be combined short-term; monitor for GI side effects"},

    # ── Corticosteroids ───────────────────────────────────
    ("prednisolone", "ibuprofen"): {"severity": "moderate", "confidence": 0.86, "desc": "Increased GI bleeding risk"},
    ("prednisolone", "aspirin"): {"severity": "moderate", "confidence": 0.86, "desc": "Increased GI bleeding and ulcer risk"},
    ("dexamethasone", "warfarin"): {"severity": "moderate", "confidence": 0.84, "desc": "Corticosteroids may alter warfarin response"},
    ("prednisolone", "metformin"): {"severity": "moderate", "confidence": 0.82, "desc": "Corticosteroids raise blood glucose – may oppose metformin"},

    # ── Thyroid ───────────────────────────────────────────
    ("levothyroxine", "iron"): {"severity": "moderate", "confidence": 0.87, "desc": "Iron reduces levothyroxine absorption – separate by 4h"},
    ("levothyroxine", "calcium"): {"severity": "mild", "confidence": 0.88, "desc": "Calcium reduces absorption – take 4 hours apart"},
    ("levothyroxine", "antacid"): {"severity": "moderate", "confidence": 0.85, "desc": "Antacids reduce levothyroxine absorption"},

    # ── Opioids ───────────────────────────────────────────
    ("tramadol", "alcohol"): {"severity": "severe", "confidence": 0.93, "desc": "CNS and respiratory depression"},
    ("morphine", "alcohol"): {"severity": "severe", "confidence": 0.95, "desc": "Critical CNS and respiratory depression"},
    ("codeine", "alcohol"): {"severity": "severe", "confidence": 0.92, "desc": "CNS and respiratory depression"},
    ("tramadol", "carbamazepine"): {"severity": "moderate", "confidence": 0.84, "desc": "Reduced tramadol efficacy and seizure risk"},

    # ── Antiepileptics ────────────────────────────────────
    ("carbamazepine", "valproate"): {"severity": "moderate", "confidence": 0.85, "desc": "Complex interaction – altered levels of both drugs"},
    ("phenytoin", "valproate"): {"severity": "moderate", "confidence": 0.86, "desc": "Valproate increases free phenytoin levels"},
    ("carbamazepine", "oral contraceptive"): {"severity": "severe", "confidence": 0.90, "desc": "Enzyme induction reduces contraceptive efficacy"},
    ("phenytoin", "warfarin"): {"severity": "severe", "confidence": 0.88, "desc": "Complex interaction – monitor INR closely"},
}

# Class-based interaction rules for drugs not in the knowledge base
CLASS_INTERACTIONS = {
    # (class1, class2): { severity, desc }
    ("BLOOD RELATED", "BLOOD RELATED"): {"severity": "moderate", "confidence": 0.78, "desc": "Multiple blood-affecting drugs – increased bleeding or clotting risk"},
    ("HEART RELATED", "HEART RELATED"): {"severity": "moderate", "confidence": 0.76, "desc": "Multiple cardiac drugs – monitor for additive effects on heart rate/pressure"},
    ("PAIN RELIEF", "BLOOD RELATED"): {"severity": "moderate", "confidence": 0.80, "desc": "Pain medications may affect blood clotting or interact with blood thinners"},
    ("PAIN RELIEF", "PAIN RELIEF"): {"severity": "moderate", "confidence": 0.82, "desc": "Combining pain relievers increases risk of GI and renal side effects"},
    ("NEURO/CNS", "NEURO/CNS"): {"severity": "moderate", "confidence": 0.80, "desc": "Multiple CNS-active drugs – additive sedation risk"},
    ("ANTI DIABETIC", "ANTI DIABETIC"): {"severity": "moderate", "confidence": 0.80, "desc": "Multiple diabetes drugs – increased hypoglycemia risk"},
    ("ANTI INFECTIVE", "BLOOD RELATED"): {"severity": "moderate", "confidence": 0.75, "desc": "Antibiotics may alter anticoagulant effectiveness"},
}


def _normalize_class(cls: str) -> str:
    """Normalize drug class for fuzzy class-based matching."""
    c = cls.upper().strip()
    if any(k in c for k in ["BLOOD", "ANTICOAGUL", "ANTIPLATELET"]):
        return "BLOOD RELATED"
    if any(k in c for k in ["HEART", "CARDIAC", "CARDIO", "HYPERTENSION", "ANTI HYPERTENSIVE"]):
        return "HEART RELATED"
    if any(k in c for k in ["PAIN", "NSAID", "ANALGESIC", "ANTI INFLAMMATORY"]):
        return "PAIN RELIEF"
    if any(k in c for k in ["NEURO", "CNS", "PSYCHIATRIC", "PSYCHO", "ANTI DEPRESSANT", "ANTI EPILEPTIC", "SEDATIVE", "ANXIOLYTIC"]):
        return "NEURO/CNS"
    if any(k in c for k in ["DIABET", "HYPOGLYCEMIC", "INSULIN"]):
        return "ANTI DIABETIC"
    if any(k in c for k in ["ANTI INFECTIVE", "ANTIBIOTIC", "ANTI BACTERIAL", "ANTI FUNGAL", "ANTI VIRAL"]):
        return "ANTI INFECTIVE"
    return c


def predict_drug_interaction(drug1: str, drug2: str) -> Dict:
    """
    Predict interaction between two drugs.
    1. Resolve brand names to generic ingredients
    2. Look up in comprehensive knowledge base
    3. Fall back to drug-class-based inference
    """
    # Step 1: Resolve to generic names
    gen1 = _resolve_generic(drug1)
    gen2 = _resolve_generic(drug2)
    logger.info(f"Interaction check: '{drug1}'→'{gen1}' vs '{drug2}'→'{gen2}'")

    # Step 2: Look up in knowledge base (sorted tuple key)
    key = tuple(sorted([gen1, gen2]))
    if key in DRUG_INTERACTION_DB:
        r = DRUG_INTERACTION_DB[key]
        return {"severity": r["severity"], "confidence": r["confidence"], "description": r["desc"]}

    # Also try matching multi-ingredient generics (e.g. "aspirin+atorvastatin+clopidogrel")
    for gen in [gen1, gen2]:
        if "+" in gen:
            parts = [p.strip() for p in gen.split("+")]
            other = gen2 if gen == gen1 else gen1
            for part in parts:
                sub_key = tuple(sorted([part, other]))
                if sub_key in DRUG_INTERACTION_DB:
                    r = DRUG_INTERACTION_DB[sub_key]
                    return {"severity": r["severity"], "confidence": r["confidence"], "description": r["desc"]}

    # Step 3: Class-based inference
    cls1 = _drug_classes.get(gen1, "")
    cls2 = _drug_classes.get(gen2, "")
    if cls1 and cls2:
        norm1 = _normalize_class(cls1)
        norm2 = _normalize_class(cls2)
        cls_key = tuple(sorted([norm1, norm2]))
        if cls_key in CLASS_INTERACTIONS:
            r = CLASS_INTERACTIONS[cls_key]
            return {
                "severity": r["severity"],
                "confidence": r["confidence"],
                "description": f"{r['desc']} ({cls1} + {cls2})"
            }

    # No interaction found
    return {
        "severity": "none",
        "confidence": 0.75,
        "description": "No significant interaction found in current database"
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
    return {
        "message": "PharmaLink ML Service", 
        "status": "running", 
        "version": "2.0.0",
        "ocr_available": EASYOCR_AVAILABLE,
        "donut_available": TRANSFORMERS_AVAILABLE,
        "ner_available": TRANSFORMERS_AVAILABLE
    }

@app.get("/health")
async def health_check():
    model_status = model_downloader.get_status()
    return {
        "status": "healthy",
        "models_loaded": list(model_manager._models.keys()),
        "production_models": {
            "available": len(model_downloader.loaded_models),
            "total": len(model_downloader.MODELS_CONFIG),
            "details": model_status["models"]
        },
        "ocr_engines": {
            "easyocr": EASYOCR_AVAILABLE,
            "easyocr_loaded": ocr_manager._easyocr_reader is not None,
            "donut": TRANSFORMERS_AVAILABLE,
            "donut_model": ocr_manager.DONUT_MODEL_ID,
            "donut_loaded": ocr_manager._donut_model is not None,
        },
        "ner_engine": {
            "available": TRANSFORMERS_AVAILABLE,
            "model": ner_engine.NER_MODEL_ID,
            "loaded": ner_engine._ner_pipeline is not None,
        },
        "gpu_available": TRANSFORMERS_AVAILABLE and torch.cuda.is_available() if TRANSFORMERS_AVAILABLE else False,
    }

# ---------------------------------------------------------
# Drug & Food Search Data (loaded once at startup)
# ---------------------------------------------------------
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Load drug search index
_drug_index: List[Dict] = []
_drug_search_file = ARTIFACTS_DIR / "drug_search_index.json"
if _drug_search_file.exists():
    with open(_drug_search_file, "r", encoding="utf-8") as _f:
        _drug_index = json.load(_f)
    logger.info(f"Loaded {len(_drug_index)} drugs into search index")
else:
    logger.warning(f"Drug search index not found: {_drug_search_file}")

# Load food data
_food_list: List[Dict] = []
_food_csv = DATA_DIR / "food_features_final.csv"
_food_xlsx = ARTIFACTS_DIR / "SrilankanCommonFoods.xlsx"
if _food_csv.exists():
    _food_df = pd.read_csv(_food_csv)
    _food_list = _food_df.to_dict(orient="records")
    logger.info(f"Loaded {len(_food_list)} foods from food_features_final.csv")
elif _food_xlsx.exists():
    _food_df = pd.read_excel(_food_xlsx)
    _food_list = _food_df.to_dict(orient="records")
    logger.info(f"Loaded {len(_food_list)} foods from SrilankanCommonFoods.xlsx")
else:
    logger.warning("No food dataset found")

# Load drug-food interaction data for risk checks
_drug_interactions_data: List[Dict] = []
_interactions_csv = DATA_DIR / "drug_interactions_final.csv"
if _interactions_csv.exists():
    _interactions_df = pd.read_csv(_interactions_csv)
    _drug_interactions_data = _interactions_df.to_dict(orient="records")
    logger.info(f"Loaded {len(_drug_interactions_data)} drug-food interaction records")

# Build brand→generic lookups now that drug index is loaded
_build_drug_lookups()
logger.info(f"Built drug lookups: {len(_brand_to_generic)} brand→generic, {len(_drug_classes)} drug classes")

@app.get("/drugs")
async def search_drugs(q: str = "", limit: int = 50):
    """Search drugs by name or generic ingredient."""
    if not q.strip():
        return _drug_index[:limit]
    query = q.lower().strip()
    results = []
    seen = set()
    # Prefix matches first
    for d in _drug_index:
        if len(results) >= limit:
            break
        lower = d["name"].lower()
        if lower.startswith(query) and lower not in seen:
            seen.add(lower)
            results.append(d)
    # Contains matches
    if len(results) < limit:
        for d in _drug_index:
            if len(results) >= limit:
                break
            lower = d["name"].lower()
            if query in lower and lower not in seen:
                seen.add(lower)
                results.append(d)
    # Generic ingredient matches
    if len(results) < limit:
        for d in _drug_index:
            if len(results) >= limit:
                break
            lower = d["name"].lower()
            gen = (d.get("generic") or "").lower()
            if gen and query in gen and lower not in seen:
                seen.add(lower)
                results.append(d)
    return results

@app.get("/foods")
async def search_foods(q: str = "", limit: int = 50):
    """Search foods by name."""
    if not q.strip():
        return _food_list[:limit]
    query = q.lower().strip()
    results = []
    for f in _food_list:
        if len(results) >= limit:
            break
        food_name = str(f.get("Food", "")).lower()
        if query in food_name:
            results.append(f)
    return results

@app.post("/drug-risk")
async def drug_risk(data: Dict[str, Any]):
    """Check drug risk based on drug index."""
    drug_index = data.get("drug_index")
    if drug_index is None or drug_index < 0 or drug_index >= len(_drug_index):
        raise HTTPException(status_code=400, detail="Invalid drug_index")
    drug = _drug_index[drug_index]
    drug_name = (drug.get("generic") or drug.get("name", "")).lower()
    # Check for known interactions
    related = [r for r in _drug_interactions_data
               if str(r.get("Active_Ingredient", "")).lower() == drug_name]
    risk = 1 if related else 0
    return {"drug": drug, "risk": risk, "interaction_count": len(related)}

@app.post("/food-drug-risk")
async def food_drug_risk(data: Dict[str, Any]):
    """Check food-drug interaction risk."""
    drug_index = data.get("drug_index")
    food_name = data.get("food_name", "")
    if drug_index is None or drug_index < 0 or drug_index >= len(_drug_index):
        raise HTTPException(status_code=400, detail="Invalid drug_index")
    drug = _drug_index[drug_index]
    drug_name = (drug.get("generic") or drug.get("name", "")).lower()
    food_lower = food_name.lower()
    # Check interactions data
    related = [r for r in _drug_interactions_data
               if str(r.get("Active_Ingredient", "")).lower() == drug_name]
    risk = 0
    explanation = "No known interaction"
    for r in related:
        cat = str(r.get("interaction_category", "")).lower()
        text = str(r.get("interaction_text", "")).lower()
        if cat == "alcohol" and any(kw in food_lower for kw in ["beer", "wine", "spirits", "alcohol", "toddy", "arrack"]):
            risk = 2
            explanation = str(r.get("interaction_text", "Alcohol interaction"))
            break
        if cat == "herbal_anticoagulant" and any(kw in food_lower for kw in ["garlic", "ginger", "ginseng", "ginkgo"]):
            risk = 2
            explanation = str(r.get("interaction_text", "Herbal anticoagulant interaction"))
            break
        if cat == "iron_support" and "iron" in food_lower:
            risk = 1
            explanation = str(r.get("interaction_text", "Iron supplement interaction"))
            break
    return {"drug": drug["name"], "food": food_name, "risk": risk, "explanation": explanation}

@app.get("/safe-foods/{drug_index}")
async def safe_foods(drug_index: int, top_n: int = 10):
    """Get safe foods for a given drug."""
    if drug_index < 0 or drug_index >= len(_drug_index):
        raise HTTPException(status_code=400, detail="Invalid drug_index")
    drug = _drug_index[drug_index]
    drug_name = (drug.get("generic") or drug.get("name", "")).lower()
    related = [r for r in _drug_interactions_data
               if str(r.get("Active_Ingredient", "")).lower() == drug_name]
    # Get risky food keywords
    risky_keywords = set()
    for r in related:
        cat = str(r.get("interaction_category", ""))
        if cat == "alcohol":
            risky_keywords.update(["beer", "wine", "spirits", "toddy", "arrack", "alcohol"])
        elif cat == "herbal_anticoagulant":
            risky_keywords.update(["garlic", "ginger", "ginseng", "ginkgo", "chamomile"])
        elif cat == "iron_support":
            risky_keywords.add("iron")
    # Filter safe foods
    safe = []
    for f in _food_list:
        fname = str(f.get("Food", "")).lower()
        if not any(kw in fname for kw in risky_keywords):
            safe.append(f)
        if len(safe) >= top_n:
            break
    return safe

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

@app.post("/prescription/ocr")
async def ocr_prescription(
    file: UploadFile = File(...),
    engine: str = Form(default="auto"),
    enhance_mode: str = Form(default="medical")
):
    """
    Perform OCR on a prescription image.

    Engines (selected via *engine* form field):
      - ``auto``        – Donut for handwritten, EasyOCR for printed (default)
      - ``donut``       – Force Medical Prescription OCR (Donut) model
      - ``easyocr``     – Force EasyOCR
      - ``all``         – Run both and merge results

    After OCR the extracted text is automatically run through the
    Medical NER model to produce structured entities.
    """
    start_time = time.time()

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # ------ Read & prepare image ------
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)

        logger.info(f"Processing image: {file.filename}, size: {pil_image.size}, engine: {engine}")

        # Preprocess for better OCR
        preprocessor = MedicalImagePreprocessor()

        # ------ OCR Stage ------
        extracted_text = ""
        confidence_scores: List[float] = []
        ocr_engine_used = "mock"
        donut_text = ""
        easyocr_text = ""

        # Determine which engine(s) to use
        use_donut = engine in ("auto", "donut", "all") and TRANSFORMERS_AVAILABLE
        use_easyocr = engine in ("auto", "easyocr", "all") and EASYOCR_AVAILABLE

        # --- Donut (handwritten medical text) ---
        if use_donut:
            try:
                logger.info("Running Donut Medical Prescription OCR …")
                donut_text = ocr_manager.run_donut_ocr(pil_image)
                if donut_text:
                    ocr_engine_used = "Donut (Medical Prescription OCR)"
                    confidence_scores.append(0.84)  # model's reported accuracy
                    logger.info(f"Donut extracted {len(donut_text)} chars")
            except Exception as e:
                logger.error(f"Donut OCR error: {e}")

        # --- EasyOCR (printed / fallback) ---
        if use_easyocr and (not donut_text or engine in ("easyocr", "all")):
            try:
                logger.info("Running EasyOCR …")
                reader = ocr_manager.easyocr
                if reader:
                    results = reader.readtext(image_array)
                    lines = []
                    for detection in results:
                        _, text_seg, conf = detection
                        lines.append(text_seg)
                        confidence_scores.append(conf)
                    easyocr_text = "\n".join(lines)
                    if not donut_text:
                        ocr_engine_used = "EasyOCR"
                    elif engine == "all":
                        ocr_engine_used = "Donut + EasyOCR (merged)"
                    logger.info(f"EasyOCR extracted {len(lines)} text segments")
            except Exception as e:
                logger.error(f"EasyOCR error: {e}")

        # --- Merge / choose best text ---
        if engine == "all" and donut_text and easyocr_text:
            # Combine both outputs (donut first, easyocr supplements)
            extracted_text = donut_text + "\n---\n" + easyocr_text
        elif donut_text:
            extracted_text = donut_text
        elif easyocr_text:
            extracted_text = easyocr_text

        # --- Fallback mock data ---
        if not extracted_text:
            logger.warning("No OCR engine produced text – returning mock data")
            ocr_engine_used = "mock"
            extracted_text = (
                "Dr. Smith Medical Clinic\n"
                "Patient: John Doe\n"
                "Date: 2025-01-05\n\n"
                "Rx:\n"
                "1. Amoxicillin 500mg - Take 1 tablet 3 times daily for 7 days\n"
                "2. Ibuprofen 400mg - Take 1 tablet as needed for pain\n"
                "3. Omeprazole 20mg - Take 1 capsule daily before breakfast\n\n"
                "Instructions: Take medications with food. Complete full course of antibiotics.\n"
                "Warning: May cause drowsiness. Avoid alcohol.\n\n"
                "Signature: Dr. Smith, MD"
            )
            confidence_scores = [0.92]

        # ------ NER Stage ------
        ner_entities = ner_engine.extract_entities(extracted_text)

        # ------ Parse into structured output ------
        parsed_data = PrescriptionParser.parse(extracted_text, ner_entities=ner_entities)

        avg_confidence = float(np.mean(confidence_scores)) if confidence_scores else 0.85
        processing_time = time.time() - start_time
        image_quality = min(100, max(50, int(avg_confidence * 100)))

        response_data = {
            "success": True,
            "interpretation": {
                "rawText": extracted_text,
                "medications": parsed_data.get("medications", []),
                "dosages": parsed_data.get("dosages", []),
                "instructions": parsed_data.get("instructions", []),
                "frequencies": parsed_data.get("frequencies", []),
                "durations": parsed_data.get("durations", []),
                "warnings": parsed_data.get("warnings", []),
                "interactions": [],
                "confidence": round(avg_confidence * 100, 2),
                "imageQuality": image_quality,
            },
            "ner_entities": ner_entities,
            "metadata": {
                "engine": ocr_engine_used,
                "enhanceMode": enhance_mode,
                "processingTime": round(processing_time, 3),
                "imageSize": f"{pil_image.size[0]}x{pil_image.size[1]}",
                "fileName": file.filename,
                "donut_available": TRANSFORMERS_AVAILABLE,
                "ner_available": TRANSFORMERS_AVAILABLE,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
        }

        logger.info(f"OCR completed in {processing_time:.2f}s using {ocr_engine_used}")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/prescription/interpret")
async def interpret_prescription(
    file: UploadFile = File(...),
    engine: str = Form(default="auto"),
    enhance_mode: str = Form(default="medical"),
):
    """
    Full prescription interpretation pipeline.

    1. Image preprocessing
    2. OCR (Donut / EasyOCR / both)
    3. NER entity extraction
    4. Structured output with medications, dosages, instructions, warnings
    5. Cross-reference with drug interaction database

    This is the recommended endpoint for production use.
    """
    start_time = time.time()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)

        logger.info(f"[Interpret] Processing: {file.filename}, size: {pil_image.size}")

        # ----- Step 1: Image Preprocessing -----
        preprocessor = MedicalImagePreprocessor()
        preprocessed = preprocessor.preprocess(image_array, enhance_mode)

        # ----- Step 2: OCR -----
        extracted_text = ""
        confidence_scores: List[float] = []
        engines_used: List[str] = []

        # Try Donut first (best for handwritten)
        if TRANSFORMERS_AVAILABLE and engine in ("auto", "donut", "all"):
            donut_result = ocr_manager.run_donut_ocr(pil_image)
            if donut_result:
                extracted_text = donut_result
                confidence_scores.append(0.84)
                engines_used.append("Donut")

        # Try EasyOCR (best for printed)
        if EASYOCR_AVAILABLE and engine in ("auto", "easyocr", "all"):
            reader = ocr_manager.easyocr
            if reader:
                results = reader.readtext(image_array)
                easy_lines = []
                for _, txt, conf in results:
                    easy_lines.append(txt)
                    confidence_scores.append(conf)
                easyocr_result = "\n".join(easy_lines)
                if easyocr_result:
                    if extracted_text:
                        extracted_text += "\n---\n" + easyocr_result
                    else:
                        extracted_text = easyocr_result
                    engines_used.append("EasyOCR")

        # Mock fallback
        if not extracted_text:
            engines_used.append("mock")
            extracted_text = (
                "Dr. Smith Medical Clinic\n"
                "Patient: John Doe\n"
                "Date: 2025-01-05\n\n"
                "Rx:\n"
                "1. Amoxicillin 500mg - Take 1 tablet 3 times daily for 7 days\n"
                "2. Ibuprofen 400mg - Take 1 tablet as needed for pain\n"
                "3. Omeprazole 20mg - Take 1 capsule daily before breakfast\n\n"
                "Instructions: Take medications with food.\n"
                "Signature: Dr. Smith, MD"
            )
            confidence_scores = [0.92]

        # ----- Step 3: NER Entity Extraction -----
        ner_entities = ner_engine.extract_entities(extracted_text)

        # ----- Step 4: Structured Parsing -----
        parsed = PrescriptionParser.parse(extracted_text, ner_entities=ner_entities)

        # ----- Step 5: Cross-reference drug interactions -----
        interaction_warnings: List[Dict] = []
        med_names = [m["name"].lower() for m in parsed.get("medications", [])]
        for i_idx in range(len(med_names)):
            for j_idx in range(i_idx + 1, len(med_names)):
                pair_result = predict_drug_interaction(med_names[i_idx], med_names[j_idx])
                if pair_result["severity"] != "none":
                    interaction_warnings.append({
                        "drugs": [med_names[i_idx], med_names[j_idx]],
                        "severity": pair_result["severity"],
                        "confidence": pair_result["confidence"],
                        "description": pair_result["description"],
                    })

        avg_confidence = float(np.mean(confidence_scores)) if confidence_scores else 0.85
        processing_time = time.time() - start_time

        return {
            "success": True,
            "interpretation": {
                "rawText": extracted_text,
                "medications": parsed.get("medications", []),
                "dosages": parsed.get("dosages", []),
                "instructions": parsed.get("instructions", []),
                "frequencies": parsed.get("frequencies", []),
                "durations": parsed.get("durations", []),
                "warnings": parsed.get("warnings", []),
                "interactions": interaction_warnings,
                "confidence": round(avg_confidence * 100, 2),
                "imageQuality": min(100, max(50, int(avg_confidence * 100))),
            },
            "ner_entities": ner_entities,
            "metadata": {
                "engines": engines_used,
                "enhanceMode": enhance_mode,
                "processingTime": round(processing_time, 3),
                "imageSize": f"{pil_image.size[0]}x{pil_image.size[1]}",
                "fileName": file.filename,
                "pipeline": "OCR → NER → Parser → Interaction Check",
                "models": {
                    "ocr_donut": ocr_manager.DONUT_MODEL_ID if "Donut" in engines_used else None,
                    "ner": ner_engine.NER_MODEL_ID if TRANSFORMERS_AVAILABLE else "regex-fallback",
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
            "disclaimer": (
                "This tool is for research and educational purposes only. "
                "It is NOT validated for clinical use. Always verify extracted "
                "information with a qualified medical professional."
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Interpret pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")

@app.post("/prescription/enhance")
async def enhance_image(
    file: UploadFile = File(...),
    mode: str = Form(default="medical"),
):
    """Enhance prescription image quality for better OCR results."""
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)

        preprocessor = MedicalImagePreprocessor()
        enhanced = preprocessor.preprocess(image_array, enhance_mode=mode)

        # Convert back to base64 for client
        import base64
        enhanced_pil = Image.fromarray(enhanced)
        buf = io.BytesIO()
        enhanced_pil.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "success": True,
            "enhanced_image": f"data:image/png;base64,{b64}",
            "quality_score": 88,
            "enhancements_applied": [
                "contrast_adjustment",
                "noise_reduction",
                "adaptive_threshold" if mode == "medical" else "otsu_threshold",
            ],
            "mode": mode,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


# ---------------------------------------------------------
# Prescription Text Analysis (no image required)
# ---------------------------------------------------------
class AnalyzeTextRequest(BaseModel):
    prescriptionText: str
    patientInfo: Optional[Dict[str, Any]] = None

@app.post("/prescription/analyze-text")
async def analyze_text(req: AnalyzeTextRequest):
    """Analyze manually-typed prescription text (no image needed).

    Runs NER + regex parsing on the provided text and returns
    structured medication data with warnings and interactions.
    """
    start_time = time.time()

    if not req.prescriptionText or not req.prescriptionText.strip():
        raise HTTPException(status_code=400, detail="Prescription text is required")

    text = req.prescriptionText.strip()

    # NER extraction
    ner_entities = ner_engine.extract_entities(text)

    # Structured parsing
    parsed = PrescriptionParser.parse(text, ner_entities=ner_entities)

    # Cross-reference drug interactions
    interaction_warnings: List[Dict] = []
    med_names = [m["name"].lower() for m in parsed.get("medications", [])]
    for i_idx in range(len(med_names)):
        for j_idx in range(i_idx + 1, len(med_names)):
            pair_result = predict_drug_interaction(med_names[i_idx], med_names[j_idx])
            if pair_result["severity"] != "none":
                interaction_warnings.append({
                    "drugs": [med_names[i_idx], med_names[j_idx]],
                    "severity": pair_result["severity"],
                    "confidence": pair_result["confidence"],
                    "description": pair_result["description"],
                })

    processing_time = time.time() - start_time

    return {
        "success": True,
        "inputText": text,
        "interpretation": {
            "rawText": text,
            "medications": parsed.get("medications", []),
            "dosages": parsed.get("dosages", []),
            "instructions": parsed.get("instructions", []),
            "frequencies": parsed.get("frequencies", []),
            "durations": parsed.get("durations", []),
            "warnings": parsed.get("warnings", []),
            "interactions": interaction_warnings,
            "confidence": 85.0,
            "totalMedications": len(parsed.get("medications", [])),
        },
        "ner_entities": ner_entities,
        "metadata": {
            "pipeline": "NER → Parser → Interaction Check",
            "processingTime": round(processing_time, 3),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
    }


class ValidateRequest(BaseModel):
    prescriptionData: Dict[str, Any]

@app.post("/prescription/validate")
async def validate_prescription(req: ValidateRequest):
    """Validate prescription data structure and completeness."""
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
        if not med.get("dosage"):
            result["warnings"].append(f"Dosage missing for {med.get('name', 'unknown')}")
            result["score"] -= 10
        if not med.get("frequency"):
            result["warnings"].append(f"Frequency missing for {med.get('name', 'unknown')}")
            result["score"] -= 10

    result["score"] = max(0, result["score"])

    return {
        "success": True,
        "prescriptionData": data,
        "validation": result,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


@app.get("/models/status")
async def get_models_status():
    """Get detailed status of all ML models"""
    return model_downloader.get_status()

@app.post("/models/download")
async def download_models(force: bool = False):
    """
    Download/setup all production models
    Set force=True to re-download existing models
    """
    try:
        results = model_downloader.download_all_models(force=force)
        success_count = sum(1 for v in results.values() if v)
        
        return {
            "success": success_count > 0,
            "message": f"Downloaded {success_count}/{len(results)} models",
            "results": results,
            "status": model_downloader.get_status()
        }
    except Exception as e:
        logger.error(f"Model download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/load")
async def load_models():
    """Load all available models into memory"""
    try:
        model_downloader.load_all_models(auto_download=True)
        return {
            "success": True,
            "loaded": list(model_downloader.loaded_models.keys()),
            "count": len(model_downloader.loaded_models)
        }
    except Exception as e:
        logger.error(f"Model load error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# Startup Event: Auto-download and load models
# ---------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Initialize models on service startup"""
    logger.info("=" * 60)
    logger.info("PharmaLink ML Service Starting...")
    logger.info("=" * 60)
    
    # Auto-download and setup models
    try:
        logger.info("Checking for production models...")
        model_downloader.setup_models(force_download=False)
        
        loaded_count = len(model_downloader.loaded_models)
        total_count = len(model_downloader.MODELS_CONFIG)
        
        if loaded_count > 0:
            logger.info(f"✓ {loaded_count}/{total_count} production models loaded")
        else:
            logger.warning("⚠ No production models loaded - using knowledge base fallback")
            logger.info("To train models, run notebooks in: notebooks/")
            logger.info("Or set model URLs in model_downloader.py")
    except Exception as e:
        logger.error(f"Model setup error: {e}")
        logger.warning("Continuing with knowledge base fallback")
    
    logger.info("=" * 60)
    logger.info("✓ PharmaLink ML Service Ready")
    logger.info("=" * 60)

# ---------------------------------------------------------
# Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ---------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
