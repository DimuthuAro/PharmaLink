"""
Prescription Interpreter – Test Suite
======================================
Tests the lightweight extraction pipeline against sample prescriptions.
Measures accuracy for drug names, dosages, frequencies.

Usage:
  python -m prescription_interpreter.test_pipeline
"""

import json
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"

# Ensure imports work
_ml_dir = str(Path(__file__).resolve().parent.parent)
if _ml_dir not in sys.path:
    sys.path.insert(0, _ml_dir)

from prescription_interpreter.text_cleaner import clean_prescription_text, compute_text_quality_score
from prescription_interpreter.rule_extractor import (
    extract_medications_from_text,
    extract_all_dosages,
    extract_all_frequencies,
    extract_all_durations,
)

# ── Console Helpers ──────────────────────────────────────────────
GREEN = "\033[92m"; RED = "\033[91m"; YELLOW = "\033[93m"
CYAN = "\033[96m"; BOLD = "\033[1m"; RESET = "\033[0m"

def ok(msg):   print(f"  {GREEN}✔{RESET}  {msg}")
def fail(msg): print(f"  {RED}✖{RESET}  {msg}")
def warn(msg): print(f"  {YELLOW}⚠{RESET}  {msg}")


# ══════════════════════════════════════════════════════════════════
# Test Cases
# ══════════════════════════════════════════════════════════════════

# Standard well-formatted prescriptions
STANDARD_TESTS = [
    {
        "id": "std_001",
        "description": "Simple 3-drug prescription",
        "text": "Rx:\n1. Amoxicillin 500mg - Take 1 tablet 3 times daily for 7 days\n2. Ibuprofen 400mg - Take 1 tablet as needed for pain\n3. Omeprazole 20mg - Take 1 capsule daily before breakfast",
        "expected_drugs": ["Amoxicillin", "Ibuprofen", "Omeprazole"],
        "expected_dosages": ["500 mg", "400 mg", "20 mg"],
    },
    {
        "id": "std_002",
        "description": "Prescription with medical abbreviations",
        "text": "Tab. Metformin 500mg BD PC\nTab. Amlodipine 5mg OD\nCap. Omeprazole 20mg OD AC",
        "expected_drugs": ["Metformin", "Amlodipine", "Omeprazole"],
        "expected_dosages": ["500 mg", "5 mg", "20 mg"],
    },
    {
        "id": "std_003",
        "description": "Complex 5-drug prescription",
        "text": "1. Warfarin 5mg OD – monitor INR weekly\n2. Lisinopril 10mg OD\n3. Atorvastatin 20mg HS\n4. Metformin 850mg BD PC\n5. Aspirin 75mg OD",
        "expected_drugs": ["Warfarin", "Lisinopril", "Atorvastatin", "Metformin", "Aspirin"],
        "expected_dosages": ["5 mg", "10 mg", "20 mg", "850 mg", "75 mg"],
    },
    {
        "id": "std_004",
        "description": "Prescription with numbered format",
        "text": "1) Azithromycin 500mg OD for 3 days\n2) Paracetamol 500mg TDS PRN\n3) Cetirizine 10mg HS",
        "expected_drugs": ["Azithromycin", "Paracetamol", "Cetirizine"],
        "expected_dosages": ["500 mg", "10 mg"],
    },
    {
        "id": "std_005",
        "description": "Syrup and injection forms",
        "text": "Syrup Amoxicillin 250mg TDS for 5 days\nInj. Ceftriaxone 1g IV BD",
        "expected_drugs": ["Amoxicillin", "Ceftriaxone"],
        "expected_dosages": ["250 mg", "1 g"],
    },
]

# OCR-degraded text (simulating common OCR errors)
OCR_DEGRADED_TESTS = [
    {
        "id": "ocr_001",
        "description": "Mild OCR degradation",
        "text": "Tab Amoxicillin 500 mg TDS for 7 days\nTab Metformin 500 mg BD\nCap Omeprazole 20 mg OD",
        "expected_drugs": ["Amoxicillin", "Metformin", "Omeprazole"],
        "expected_dosages": ["500 mg", "20 mg"],
    },
    {
        "id": "ocr_002",
        "description": "Moderate OCR degradation (spacing issues)",
        "text": "1. Amoxicillin 500mg -3 times day 7days\n2 .Ibuprofen 400mg as needed\n3. Omeprazole 20 mg daily",
        "expected_drugs": ["Amoxicillin", "Ibuprofen", "Omeprazole"],
        "expected_dosages": ["500 mg", "400 mg", "20 mg"],
    },
    {
        "id": "ocr_003",
        "description": "Heavy OCR degradation (partial gibberish)",
        "text": "3 \"a\nflaw AU ANA\nTab Amoxicillin 500mg\nCes 5) LAA Conf\nMetformin 850mg BD\ndr. Nimini\nConsult",
        "expected_drugs": ["Amoxicillin", "Metformin"],
        "expected_dosages": ["500 mg", "850 mg"],
    },
]

# Edge cases
EDGE_TESTS = [
    {
        "id": "edge_001",
        "description": "Empty text",
        "text": "",
        "expected_drugs": [],
        "expected_dosages": [],
    },
    {
        "id": "edge_002",
        "description": "Only gibberish",
        "text": "€¢|{}[]~~ @@## $$ %%",
        "expected_drugs": [],
        "expected_dosages": [],
    },
    {
        "id": "edge_003",
        "description": "Drug names without dosage",
        "text": "Amoxicillin\nMetformin\nOmeprazole",
        "expected_drugs": ["Amoxicillin", "Metformin", "Omeprazole"],
        "expected_dosages": [],
    },
    {
        "id": "edge_004",
        "description": "Single drug",
        "text": "Tab. Paracetamol 500mg TDS for 3 days",
        "expected_drugs": ["Paracetamol"],
        "expected_dosages": ["500 mg"],
    },
]


def run_test(test_case: dict) -> dict:
    """Run a single test case and return results."""
    text = test_case["text"]
    expected_drugs = [d.lower() for d in test_case["expected_drugs"]]
    expected_dosages = test_case.get("expected_dosages", [])

    start = time.time()

    # Clean text
    cleaned = clean_prescription_text(text)
    quality = compute_text_quality_score(cleaned)

    # Extract
    medications = extract_medications_from_text(cleaned)
    dosages = extract_all_dosages(cleaned)

    elapsed = time.time() - start

    # Evaluate drug name accuracy
    found_drugs = [m["name"].lower() for m in medications]

    # True positives: expected drugs that were found
    drug_tp = sum(1 for d in expected_drugs if any(d in f or f in d for f in found_drugs))
    # False positives: found drugs not in expected
    drug_fp = sum(1 for f in found_drugs if not any(f in d or d in f for d in expected_drugs))
    # False negatives: expected drugs not found
    drug_fn = len(expected_drugs) - drug_tp

    drug_precision = drug_tp / max(drug_tp + drug_fp, 1)
    drug_recall = drug_tp / max(len(expected_drugs), 1) if expected_drugs else 1.0
    drug_f1 = 2 * drug_precision * drug_recall / max(drug_precision + drug_recall, 1e-9)

    # Evaluate dosage accuracy
    found_dosages = [d["text"].lower().replace(' ', '') for d in dosages]
    expected_dosages_norm = [d.lower().replace(' ', '') for d in expected_dosages]
    dosage_tp = sum(1 for d in expected_dosages_norm if d in found_dosages)
    dosage_recall = dosage_tp / max(len(expected_dosages_norm), 1) if expected_dosages_norm else 1.0

    return {
        "id": test_case["id"],
        "description": test_case["description"],
        "quality_score": quality,
        "found_drugs": [m["name"] for m in medications],
        "expected_drugs": test_case["expected_drugs"],
        "found_dosages": [d["text"] for d in dosages],
        "drug_precision": round(drug_precision, 3),
        "drug_recall": round(drug_recall, 3),
        "drug_f1": round(drug_f1, 3),
        "dosage_recall": round(dosage_recall, 3),
        "time_ms": round(elapsed * 1000, 1),
        "passed": drug_recall >= 0.7,  # 70% recall threshold
    }


def main():
    print(f"\n{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}  Prescription Interpreter – Pipeline Test Suite{RESET}")
    print(f"{CYAN}{'='*60}{RESET}\n")

    all_tests = STANDARD_TESTS + OCR_DEGRADED_TESTS + EDGE_TESTS
    results = []

    # Run standard tests
    print(f"\n{BOLD}  Standard Prescription Tests{RESET}")
    print(f"  {'─'*50}")
    for test in STANDARD_TESTS:
        result = run_test(test)
        results.append(result)
        icon = f"{GREEN}✔" if result["passed"] else f"{RED}✖"
        print(f"  {icon}{RESET}  {test['id']}: {test['description']}")
        print(f"      Drugs: {result['found_drugs']} (P={result['drug_precision']}, R={result['drug_recall']}, F1={result['drug_f1']})")
        print(f"      Dosages: {result['found_dosages']} (R={result['dosage_recall']})")
        print(f"      Time: {result['time_ms']}ms | Quality: {result['quality_score']:.1f}")

    # Run OCR-degraded tests
    print(f"\n{BOLD}  OCR-Degraded Text Tests{RESET}")
    print(f"  {'─'*50}")
    for test in OCR_DEGRADED_TESTS:
        result = run_test(test)
        results.append(result)
        icon = f"{GREEN}✔" if result["passed"] else f"{RED}✖"
        print(f"  {icon}{RESET}  {test['id']}: {test['description']}")
        print(f"      Drugs: {result['found_drugs']} (P={result['drug_precision']}, R={result['drug_recall']}, F1={result['drug_f1']})")
        print(f"      Time: {result['time_ms']}ms | Quality: {result['quality_score']:.1f}")

    # Run edge cases
    print(f"\n{BOLD}  Edge Case Tests{RESET}")
    print(f"  {'─'*50}")
    for test in EDGE_TESTS:
        result = run_test(test)
        results.append(result)
        icon = f"{GREEN}✔" if result["passed"] else f"{RED}✖"
        print(f"  {icon}{RESET}  {test['id']}: {test['description']}")
        print(f"      Drugs: {result['found_drugs']} (R={result['drug_recall']})")

    # Summary
    print(f"\n{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}  RESULTS SUMMARY{RESET}")
    print(f"{CYAN}{'='*60}{RESET}")

    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    avg_recall = sum(r["drug_recall"] for r in results) / len(results)
    avg_precision = sum(r["drug_precision"] for r in results) / len(results)
    avg_f1 = sum(r["drug_f1"] for r in results) / len(results)
    avg_dosage_recall = sum(r["dosage_recall"] for r in results) / len(results)
    avg_time = sum(r["time_ms"] for r in results) / len(results)

    print(f"\n  Tests passed:     {passed}/{total} ({passed/total*100:.0f}%)")
    print(f"  Avg Drug Recall:  {avg_recall:.1%}")
    print(f"  Avg Drug Prec:    {avg_precision:.1%}")
    print(f"  Avg Drug F1:      {avg_f1:.1%}")
    print(f"  Avg Dosage Recall:{avg_dosage_recall:.1%}")
    print(f"  Avg Time:         {avg_time:.1f}ms")

    target_met = avg_recall >= 0.70
    color = GREEN if target_met else RED
    print(f"\n  {color}{'✔' if target_met else '✖'}  70% recall target: {'MET' if target_met else 'NOT MET'} ({avg_recall:.1%}){RESET}")

    # Save results
    out_path = DATA_DIR / "pipeline_test_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "results": results,
            "summary": {
                "passed": passed,
                "total": total,
                "avg_drug_recall": round(avg_recall, 3),
                "avg_drug_precision": round(avg_precision, 3),
                "avg_drug_f1": round(avg_f1, 3),
                "avg_dosage_recall": round(avg_dosage_recall, 3),
                "avg_time_ms": round(avg_time, 1),
                "target_70pct_met": target_met,
            }
        }, f, indent=2)
    print(f"\n  Results saved to {out_path}\n")

    return 0 if target_met else 1


if __name__ == "__main__":
    sys.exit(main())
