"""
Drug-Food Interaction Model Training Script
Trains a RandomForest classifier to predict harmful drug-food interactions
"""

import os
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

# Directory setup
BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "ml_service" / "models"

# Create directories
DATA_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

print("="*60)
print("DRUG-FOOD INTERACTION MODEL TRAINING")
print("="*60)
print(f"Artifacts: {ARTIFACTS_DIR}")
print(f"Data: {DATA_DIR}")
print(f"Models: {MODEL_DIR}")
print("="*60)

# ============================================================================
# STEP 1: Load Drug Dataset
# ============================================================================
print("\n[1/8] Loading drug dataset...")

drug_file = ARTIFACTS_DIR / "MID.xlsx"
if not drug_file.exists():
    raise FileNotFoundError(f"Drug dataset not found: {drug_file}\nRun download_datasets.py first")

drug = pd.read_excel(drug_file)
print(f"✅ Loaded {len(drug)} drug records")

# Data preprocessing
print("   Cleaning drug data...")
drug = drug.drop_duplicates()
drug = drug.dropna(subset=['Name', 'Contains'])
drug = drug.reset_index(drop=True)

# Extract active ingredient
drug['Active_Ingredient'] = drug['Contains'].str.extract(r'^(.+?) \(')

# Create clean drug dataframe
drug_df = drug[['Name', 'Contains', 'Active_Ingredient',
                'Therapeutic_Class', 'Action_Class', 'SafetyAdvice']].copy()

drug_df.loc[:, 'Therapeutic_Class'] = drug_df['Therapeutic_Class'].fillna('Unknown')
drug_df.loc[:, 'Action_Class'] = drug_df['Action_Class'].fillna('Unknown')
drug_df.loc[:, 'Active_Ingredient'] = drug_df['Active_Ingredient'].fillna('Unknown')

print(f"✅ Cleaned: {len(drug_df)} unique drugs")

# ============================================================================
# STEP 2: Load Drug-Food Interaction Dataset
# ============================================================================
print("\n[2/8] Loading drug-food interactions...")

interactions_file = ARTIFACTS_DIR / "Drug to Food interactions Dataset.json"
if not interactions_file.exists():
    raise FileNotFoundError(f"Interactions dataset not found: {interactions_file}")

with open(interactions_file, 'r', encoding='utf-8') as f:
    jf = json.load(f)

print(f"✅ Loaded {len(jf)} interaction records")

# Convert to DataFrame and explode
raw_interactions = pd.DataFrame(jf)
interactions_df = raw_interactions.explode('food_interactions').reset_index(drop=True)
interactions_df = interactions_df.rename(columns={
    'name': 'Active_Ingredient',
    'food_interactions': 'interaction_text',
    'reference': 'source_reference'
})

print(f"✅ Expanded to {len(interactions_df)} interaction entries")

# ============================================================================
# STEP 3: Classify Interaction Categories
# ============================================================================
print("\n[3/8] Classifying interaction types...")

def map_interaction_category(text: str) -> str:
    """Classify interaction based on text"""
    t = text.lower()
    
    # Alcohol-related
    if 'avoid alcohol' in t or ('alcohol' in t and 'avoid' in t):
        return 'alcohol'
    
    # Herbal anticoagulants
    if ('anticoagulant' in t or 'antiplatelet' in t or 'herbs and supplements' in t
        or 'garlic' in t or 'ginger' in t or 'ginkgo' in t or 'ginseng' in t
        or 'chamomile' in t or 'bilberry' in t or 'danshen' in t):
        return 'herbal_anticoagulant'
    
    # Iron supplement
    if 'iron supplement' in t or ('iron' in t and 'supplement' in t):
        return 'iron_support'
    
    # Fluids
    if 'drink plenty of fluids' in t or 'plenty of fluids' in t:
        return 'fluids'
    
    return 'other'

interactions_df['interaction_category'] = interactions_df['interaction_text'].apply(map_interaction_category)

# Merge with drug information
drug_interactions = interactions_df.merge(
    drug_df,
    on='Active_Ingredient',
    how='left'
)

print(f"✅ Categorized interactions:")
print(drug_interactions['interaction_category'].value_counts())

# ============================================================================
# STEP 4: Load Food Dataset
# ============================================================================
print("\n[4/8] Loading food dataset...")

# Try multiple possible food dataset files
food_file_csv = ARTIFACTS_DIR / "Sri Lanka Food Composition Table .csv"
food_file_xlsx = ARTIFACTS_DIR / "SrilankanCommonFoods.xlsx"

if food_file_csv.exists():
    food = pd.read_csv(food_file_csv)
    print(f"✅ Loaded {len(food)} food items from CSV")
    
    # Clean food data
    food = food.drop_duplicates().reset_index(drop=True)
    if 'Unnamed: 36' in food.columns:
        food = food.drop(columns=['Unnamed: 36'])
    
    food = food.rename(columns={
        'drfoodlistdesc': 'Food',
        'Energy (kcal)': 'Calories',
        'Total fats (g)': 'Fat',
        'Total carbohydrates (g)': 'Carbs',
        'Protein (g)': 'Protein'
    })

    # Filter single food items if column exists
    if 'Recipe/Single food item' in food.columns:
        food = food[food['Recipe/Single food item'] == 'S'].copy()

    iron_col = 'Iron (mg)' if 'Iron (mg)' in food.columns else None
    fiber_col = 'Fiber (g)' if 'Fiber (g)' in food.columns else None
    starch_col = 'Starch (g)' if 'Starch (g)' in food.columns else None

elif food_file_xlsx.exists():
    food = pd.read_excel(food_file_xlsx)
    print(f"✅ Loaded {len(food)} food items from XLSX")
    
    food = food.drop_duplicates().reset_index(drop=True)
    
    # Strip units from values (e.g. "110 kcal" → 110, "24g" → 24)
    for col in ['Calories (kcal)', 'Carbohydrate (g)', 'Protein (g)', 'Fat (g)']:
        if col in food.columns:
            food[col] = food[col].astype(str).str.replace(r'[^\d.]', '', regex=True)
            food[col] = pd.to_numeric(food[col], errors='coerce')
    
    food = food.rename(columns={
        'Calories (kcal)': 'Calories',
        'Carbohydrate (g)': 'Carbs',
        'Protein (g)': 'Protein',
        'Fat (g)': 'Fat'
    })
    
    iron_col = None
    fiber_col = None
    starch_col = None
else:
    raise FileNotFoundError(
        f"Food dataset not found. Expected one of:\n"
        f"  {food_file_csv}\n  {food_file_xlsx}\n"
        f"Run download_datasets.py first"
    )

# Add risk flags based on food names
herb_keywords = ['GARLIC', 'GINGER', 'GINSENG', 'GINKGO', 'CHAMOMILE', 'BILBERRY', 'DANSHEN']
pattern = r'(' + '|'.join(herb_keywords) + r')'
food['Herbal_Risk'] = food['Food'].str.contains(pattern, case=False, na=False)

alcohol_keywords = ['BEER', 'SPIRITS', 'LIQUOR', 'TODDY', 'ARRAK', 'ARRACK', 'WINE']
pattern_alcohol = r'(?:' + '|'.join(alcohol_keywords) + r')'
food['Alcohol_Risk'] = food['Food'].str.contains(pattern_alcohol, case=False, na=False)

food['Iron_Rich'] = food[iron_col] > 10 if iron_col and iron_col in food.columns else False
food['High_Fat'] = food['Fat'] > 10
food['High_Protein'] = food['Protein'] > 10

# Build feature columns list
feature_cols = ['Food', 'Calories', 'Protein', 'Fat', 'Carbs']
if fiber_col and fiber_col in food.columns:
    feature_cols.append(fiber_col)
if starch_col and starch_col in food.columns:
    feature_cols.append(starch_col)
feature_cols.extend(['Herbal_Risk', 'Alcohol_Risk', 'Iron_Rich', 'High_Fat', 'High_Protein'])

food_features = food[[c for c in feature_cols if c in food.columns]].copy()
food_features = food_features.dropna(subset=['Food']).reset_index(drop=True)

print(f"✅ Processed {len(food_features)} food items")

# ============================================================================
# STEP 5: Create Training Dataset
# ============================================================================
print("\n[5/8] Creating training dataset...")

# Create positive examples (harmful interactions)
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
            'Drug_Product_Name': row['Name'],
            'Interaction_Category': category,
            'Interaction_Text': row['interaction_text'],
            'Food': f['Food'],
            'Calories': f['Calories'],
            'Protein': f['Protein'],
            'Fat': f['Fat'],
            'Carbs': f['Carbs'],
            'Herbal_Risk': f['Herbal_Risk'],
            'Alcohol_Risk': f['Alcohol_Risk'],
            'Iron_Rich': f['Iron_Rich']
        })

food_drug_interactions = pd.DataFrame(rows)

# Positive examples (label=1, harmful)
positive = food_drug_interactions.copy()
positive['label'] = 1
positive = positive[['Drug_Ingredient', 'Food', 'label']]

print(f"✅ Created {len(positive)} positive examples (harmful)")

# Create negative examples (safe combinations)
unique_drugs = drug_df['Active_Ingredient'].dropna().unique()
unique_foods = food_features['Food'].dropna().unique()

np.random.seed(42)
sample_drugs = np.random.choice(unique_drugs, size=600, replace=True)
sample_foods = np.random.choice(unique_foods, size=600, replace=True)

neg = pd.DataFrame({
    'Drug_Ingredient': sample_drugs,
    'Food': sample_foods
})

# Remove pairs that ARE harmful
pos_pairs = positive[['Drug_Ingredient', 'Food']].drop_duplicates()
neg = neg.merge(pos_pairs, on=['Drug_Ingredient','Food'], how='left', indicator=True)
neg = neg[neg['_merge']=='left_only'].drop(columns=['_merge'])

neg['label'] = 0  # safe
neg = neg[['Drug_Ingredient','Food','label']]

print(f"✅ Created {len(neg)} negative examples (safe)")

# Combine datasets
dataset = pd.concat([positive, neg], ignore_index=True)

# Add food features
dataset = dataset.merge(food_features, on='Food', how='left')

# Add drug features
drug_unique = (
    drug_df[['Active_Ingredient', 'Therapeutic_Class', 'Action_Class']]
    .drop_duplicates(subset='Active_Ingredient')
    .set_index('Active_Ingredient')
)

dataset['Therapeutic_Class'] = dataset['Drug_Ingredient'].map(drug_unique['Therapeutic_Class'])
dataset['Action_Class'] = dataset['Drug_Ingredient'].map(drug_unique['Action_Class'])
dataset['Therapeutic_Class'] = dataset['Therapeutic_Class'].fillna('Unknown')
dataset['Action_Class'] = dataset['Action_Class'].fillna('Unknown')

print(f"✅ Total training examples: {len(dataset)}")
print(f"   Class balance: {dataset['label'].value_counts().to_dict()}")

# Save training data
training_csv = DATA_DIR / "training_pairs_final.csv"
dataset.to_csv(training_csv, index=False)
print(f"✅ Saved training data: {training_csv}")

# ============================================================================
# STEP 6: Prepare Features
# ============================================================================
print("\n[6/8] Preparing features...")

numeric_features = [c for c in ['Calories', 'Protein', 'Fat', 'Carbs'] if c in dataset.columns]
binary_features = [c for c in ['Herbal_Risk', 'Alcohol_Risk', 'Iron_Rich', 'High_Fat', 'High_Protein'] if c in dataset.columns]
cat_features = ['Therapeutic_Class', 'Action_Class']

all_features = numeric_features + binary_features + cat_features

X = dataset[all_features]
y = dataset['label']

print(f"✅ Features: {len(all_features)}")
print(f"   Numeric: {numeric_features}")
print(f"   Binary: {binary_features}")
print(f"   Categorical: {cat_features}")

# ============================================================================
# STEP 7: Train Model
# ============================================================================
print("\n[7/8] Training model...")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print(f"✅ Train set: {len(X_train)} | Test set: {len(X_test)}")

# Build pipeline
num_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

cat_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('encoder', OneHotEncoder(handle_unknown='ignore'))
])

preprocess = ColumnTransformer(
    [
        ('num', num_pipeline, numeric_features),
        ('cat', cat_pipeline, cat_features)
    ],
    remainder='passthrough'  # binary features already 0/1
)

clf = RandomForestClassifier(
    n_estimators=200,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)

model = Pipeline([
    ('preprocess', preprocess),
    ('clf', clf)
])

print("⏳ Training RandomForest (200 trees)...")
model.fit(X_train, y_train)
print("✅ Training complete!")

# ============================================================================
# STEP 8: Evaluate and Save
# ============================================================================
print("\n[8/8] Evaluating model...")

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n{'='*60}")
print("MODEL PERFORMANCE")
print(f"{'='*60}")
print(f"Accuracy: {accuracy*100:.2f}%\n")
print(classification_report(y_test, y_pred, target_names=['Safe', 'Harmful']))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))
print(f"{'='*60}")

# Save model
model_path = MODEL_DIR / "drug_food_interaction_model.pkl"
joblib.dump(model, model_path)
print(f"\n✅ Model saved: {model_path}")

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

print(f"✅ Metadata saved: {metadata_path}")

# Save supporting data for inference
food_features.to_csv(DATA_DIR / "food_features_final.csv", index=False)
drug_interactions.to_csv(DATA_DIR / "drug_interactions_final.csv", index=False)
print(f"✅ Supporting data saved to: {DATA_DIR}")

print("\n" + "="*60)
print("✅ MODEL TRAINING COMPLETE!")
print("="*60)
print(f"\nModel location: {model_path}")
print(f"Ready for inference in ML service!")
print("="*60)
