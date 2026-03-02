"""
Drug Interactions – Step 3: Model Training
============================================
Trains a RandomForest classifier to predict harmful drug-food interactions
from the preprocessed datasets.

Pipeline:
  1. Load processed drug & food data
  2. Generate positive examples (harmful drug-food pairs)
  3. Generate negative examples (safe drug-food pairs)
  4. Feature engineering (numeric + categorical + binary)
  5. Train RandomForest with sklearn Pipeline
  6. Evaluate model (accuracy, classification report, confusion matrix)
  7. Save trained model & metadata

Input:
  artifacts/MID.xlsx
  artifacts/Drug to Food interactions Dataset.json
  data/food_features_final.csv
  data/drug_interactions_final.csv

Output:
  ml_service/models/drug_food_interaction_model.pkl
  ml_service/models/drug_food_interaction_metadata.json
  data/training_pairs_final.csv

Usage:
  python -m drug_interactions.train_model
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

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
def fail(msg): print(f"  {C.RED}✖{C.RESET}  {msg}")
def step(n, total, msg): print(f"\n  {C.BOLD}{C.BLUE}[{n}/{total}]{C.RESET} {C.WHITE}{msg}{C.RESET}")


def banner():
    print(f"""
{C.CYAN}╔══════════════════════════════════════════════════════════════╗
║{C.RESET}{C.BOLD}{C.WHITE}   DRUG INTERACTIONS – Model Training                       {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Model    : RandomForest Classifier
  Artifacts: {ARTIFACTS_DIR}
  Data     : {DATA_DIR}
  Output   : {MODEL_DIR}{C.RESET}
""")


def main():
    banner()

    # ════════════════════════════════════════════════════════════
    # STEP 1: Load Drug Dataset
    # ════════════════════════════════════════════════════════════
    step(1, 8, "Loading drug dataset")

    drug_file = ARTIFACTS_DIR / "MID.xlsx"
    if not drug_file.exists():
        fail(f"Drug dataset not found: {drug_file}")
        fail("Run: python -m drug_interactions.download_datasets --all")
        return

    drug = pd.read_excel(drug_file)
    drug = drug.drop_duplicates().dropna(subset=['Name', 'Contains']).reset_index(drop=True)
    drug['Active_Ingredient'] = drug['Contains'].str.extract(r'^(.+?) \(')

    drug_df = drug[['Name', 'Contains', 'Active_Ingredient',
                     'Therapeutic_Class', 'Action_Class', 'SafetyAdvice']].copy()
    drug_df['Therapeutic_Class'] = drug_df['Therapeutic_Class'].fillna('Unknown')
    drug_df['Action_Class'] = drug_df['Action_Class'].fillna('Unknown')
    drug_df['Active_Ingredient'] = drug_df['Active_Ingredient'].fillna('Unknown')

    ok(f"Loaded {len(drug_df)} drug records")

    # ════════════════════════════════════════════════════════════
    # STEP 2: Load Drug-Food Interactions
    # ════════════════════════════════════════════════════════════
    step(2, 8, "Loading drug-food interactions")

    interactions_file = ARTIFACTS_DIR / "Drug to Food interactions Dataset.json"
    if not interactions_file.exists():
        fail(f"Drug-food interactions not found: {interactions_file}")
        return

    with open(interactions_file, 'r', encoding='utf-8') as f:
        jf = json.load(f)

    interactions_df = pd.DataFrame(jf).explode('food_interactions').reset_index(drop=True)
    interactions_df = interactions_df.rename(columns={
        'name': 'Active_Ingredient',
        'food_interactions': 'interaction_text',
        'reference': 'source_reference'
    })
    ok(f"Loaded {len(interactions_df)} interaction entries")

    # ════════════════════════════════════════════════════════════
    # STEP 3: Classify Interaction Categories
    # ════════════════════════════════════════════════════════════
    step(3, 8, "Classifying interaction types")

    def map_category(text):
        t = text.lower()
        if 'avoid alcohol' in t or ('alcohol' in t and 'avoid' in t): return 'alcohol'
        if any(kw in t for kw in ['anticoagulant', 'antiplatelet', 'garlic', 'ginger', 'ginkgo', 'ginseng', 'chamomile']):
            return 'herbal_anticoagulant'
        if 'iron supplement' in t or ('iron' in t and 'supplement' in t): return 'iron_support'
        if 'drink plenty of fluids' in t: return 'fluids'
        return 'other'

    interactions_df['interaction_category'] = interactions_df['interaction_text'].apply(map_category)
    drug_interactions = interactions_df.merge(drug_df, on='Active_Ingredient', how='left')

    ok(f"Categorized interactions:")
    print(f"    {drug_interactions['interaction_category'].value_counts().to_dict()}")

    # ════════════════════════════════════════════════════════════
    # STEP 4: Load Food Dataset
    # ════════════════════════════════════════════════════════════
    step(4, 8, "Loading food dataset")

    food_csv = DATA_DIR / "food_features_final.csv"
    if food_csv.exists():
        food_features = pd.read_csv(food_csv)
        ok(f"Loaded {len(food_features)} food items from food_features_final.csv")
    else:
        fail("food_features_final.csv not found – run extract_data.py first")
        return

    # ════════════════════════════════════════════════════════════
    # STEP 5: Create Training Dataset
    # ════════════════════════════════════════════════════════════
    step(5, 8, "Creating training dataset (positive + negative examples)")

    # Positive examples (harmful interactions)
    rows = []
    for _, row in drug_interactions.iterrows():
        category = row['interaction_category']
        if category == 'herbal_anticoagulant':
            risky_foods = food_features[food_features['Herbal_Risk'] == True]
        elif category == 'alcohol':
            risky_foods = food_features[food_features['Alcohol_Risk'] == True]
        elif category == 'iron_support':
            risky_foods = food_features[food_features['Iron_Rich'] == True]
        else:
            continue

        for _, f in risky_foods.iterrows():
            rows.append({
                'Drug_Ingredient': row['Active_Ingredient'],
                'Food': f['Food'], 'Calories': f['Calories'],
                'Protein': f['Protein'], 'Fat': f['Fat'], 'Carbs': f['Carbs'],
                'Herbal_Risk': f['Herbal_Risk'], 'Alcohol_Risk': f['Alcohol_Risk'],
                'Iron_Rich': f['Iron_Rich'],
            })

    positive = pd.DataFrame(rows)
    positive['label'] = 1
    positive = positive[['Drug_Ingredient', 'Food', 'label']]
    ok(f"Positive examples (harmful): {len(positive)}")

    # Negative examples (safe combinations)
    unique_drugs = drug_df['Active_Ingredient'].dropna().unique()
    unique_foods = food_features['Food'].dropna().unique()

    np.random.seed(42)
    neg = pd.DataFrame({
        'Drug_Ingredient': np.random.choice(unique_drugs, size=600, replace=True),
        'Food': np.random.choice(unique_foods, size=600, replace=True)
    })

    pos_pairs = positive[['Drug_Ingredient', 'Food']].drop_duplicates()
    neg = neg.merge(pos_pairs, on=['Drug_Ingredient', 'Food'], how='left', indicator=True)
    neg = neg[neg['_merge'] == 'left_only'].drop(columns=['_merge'])
    neg['label'] = 0
    neg = neg[['Drug_Ingredient', 'Food', 'label']]
    ok(f"Negative examples (safe): {len(neg)}")

    # Combine
    dataset = pd.concat([positive, neg], ignore_index=True)
    dataset = dataset.merge(food_features, on='Food', how='left')

    drug_unique = (drug_df[['Active_Ingredient', 'Therapeutic_Class', 'Action_Class']]
                   .drop_duplicates(subset='Active_Ingredient')
                   .set_index('Active_Ingredient'))
    dataset['Therapeutic_Class'] = dataset['Drug_Ingredient'].map(drug_unique['Therapeutic_Class'])
    dataset['Action_Class'] = dataset['Drug_Ingredient'].map(drug_unique['Action_Class'])
    dataset['Therapeutic_Class'] = dataset['Therapeutic_Class'].fillna('Unknown')
    dataset['Action_Class'] = dataset['Action_Class'].fillna('Unknown')

    ok(f"Total training examples: {len(dataset)}")
    print(f"    Class balance: {dataset['label'].value_counts().to_dict()}")

    dataset.to_csv(DATA_DIR / "training_pairs_final.csv", index=False)
    ok(f"Saved training data → training_pairs_final.csv")

    # ════════════════════════════════════════════════════════════
    # STEP 6: Prepare Features
    # ════════════════════════════════════════════════════════════
    step(6, 8, "Preparing feature matrix")

    numeric_features = [c for c in ['Calories', 'Protein', 'Fat', 'Carbs'] if c in dataset.columns]
    binary_features = [c for c in ['Herbal_Risk', 'Alcohol_Risk', 'Iron_Rich', 'High_Fat', 'High_Protein'] if c in dataset.columns]
    cat_features = ['Therapeutic_Class', 'Action_Class']
    all_features = numeric_features + binary_features + cat_features

    X = dataset[all_features]
    y = dataset['label']

    ok(f"Feature count: {len(all_features)}")
    print(f"    Numeric: {numeric_features}")
    print(f"    Binary:  {binary_features}")
    print(f"    Categorical: {cat_features}")

    # ════════════════════════════════════════════════════════════
    # STEP 7: Train Model
    # ════════════════════════════════════════════════════════════
    step(7, 8, "Training RandomForest classifier")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    ok(f"Train: {len(X_train)} | Test: {len(X_test)}")

    num_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    cat_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OneHotEncoder(handle_unknown='ignore'))
    ])
    preprocess = ColumnTransformer([
        ('num', num_pipeline, numeric_features),
        ('cat', cat_pipeline, cat_features)
    ], remainder='passthrough')

    clf = RandomForestClassifier(n_estimators=200, class_weight='balanced', random_state=42, n_jobs=-1)
    model = Pipeline([('preprocess', preprocess), ('clf', clf)])

    print(f"  {C.DIM}Training RandomForest (200 trees) ...{C.RESET}")
    model.fit(X_train, y_train)
    ok("Training complete!")

    # ════════════════════════════════════════════════════════════
    # STEP 8: Evaluate and Save
    # ════════════════════════════════════════════════════════════
    step(8, 8, "Evaluating model & saving artifacts")

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n  {'='*58}")
    print(f"  {C.BOLD}MODEL PERFORMANCE{C.RESET}")
    print(f"  {'='*58}")
    print(f"  Accuracy: {C.GREEN}{C.BOLD}{accuracy*100:.2f}%{C.RESET}\n")
    print(classification_report(y_test, y_pred, target_names=['Safe', 'Harmful']))
    print("  Confusion Matrix:")
    print(f"  {confusion_matrix(y_test, y_pred)}")
    print(f"  {'='*58}")

    # Save model
    model_path = MODEL_DIR / "drug_food_interaction_model.pkl"
    joblib.dump(model, model_path)
    ok(f"Model saved → {model_path}")

    # Save metadata
    metadata = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 200,
        "features": all_features,
        "numeric_features": numeric_features,
        "binary_features": binary_features,
        "categorical_features": cat_features,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": float(accuracy),
        "timestamp": pd.Timestamp.now().isoformat()
    }
    metadata_path = MODEL_DIR / "drug_food_interaction_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    ok(f"Metadata saved → {metadata_path}")

    # Save supporting data
    food_features.to_csv(DATA_DIR / "food_features_final.csv", index=False)
    drug_interactions.to_csv(DATA_DIR / "drug_interactions_final.csv", index=False)
    ok(f"Supporting data saved → {DATA_DIR}")

    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Model training complete!{C.RESET}")
    print(f"  Accuracy: {accuracy*100:.2f}%")
    print(f"  Model:    {model_path}")
    print(f"{C.DIM}  Next step: python -m drug_interactions.implementation{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
