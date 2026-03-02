"""
Cross-Brand Comparison – Step 3: Model Training
=================================================
Trains a brand recommendation model that ranks alternative brands
based on therapeutic equivalence, pricing tier, and availability.

Pipeline:
  1. Load brand features and comparison database
  2. Create training pairs (brand vs alternatives, same generic)
  3. Feature engineering (brand similarity, class match, form match)
  4. Train RandomForest ranker for brand scoring
  5. Evaluate ranking accuracy
  6. Save model and metadata

Input:
  data/brand_features.csv
  artifacts/brand_comparison_database.json
  artifacts/generic_to_brands.json

Output:
  ml_service/models/brand_comparison_model.pkl
  ml_service/models/brand_comparison_metadata.json

Usage:
  python -m cross_brand_comparison.train_model
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline as SKPipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
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
║{C.RESET}{C.BOLD}{C.WHITE}   CROSS-BRAND COMPARISON – Model Training                   {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Model    : RandomForest Brand Ranker
  Data     : {DATA_DIR}
  Output   : {MODEL_DIR}{C.RESET}
""")


def main():
    banner()

    # ════════════════════════════════════════════════════════════
    # STEP 1: Load Brand Features
    # ════════════════════════════════════════════════════════════
    step(1, 6, "Loading brand features")

    features_csv = DATA_DIR / "brand_features.csv"
    if not features_csv.exists():
        fail("brand_features.csv not found – run extract_data.py first")
        return

    brand_df = pd.read_csv(features_csv)
    ok(f"Loaded {len(brand_df)} brand entries")

    # ════════════════════════════════════════════════════════════
    # STEP 2: Load Comparison Database
    # ════════════════════════════════════════════════════════════
    step(2, 6, "Loading comparison database")

    comp_file = ARTIFACTS_DIR / "generic_to_brands.json"
    if not comp_file.exists():
        fail("generic_to_brands.json not found – run extract_data.py first")
        return

    with open(comp_file, "r", encoding="utf-8") as f:
        generic_to_brands = json.load(f)

    comparables = {k: v for k, v in generic_to_brands.items() if len(v) >= 2}
    ok(f"Loaded {len(comparables)} generics with 2+ brands")

    # ════════════════════════════════════════════════════════════
    # STEP 3: Create Training Dataset
    # ════════════════════════════════════════════════════════════
    step(3, 6, "Creating brand comparison training pairs")

    MAX_PAIRS_PER_GENERIC = 50  # cap to prevent memory explosion on large groups
    rng = np.random.RandomState(42)

    rows = []
    for generic, brands in comparables.items():
        n = len(brands)
        brand_count = n

        if n * (n - 1) <= MAX_PAIRS_PER_GENERIC:
            # Small group – use all pairs
            pairs = [(i, j) for i in range(n) for j in range(n) if i != j]
        else:
            # Large group – randomly sample pairs
            pairs = set()
            while len(pairs) < MAX_PAIRS_PER_GENERIC:
                i, j = rng.randint(0, n, size=2)
                if i != j:
                    pairs.add((int(i), int(j)))
            pairs = list(pairs)

        for i, j in pairs:
            brand_a, brand_b = brands[i], brands[j]
            same_form = 1 if brand_a.get("form") == brand_b.get("form") else 0
            same_class = 1 if brand_a.get("therapeutic_class") == brand_b.get("therapeutic_class") else 0
            same_action = 1 if brand_a.get("action_class") == brand_b.get("action_class") else 0

            rows.append({
                "generic": generic,
                "brand_a": brand_a["brand_name"],
                "brand_b": brand_b["brand_name"],
                "same_form": same_form,
                "same_class": same_class,
                "same_action": same_action,
                "brand_count": brand_count,
                "therapeutic_class": brand_a.get("therapeutic_class", "Unknown"),
                "label": 1 if same_class == 1 else 0,
            })

    training_df = pd.DataFrame(rows)

    # Add negative examples (different generics, not interchangeable)
    all_generics = list(comparables.keys())
    np.random.seed(42)

    neg_rows = []
    for _ in range(min(len(rows), 500)):
        g1, g2 = np.random.choice(all_generics, size=2, replace=False)
        b1 = np.random.choice([b["brand_name"] for b in comparables[g1]])
        b2 = np.random.choice([b["brand_name"] for b in comparables[g2]])
        neg_rows.append({
            "generic": g1,
            "brand_a": b1,
            "brand_b": b2,
            "same_form": 0,
            "same_class": 0,
            "same_action": 0,
            "brand_count": 1,
            "therapeutic_class": "Mixed",
            "label": 0,
        })

    neg_df = pd.DataFrame(neg_rows)
    dataset = pd.concat([training_df, neg_df], ignore_index=True)

    ok(f"Created {len(dataset)} training pairs")
    print(f"    Positive (interchangeable): {(dataset['label'] == 1).sum()}")
    print(f"    Negative (not interchangeable): {(dataset['label'] == 0).sum()}")

    # ════════════════════════════════════════════════════════════
    # STEP 4: Prepare Features & Train
    # ════════════════════════════════════════════════════════════
    step(4, 6, "Preparing features")

    numeric_features = ['same_form', 'same_class', 'same_action', 'brand_count']
    cat_features = ['therapeutic_class']
    all_features = numeric_features + cat_features

    X = dataset[all_features]
    y = dataset['label']

    ok(f"Feature count: {len(all_features)}")

    # ════════════════════════════════════════════════════════════
    # STEP 5: Train Model
    # ════════════════════════════════════════════════════════════
    step(5, 6, "Training RandomForest brand ranker")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    ok(f"Train: {len(X_train)} | Test: {len(X_test)}")

    num_pipeline = SKPipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    cat_pipeline = SKPipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OneHotEncoder(handle_unknown='ignore'))
    ])
    preprocess = ColumnTransformer([
        ('num', num_pipeline, numeric_features),
        ('cat', cat_pipeline, cat_features)
    ], remainder='passthrough')

    clf = RandomForestClassifier(n_estimators=150, class_weight='balanced', random_state=42, n_jobs=-1)
    model = SKPipeline([('preprocess', preprocess), ('clf', clf)])

    print(f"  {C.DIM}Training RandomForest (150 trees) ...{C.RESET}")
    model.fit(X_train, y_train)
    ok("Training complete!")

    # ════════════════════════════════════════════════════════════
    # STEP 6: Evaluate and Save
    # ════════════════════════════════════════════════════════════
    step(6, 6, "Evaluating model & saving")

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n  {'='*58}")
    print(f"  {C.BOLD}MODEL PERFORMANCE{C.RESET}")
    print(f"  {'='*58}")
    print(f"  Accuracy: {C.GREEN}{C.BOLD}{accuracy*100:.2f}%{C.RESET}\n")
    print(classification_report(y_test, y_pred, target_names=['Not Interchangeable', 'Interchangeable']))
    print(f"  {'='*58}")

    # Save model
    model_path = MODEL_DIR / "brand_comparison_model.pkl"
    joblib.dump(model, model_path)
    ok(f"Model saved → {model_path}")

    # Save metadata
    metadata = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 150,
        "features": all_features,
        "numeric_features": numeric_features,
        "categorical_features": cat_features,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": float(accuracy),
        "comparable_generics": len(comparables),
        "total_brands": sum(len(v) for v in comparables.values()),
        "timestamp": pd.Timestamp.now().isoformat()
    }
    with open(MODEL_DIR / "brand_comparison_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    ok(f"Metadata saved → brand_comparison_metadata.json")

    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Model training complete!{C.RESET}")
    print(f"  Accuracy: {accuracy*100:.2f}%")
    print(f"{C.DIM}  Next step: python -m cross_brand_comparison.implementation{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
