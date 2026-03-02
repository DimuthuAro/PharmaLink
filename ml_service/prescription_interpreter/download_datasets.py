"""
Prescription Interpreter – Step 1: Download Models & Datasets
==============================================================
Downloads the pre-trained models required for the OCR + NER pipeline:

  1. Donut Medical Prescription OCR model (HuggingFace)
     chinmays18/medical-prescription-ocr
  2. BERT Medical NER model (HuggingFace)
     samrawal/bert-large-uncased_med-ner
  3. EasyOCR language models (first-time download)
  4. Sample prescription images for testing (optional)

All models are cached by HuggingFace Transformers / EasyOCR in their
default cache directories (~/.cache/huggingface, ~/.EasyOCR).

Usage:
  python -m prescription_interpreter.download_datasets           # interactive
  python -m prescription_interpreter.download_datasets --all     # download everything
  python -m prescription_interpreter.download_datasets --donut   # just Donut OCR
  python -m prescription_interpreter.download_datasets --ner     # just NER model
  python -m prescription_interpreter.download_datasets --easyocr # just EasyOCR
"""

import argparse
import sys
import os
from pathlib import Path

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
def fail(msg): print(f"  {C.RED}✖{C.RESET}  {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def step(n, total, msg): print(f"\n  {C.BOLD}{C.BLUE}[{n}/{total}]{C.RESET} {C.WHITE}{msg}{C.RESET}")


def banner():
    print(f"""
{C.CYAN}╔══════════════════════════════════════════════════════════════╗
║{C.RESET}{C.BOLD}{C.WHITE}   PRESCRIPTION INTERPRETER – Model & Dataset Download       {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Models  : Donut OCR + BERT Medical NER + EasyOCR
  Cache   : ~/.cache/huggingface , ~/.EasyOCR{C.RESET}
""")


# ── Download Functions ───────────────────────────────────────────

def download_donut_model():
    """Download the Medical Prescription OCR (Donut) model from HuggingFace."""
    step(1, 4, "Downloading Donut Medical Prescription OCR model")
    model_id = "chinmays18/medical-prescription-ocr"
    print(f"  {C.DIM}Model: {model_id}{C.RESET}")

    try:
        from transformers import DonutProcessor, VisionEncoderDecoderModel
        import torch
    except ImportError:
        fail("transformers / torch not installed")
        print(f"  {C.DIM}Install: pip install transformers torch sentencepiece{C.RESET}")
        return False

    try:
        print(f"  {C.DIM}Downloading processor (this may take a few minutes on first run)...{C.RESET}")
        processor = DonutProcessor.from_pretrained(model_id)
        ok("Donut processor downloaded")

        print(f"  {C.DIM}Downloading model weights...{C.RESET}")
        model = VisionEncoderDecoderModel.from_pretrained(model_id)
        ok("Donut model downloaded")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"  {C.DIM}Device: {device}{C.RESET}")
        ok(f"Donut Medical Prescription OCR ready ({model_id})")
        return True

    except Exception as e:
        fail(f"Donut download failed: {e}")
        return False


def download_ner_model():
    """Download the Medical NER (BERT) model from HuggingFace."""
    step(2, 4, "Downloading BERT Medical NER model")
    model_id = "samrawal/bert-large-uncased_med-ner"
    print(f"  {C.DIM}Model: {model_id}{C.RESET}")

    try:
        from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline as hf_pipeline
    except ImportError:
        fail("transformers not installed")
        print(f"  {C.DIM}Install: pip install transformers torch{C.RESET}")
        return False

    try:
        print(f"  {C.DIM}Downloading tokenizer...{C.RESET}")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        ok("NER tokenizer downloaded")

        print(f"  {C.DIM}Downloading model weights...{C.RESET}")
        model = AutoModelForTokenClassification.from_pretrained(model_id)
        ok("NER model downloaded")

        # Verify pipeline loads
        pipe = hf_pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")
        ok(f"Medical NER pipeline ready ({model_id})")
        return True

    except Exception as e:
        fail(f"NER model download failed: {e}")
        return False


def download_easyocr():
    """Download and initialize EasyOCR English models."""
    step(3, 4, "Downloading EasyOCR English language models")

    try:
        import easyocr
    except ImportError:
        fail("EasyOCR not installed")
        print(f"  {C.DIM}Install: pip install easyocr{C.RESET}")
        return False

    try:
        print(f"  {C.DIM}Initializing EasyOCR (downloads language models on first use)...{C.RESET}")
        reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        ok("EasyOCR English models ready")
        return True

    except Exception as e:
        fail(f"EasyOCR init failed: {e}")
        return False


def create_sample_data():
    """Create sample test data and abbreviation mappings for prescriptions."""
    step(4, 4, "Creating sample prescription data & abbreviation mappings")

    # Medical abbreviation map
    abbreviation_map = {
        "OD": "Once daily", "BD": "Twice daily", "TDS": "Three times daily",
        "TID": "Three times daily", "QID": "Four times daily",
        "QD": "Once daily", "BID": "Twice daily",
        "PRN": "As needed", "SOS": "If needed (emergency)", "HS": "At bedtime",
        "AC": "Before meals", "PC": "After meals", "PO": "By mouth",
        "IM": "Intramuscular", "IV": "Intravenous", "SC": "Subcutaneous",
        "SL": "Sublingual", "QAM": "Every morning", "QPM": "Every evening",
        "Q4H": "Every 4 hours", "Q6H": "Every 6 hours",
        "Q8H": "Every 8 hours", "Q12H": "Every 12 hours", "STAT": "Immediately",
        "Tab": "Tablet", "Cap": "Capsule", "Inj": "Injection",
        "Susp": "Suspension", "Syr": "Syrup", "Oint": "Ointment",
        "gtts": "Drops", "mEq": "Milliequivalent", "mcg": "Microgram",
    }

    import json
    abbrev_path = ARTIFACTS_DIR / "medical_abbreviations.json"
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(abbrev_path, "w", encoding="utf-8") as f:
        json.dump(abbreviation_map, f, indent=2)
    ok(f"Abbreviation map saved → {abbrev_path}")

    # Sample prescription texts for testing
    sample_prescriptions = [
        {
            "id": "sample_001",
            "description": "Simple 3-drug prescription",
            "text": (
                "Dr. Smith Medical Clinic\nPatient: John Doe\nDate: 2025-01-05\n\n"
                "Rx:\n1. Amoxicillin 500mg - Take 1 tablet 3 times daily for 7 days\n"
                "2. Ibuprofen 400mg - Take 1 tablet as needed for pain\n"
                "3. Omeprazole 20mg - Take 1 capsule daily before breakfast\n\n"
                "Instructions: Take medications with food.\nSignature: Dr. Smith, MD"
            ),
            "expected_medications": ["Amoxicillin", "Ibuprofen", "Omeprazole"],
        },
        {
            "id": "sample_002",
            "description": "Prescription with medical abbreviations",
            "text": (
                "Rx:\nTab. Metformin 500mg BD PC\nTab. Amlodipine 5mg OD\n"
                "Cap. Omeprazole 20mg OD AC\nDuration: 30 days\n"
                "Review after 1 month"
            ),
            "expected_medications": ["Metformin", "Amlodipine", "Omeprazole"],
        },
        {
            "id": "sample_003",
            "description": "Complex multi-drug prescription",
            "text": (
                "Patient: Jane Smith  Age: 65  Date: 2025-03-10\n\n"
                "1. Warfarin 5mg OD – monitor INR weekly\n"
                "2. Lisinopril 10mg OD\n"
                "3. Atorvastatin 20mg HS\n"
                "4. Metformin 850mg BD PC\n"
                "5. Aspirin 75mg OD\n\n"
                "Avoid: Vitamin K-rich foods, alcohol\n"
                "Follow up: 2 weeks"
            ),
            "expected_medications": ["Warfarin", "Lisinopril", "Atorvastatin", "Metformin", "Aspirin"],
        },
    ]

    samples_path = ARTIFACTS_DIR / "sample_prescriptions.json"
    with open(samples_path, "w", encoding="utf-8") as f:
        json.dump(sample_prescriptions, f, indent=2)
    ok(f"Sample prescriptions saved → {samples_path}")

    # Create uploads directory for prescription images
    uploads_dir = BASE_DIR / "uploads" / "prescriptions"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    ok(f"Uploads directory ready → {uploads_dir}")

    return True


# ── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Download models for Prescription Interpreter")
    parser.add_argument("--all", action="store_true", help="Download everything")
    parser.add_argument("--donut", action="store_true", help="Download Donut OCR model only")
    parser.add_argument("--ner", action="store_true", help="Download Medical NER model only")
    parser.add_argument("--easyocr", action="store_true", help="Download EasyOCR models only")
    parser.add_argument("--samples", action="store_true", help="Create sample data only")
    args = parser.parse_args()

    banner()

    download_all = args.all or not any([args.donut, args.ner, args.easyocr, args.samples])

    results = {}

    if download_all or args.donut:
        results["donut"] = download_donut_model()

    if download_all or args.ner:
        results["ner"] = download_ner_model()

    if download_all or args.easyocr:
        results["easyocr"] = download_easyocr()

    if download_all or args.samples:
        results["samples"] = create_sample_data()

    # Summary
    passed = sum(1 for v in results.values() if v)
    total = len(results)

    print(f"\n{'='*60}")
    if passed == total:
        print(f"{C.GREEN}✔ All {total} downloads completed successfully!{C.RESET}")
    else:
        print(f"{C.YELLOW}⚠ {passed}/{total} downloads succeeded{C.RESET}")
        for name, ok_val in results.items():
            status = f"{C.GREEN}✔{C.RESET}" if ok_val else f"{C.RED}✖{C.RESET}"
            print(f"  {status} {name}")
    print(f"{C.DIM}  Next step: python -m prescription_interpreter.extract_data{C.RESET}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
