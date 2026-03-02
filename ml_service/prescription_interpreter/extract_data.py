"""
Prescription Interpreter – Step 2: Data Extraction & Preprocessing
===================================================================
Extracts and prepares data for the prescription interpretation pipeline:

  1. Load and validate medical abbreviation mappings
  2. Load sample prescription texts
  3. Run regex-based entity extraction on samples (baseline)
  4. Build medication pattern database (common drug suffixes, forms)
  5. Generate evaluation dataset (ground truth for model assessment)

Input:
  artifacts/medical_abbreviations.json
  artifacts/sample_prescriptions.json
  artifacts/drug_names_database.json

Output:
  data/prescription_patterns.json
  data/prescription_evaluation_dataset.csv
  artifacts/medication_form_patterns.json

Usage:
  python -m prescription_interpreter.extract_data
"""

import json
import re
import pandas as pd
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"

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
║{C.RESET}{C.BOLD}{C.WHITE}   PRESCRIPTION INTERPRETER – Data Extraction                {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Input  : {ARTIFACTS_DIR}
  Output : {DATA_DIR}{C.RESET}
""")


# ── Regex Patterns (from PrescriptionParser in main.py) ──────────
MEDICATION_PATTERNS = [
    r'(?:Tab(?:let)?\.?|Cap(?:sule)?\.?|Syrup\.?|Inj(?:ection)?\.?)\s*([A-Za-z][A-Za-z\s-]+?)(?:\s+\d+\s*(?:mg|g|ml|mcg))?',
    r'\b([A-Z][a-z]+(?:cillin|mycin|prazole|olol|sartan|statin|pril|dipine|azole|idine|amine|etine|azepam))\b',
    r'Rx[:\s]+([A-Za-z][A-Za-z\s-]+?)(?=\s+\d|\s*$)',
    r'^\s*\d+[.)\s]+([A-Z][a-zA-Z\s-]+?)(?:\s+\d+\s*(?:mg|g|ml))',
]
DOSAGE_PATTERNS = [
    r'(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|IU|tablets?|caps?|capsules?)',
]
FREQUENCY_PATTERNS = [
    r'(once|twice|thrice|\d+\s*times?)\s*(?:a\s*)?(?:day|daily)',
    r'(every\s*\d+\s*(?:hours?|hrs?))',
    r'(morning|evening|night|bedtime)',
    r'(OD|BD|TDS|TID|QID|QD|BID|PRN|SOS|HS)',
    r'(\d+[-–]\d+[-–]\d+)',
]
DURATION_PATTERNS = [
    r'(?:for\s*)?(\d+)\s*(days?|weeks?|months?)',
]

STOP_WORDS = {
    'the', 'and', 'for', 'with', 'take', 'daily', 'tablet',
    'capsule', 'syrup', 'injection', 'patient', 'doctor',
}


def extract_entities_regex(text):
    """Run regex-based extraction mirroring PrescriptionParser."""
    medications = set()
    for pattern in MEDICATION_PATTERNS:
        for m in re.findall(pattern, text, re.IGNORECASE | re.MULTILINE):
            name = m.strip() if isinstance(m, str) else str(m).strip()
            if len(name) >= 3 and name.lower() not in STOP_WORDS:
                medications.add(name)

    def _collect(patterns):
        results = []
        for p in patterns:
            for m in re.findall(p, text, re.IGNORECASE):
                val = ' '.join(str(x) for x in m) if isinstance(m, tuple) else str(m)
                if val and val not in results:
                    results.append(val)
        return results

    return {
        "medications": list(medications),
        "dosages": _collect(DOSAGE_PATTERNS),
        "frequencies": _collect(FREQUENCY_PATTERNS),
        "durations": _collect(DURATION_PATTERNS),
    }


def main():
    banner()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # ════════════════════════════════════════════════════════════
    # STEP 1: Load Abbreviation Mappings
    # ════════════════════════════════════════════════════════════
    step(1, 5, "Loading medical abbreviation mappings")

    abbrev_path = ARTIFACTS_DIR / "medical_abbreviations.json"
    if abbrev_path.exists():
        with open(abbrev_path, "r", encoding="utf-8") as f:
            abbreviations = json.load(f)
        ok(f"Loaded {len(abbreviations)} abbreviation mappings")
    else:
        warn("medical_abbreviations.json not found – run download_datasets.py first")
        abbreviations = {}

    # ════════════════════════════════════════════════════════════
    # STEP 2: Load & Process Sample Prescriptions
    # ════════════════════════════════════════════════════════════
    step(2, 5, "Loading sample prescriptions")

    samples_path = ARTIFACTS_DIR / "sample_prescriptions.json"
    if samples_path.exists():
        with open(samples_path, "r", encoding="utf-8") as f:
            samples = json.load(f)
        ok(f"Loaded {len(samples)} sample prescriptions")
    else:
        warn("sample_prescriptions.json not found – using built-in samples")
        samples = [
            {
                "id": "default_001",
                "description": "Default test prescription",
                "text": "Rx:\n1. Amoxicillin 500mg TDS for 7 days\n2. Ibuprofen 400mg PRN",
                "expected_medications": ["Amoxicillin", "Ibuprofen"],
            }
        ]

    # ════════════════════════════════════════════════════════════
    # STEP 3: Regex Baseline Extraction on Samples
    # ════════════════════════════════════════════════════════════
    step(3, 5, "Running regex-based extraction baseline on samples")

    eval_rows = []
    total_expected = 0
    total_found = 0

    for sample in samples:
        extracted = extract_entities_regex(sample["text"])
        expected = [m.lower() for m in sample.get("expected_medications", [])]
        found = [m.lower() for m in extracted["medications"]]

        hits = sum(1 for e in expected if any(e in f or f in e for f in found))
        total_expected += len(expected)
        total_found += hits

        eval_rows.append({
            "sample_id": sample["id"],
            "description": sample["description"],
            "expected_count": len(expected),
            "found_count": len(found),
            "hits": hits,
            "precision": round(hits / len(found), 3) if found else 0,
            "recall": round(hits / len(expected), 3) if expected else 0,
            "medications_found": "; ".join(extracted["medications"]),
            "dosages_found": "; ".join(extracted["dosages"]),
            "frequencies_found": "; ".join(extracted["frequencies"]),
            "durations_found": "; ".join(extracted["durations"]),
        })

        print(f"    {sample['id']}: expected={len(expected)} found={len(found)} hits={hits}")

    recall = round(total_found / total_expected, 3) if total_expected else 0
    ok(f"Baseline recall: {recall*100:.1f}% ({total_found}/{total_expected} medications matched)")

    eval_df = pd.DataFrame(eval_rows)
    eval_path = DATA_DIR / "prescription_evaluation_dataset.csv"
    eval_df.to_csv(eval_path, index=False)
    ok(f"Evaluation dataset saved → {eval_path}")

    # ════════════════════════════════════════════════════════════
    # STEP 4: Build Medication Pattern Database
    # ════════════════════════════════════════════════════════════
    step(4, 5, "Building medication form & suffix patterns")

    # Common drug name suffixes (pharmacological families)
    drug_suffixes = {
        "cillin": "Penicillin antibiotic",
        "mycin": "Macrolide/Aminoglycoside antibiotic",
        "prazole": "Proton pump inhibitor",
        "olol": "Beta-blocker",
        "sartan": "ARB (Angiotensin receptor blocker)",
        "statin": "HMG-CoA reductase inhibitor (cholesterol)",
        "pril": "ACE inhibitor",
        "dipine": "Calcium channel blocker",
        "azole": "Antifungal / PPI",
        "idine": "H2 blocker / miscellaneous",
        "amine": "Various pharmacological classes",
        "etine": "SSRI antidepressant",
        "azepam": "Benzodiazepine",
        "oxacin": "Fluoroquinolone antibiotic",
        "cycline": "Tetracycline antibiotic",
        "zosin": "Alpha-blocker",
        "lukast": "Leukotriene receptor antagonist",
        "navir": "Protease inhibitor (antiviral)",
        "vudine": "Nucleoside reverse transcriptase inhibitor",
        "gliptin": "DPP-4 inhibitor (diabetes)",
        "gliflozin": "SGLT2 inhibitor (diabetes)",
        "glutide": "GLP-1 receptor agonist (diabetes)",
        "mab": "Monoclonal antibody",
        "nib": "Tyrosine kinase inhibitor",
    }

    # Dosage form identifiers
    dosage_forms = {
        "Tab": "Tablet", "Tab.": "Tablet", "Tablet": "Tablet",
        "Cap": "Capsule", "Cap.": "Capsule", "Capsule": "Capsule",
        "Syr": "Syrup", "Syrup": "Syrup",
        "Inj": "Injection", "Injection": "Injection",
        "Susp": "Suspension", "Oint": "Ointment",
        "CR": "Controlled Release", "SR": "Sustained Release",
        "XR": "Extended Release", "ER": "Extended Release",
        "DR": "Delayed Release",
    }

    patterns_data = {
        "drug_suffixes": drug_suffixes,
        "dosage_forms": dosage_forms,
        "abbreviations": abbreviations,
        "regex_patterns": {
            "medication": MEDICATION_PATTERNS,
            "dosage": [p for p in DOSAGE_PATTERNS],
            "frequency": FREQUENCY_PATTERNS,
            "duration": DURATION_PATTERNS,
        },
    }

    patterns_path = DATA_DIR / "prescription_patterns.json"
    with open(patterns_path, "w", encoding="utf-8") as f:
        json.dump(patterns_data, f, indent=2)
    ok(f"Prescription patterns saved → {patterns_path}")

    form_path = ARTIFACTS_DIR / "medication_form_patterns.json"
    with open(form_path, "w", encoding="utf-8") as f:
        json.dump({"drug_suffixes": drug_suffixes, "dosage_forms": dosage_forms}, f, indent=2)
    ok(f"Form patterns saved → {form_path}")

    # ════════════════════════════════════════════════════════════
    # STEP 5: Build Known Drug Name Lookup (from existing DB)
    # ════════════════════════════════════════════════════════════
    step(5, 5, "Building known drug name lookup from existing database")

    drug_db_path = ARTIFACTS_DIR / "drug_names_database.json"
    known_drugs = set()
    if drug_db_path.exists():
        with open(drug_db_path, "r", encoding="utf-8") as f:
            drug_db = json.load(f)
        if isinstance(drug_db, list):
            for entry in drug_db:
                if isinstance(entry, str):
                    known_drugs.add(entry.lower())
                elif isinstance(entry, dict):
                    known_drugs.add(entry.get("name", "").lower())
        elif isinstance(drug_db, dict):
            for k in drug_db:
                known_drugs.add(k.lower())
        ok(f"Loaded {len(known_drugs)} known drug names")
    else:
        warn("drug_names_database.json not found – drug name validation will be limited")

    # Save compact lookup
    lookup_path = DATA_DIR / "prescription_drug_lookup.json"
    with open(lookup_path, "w", encoding="utf-8") as f:
        json.dump(sorted(list(known_drugs)), f)
    ok(f"Drug name lookup saved → {lookup_path} ({len(known_drugs)} names)")

    # Summary
    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Data extraction complete!{C.RESET}")
    print(f"  Evaluation samples : {len(eval_rows)}")
    print(f"  Baseline recall    : {recall*100:.1f}%")
    print(f"  Drug suffixes      : {len(drug_suffixes)}")
    print(f"  Known drug names   : {len(known_drugs)}")
    print(f"{C.DIM}  Next step: python -m prescription_interpreter.train_model{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
