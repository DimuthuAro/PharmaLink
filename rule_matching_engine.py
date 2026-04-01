from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

from parser_skeleton import NarrativeParser, ParsedNarrative


class RuleMatchingEngine:
    def __init__(self, data_dir: str = "data") -> None:
        data_path = Path(data_dir)
        self.rules_df = pd.read_csv(data_path / "narrative_rules.csv").fillna("")
        self.parser = NarrativeParser(data_dir=data_dir)

    @staticmethod
    def _norm(value: Any) -> str:
        return str(value).strip().lower()

    @staticmethod
    def _safe_int(value: Any, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _build_event_pattern(self, parsed: ParsedNarrative) -> str:
        mapping = {
            "took_drug": "took",
            "ate_food": "ate",
            "drank_food": "drank",
            "felt_symptom": "felt",
            "skipped_meal": "skipped",
            "missed_dose": "missed_dose",
            "double_dose": "double_dose",
            "habit": "habit",
        }
        return "->".join(mapping[e] for e in parsed.events if e in mapping)

    def _score_rule(self, row: pd.Series, parsed: ParsedNarrative) -> int:
        score = 0

        rule_drug = self._norm(row["drug_keyword"])
        rule_food = self._norm(row["food_keyword"])
        rule_symptom = self._norm(row["symptom_keyword"])
        rule_pattern = self._norm(row["event_pattern"])

        parsed_drug = self._norm(parsed.drug)
        parsed_class = self._norm(parsed.drug_class)
        parsed_food = self._norm(parsed.food)
        parsed_food_cat = self._norm(parsed.food_category)
        parsed_symptom = self._norm(parsed.symptom)
        parsed_pattern = self._build_event_pattern(parsed)

        # Drug match
        if not rule_drug:
            score += 1
        elif rule_drug == parsed_drug:
            score += 5
        elif rule_drug == parsed_class:
            score += 4

        # Food match
        if not rule_food:
            score += 1
        elif rule_food == parsed_food:
            score += 5
        elif rule_food == parsed_food_cat:
            score += 4

        # Symptom match
        if not rule_symptom:
            score += 1
        elif rule_symptom == parsed_symptom:
            score += 5

        # Event pattern match
        if not rule_pattern:
            score += 1
        elif rule_pattern == parsed_pattern:
            score += 6
        elif rule_pattern in parsed_pattern or parsed_pattern in rule_pattern:
            score += 3

        # Temporal bonus
        if parsed.temporal_order:
            if parsed.temporal_order == "drug_before_food" and "took" in parsed_pattern:
                score += 1
            if parsed.temporal_order == "drug_before_food_then_symptom" and "felt" in parsed_pattern:
                score += 1
            if parsed.temporal_order == "meal_before_drug_then_symptom" and "skipped" in parsed_pattern:
                score += 2
            if parsed.temporal_order == "drug_with_food" and "with" in self._norm(row["timing_window"]):
                score += 1

        return score

    def _select_best_rule(self, parsed: ParsedNarrative) -> Optional[pd.Series]:
        if not parsed.drug and not parsed.food and not parsed.symptom and not parsed.events:
            return None

        scored_rows = []
        for _, row in self.rules_df.iterrows():
            score = self._score_rule(row, parsed)
            scored_rows.append((score, row))

        scored_rows.sort(
            key=lambda x: (
                x[0],
                self._safe_float(x[1].get("confidence_base", 0)),
                self._safe_int(x[1].get("severity", 0)),
            ),
            reverse=True,
        )

        best_score, best_row = scored_rows[0]
        if best_score < 6:
            return None
        return best_row

    def _render_template(self, template: str, parsed: ParsedNarrative) -> str:
        if not template:
            return ""

        replacements = {
            "{drug}": parsed.drug or parsed.drug_class or "the medicine",
            "{food}": parsed.food or parsed.food_category or "the food",
            "{symptom}": parsed.symptom or "the symptom",
        }

        text = template
        for key, value in replacements.items():
            text = text.replace(key, value)
        return text

    def analyze_text(self, text: str) -> Dict[str, Any]:
        parsed = self.parser.parse(text)
        best_rule = self._select_best_rule(parsed)

        if best_rule is None:
            return {
                "input_text": text,
                "parsed": asdict(parsed),
                "matched": False,
                "message": "No strong matching rule was found.",
            }

        explanation = self._render_template(best_rule.get("explanation_template", ""), parsed)
        advice = self._render_template(best_rule.get("advice_template", ""), parsed)

        result = {
            "input_text": text,
            "parsed": asdict(parsed),
            "matched": True,
            "rule_id": best_rule.get("rule_id", ""),
            "rule_category": best_rule.get("rule_category", ""),
            "risk_type": best_rule.get("risk_type", ""),
            "severity": self._safe_int(best_rule.get("severity", 0)),
            "timing_window": best_rule.get("timing_window", ""),
            "confidence": self._safe_float(best_rule.get("confidence_base", 0.0)),
            "explanation": explanation,
            "advice": advice,
        }
        return result


if __name__ == "__main__":
    engine = RuleMatchingEngine(data_dir="data")

    samples = [
        "I took amoxicillin and then drank milk",
        "Skipped breakfast and took my diabetes tablet, then felt dizzy",
        "I had grapefruit juice while taking statins",
        "Oops I ate immediately after taking levothyroxine",
        "I drank alcohol after taking a sedative and felt very sleepy",
    ]

    for sample in samples:
        print("=" * 80)
        result = engine.analyze_text(sample)
        for key, value in result.items():
            print(f"{key}: {value}")