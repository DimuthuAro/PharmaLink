"""
Prescription Text Cleaner
==========================
Cleans raw OCR output to fix common corruption patterns, normalize
whitespace, and prepare text for drug/dosage extraction.

Designed for the kind of gibberish OCR output from handwritten prescriptions:
  Input:  "3 "a\nflaw AU ANA (Reig\n(€ ¢ (ON 1 |\nCes 5) LAA Conf..."
  Output: cleaned text with best-effort recovery of drug names
"""

import re
import unicodedata
from typing import List, Tuple


# Characters commonly misread by OCR mapped to likely corrections
OCR_CHAR_FIXES = {
    '€': 'e', '¢': 'c', '£': 'L', '¥': 'Y', '©': 'c', '®': 'R',
    '°': 'o', '±': '+', '²': '2', '³': '3', 'µ': 'u', '¹': '1',
    '¼': '1/4', '½': '1/2', '¾': '3/4', 'ß': 'B', 'ð': 'd',
    '÷': '/', '×': 'x', 'ø': 'o', 'þ': 'p', 'æ': 'ae', 'œ': 'oe',
    '|': 'l', '!': 'l', '{': '(', '}': ')', '[': '(', ']': ')',
    '`': "'", '~': '-', '\\': '/',
}

# Common OCR word-level corruptions for medical terms
OCR_WORD_FIXES = {
    'rnq': 'mg', 'mq': 'mg', 'rng': 'mg', 'mG': 'mg', 'Mg': 'mg',
    'mI': 'ml', 'MI': 'ml', 'rnl': 'ml',
    'mcG': 'mcg', 'MCG': 'mcg',
    'tab': 'Tab', 'TAB': 'Tab', 'tob': 'Tab',
    'cap': 'Cap', 'CAP': 'Cap',
    'inj': 'Inj', 'INJ': 'Inj',
    'syr': 'Syr', 'SYR': 'Syr',
    'od': 'OD', 'Od': 'OD',
    'bd': 'BD', 'Bd': 'BD',
    'tds': 'TDS', 'Tds': 'TDS',
    'prn': 'PRN', 'Prn': 'PRN',
    'sos': 'SOS', 'Sos': 'SOS',
    'hs': 'HS', 'Hs': 'HS',
    'Rx': 'Rx', 'rx': 'Rx', 'RX': 'Rx',
}


def remove_noise_chars(text: str) -> str:
    """Remove non-printable/control characters and fix OCR char substitutions."""
    result = []
    for ch in text:
        if ch in OCR_CHAR_FIXES:
            result.append(OCR_CHAR_FIXES[ch])
        elif unicodedata.category(ch).startswith('C') and ch not in ('\n', '\t', '\r'):
            # Skip control characters
            continue
        else:
            result.append(ch)
    return ''.join(result)


def normalize_whitespace(text: str) -> str:
    """Collapse multiple spaces/tabs, preserve newlines."""
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def fix_ocr_words(text: str) -> str:
    """Fix common OCR word-level corruptions."""
    words = text.split()
    fixed = []
    for word in words:
        stripped = word.strip('.,;:()[]{}')
        if stripped in OCR_WORD_FIXES:
            word = word.replace(stripped, OCR_WORD_FIXES[stripped])
        fixed.append(word)
    return ' '.join(fixed)


def fix_dosage_patterns(text: str) -> str:
    """Fix common dosage OCR errors like '500rnq' -> '500mg'."""
    # Fix dosage unit corruptions
    text = re.sub(r'(\d+)\s*rnq\b', r'\1mg', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s*mq\b', r'\1mg', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s*rng\b', r'\1mg', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s*rnl\b', r'\1ml', text, flags=re.IGNORECASE)
    # Ensure space between number and unit
    text = re.sub(r'(\d+)(mg|ml|mcg|IU)\b', r'\1 \2', text, flags=re.IGNORECASE)
    return text


def remove_gibberish_lines(text: str, min_alpha_ratio: float = 0.3) -> str:
    """Remove lines that are mostly non-alphabetic (likely OCR noise)."""
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if not line:
            cleaned.append('')
            continue
        alpha_count = sum(1 for c in line if c.isalpha())
        total = len(line.replace(' ', ''))
        if total == 0:
            continue
        ratio = alpha_count / total
        if ratio >= min_alpha_ratio or len(line) < 5:
            cleaned.append(line)
    return '\n'.join(cleaned)


def extract_readable_segments(text: str, min_word_len: int = 2) -> List[str]:
    """Extract segments that look like readable text (have real words)."""
    lines = text.split('\n')
    readable = []
    for line in lines:
        words = line.split()
        real_words = [w for w in words if len(w) >= min_word_len and any(c.isalpha() for c in w)]
        if len(real_words) >= 1:
            readable.append(' '.join(real_words))
    return readable


def clean_prescription_text(raw_text: str) -> str:
    """
    Full cleaning pipeline for raw OCR output.

    Returns cleaned text ready for drug/dosage extraction.
    """
    if not raw_text or not raw_text.strip():
        return ""

    text = remove_noise_chars(raw_text)
    text = normalize_whitespace(text)
    text = fix_ocr_words(text)
    text = fix_dosage_patterns(text)
    text = remove_gibberish_lines(text)
    text = normalize_whitespace(text)

    return text


def compute_text_quality_score(text: str) -> float:
    """
    Estimate quality of OCR text on 0-100 scale.
    Returns a score indicating how readable the text is.
    """
    if not text or not text.strip():
        return 0.0

    total_chars = len(text.replace(' ', '').replace('\n', ''))
    if total_chars == 0:
        return 0.0

    alpha_chars = sum(1 for c in text if c.isalpha())
    digit_chars = sum(1 for c in text if c.isdigit())
    space_chars = sum(1 for c in text if c == ' ')

    # Good text has high alpha ratio
    alpha_ratio = alpha_chars / total_chars
    # Some digits expected (dosages)
    digit_ratio = digit_chars / total_chars

    # Word length distribution
    words = text.split()
    if not words:
        return 0.0

    avg_word_len = sum(len(w) for w in words) / len(words)
    # Typical prescription words are 3-12 chars
    word_len_score = 1.0 if 3 <= avg_word_len <= 12 else max(0, 1 - abs(avg_word_len - 7) / 10)

    # Look for medical-ish patterns
    has_dosage = bool(re.search(r'\d+\s*(?:mg|ml|mcg|g|IU)\b', text, re.IGNORECASE))
    has_frequency = bool(re.search(r'\b(?:OD|BD|TDS|TID|QID|PRN|daily|twice|once)\b', text, re.IGNORECASE))
    has_drug_form = bool(re.search(r'\b(?:Tab|Cap|Syrup|Inj|Cream)\b', text, re.IGNORECASE))

    medical_bonus = (0.1 if has_dosage else 0) + (0.1 if has_frequency else 0) + (0.05 if has_drug_form else 0)

    score = (alpha_ratio * 50) + (word_len_score * 25) + (digit_ratio * 10) + (medical_bonus * 100)
    return min(100.0, max(0.0, score))
