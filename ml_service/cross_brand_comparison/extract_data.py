"""
Cross-Brand Comparison – Step 2: Data Extraction & Preprocessing
=================================================================
Extracts brand data from MID.xlsx and builds structured datasets
for cross-brand comparison, pricing analysis, and brand ranking.

Pipeline:
  1. Extract brand names, generic ingredients, and therapeutic classes
  2. Build brand-to-generic mapping with class information
  3. Group brands by generic ingredient for comparison
  4. Generate brand comparison features (manufacturer, class, strength)
  5. Build brand similarity index for alternative suggestions

Input:
  artifacts/MID.xlsx

Output:
  artifacts/brand_comparison_database.json  – Full brand comparison dataset
  artifacts/generic_to_brands.json          – Generic → brand mapping
  artifacts/brand_features.csv              – Brand features for ML model

Usage:
  python -m cross_brand_comparison.extract_data
"""

import re
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
║{C.RESET}{C.BOLD}{C.WHITE}   CROSS-BRAND COMPARISON – Data Extraction                  {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
""")


# ═══════════════════════════════════════════════════════════════════
# STEP 1: Load and Parse Drug Dataset
# ═══════════════════════════════════════════════════════════════════
def load_drug_dataset():
    step(1, 5, "Loading drug dataset from MID.xlsx")

    drug_file = ARTIFACTS_DIR / "MID.xlsx"
    if not drug_file.exists():
        fail(f"MID.xlsx not found at {drug_file}")
        fail("Run: python -m cross_brand_comparison.download_datasets --all")
        return None

    df = pd.read_excel(drug_file)
    df = df.drop_duplicates().dropna(subset=['Name', 'Contains']).reset_index(drop=True)

    # Extract generic name from "Contains" field
    def extract_generic(contains):
        m = re.match(r"^(.+?)\s*\(", str(contains))
        return m.group(1).strip() if m else str(contains).strip()

    def extract_strength(contains):
        m = re.search(r'(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU))', str(contains))
        return m.group(1).strip() if m else ""

    def extract_form(name):
        name_lower = str(name).lower()
        for form in ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'gel',
                      'ointment', 'drops', 'suspension', 'solution', 'inhaler', 'patch']:
            if form in name_lower:
                return form.title()
        return "Tablet"  # Default

    df['Generic_Name'] = df['Contains'].apply(extract_generic)
    df['Strength'] = df['Contains'].apply(extract_strength)
    df['Form'] = df['Name'].apply(extract_form)
    df['Therapeutic_Class'] = df['Therapeutic_Class'].fillna('Unknown')
    df['Action_Class'] = df['Action_Class'].fillna('Unknown')

    ok(f"Loaded {len(df)} drug brand records")
    ok(f"Unique generics: {df['Generic_Name'].nunique()}")
    ok(f"Unique brands: {df['Name'].nunique()}")

    return df


# ═══════════════════════════════════════════════════════════════════
# STEP 2: Build Generic-to-Brand Mapping
# ═══════════════════════════════════════════════════════════════════
def build_generic_brand_mapping(df):
    step(2, 5, "Building generic-to-brand mapping")

    generic_to_brands = defaultdict(list)

    for _, row in df.iterrows():
        generic = row['Generic_Name']
        brand = {
            "brand_name": str(row['Name']).strip(),
            "generic": generic,
            "strength": row.get('Strength', ''),
            "form": row.get('Form', 'Tablet'),
            "therapeutic_class": str(row.get('Therapeutic_Class', 'Unknown')),
            "action_class": str(row.get('Action_Class', 'Unknown')),
            "manufacturer": str(row.get('Manufacturer', 'Unknown')),
        }
        generic_to_brands[generic].append(brand)

    # Sort by number of brands (most popular generics first)
    sorted_mapping = dict(sorted(generic_to_brands.items(), key=lambda x: -len(x[1])))

    out = ARTIFACTS_DIR / "generic_to_brands.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(sorted_mapping, f, ensure_ascii=False, indent=2)

    multi_brand = {k: v for k, v in sorted_mapping.items() if len(v) >= 2}
    ok(f"Built mapping: {len(sorted_mapping)} generics → {sum(len(v) for v in sorted_mapping.values())} brands")
    ok(f"Generics with 2+ brands (comparable): {len(multi_brand)}")
    ok(f"Saved → generic_to_brands.json")

    return sorted_mapping


# ═══════════════════════════════════════════════════════════════════
# STEP 3: Build Brand Comparison Database
# ═══════════════════════════════════════════════════════════════════
def build_comparison_database(df, generic_mapping):
    step(3, 5, "Building brand comparison database")

    comparisons = []

    for generic, brands in generic_mapping.items():
        if len(brands) < 2:
            continue

        comparison = {
            "generic_name": generic,
            "brand_count": len(brands),
            "therapeutic_class": brands[0].get("therapeutic_class", "Unknown"),
            "brands": brands,
            "cheapest_brand": None,
            "most_popular_brand": None,
        }

        # Set first brand as default cheapest/popular
        if brands:
            comparison["cheapest_brand"] = brands[0]["brand_name"]
            comparison["most_popular_brand"] = brands[0]["brand_name"]

        comparisons.append(comparison)

    # Sort by brand count descending
    comparisons.sort(key=lambda x: -x["brand_count"])

    out = ARTIFACTS_DIR / "brand_comparison_database.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(comparisons, f, ensure_ascii=False, indent=2)

    ok(f"Built comparison database: {len(comparisons)} comparable generics")
    ok(f"Total brands in comparisons: {sum(c['brand_count'] for c in comparisons)}")
    ok(f"Saved → brand_comparison_database.json")

    return comparisons


# ═══════════════════════════════════════════════════════════════════
# STEP 4: Generate Brand Features for ML
# ═══════════════════════════════════════════════════════════════════
def generate_brand_features(df):
    step(4, 5, "Generating brand features for ML model")

    features = df[['Name', 'Generic_Name', 'Strength', 'Form',
                    'Therapeutic_Class', 'Action_Class']].copy()

    # Encode dosage form
    form_map = {'Tablet': 0, 'Capsule': 1, 'Syrup': 2, 'Injection': 3,
                'Cream': 4, 'Gel': 5, 'Drops': 6, 'Suspension': 7, 'Solution': 8}
    features['Form_Encoded'] = features['Form'].map(form_map).fillna(0)

    # Strength as numeric
    features['Strength_mg'] = features['Strength'].str.extract(r'(\d+(?:\.\d+)?)').astype(float)
    features['Strength_mg'] = features['Strength_mg'].fillna(0)

    # Number of brands per generic (popularity indicator)
    brand_counts = df.groupby('Generic_Name').size().to_dict()
    features['Brand_Count'] = features['Generic_Name'].map(brand_counts)

    # Therapeutic class frequency (rarity indicator)
    class_counts = df['Therapeutic_Class'].value_counts().to_dict()
    features['Class_Frequency'] = features['Therapeutic_Class'].map(class_counts)

    features.to_csv(DATA_DIR / "brand_features.csv", index=False)
    ok(f"Generated features for {len(features)} brands → brand_features.csv")

    return features


# ═══════════════════════════════════════════════════════════════════
# STEP 5: Build Brand Similarity Index
# ═══════════════════════════════════════════════════════════════════
def build_similarity_index(df, generic_mapping):
    step(5, 5, "Building brand similarity index")

    similarity_index = {}

    for generic, brands in generic_mapping.items():
        brand_names = [b["brand_name"] for b in brands]
        for brand in brand_names:
            # Similar brands = other brands of same generic
            alternatives = [b for b in brand_names if b != brand]
            if alternatives:
                similarity_index[brand.lower()] = {
                    "generic": generic,
                    "alternatives": alternatives,
                    "therapeutic_class": brands[0].get("therapeutic_class", "Unknown"),
                }

    out = ARTIFACTS_DIR / "brand_similarity_index.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(similarity_index, f, ensure_ascii=False)

    ok(f"Built similarity index: {len(similarity_index)} brands with alternatives")
    ok(f"Saved → brand_similarity_index.json")

    return similarity_index


# ═══════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════
def main():
    banner()

    df = load_drug_dataset()
    if df is None:
        return

    generic_mapping = build_generic_brand_mapping(df)
    build_comparison_database(df, generic_mapping)
    generate_brand_features(df)
    build_similarity_index(df, generic_mapping)

    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Data extraction complete!{C.RESET}")
    print(f"{C.DIM}  Next step: python -m cross_brand_comparison.train_model{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
