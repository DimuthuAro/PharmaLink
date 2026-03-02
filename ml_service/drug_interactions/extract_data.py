"""
Drug Interactions – Step 2: Data Extraction & Preprocessing
============================================================
Extracts and transforms raw datasets into clean, structured formats
ready for model training.

Pipeline:
  1. Extract drug names & active ingredients from MID.xlsx
  2. Build drug-drug interaction database from DrugBank CSV (191k+ pairs)
  3. Build searchable drug index for the API
  4. Process food dataset and classify food risk categories
  5. Process drug-food interaction categories

Input:
  artifacts/MID.xlsx
  artifacts/Drug to Food interactions Dataset.json
  artifacts/SrilankanCommonFoods.xlsx
  artifacts/db_drug_interactions.csv

Output:
  artifacts/drug_names_database.json       – Drug name → generic mapping
  artifacts/drug_interaction_db.json       – 191k+ DDI pairs (DrugBank)
  artifacts/drug_interaction_drug_names.json – Unique DDI drug names
  artifacts/drug_search_index.json         – Searchable drug index
  data/drug_interactions_final.csv         – Processed drug-food interactions
  data/food_features_final.csv            – Processed food features

Usage:
  python -m drug_interactions.extract_data
"""

import os
import re
import csv
import json
import pandas as pd
import numpy as np
from pathlib import Path
from collections import defaultdict

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
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
║{C.RESET}{C.BOLD}{C.WHITE}   DRUG INTERACTIONS – Data Extraction & Preprocessing       {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
""")


# ═══════════════════════════════════════════════════════════════════
# STEP 1: Extract Drug Names from MID.xlsx
# ═══════════════════════════════════════════════════════════════════
def extract_drug_names():
    step(1, 5, "Extracting drug names from MID.xlsx")

    drug_file = ARTIFACTS_DIR / "MID.xlsx"
    if not drug_file.exists():
        fail(f"MID.xlsx not found at {drug_file}")
        return None

    df = pd.read_excel(drug_file)
    df = df.dropna(subset=["Name", "Contains"])
    df = df.drop_duplicates(subset=["Name"])

    def extract_generic(contains):
        m = re.match(r"^(.+?)\s*\(", str(contains))
        return m.group(1).strip() if m else str(contains).strip()

    df["GenericName"] = df["Contains"].apply(extract_generic)

    drugs = []
    for _, row in df.iterrows():
        entry = {"name": str(row["Name"]).strip(), "generic": str(row["GenericName"]).strip()}
        tc = row.get("Therapeutic_Class")
        if pd.notna(tc):
            entry["class"] = str(tc).strip()
        drugs.append(entry)

    out = ARTIFACTS_DIR / "drug_names_database.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(drugs, f, ensure_ascii=False)

    ok(f"Extracted {len(drugs)} drug entries → drug_names_database.json")
    ok(f"Unique generics: {df['GenericName'].nunique()}")

    return df


# ═══════════════════════════════════════════════════════════════════
# STEP 2: Build Drug-Drug Interaction Database from DrugBank CSV
# ═══════════════════════════════════════════════════════════════════
def build_ddi_database():
    step(2, 5, "Building drug-drug interaction database from DrugBank")

    input_csv = ARTIFACTS_DIR / "db_drug_interactions.csv"
    if not input_csv.exists():
        warn(f"db_drug_interactions.csv not found – skipping DDI database build")
        warn("Download it: kaggle datasets download mghobashy/drug-drug-interactions")
        return

    # Severity classification keywords
    SEVERE_KEYWORDS = [
        r'\btoxic', r'\btoxicity\b', r'\bserotonin syndrome\b', r'\bQTc prolongation\b',
        r'\bseizure', r'\barrhythmi', r'\bhemorrhag', r'\bbleeding risk\b',
        r'\brespiratory depression\b', r'\bcardiotoxic', r'\bhepatotoxic', r'\bnephrotoxic',
        r'\brhabdomyolysis\b', r'\blife.threatening\b', r'\bfatal\b', r'\bdeath\b',
        r'\bhypertensive crisis\b', r'\bsevere\b', r'\bdangerous\b',
    ]
    MODERATE_KEYWORDS = [
        r'\bdecrease.*effect', r'\bincrease.*effect', r'\breduce.*efficacy',
        r'\benhance.*adverse', r'\bincrease.*risk\b', r'\bhypotension\b',
        r'\bhyperkalemia\b', r'\bhypoglycemi', r'\bbradycardia\b', r'\bsedation\b',
        r'\bdrowsiness\b', r'\bCNS depression\b',
        r'\bthe serum concentration.+can be increased\b',
        r'\badverse effects can be increased\b',
    ]

    severe_re = re.compile('|'.join(SEVERE_KEYWORDS), re.IGNORECASE)
    moderate_re = re.compile('|'.join(MODERATE_KEYWORDS), re.IGNORECASE)

    def classify_severity(desc):
        if severe_re.search(desc): return 'severe'
        if moderate_re.search(desc): return 'moderate'
        return 'mild'

    print(f"  {C.DIM}Reading {input_csv.name} ...{C.RESET}")
    interactions = {}
    drug_names = set()
    skipped = 0

    with open(input_csv, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            drug1 = row.get('Drug 1', '').strip()
            drug2 = row.get('Drug 2', '').strip()
            desc = row.get('Interaction Description', '').strip()
            if not drug1 or not drug2 or not desc:
                skipped += 1
                continue

            drug_names.add(drug1)
            drug_names.add(drug2)

            key = '|'.join(sorted([drug1.lower(), drug2.lower()]))
            if key in interactions:
                if len(desc) > len(interactions[key]['description']):
                    interactions[key]['description'] = desc
                    interactions[key]['severity'] = classify_severity(desc)
                continue

            interactions[key] = {
                'drug1': drug1, 'drug2': drug2,
                'severity': classify_severity(desc), 'description': desc,
            }

    # Save interaction DB
    interaction_db = {}
    for item in interactions.values():
        key = '|'.join(sorted([item['drug1'].lower(), item['drug2'].lower()]))
        interaction_db[key] = item

    output_file = ARTIFACTS_DIR / "drug_interaction_db.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(interaction_db, f, ensure_ascii=False)

    # Save unique drug names
    names_file = ARTIFACTS_DIR / "drug_interaction_drug_names.json"
    with open(names_file, 'w', encoding='utf-8') as f:
        json.dump(sorted(drug_names, key=str.lower), f, ensure_ascii=False)

    severity_counts = defaultdict(int)
    for item in interactions.values():
        severity_counts[item['severity']] += 1

    ok(f"Built DDI database: {len(interactions):,} interaction pairs")
    ok(f"Unique drug names: {len(drug_names):,}")
    print(f"    Severe: {severity_counts['severe']:,} | Moderate: {severity_counts['moderate']:,} | Mild: {severity_counts['mild']:,}")
    ok(f"Saved → drug_interaction_db.json ({output_file.stat().st_size / 1024 / 1024:.1f} MB)")
    ok(f"Saved → drug_interaction_drug_names.json")


# ═══════════════════════════════════════════════════════════════════
# STEP 3: Build Drug Search Index
# ═══════════════════════════════════════════════════════════════════
def build_search_index():
    step(3, 5, "Building searchable drug index")

    names_file = ARTIFACTS_DIR / "drug_names_database.json"
    if not names_file.exists():
        fail("drug_names_database.json not found – run Step 1 first")
        return

    with open(names_file, "r", encoding="utf-8") as f:
        drugs = json.load(f)

    brand_to_generic = {}
    generic_set = set()

    for d in drugs:
        name = d["name"]
        generic = d["generic"]
        cls = d.get("class", "")
        brand_to_generic[name] = {"generic": generic, "class": cls}
        generic_set.add(generic)

    search_index = []
    seen = set()

    # Generics first (higher search priority)
    for g in sorted(generic_set):
        key = g.lower()
        if key not in seen:
            seen.add(key)
            search_index.append({"name": g, "type": "generic"})

    # Then brands
    for name, info in brand_to_generic.items():
        key = name.lower()
        if key not in seen:
            seen.add(key)
            entry = {"name": name, "generic": info["generic"], "type": "brand"}
            if info["class"]:
                entry["class"] = info["class"]
            search_index.append(entry)

    out = ARTIFACTS_DIR / "drug_search_index.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(search_index, f, ensure_ascii=False)

    ok(f"Search index: {len(search_index)} entries ({len(generic_set)} generics, {len(brand_to_generic)} brands)")
    ok(f"Saved → drug_search_index.json ({out.stat().st_size / 1024 / 1024:.1f} MB)")


# ═══════════════════════════════════════════════════════════════════
# STEP 4: Process Food Dataset
# ═══════════════════════════════════════════════════════════════════
def process_food_data():
    step(4, 5, "Processing food dataset")

    food_file_csv = ARTIFACTS_DIR / "Sri Lanka Food Composition Table .csv"
    food_file_xlsx = ARTIFACTS_DIR / "SrilankanCommonFoods.xlsx"

    if food_file_csv.exists():
        food = pd.read_csv(food_file_csv)
        ok(f"Loaded {len(food)} food items from CSV")

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

        if 'Recipe/Single food item' in food.columns:
            food = food[food['Recipe/Single food item'] == 'S'].copy()

        iron_col = 'Iron (mg)' if 'Iron (mg)' in food.columns else None

    elif food_file_xlsx.exists():
        food = pd.read_excel(food_file_xlsx)
        ok(f"Loaded {len(food)} food items from XLSX")

        food = food.drop_duplicates().reset_index(drop=True)
        for col in ['Calories (kcal)', 'Carbohydrate (g)', 'Protein (g)', 'Fat (g)']:
            if col in food.columns:
                food[col] = food[col].astype(str).str.replace(r'[^\d.]', '', regex=True)
                food[col] = pd.to_numeric(food[col], errors='coerce')

        food = food.rename(columns={
            'Calories (kcal)': 'Calories', 'Carbohydrate (g)': 'Carbs',
            'Protein (g)': 'Protein', 'Fat (g)': 'Fat'
        })
        iron_col = None
    else:
        fail("No food dataset found – run download_datasets.py first")
        return None

    # Add risk flags
    herb_kw = ['GARLIC', 'GINGER', 'GINSENG', 'GINKGO', 'CHAMOMILE', 'BILBERRY', 'DANSHEN']
    food['Herbal_Risk'] = food['Food'].str.contains('|'.join(herb_kw), case=False, na=False)

    alcohol_kw = ['BEER', 'SPIRITS', 'LIQUOR', 'TODDY', 'ARRAK', 'ARRACK', 'WINE']
    food['Alcohol_Risk'] = food['Food'].str.contains('|'.join(alcohol_kw), case=False, na=False)

    food['Iron_Rich'] = food[iron_col] > 10 if iron_col and iron_col in food.columns else False
    food['High_Fat'] = food['Fat'] > 10
    food['High_Protein'] = food['Protein'] > 10

    feature_cols = ['Food', 'Calories', 'Protein', 'Fat', 'Carbs',
                    'Herbal_Risk', 'Alcohol_Risk', 'Iron_Rich', 'High_Fat', 'High_Protein']
    food_features = food[[c for c in feature_cols if c in food.columns]].copy()
    food_features = food_features.dropna(subset=['Food']).reset_index(drop=True)

    food_features.to_csv(DATA_DIR / "food_features_final.csv", index=False)
    ok(f"Processed {len(food_features)} food items → food_features_final.csv")

    return food_features


# ═══════════════════════════════════════════════════════════════════
# STEP 5: Process Drug-Food Interactions
# ═══════════════════════════════════════════════════════════════════
def process_drug_food_interactions(drug_df):
    step(5, 5, "Processing drug-food interaction categories")

    interactions_file = ARTIFACTS_DIR / "Drug to Food interactions Dataset.json"
    if not interactions_file.exists():
        fail("Drug-food interactions JSON not found")
        return

    drug_file = ARTIFACTS_DIR / "MID.xlsx"
    if not drug_file.exists():
        fail("MID.xlsx not found")
        return

    # Load drug data
    drug = pd.read_excel(drug_file)
    drug = drug.drop_duplicates().dropna(subset=['Name', 'Contains']).reset_index(drop=True)
    drug['Active_Ingredient'] = drug['Contains'].str.extract(r'^(.+?) \(')
    drug_df_clean = drug[['Name', 'Contains', 'Active_Ingredient',
                          'Therapeutic_Class', 'Action_Class', 'SafetyAdvice']].copy()
    drug_df_clean['Therapeutic_Class'] = drug_df_clean['Therapeutic_Class'].fillna('Unknown')
    drug_df_clean['Action_Class'] = drug_df_clean['Action_Class'].fillna('Unknown')
    drug_df_clean['Active_Ingredient'] = drug_df_clean['Active_Ingredient'].fillna('Unknown')

    # Load interactions
    with open(interactions_file, 'r', encoding='utf-8') as f:
        jf = json.load(f)

    interactions_df = pd.DataFrame(jf).explode('food_interactions').reset_index(drop=True)
    interactions_df = interactions_df.rename(columns={
        'name': 'Active_Ingredient',
        'food_interactions': 'interaction_text',
        'reference': 'source_reference'
    })

    def map_category(text):
        t = text.lower()
        if 'avoid alcohol' in t or ('alcohol' in t and 'avoid' in t): return 'alcohol'
        if any(kw in t for kw in ['anticoagulant', 'antiplatelet', 'garlic', 'ginger', 'ginkgo', 'ginseng']):
            return 'herbal_anticoagulant'
        if 'iron supplement' in t or ('iron' in t and 'supplement' in t): return 'iron_support'
        if 'drink plenty of fluids' in t: return 'fluids'
        return 'other'

    interactions_df['interaction_category'] = interactions_df['interaction_text'].apply(map_category)

    drug_interactions = interactions_df.merge(drug_df_clean, on='Active_Ingredient', how='left')
    drug_interactions.to_csv(DATA_DIR / "drug_interactions_final.csv", index=False)

    ok(f"Processed {len(drug_interactions)} drug-food interaction entries")
    print(f"    Categories: {drug_interactions['interaction_category'].value_counts().to_dict()}")
    ok(f"Saved → drug_interactions_final.csv")


# ═══════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════
def main():
    banner()

    drug_df = extract_drug_names()
    build_ddi_database()
    build_search_index()
    food_features = process_food_data()
    process_drug_food_interactions(drug_df)

    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Data extraction complete!{C.RESET}")
    print(f"{C.DIM}  Next step: python -m drug_interactions.train_model{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
