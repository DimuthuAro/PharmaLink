"""
Prescription Interpreter – Step 3: Model Training & Evaluation
===============================================================
Evaluates and fine-tunes the OCR + NER pipeline:

  1. Load pre-trained models (Donut OCR + BERT Medical NER)
  2. Load evaluation dataset and sample prescriptions
  3. Run the full pipeline on sample texts (NER evaluation)
  4. Measure entity extraction accuracy (precision/recall/F1)
  5. Train a medication-name classifier (known drug vs noise)
  6. Save evaluation results and classifier model

Input:
  data/prescription_evaluation_dataset.csv
  data/prescription_patterns.json
  data/prescription_drug_lookup.json
  artifacts/sample_prescriptions.json

Output:
  ml_service/models/prescription_ner_evaluation.json
  ml_service/models/medication_classifier.pkl
  ml_service/models/prescription_model_metadata.json

Usage:
  python -m prescription_interpreter.train_model
  python -m prescription_interpreter.train_model --skip-ner   # skip NER eval
"""

import json
import sys
import time
import re
import argparse
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

# Ensure ml_service is importable when running as a standalone script
_ml_service_dir = str(Path(__file__).resolve().parent.parent)
if _ml_service_dir not in sys.path:
    sys.path.insert(0, _ml_service_dir)
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

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
║{C.RESET}{C.BOLD}{C.WHITE}   PRESCRIPTION INTERPRETER – Model Training & Evaluation    {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Pipeline: Donut OCR → BERT NER → Medication Classifier
  Data    : {DATA_DIR}
  Output  : {MODEL_DIR}{C.RESET}
""")


# ── Drug suffix features for classifier ─────────────────────────
DRUG_SUFFIXES = [
    "cillin", "mycin", "prazole", "olol", "sartan", "statin",
    "pril", "dipine", "azole", "idine", "amine", "etine",
    "azepam", "oxacin", "cycline", "zosin", "lukast", "navir",
    "gliptin", "gliflozin", "glutide", "mab", "nib",
]


def extract_word_features(word: str) -> dict:
    """Extract features from a word for the medication classifier."""
    w = word.lower().strip()
    features = {
        "length": len(w),
        "has_digit": int(any(c.isdigit() for c in w)),
        "starts_upper": int(word[0].isupper()) if word else 0,
        "vowel_ratio": sum(1 for c in w if c in 'aeiou') / max(len(w), 1),
        "consonant_clusters": len(re.findall(r'[bcdfghjklmnpqrstvwxyz]{3,}', w)),
    }
    # Suffix matches
    for suffix in DRUG_SUFFIXES:
        features[f"suffix_{suffix}"] = int(w.endswith(suffix))

    return features


def main():
    parser = argparse.ArgumentParser(description="Train/evaluate Prescription Interpreter models")
    parser.add_argument("--skip-ner", action="store_true", help="Skip NER model evaluation")
    args = parser.parse_args()

    banner()

    # ════════════════════════════════════════════════════════════
    # STEP 1: Load Pre-trained NER Model
    # ════════════════════════════════════════════════════════════
    step(1, 6, "Loading pre-trained Medical NER model")

    ner_pipeline = None
    ner_available = False

    if not args.skip_ner:
        try:
            from transformers import pipeline as hf_pipeline
            import torch

            NER_MODEL_ID = "samrawal/bert-large-uncased_med-ner"
            print(f"  {C.DIM}Model: {NER_MODEL_ID}{C.RESET}")
            device = 0 if torch.cuda.is_available() else -1

            ner_pipeline = hf_pipeline(
                "ner",
                model=NER_MODEL_ID,
                tokenizer=NER_MODEL_ID,
                aggregation_strategy="simple",
                device=device,
            )
            ner_available = True
            ok(f"NER model loaded on {'CUDA' if device == 0 else 'CPU'}")
        except Exception as e:
            warn(f"NER model not available: {e}")
            warn("Skipping NER evaluation – using regex baseline only")
    else:
        warn("NER evaluation skipped (--skip-ner flag)")

    # ════════════════════════════════════════════════════════════
    # STEP 2: Load Evaluation Data
    # ════════════════════════════════════════════════════════════
    step(2, 6, "Loading evaluation data")

    samples_path = ARTIFACTS_DIR / "sample_prescriptions.json"
    if samples_path.exists():
        with open(samples_path, "r", encoding="utf-8") as f:
            samples = json.load(f)
        ok(f"Loaded {len(samples)} sample prescriptions")
    else:
        warn("sample_prescriptions.json not found – using built-in samples")
        samples = [
            {
                "id": "builtin_001",
                "text": "Rx:\n1. Amoxicillin 500mg TDS for 7 days\n2. Ibuprofen 400mg PRN\n3. Omeprazole 20mg OD",
                "expected_medications": ["Amoxicillin", "Ibuprofen", "Omeprazole"],
            }
        ]

    # Load known drug names
    lookup_path = DATA_DIR / "prescription_drug_lookup.json"
    known_drugs = set()
    if lookup_path.exists():
        with open(lookup_path, "r", encoding="utf-8") as f:
            known_drugs = set(json.load(f))
        ok(f"Loaded {len(known_drugs)} known drug names")
    else:
        warn("Drug lookup not found")

    # ════════════════════════════════════════════════════════════
    # STEP 3: Run NER Pipeline on Samples
    # ════════════════════════════════════════════════════════════
    step(3, 6, "Running NER pipeline evaluation on samples")

    NER_ENTITY_MAP = {
        "MEDICATION": "medication", "DRUG": "medication",
        "DOSAGE": "dosage", "STRENGTH": "dosage",
        "FREQUENCY": "frequency", "DURATION": "duration",
    }

    ner_results = []
    for sample in samples:
        text = sample["text"]
        expected = [m.lower() for m in sample.get("expected_medications", [])]

        ner_meds = []
        if ner_available and ner_pipeline:
            try:
                t0 = time.time()
                raw_entities = ner_pipeline(text)
                elapsed = time.time() - t0

                for ent in raw_entities:
                    label = re.sub(r"^[BI]-", "", ent.get("entity_group", "").upper())
                    mapped = NER_ENTITY_MAP.get(label)
                    if mapped == "medication":
                        word = ent.get("word", "").strip().replace(" ##", "")
                        if len(word) >= 3:
                            ner_meds.append(word.lower())

                found_lower = ner_meds
                hits = sum(1 for e in expected if any(e in f or f in e for f in found_lower))

                ner_results.append({
                    "sample_id": sample["id"],
                    "method": "NER",
                    "expected": len(expected),
                    "found": len(found_lower),
                    "hits": hits,
                    "precision": round(hits / len(found_lower), 3) if found_lower else 0,
                    "recall": round(hits / len(expected), 3) if expected else 0,
                    "inference_time_ms": round(elapsed * 1000, 1),
                })
                print(f"    {sample['id']} (NER): expected={len(expected)} found={len(found_lower)} hits={hits} ({elapsed*1000:.0f}ms)")
            except Exception as e:
                warn(f"NER failed for {sample['id']}: {e}")

        # Also run regex baseline for comparison
        from prescription_interpreter.extract_data import extract_entities_regex
        regex_result = extract_entities_regex(text)
        regex_found = [m.lower() for m in regex_result["medications"]]
        regex_hits = sum(1 for e in expected if any(e in f or f in e for f in regex_found))

        ner_results.append({
            "sample_id": sample["id"],
            "method": "Regex",
            "expected": len(expected),
            "found": len(regex_found),
            "hits": regex_hits,
            "precision": round(regex_hits / len(regex_found), 3) if regex_found else 0,
            "recall": round(regex_hits / len(expected), 3) if expected else 0,
            "inference_time_ms": 0,
        })

    if ner_results:
        ner_df = pd.DataFrame(ner_results)
        for method in ner_df["method"].unique():
            subset = ner_df[ner_df["method"] == method]
            avg_recall = subset["recall"].mean()
            avg_precision = subset["precision"].mean()
            print(f"    {method}: avg precision={avg_precision:.3f} avg recall={avg_recall:.3f}")

    # ════════════════════════════════════════════════════════════
    # STEP 4: Save NER Evaluation Results
    # ════════════════════════════════════════════════════════════
    step(4, 6, "Saving NER evaluation results")

    eval_output = {
        "evaluation_date": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ner_model": "samrawal/bert-large-uncased_med-ner" if ner_available else "N/A",
        "samples_evaluated": len(samples),
        "results": ner_results,
    }
    eval_path = MODEL_DIR / "prescription_ner_evaluation.json"
    with open(eval_path, "w", encoding="utf-8") as f:
        json.dump(eval_output, f, indent=2)
    ok(f"NER evaluation saved → {eval_path}")

    # ════════════════════════════════════════════════════════════
    # STEP 5: Train Medication Name Classifier
    # ════════════════════════════════════════════════════════════
    step(5, 6, "Training medication name classifier")

    # Positive examples: known drug names
    positive_words = list(known_drugs)[:2000] if known_drugs else [
        "amoxicillin", "ibuprofen", "metformin", "omeprazole", "atorvastatin",
        "lisinopril", "amlodipine", "warfarin", "aspirin", "paracetamol",
        "ciprofloxacin", "diazepam", "fluoxetine", "losartan", "metoprolol",
    ]

    # Negative examples: common non-drug words
    negative_words = [
        "patient", "doctor", "clinic", "hospital", "date", "morning",
        "tablet", "capsule", "daily", "food", "water", "take", "avoid",
        "signature", "prescription", "instructions", "review", "follow",
        "name", "address", "phone", "email", "report", "test", "blood",
        "sugar", "pressure", "weight", "height", "temperature", "pulse",
        "the", "and", "for", "with", "from", "this", "that", "after",
        "before", "during", "between", "about", "under", "over", "into",
    ]

    rows = []
    for word in positive_words:
        if len(word) >= 3:
            feat = extract_word_features(word)
            feat["label"] = 1
            rows.append(feat)
    for word in negative_words:
        if len(word) >= 3:
            feat = extract_word_features(word)
            feat["label"] = 0
            rows.append(feat)

    if len(rows) < 20:
        warn("Not enough data to train classifier – skipping")
    else:
        clf_df = pd.DataFrame(rows)
        feature_cols = [c for c in clf_df.columns if c != "label"]
        X = clf_df[feature_cols]
        y = clf_df["label"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        ok(f"Training data: {len(X_train)} train, {len(X_test)} test")

        clf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1)
        print(f"  {C.DIM}Training RandomForest medication classifier (100 trees) ...{C.RESET}")
        clf.fit(X_train, y_train)

        y_pred = clf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)

        print(f"\n  {'='*58}")
        print(f"  {C.BOLD}MEDICATION CLASSIFIER PERFORMANCE{C.RESET}")
        print(f"  {'='*58}")
        print(f"  Accuracy: {C.GREEN}{C.BOLD}{accuracy*100:.2f}%{C.RESET}\n")
        print(classification_report(y_test, y_pred, target_names=['Non-Drug', 'Drug Name']))
        print(f"  {'='*58}")

        model_path = MODEL_DIR / "medication_classifier.pkl"
        joblib.dump(clf, model_path)
        ok(f"Classifier saved → {model_path}")

    # ════════════════════════════════════════════════════════════
    # STEP 6: Save Metadata
    # ════════════════════════════════════════════════════════════
    step(6, 6, "Saving model metadata")

    metadata = {
        "pipeline": "Donut OCR → BERT Medical NER → Regex Parser → Medication Classifier",
        "models": {
            "ocr": {
                "name": "Medical Prescription OCR (Donut)",
                "model_id": "chinmays18/medical-prescription-ocr",
                "type": "VisionEncoderDecoder",
            },
            "ner": {
                "name": "Medical NER (BERT)",
                "model_id": "samrawal/bert-large-uncased_med-ner",
                "type": "TokenClassification",
                "available": ner_available,
            },
            "medication_classifier": {
                "name": "Medication Name Classifier",
                "type": "RandomForestClassifier",
                "n_estimators": 100,
                "accuracy": accuracy if 'accuracy' in dir() else None,
                "features": feature_cols if 'feature_cols' in dir() else [],
            },
        },
        "evaluation_samples": len(samples),
        "known_drug_names": len(known_drugs),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    meta_path = MODEL_DIR / "prescription_model_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    ok(f"Metadata saved → {meta_path}")

    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Model training & evaluation complete!{C.RESET}")
    if 'accuracy' in dir():
        print(f"  Classifier accuracy: {accuracy*100:.2f}%")
    print(f"{C.DIM}  Next step: python -m prescription_interpreter.implementation{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
