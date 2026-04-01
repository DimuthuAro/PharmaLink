import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd


@dataclass
class ParsedNarrative:
    text: str
    drug: Optional[str]
    drug_class: Optional[str]
    food: Optional[str]
    food_category: Optional[str]
    symptom: Optional[str]
    temporal_markers: List[str]
    events: List[str]
    temporal_order: Optional[str]


class NarrativeParser:
    def __init__(self, data_dir: str = "data") -> None:
        data_path = Path(data_dir)

        self.drug_aliases = pd.read_csv(data_path / "drug_aliases.csv")
        self.food_aliases = pd.read_csv(data_path / "food_aliases.csv")
        self.symptom_aliases = pd.read_csv(data_path / "symptom_aliases.csv")
        self.temporal_markers = pd.read_csv(data_path / "temporal_markers.csv")

        self.drug_lookup = self._build_lookup(
            self.drug_aliases, key_col="alias", value_cols=["canonical_drug", "drug_class"]
        )
        self.food_lookup = self._build_lookup(
            self.food_aliases, key_col="alias", value_cols=["canonical_food", "category"]
        )
        self.symptom_lookup = self._build_lookup(
            self.symptom_aliases, key_col="alias", value_cols=["canonical_symptom"]
        )
        self.temporal_lookup = self._build_lookup(
            self.temporal_markers, key_col="phrase", value_cols=["meaning"]
        )

        self.drug_verbs = ["took", "take", "taking", "swallowed", "used", "had"]
        self.food_verbs = ["ate", "eat", "consumed", "drink", "drank", "had"]
        self.symptom_verbs = [
           "felt", "feel", "feeling",
           "became", "become",
           "started feeling", "experienced", "got"
        ]

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"\s+", " ", text)
        return text

    @staticmethod
    def _build_lookup(df: pd.DataFrame, key_col: str, value_cols: List[str]) -> Dict[str, Dict[str, str]]:
        lookup: Dict[str, Dict[str, str]] = {}
        for _, row in df.iterrows():
            key = str(row[key_col]).strip().lower()
            lookup[key] = {col: str(row[col]).strip() for col in value_cols}
        return lookup

    def _find_longest_match(self, text: str, lookup: Dict[str, Dict[str, str]]) -> Optional[Dict[str, str]]:
        matches = []
        for alias, payload in lookup.items():
            pattern = r"\b" + re.escape(alias) + r"\b"
            if re.search(pattern, text):
                matches.append((alias, payload))
        if not matches:
            return None
        matches.sort(key=lambda x: len(x[0]), reverse=True)
        return matches[0][1]

    def extract_drug(self, text: str) -> tuple[Optional[str], Optional[str]]:
        norm = self._normalize(text)
        match = self._find_longest_match(norm, self.drug_lookup)
        if not match:
            return None, None
        return match["canonical_drug"], match["drug_class"]

    def extract_food(self, text: str) -> tuple[Optional[str], Optional[str]]:
        norm = self._normalize(text)
        match = self._find_longest_match(norm, self.food_lookup)
    
        if not match:
            return None, None
    
        canonical_food = match["canonical_food"]
        category = match["category"]
    
        # filter out meal words (not actual interaction foods)
        if canonical_food in ["food"] and any(m in norm for m in ["breakfast", "lunch", "dinner"]):
            return None, None
    
        return canonical_food, category

    def extract_symptom(self, text: str) -> Optional[str]:
        norm = self._normalize(text)
        match = self._find_longest_match(norm, self.symptom_lookup)
        if not match:
            return None
        return match["canonical_symptom"]

    def extract_temporal_markers(self, text: str) -> List[str]:
        norm = self._normalize(text)
        found: List[str] = []
        for phrase, payload in self.temporal_lookup.items():
            pattern = r"\b" + re.escape(phrase) + r"\b"
            if re.search(pattern, norm):
                found.append(payload["meaning"])
        return sorted(set(found))

    def extract_events(self, text: str, drug: Optional[str], food: Optional[str], symptom: Optional[str]) -> List[str]:
        norm = self._normalize(text)
        events: List[str] = []

        if drug and any(v in norm for v in self.drug_verbs):
            events.append("took_drug")

        # detect drink first
        if "drink" in norm or "drank" in norm or "juice" in norm:
            events.append("drank_food")
        
        # detect eating
        elif any(v in norm for v in ["ate", "eat", "consumed", "had"]):
            events.append("ate_food")

        if symptom and any(v in norm for v in self.symptom_verbs):
            events.append("felt_symptom")

        if any(marker in norm for marker in [
            "without food", "without eating", "on an empty stomach",
            "skipped breakfast", "skipped lunch", "skipped dinner", "skipped meals",
            "didn’t eat", "did not eat"
        ]):
            events.insert(0, "skipped_meal")

        # Deduplicate while preserving order
        deduped: List[str] = []
        for event in events:
            if event not in deduped:
                deduped.append(event)
        return deduped

    def infer_temporal_order(self, markers: List[str], events: List[str]) -> Optional[str]:
        if "empty_stomach" in markers and "felt_symptom" in events:
            return "meal_before_drug_then_symptom"
        if "empty_stomach" in markers:
            return "meal_before_drug"
        if "simultaneous" in markers and "felt_symptom" in events:
            return "drug_with_food_then_symptom"
        if "simultaneous" in markers:
            return "drug_with_food"
        if ("after" in markers or "immediate_after" in markers or "delayed_next" in markers) and "felt_symptom" in events:
            return "drug_before_food_then_symptom"
        if any(m in markers for m in ["after", "immediate_after", "delayed_next", "sequence_next"]):
            return "drug_before_food"
        if "felt_symptom" in events and "took_drug" in events:
            return "drug_then_symptom"
        if "sequence_next" in markers and "took_drug" in events and ("ate_food" in events or "drank_food" in events):
            return "drug_before_food"
        if events == ["ate_food"]:
            return "food_only"
        if events == ["drank_food"]:
            return "food_only"
        if events == ["skipped_meal"]:
            return "meal_only"
        return None

    def parse(self, text: str) -> ParsedNarrative:
        drug, drug_class = self.extract_drug(text)
        food, food_category = self.extract_food(text)
        symptom = self.extract_symptom(text)
        markers = self.extract_temporal_markers(text)
        events = self.extract_events(text, drug, food, symptom)
        temporal_order = self.infer_temporal_order(markers, events)

        return ParsedNarrative(
            text=text,
            drug=drug,
            drug_class=drug_class,
            food=food,
            food_category=food_category,
            symptom=symptom,
            temporal_markers=markers,
            events=events,
            temporal_order=temporal_order,
        )


if __name__ == "__main__":
    parser = NarrativeParser(data_dir="data")

    samples = [
        "I took amoxicillin and then drank milk",
        "Skipped breakfast and took my diabetes tablet, then felt dizzy",
        "I had grapefruit juice while taking statins",
        "Oops I ate immediately after taking levothyroxine",
    ]

    for sample in samples:
        result = parser.parse(sample)
        print("=" * 60)
        print(result)