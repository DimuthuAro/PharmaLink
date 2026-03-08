"""
Build a lightweight drug name search index from the drug_names_database.json.
Extracts unique generic names and brand base-names for fast fuzzy lookup.

Output:
  ml_service/models/drug_search_index.json
  - generic_names: set of unique generic drug names (lowercase)
  - brand_basenames: set of brand base-names (first word, lowercase)
  - generic_to_class: mapping from generic name to drug class

Usage:
  python -m prescription_interpreter.build_drug_index
"""

import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)


def build_index():
    db_path = ARTIFACTS_DIR / "drug_names_database.json"
    if not db_path.exists():
        print(f"ERROR: {db_path} not found")
        return

    with open(db_path, "r", encoding="utf-8") as f:
        drugs = json.load(f)

    generic_names = set()
    generic_to_class = {}
    brand_basenames = set()

    for entry in drugs:
        # Extract generic name
        generic = entry.get("generic", "").strip()
        if generic and len(generic) >= 3:
            gen_lower = generic.lower()
            generic_names.add(gen_lower)
            drug_class = entry.get("class", "").strip()
            if drug_class and gen_lower not in generic_to_class:
                generic_to_class[gen_lower] = drug_class

        # Extract brand base-name (first word before dosage/form)
        brand = entry.get("name", "").strip()
        if brand:
            # Take the first word(s) before any number or dosage form
            match = re.match(r'^([A-Za-z][A-Za-z\s-]*?)(?:\s+\d|\s+(?:tablet|capsule|injection|syrup|cream|gel|drop|suspension|ointment|solution|oral|softgel|powder|patch|suppository|infusion|inhaler|spray|lotion|shampoo|dusting|bar|soap|chewable|nasal|eye|ear|mouth|topical|kit|vaccine|prefilled|cartridge|pen|refil))', brand, re.IGNORECASE)
            if match:
                base = match.group(1).strip().lower()
                if len(base) >= 2:
                    brand_basenames.add(base)

    index = {
        "generic_names": sorted(generic_names),
        "brand_basenames": sorted(brand_basenames),
        "generic_to_class": generic_to_class,
        "stats": {
            "total_entries": len(drugs),
            "unique_generics": len(generic_names),
            "unique_brands": len(brand_basenames),
        }
    }

    out_path = MODEL_DIR / "drug_search_index.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    print(f"Built drug index: {len(generic_names)} generics, {len(brand_basenames)} brands")
    print(f"Saved to {out_path}")
    return index


if __name__ == "__main__":
    build_index()
