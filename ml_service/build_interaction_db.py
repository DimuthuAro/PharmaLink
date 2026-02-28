"""
Build Drug-Drug Interaction database from DrugBank DDI dataset.
Converts db_drug_interactions.csv → drug_interaction_db.json
for use by the drug interaction microservice.

Source: kaggle.com/mghobashy/drug-drug-interactions (~191k interactions)
"""
import csv
import json
import re
from pathlib import Path
from collections import defaultdict

ARTIFACTS = Path(__file__).resolve().parent.parent / "artifacts"
INPUT_CSV = ARTIFACTS / "db_drug_interactions.csv"
OUTPUT_FILE = ARTIFACTS / "drug_interaction_db.json"
DRUG_NAMES_FILE = ARTIFACTS / "drug_interaction_drug_names.json"


# ── Severity classifier ─────────────────────────────────────────────────────
# Classify interaction severity from description text using keyword heuristics
SEVERE_KEYWORDS = [
    r'\btoxic',
    r'\btoxicity\b',
    r'\bserotonin syndrome\b',
    r'\bQTc prolongation\b',
    r'\bseizure',
    r'\barrhythmi',
    r'\bhemorrhag',
    r'\bbleeding risk\b',
    r'\brespiratory depression\b',
    r'\bcardiotoxic',
    r'\bhepatotoxic',
    r'\bnephrotoxic',
    r'\brhabdomyolysis\b',
    r'\bagranulocytosis\b',
    r'\bstevens.johnson\b',
    r'\bneuroleptic malignant\b',
    r'\blife.threatening\b',
    r'\bfatal\b',
    r'\bdeath\b',
    r'\bhypertensive crisis\b',
    r'\bsevere\b',
    r'\bdangerous\b',
    r'\bthrombocytopeni',
    r'\bpancytopeni',
    r'\baplas',
    r'\bbone marrow\b',
    r'\banaphylax',
    r'\bangioedema\b',
]

MODERATE_KEYWORDS = [
    r'\bdecrease.*effect',
    r'\bincrease.*effect',
    r'\breduce.*efficacy',
    r'\benhance.*adverse',
    r'\bincrease.*risk\b',
    r'\bdecrease.*metabolism\b',
    r'\bincrease.*concentration\b',
    r'\bdecrease.*clearance\b',
    r'\bdecrease.*excretion\b',
    r'\bincrease.*absorption\b',
    r'\bhypotension\b',
    r'\bhyperkalemia\b',
    r'\bhypoglycemi',
    r'\bbradycardia\b',
    r'\bconstipation\b',
    r'\bsedation\b',
    r'\bdrowsiness\b',
    r'\bCNS depression\b',
    r'\bincrease the anticoagulant\b',
    r'\bincrease the anticholinergic\b',
    r'\bincrease the hypertensive\b',
    r'\bincrease the hypotensive\b',
    r'\bincrease the hypoglycemic\b',
    r'\bincrease the ototoxic\b',
    r'\bincrease the myelosuppressive\b',
    r'\bincrease the neuromuscular\b',
    r'\bincrease the photosensitiz',
    r'\bincrease the immunosuppressive\b',
    r'\breduce the antihypertensive\b',
    r'\bthe serum concentration.+can be increased\b',
    r'\bthe serum concentration.+can be decreased\b',
    r'\bthe metabolism.+can be decreased\b',
    r'\bthe metabolism.+can be increased\b',
    r'\bmay increase.*activities\b',
    r'\bmay decrease.*activities\b',
    r'\badverse effects can be increased\b',
]

_severe_re = re.compile('|'.join(SEVERE_KEYWORDS), re.IGNORECASE)
_moderate_re = re.compile('|'.join(MODERATE_KEYWORDS), re.IGNORECASE)


def classify_severity(description: str) -> str:
    if _severe_re.search(description):
        return 'severe'
    if _moderate_re.search(description):
        return 'moderate'
    return 'mild'


def main():
    if not INPUT_CSV.exists():
        print(f"ERROR: {INPUT_CSV} not found.")
        print("Download it first:")
        print("  kaggle datasets download mghobashy/drug-drug-interactions -p artifacts --unzip")
        return

    print(f"Reading {INPUT_CSV} ...")
    interactions = {}
    drug_names = set()
    skipped = 0

    with open(INPUT_CSV, 'r', encoding='utf-8', errors='replace') as f:
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

            # Canonical key: sorted lowercase names joined by |
            key = '|'.join(sorted([drug1.lower(), drug2.lower()]))
            if key in interactions:
                # Keep the longer (more detailed) description
                if len(desc) > len(interactions[key]['description']):
                    interactions[key]['description'] = desc
                    interactions[key]['severity'] = classify_severity(desc)
                continue

            severity = classify_severity(desc)
            interactions[key] = {
                'drug1': drug1,
                'drug2': drug2,
                'severity': severity,
                'description': desc,
            }

    # Build the output
    interaction_list = list(interactions.values())

    # Stats
    severity_counts = defaultdict(int)
    for i in interaction_list:
        severity_counts[i['severity']] += 1

    print(f"\n{'='*60}")
    print(f"  Total interaction pairs: {len(interaction_list):,}")
    print(f"  Unique drug names:       {len(drug_names):,}")
    print(f"  Severe interactions:     {severity_counts['severe']:,}")
    print(f"  Moderate interactions:   {severity_counts['moderate']:,}")
    print(f"  Mild interactions:       {severity_counts['mild']:,}")
    print(f"  Skipped rows:            {skipped}")
    print(f"{'='*60}\n")

    # Save interaction database as a dict keyed by canonical pair
    # Format: { "aspirin|warfarin": { severity, description, drug1, drug2 } }
    interaction_db = {}
    for item in interaction_list:
        key = '|'.join(sorted([item['drug1'].lower(), item['drug2'].lower()]))
        interaction_db[key] = {
            'drug1': item['drug1'],
            'drug2': item['drug2'],
            'severity': item['severity'],
            'description': item['description'],
        }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(interaction_db, f, ensure_ascii=False)
    print(f"Saved interaction DB: {OUTPUT_FILE}")
    print(f"  Size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.1f} MB")

    # Save the unique drug names list (sorted) for the search index
    sorted_names = sorted(drug_names, key=str.lower)
    with open(DRUG_NAMES_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted_names, f, ensure_ascii=False)
    print(f"Saved drug names: {DRUG_NAMES_FILE}")
    print(f"  {len(sorted_names):,} unique drug names")

    # Print some example interactions
    print("\nSample interactions:")
    for item in interaction_list[:5]:
        print(f"  {item['drug1']} + {item['drug2']}")
        print(f"    [{item['severity'].upper()}] {item['description'][:100]}...")
        print()


if __name__ == '__main__':
    main()
