"""
Rule-Based Drug & Dosage Extractor
====================================
Lightweight extraction using:
  1. Fuzzy matching against 1,605 generic drug names + 117K brand names
  2. Drug suffix pattern matching (cillin, mycin, prazole, etc.)
  3. Regex patterns for dosage, frequency, duration
  4. Line-by-line co-location of drug + dosage + frequency

Designed for 70%+ accuracy with minimal data/compute.
"""

import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent / "artifacts"

# ── Drug suffix patterns (strong signal for drug name detection) ──
DRUG_SUFFIXES = re.compile(
    r'(?:cillin|mycin|prazole|olol|sartan|statin|pril|dipine|azole|'
    r'idine|amine|etine|azepam|ofen|formin|profen|oxacin|cycline|'
    r'nazole|tadine|fenac|codone|sone|olone|asone|nisolone|mab|nib|'
    r'tide|lukast|setron|parin|buterol|vastatin|afil|gliptin|oprazole|'
    r'gliflozin|glutide|navir|zosin|morphone|tropium|methacin)$', re.IGNORECASE
)

# ── Dosage form prefixes ─────────────────────────────────────────
FORM_PREFIXES = re.compile(
    r'^(?:Tab(?:let)?|Cap(?:sule)?|Syrup|Syr|Inj(?:ection)?|Cream|'
    r'Oint(?:ment)?|Drop|Susp(?:ension)?|Gel|Patch|Inhaler|Spray|'
    r'Lotion|Solution|Powder)\.?\s+', re.IGNORECASE
)

# ── Dosage pattern ───────────────────────────────────────────────
DOSAGE_RE = re.compile(
    r'(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|IU|mEq|units?)\b', re.IGNORECASE
)

# ── Frequency patterns (ordered by specificity) ─────────────────
FREQUENCY_PATTERNS = [
    (re.compile(r'\b(OD|BD|TDS|TID|QID|QD|BID|PRN|SOS|HS|AC|PC|STAT)\b', re.IGNORECASE), 0.90),
    (re.compile(r'\b(\d+[-–]\d+[-–]\d+)\b'), 0.85),
    (re.compile(r'\b(once|twice|thrice|\d+\s*times?)\s*(?:a\s*)?(?:day|daily)\b', re.IGNORECASE), 0.85),
    (re.compile(r'\b(every\s*\d+\s*(?:hours?|hrs?))\b', re.IGNORECASE), 0.85),
    (re.compile(r'\b(Q\d+H)\b', re.IGNORECASE), 0.85),
    (re.compile(r'\b(morning|evening|night|bedtime|before\s+meals?|after\s+meals?)\b', re.IGNORECASE), 0.75),
]

# ── Duration pattern ─────────────────────────────────────────────
DURATION_RE = re.compile(
    r'(?:for\s+)?(\d+)\s*(days?|weeks?|months?)\b', re.IGNORECASE
)

# ── Abbreviation expansion map ───────────────────────────────────
ABBREVIATION_MAP = {
    "OD": "Once daily", "BD": "Twice daily", "TDS": "Three times daily",
    "TID": "Three times daily", "QID": "Four times daily",
    "QD": "Once daily", "BID": "Twice daily",
    "PRN": "As needed", "SOS": "If needed (emergency)", "HS": "At bedtime",
    "AC": "Before meals", "PC": "After meals", "PO": "By mouth",
    "IM": "Intramuscular", "IV": "Intravenous", "SC": "Subcutaneous",
    "SL": "Sublingual", "STAT": "Immediately",
    "Q4H": "Every 4 hours", "Q6H": "Every 6 hours",
    "Q8H": "Every 8 hours", "Q12H": "Every 12 hours",
}

# ── Stop words (not drug names) ──────────────────────────────────
STOP_WORDS = frozenset({
    'the', 'and', 'for', 'with', 'take', 'daily', 'tablet', 'capsule',
    'syrup', 'injection', 'patient', 'doctor', 'clinic', 'hospital',
    'date', 'name', 'address', 'signature', 'phone', 'age', 'sex',
    'male', 'female', 'prescription', 'diagnosis', 'instructions',
    'warning', 'note', 'pharmacy', 'medical', 'dr', 'mr', 'mrs', 'ms',
    'rx', 'refill', 'quantity', 'supply', 'label', 'dispense', 'review',
    'follow', 'avoid', 'monitor', 'take', 'before', 'after', 'meals',
    'food', 'water', 'breakfast', 'lunch', 'dinner', 'cream', 'gel',
    'ointment', 'drops', 'suspension', 'solution', 'tab', 'cap', 'syr',
    'inj', 'continue', 'stop', 'complete', 'course', 'consult', 'if',
    'not', 'any', 'needed', 'needed', 'known', 'allergies', 'none',
})


class DrugIndex:
    """Loads and manages the drug name search index for fast lookup."""

    def __init__(self):
        self._generic_names: Set[str] = set()
        self._brand_basenames: Set[str] = set()
        self._generic_to_class: Dict[str, str] = {}
        self._loaded = False

    def load(self):
        if self._loaded:
            return

        index_path = MODEL_DIR / "drug_search_index.json"
        if not index_path.exists():
            logger.warning(f"Drug index not found at {index_path}")
            self._loaded = True
            return

        with open(index_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self._generic_names = set(data.get("generic_names", []))
        self._brand_basenames = set(data.get("brand_basenames", []))
        self._generic_to_class = data.get("generic_to_class", {})
        self._loaded = True
        logger.info(f"Drug index loaded: {len(self._generic_names)} generics, {len(self._brand_basenames)} brands")

    def is_known_drug(self, name: str) -> bool:
        """Check if name matches a known drug (generic or brand)."""
        self.load()
        lower = name.lower().strip()
        return lower in self._generic_names or lower in self._brand_basenames

    def fuzzy_match_drug(self, name: str, threshold: int = 80) -> Optional[Tuple[str, int]]:
        """
        Try fuzzy matching against generic drug names.
        Returns (matched_name, score) or None.
        Uses simple edit-distance ratio for lightweight matching.
        """
        self.load()
        lower = name.lower().strip()
        if not lower or len(lower) < 3:
            return None

        # Exact match first
        if lower in self._generic_names:
            return (lower, 100)
        if lower in self._brand_basenames:
            return (lower, 100)

        # Simple similarity: check if name is substring or has large overlap
        best_match = None
        best_score = 0

        # Only check generics for fuzzy (much smaller set)
        for generic in self._generic_names:
            score = _simple_similarity(lower, generic)
            if score > best_score and score >= threshold:
                best_score = score
                best_match = generic

        if best_match:
            return (best_match, best_score)
        return None

    def get_drug_class(self, name: str) -> Optional[str]:
        """Get the therapeutic class for a generic drug name."""
        self.load()
        return self._generic_to_class.get(name.lower().strip())


def _simple_similarity(a: str, b: str) -> int:
    """
    Simple string similarity score (0-100) based on longest common subsequence ratio.
    Much lighter than full edit-distance for large comparisons.
    """
    if a == b:
        return 100
    if not a or not b:
        return 0

    # Quick length check — very different lengths means low similarity
    len_ratio = min(len(a), len(b)) / max(len(a), len(b))
    if len_ratio < 0.6:
        return 0

    # Check prefix match (common in drug names)
    prefix_len = 0
    for i in range(min(len(a), len(b))):
        if a[i] == b[i]:
            prefix_len += 1
        else:
            break

    prefix_ratio = prefix_len / max(len(a), len(b))

    # Check character overlap
    chars_a = set(a)
    chars_b = set(b)
    overlap = len(chars_a & chars_b) / max(len(chars_a | chars_b), 1)

    # Weighted score
    score = (prefix_ratio * 60) + (overlap * 25) + (len_ratio * 15)
    return int(min(100, score))


# Singleton drug index
_drug_index = DrugIndex()


def extract_medications_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Extract medications with dosage, frequency, and duration from prescription text.

    Returns list of medication dicts:
    [
        {
            "name": "Amoxicillin",
            "dosage": "500 mg",
            "frequency": "Three times daily",
            "duration": "7 days",
            "confidence": 92.5,
            "match_type": "exact_generic"  # exact_generic|exact_brand|suffix|fuzzy
        }
    ]
    """
    if not text or not text.strip():
        return []

    _drug_index.load()
    medications = []
    seen_names = set()

    # Strategy 1: Line-by-line parsing (best for structured prescriptions)
    line_meds = _parse_lines(text)
    for med in line_meds:
        name_lower = med["name"].lower()
        if name_lower not in seen_names:
            seen_names.add(name_lower)
            medications.append(med)

    # Strategy 2: Pattern-based extraction from full text
    pattern_meds = _extract_by_patterns(text)
    for med in pattern_meds:
        name_lower = med["name"].lower()
        if name_lower not in seen_names:
            seen_names.add(name_lower)
            medications.append(med)

    # Strategy 3: Fuzzy matching unrecognized capitalized words against drug DB
    fuzzy_meds = _fuzzy_scan(text, seen_names)
    for med in fuzzy_meds:
        name_lower = med["name"].lower()
        if name_lower not in seen_names:
            seen_names.add(name_lower)
            medications.append(med)

    return medications


def _parse_lines(text: str) -> List[Dict[str, Any]]:
    """Parse individual lines to co-locate drug name + dosage + frequency."""
    results = []
    lines = text.split('\n')

    # Pattern for numbered prescription lines: "1. Amoxicillin 500mg TDS for 7 days"
    numbered_re = re.compile(
        r'^\s*\d+[.)]\s*'                    # line number
        r'(?:' + FORM_PREFIXES.pattern[1:] +  # optional form prefix (reuse pattern without ^)
        r')?'
        r'([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)',  # drug name (1-2 words)
        re.IGNORECASE
    )

    # Pattern for "Tab. DrugName 500mg" style
    form_prefix_re = re.compile(
        r'(?:Tab(?:let)?|Cap(?:sule)?|Syrup|Syr|Inj(?:ection)?|Cream|'
        r'Oint(?:ment)?|Drop|Susp(?:ension)?)\.?\s+'
        r'([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)',
        re.IGNORECASE
    )

    for line in lines:
        line = line.strip()
        if not line or len(line) < 4:
            continue

        drug_name = None
        rest_of_line = line

        # Try numbered pattern
        m = numbered_re.match(line)
        if m:
            drug_name = m.group(1).strip()
            rest_of_line = line[m.end():]
        else:
            # Try form prefix pattern
            m = form_prefix_re.search(line)
            if m:
                drug_name = m.group(1).strip()
                rest_of_line = line[m.end():]

        if not drug_name or len(drug_name) < 3:
            continue
        if drug_name.lower() in STOP_WORDS:
            continue

        # Determine match type and confidence
        match_type, confidence = _classify_drug_name(drug_name)
        if match_type == "unknown":
            continue

        # Extract dosage from rest of line
        dosage = ""
        dose_m = DOSAGE_RE.search(rest_of_line)
        if not dose_m:
            dose_m = DOSAGE_RE.search(line)
        if dose_m:
            dosage = f"{dose_m.group(1)} {dose_m.group(2).lower()}"

        # Extract frequency
        frequency = ""
        for freq_re, _ in FREQUENCY_PATTERNS:
            freq_m = freq_re.search(rest_of_line)
            if not freq_m:
                freq_m = freq_re.search(line)
            if freq_m:
                raw_freq = freq_m.group(1) if freq_m.lastindex else freq_m.group(0)
                frequency = ABBREVIATION_MAP.get(raw_freq.strip().upper(), raw_freq)
                break

        # Extract duration
        duration = ""
        dur_m = DURATION_RE.search(rest_of_line)
        if not dur_m:
            dur_m = DURATION_RE.search(line)
        if dur_m:
            duration = f"{dur_m.group(1)} {dur_m.group(2)}"

        # Boost confidence if we found dosage/frequency
        if dosage:
            confidence = min(99, confidence + 5)
        if frequency:
            confidence = min(99, confidence + 5)

        results.append({
            "name": drug_name,
            "dosage": dosage,
            "frequency": frequency,
            "duration": duration,
            "confidence": round(confidence, 1),
            "match_type": match_type,
        })

    return results


def _extract_by_patterns(text: str) -> List[Dict[str, Any]]:
    """Extract drug names using regex patterns on full text."""
    results = []

    # Pattern: drug-like words followed by dosage
    drug_dose_re = re.compile(
        r'\b([A-Z][a-z]{2,20})\s+(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|IU)\b',
        re.IGNORECASE
    )

    for m in drug_dose_re.finditer(text):
        name = m.group(1).strip()
        if name.lower() in STOP_WORDS or len(name) < 3:
            continue

        match_type, confidence = _classify_drug_name(name)
        if match_type == "unknown":
            continue

        dosage = f"{m.group(2)} {m.group(3).lower()}"
        confidence = min(99, confidence + 5)  # bonus for having dosage next to name

        results.append({
            "name": name,
            "dosage": dosage,
            "frequency": "",
            "duration": "",
            "confidence": round(confidence, 1),
            "match_type": match_type,
        })

    return results


def _fuzzy_scan(text: str, already_found: set) -> List[Dict[str, Any]]:
    """Scan for capitalized words that might be drug names via fuzzy matching."""
    results = []
    words = re.findall(r'\b([A-Z][a-z]{3,20})\b', text)

    for word in words:
        if word.lower() in already_found or word.lower() in STOP_WORDS:
            continue

        match = _drug_index.fuzzy_match_drug(word, threshold=80)
        if match:
            matched_name, score = match
            results.append({
                "name": word,
                "matched_as": matched_name,
                "dosage": "",
                "frequency": "",
                "duration": "",
                "confidence": round(score * 0.85, 1),  # discount fuzzy matches
                "match_type": "fuzzy",
            })

    return results


def _classify_drug_name(name: str) -> Tuple[str, float]:
    """
    Classify a candidate drug name and return (match_type, confidence).
    Returns ("unknown", 0) if not a drug.
    """
    lower = name.lower().strip()

    # Check exact generic match
    if lower in _drug_index._generic_names:
        return ("exact_generic", 92.0)

    # Check exact brand match
    if lower in _drug_index._brand_basenames:
        return ("exact_brand", 88.0)

    # Check drug suffix
    if DRUG_SUFFIXES.search(lower):
        return ("suffix", 82.0)

    # Try fuzzy match
    match = _drug_index.fuzzy_match_drug(name, threshold=80)
    if match:
        return ("fuzzy", match[1] * 0.85)

    return ("unknown", 0.0)


def extract_all_dosages(text: str) -> List[Dict[str, Any]]:
    """Extract all dosage mentions from text."""
    results = []
    seen = set()
    for m in DOSAGE_RE.finditer(text):
        val = f"{m.group(1)} {m.group(2).lower()}"
        if val not in seen:
            seen.add(val)
            results.append({"text": val, "score": 0.90})
    return results


def extract_all_frequencies(text: str) -> List[Dict[str, Any]]:
    """Extract all frequency mentions from text."""
    results = []
    seen = set()
    for freq_re, score in FREQUENCY_PATTERNS:
        for m in freq_re.finditer(text):
            raw = m.group(1) if m.lastindex else m.group(0)
            expanded = ABBREVIATION_MAP.get(raw.strip().upper(), raw)
            if expanded not in seen:
                seen.add(expanded)
                results.append({"text": expanded, "score": score})
    return results


def extract_all_durations(text: str) -> List[Dict[str, Any]]:
    """Extract all duration mentions from text."""
    results = []
    seen = set()
    for m in DURATION_RE.finditer(text):
        val = f"{m.group(1)} {m.group(2)}"
        if val not in seen:
            seen.add(val)
            results.append({"text": val, "score": 0.85})
    return results
