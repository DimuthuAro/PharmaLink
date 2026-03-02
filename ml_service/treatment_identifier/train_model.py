"""
Treatment Identifier – Step 3: Model Training
================================================
Trains a multi-label classifier that predicts treatment conditions
from medication features (therapeutic class, action class, drug suffix).

Pipeline:
  1. Load training data (treatment_training_data.csv)
  2. Feature engineering (TF-IDF on drug names + one-hot on classes)
  3. Train multi-output RandomForest classifier
  4. Evaluate model performance
  5. Save trained model & metadata

Input:
  data/treatment_training_data.csv
  artifacts/treatment_knowledge_base.json

Output:
  ml_service/models/treatment_identifier_model.pkl
  ml_service/models/treatment_identifier_metadata.json
  ml_service/models/treatment_label_encoder.pkl

Usage:
  python -m treatment_identifier.train_model
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from collections import Counter
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.metrics import accuracy_score, classification_report
from scipy.sparse import hstack

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# ── Console Helpers ──────────────────────────────────────────────
class C:
    RESET = "\033[0m"; BOLD = "\033[1m"; DIM = "\033[2m"
    GREEN = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"
    CYAN = "\033[96m"; WHITE = "\033[97m"; BLUE = "\033[94m"

def ok(msg):   print(f"  {C.GREEN}✔{C.RESET}  {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def fail(msg): print(f"  {C.RED}✖{C.RESET}  {msg}")
def step(n, total, msg): print(f"\n  {C.BOLD}{C.BLUE}[{n}/{total}]{C.RESET} {C.WHITE}{msg}{C.RESET}")


def banner():
    print(f"""
{C.CYAN}╔══════════════════════════════════════════════════════════════╗
║{C.RESET}{C.BOLD}{C.WHITE}   TREATMENT IDENTIFIER – Model Training                    {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Model    : MultiOutput RandomForest Classifier
  Data     : {DATA_DIR}
  Output   : {MODEL_DIR}{C.RESET}
""")


def main():
    banner()

    # ════════════════════════════════════════════════════════════
    # STEP 1: Load Training Data
    # ════════════════════════════════════════════════════════════
    step(1, 7, "Loading training data")

    train_csv = DATA_DIR / "treatment_training_data.csv"
    if not train_csv.exists():
        fail(f"Training data not found: {train_csv}")
        fail("Run: python -m treatment_identifier.extract_data")
        return

    df = pd.read_csv(train_csv)
    df["therapeutic_class"] = df["therapeutic_class"].fillna("Unknown")
    df["action_class"] = df["action_class"].fillna("Unknown")
    df["treatment_area"] = df["treatment_area"].fillna("Unknown")

    ok(f"Loaded {len(df)} training samples")
    ok(f"Unique drugs: {df['generic_name'].nunique()}")
    ok(f"Unique conditions: {df['condition'].nunique()}")

    # ════════════════════════════════════════════════════════════
    # STEP 2: Group conditions per drug (multi-label format)
    # ════════════════════════════════════════════════════════════
    step(2, 7, "Creating multi-label dataset")

    # Group all conditions per drug
    drug_conditions = df.groupby("generic_name").agg({
        "condition": lambda x: list(set(x)),
        "therapeutic_class": "first",
        "action_class": "first",
        "treatment_area": "first",
        "confidence": "mean",
    }).reset_index()

    ok(f"Created {len(drug_conditions)} drug entries with multi-label conditions")

    # Determine top conditions (those appearing in at least 2 drugs)
    all_conditions = []
    for conds in drug_conditions["condition"]:
        all_conditions.extend(conds)
    condition_counts = Counter(all_conditions)
    top_conditions = [c for c, count in condition_counts.items() if count >= 2]
    top_conditions = sorted(top_conditions)

    ok(f"Top conditions (appearing 2+ times): {len(top_conditions)}")

    # Filter to only top conditions
    def filter_conditions(conds):
        return [c for c in conds if c in top_conditions]

    drug_conditions["filtered_conditions"] = drug_conditions["condition"].apply(filter_conditions)
    drug_conditions = drug_conditions[drug_conditions["filtered_conditions"].apply(len) > 0].reset_index(drop=True)

    ok(f"Filtered dataset: {len(drug_conditions)} drugs")

    # ════════════════════════════════════════════════════════════
    # STEP 3: Feature Engineering
    # ════════════════════════════════════════════════════════════
    step(3, 7, "Feature engineering")

    # Multi-label binarizer for conditions
    mlb = MultiLabelBinarizer()
    mlb.fit([top_conditions])
    y = mlb.transform(drug_conditions["filtered_conditions"])

    ok(f"Label matrix shape: {y.shape} ({len(top_conditions)} conditions)")

    # TF-IDF on drug names (captures suffix patterns)
    tfidf = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 5),
        max_features=500,
        lowercase=True,
    )
    X_name = tfidf.fit_transform(drug_conditions["generic_name"])
    ok(f"TF-IDF features (char n-grams): {X_name.shape[1]}")

    # One-hot encode therapeutic class
    tc_encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
    X_tc = tc_encoder.fit_transform(drug_conditions[["therapeutic_class"]])
    ok(f"Therapeutic class features: {X_tc.shape[1]}")

    # One-hot encode action class
    ac_encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
    X_ac = ac_encoder.fit_transform(drug_conditions[["action_class"]])
    ok(f"Action class features: {X_ac.shape[1]}")

    # Combine all features
    X = hstack([X_name, X_tc, X_ac])
    ok(f"Total feature matrix: {X.shape}")

    # ════════════════════════════════════════════════════════════
    # STEP 4: Train/Test Split
    # ════════════════════════════════════════════════════════════
    step(4, 7, "Splitting train/test data")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    ok(f"Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")

    # ════════════════════════════════════════════════════════════
    # STEP 5: Train Model
    # ════════════════════════════════════════════════════════════
    step(5, 7, "Training MultiOutput RandomForest classifier")

    base_clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model = MultiOutputClassifier(base_clf, n_jobs=-1)

    print(f"  {C.DIM}Training RandomForest (200 trees, {len(top_conditions)} outputs) ...{C.RESET}")
    model.fit(X_train, y_train)
    ok("Training complete!")

    # ════════════════════════════════════════════════════════════
    # STEP 6: Evaluate Model
    # ════════════════════════════════════════════════════════════
    step(6, 7, "Evaluating model performance")

    y_pred = model.predict(X_test)

    # Per-label accuracy
    label_accuracies = []
    for i, condition in enumerate(mlb.classes_):
        acc = accuracy_score(y_test[:, i], y_pred[:, i])#type : ignore
        label_accuracies.append((condition, acc))

    label_accuracies.sort(key=lambda x: x[1], reverse=True)

    # Exact match ratio
    exact_match = np.mean(np.all(y_test == y_pred, axis=1))

    # Hamming score (proportion of correct labels)
    hamming = 1 - np.mean(y_test != y_pred)

    print(f"\n  {'='*58}")
    print(f"  {C.BOLD}MODEL PERFORMANCE{C.RESET}")
    print(f"  {'='*58}")
    print(f"  Exact Match Ratio : {C.GREEN}{C.BOLD}{exact_match*100:.2f}%{C.RESET}")
    print(f"  Hamming Score     : {C.GREEN}{C.BOLD}{hamming*100:.2f}%{C.RESET}")
    print(f"\n  {C.BOLD}Per-Condition Accuracy (top 15):{C.RESET}")
    for cond, acc in label_accuracies[:15]:
        bar = "█" * int(acc * 20) + "░" * (20 - int(acc * 20))
        print(f"    {cond:<35} {bar} {acc*100:.1f}%")
    print(f"  {'='*58}")

    # ════════════════════════════════════════════════════════════
    # STEP 7: Save Model & Artifacts
    # ════════════════════════════════════════════════════════════
    step(7, 7, "Saving model & artifacts")

    # Save model
    model_path = MODEL_DIR / "treatment_identifier_model.pkl"
    joblib.dump(model, model_path)
    ok(f"Model saved → {model_path.name}")

    # Save label encoder
    encoder_path = MODEL_DIR / "treatment_label_encoder.pkl"
    joblib.dump(mlb, encoder_path)
    ok(f"Label encoder saved → {encoder_path.name}")

    # Save feature transformers
    transformers_path = MODEL_DIR / "treatment_feature_transformers.pkl"
    joblib.dump({
        "tfidf": tfidf,
        "tc_encoder": tc_encoder,
        "ac_encoder": ac_encoder,
    }, transformers_path)
    ok(f"Feature transformers saved → {transformers_path.name}")

    # Save metadata
    metadata = {
        "model_type": "MultiOutputClassifier(RandomForest)",
        "n_estimators": 200,
        "max_depth": 20,
        "n_conditions": len(top_conditions),
        "conditions": top_conditions,
        "n_drugs_trained": len(drug_conditions),
        "feature_count": X.shape[1], #type : ignore
        "exact_match_ratio": float(exact_match),
        "hamming_score": float(hamming),
        "train_samples": int(X_train.shape[0]),
        "test_samples": int(X_test.shape[0]),
        "per_condition_accuracy": {cond: float(acc) for cond, acc in label_accuracies},
        "timestamp": pd.Timestamp.now().isoformat(),
    }
    metadata_path = MODEL_DIR / "treatment_identifier_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    ok(f"Metadata saved → {metadata_path.name}")

    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Model training complete!{C.RESET}")
    print(f"  Exact Match : {exact_match*100:.2f}%")
    print(f"  Hamming Score: {hamming*100:.2f}%")
    print(f"  Conditions   : {len(top_conditions)}")
    print(f"  Model        : {model_path}")
    print(f"{C.DIM}  Next step: python -m treatment_identifier.implementation{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
