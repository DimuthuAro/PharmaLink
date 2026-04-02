import pandas as pd
import joblib
import torch
import re

from pathlib import Path
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification

BASE_DIR = Path(__file__).resolve().parent.parent  # PharmaLink/

MODEL_DIR = Path(BASE_DIR / "PharmaLink_model")
LABEL_ENCODER_PATH = Path(BASE_DIR / "model" / "distilbert_label_encoder.joblib")
RULES_PATH = Path(BASE_DIR / "data" / "narrative_rules_knowledge_base.csv")

# ----------------------------
# Load model
# ----------------------------
tokenizer = DistilBertTokenizerFast.from_pretrained(str(MODEL_DIR))
model = DistilBertForSequenceClassification.from_pretrained(str(MODEL_DIR))
label_encoder = joblib.load(LABEL_ENCODER_PATH)
rules_df = pd.read_csv(RULES_PATH)

model.eval()

def normalize(text: str) -> str:
    text = str(text).lower().strip()
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def token_list(value):
    if pd.isna(value):
        return []
    return [t.strip().lower() for t in str(value).split() if t.strip()]

def contains_phrase(story, phrase):
    phrase = normalize(phrase)
    if not phrase or phrase == "none":
        return False
    return phrase in story

def score_rule(story, row):
    score = 0
    story = normalize(story)

    drug_kw = str(row.get("drug_keyword", "") or "").strip().lower()
    food_kw = str(row.get("food_keyword", "") or "").strip().lower()
    extra_kws = token_list(row.get("extra_keywords", ""))

    if drug_kw and drug_kw != "none" and contains_phrase(story, drug_kw):
        score += 5
    if food_kw and food_kw != "none" and contains_phrase(story, food_kw):
        score += 5

    for kw in extra_kws:
        if kw in story:
            score += 2

    if drug_kw and food_kw and contains_phrase(story, drug_kw) and contains_phrase(story, food_kw):
        score += 6

    return score

def get_best_rule(story, predicted_category):
    matched_rules = rules_df[rules_df["interaction_category"] == predicted_category].copy()

    if matched_rules.empty:
        return None

    matched_rules["rule_score"] = matched_rules.apply(lambda row: score_rule(story, row), axis=1)
    matched_rules = matched_rules.sort_values(
        by=["rule_score", "confidence_base"],
        ascending=[False, False]
    )

    return matched_rules.iloc[0]

def predict_story(story: str):
    encoded = tokenizer(
        story,
        truncation=True,
        padding="max_length",
        max_length=128,
        return_tensors="pt"
    )

    with torch.no_grad():
        outputs = model(**encoded)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1)[0]

    pred_idx = int(torch.argmax(probs).item())
    predicted_category = label_encoder.inverse_transform([pred_idx])[0]
    confidence = float(probs[pred_idx].item())

    result = {
        "story": story,
        "interaction_category": predicted_category,
        "confidence": confidence,
        "rule_found": False
    }

    best_rule = get_best_rule(story, predicted_category)

    if best_rule is not None:
        result["rule_found"] = True
        result["severity"] = int(best_rule["severity"])
        result["explanation"] = best_rule["explanation"]
        result["advice"] = best_rule["advice"]
        result["timing_window"] = best_rule["timing_window"]
        result["matched_rule_score"] = float(best_rule["rule_score"])
        result["matched_drug_keyword"] = str(best_rule.get("drug_keyword", ""))
        result["matched_food_keyword"] = str(best_rule.get("food_keyword", ""))

    return result

if __name__ == "__main__":
    test_stories = [
        "I took my antibiotic and then drank milk",
        "I took levothyroxine and ate food immediately after",
        "I drank alcohol after taking my sleeping pill",
        "I ate grapefruit while taking a statin",
        "I skipped breakfast and took my diabetes medicine",
        "I forgot to take my medicine yesterday"
    ]

    for story in test_stories:
        print(predict_story(story))
        print("-" * 100)