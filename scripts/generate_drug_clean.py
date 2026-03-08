"""Generate drug_clean.csv from MID.xlsx (same logic as model_building.ipynb)"""
import pandas as pd
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
ARTIFACTS = BASE / "artifacts"
DATA = BASE / "data"

print("Reading MID.xlsx...")
drug = pd.read_excel(str(ARTIFACTS / "MID.xlsx"))
df = drug.copy()

def clean_text(x):
    if pd.isna(x):
        return ""
    x = str(x)
    x = re.sub(r"\s+", " ", x)
    x = re.sub(r"<.*?>", "", x)
    return x.strip()

for col in df.columns:
    if df[col].dtype == "object":
        df[col] = df[col].apply(clean_text)

useful_cols = [
    "Name", "Contains", "ProductIntroduction", "ProductUses",
    "ProductBenefits", "SideEffect", "HowToUse", "HowWorks",
    "QuickTips", "SafetyAdvice", "Chemical_Class", "Habit_Forming",
    "Therapeutic_Class", "Action_Class",
]
drug_clean = df[useful_cols].copy()

text_cols = [
    "ProductIntroduction", "ProductUses", "ProductBenefits",
    "SideEffect", "HowToUse", "HowWorks", "QuickTips", "SafetyAdvice",
]
drug_clean["combined_text"] = drug_clean[text_cols].fillna("").agg(" ".join, axis=1)
drug_clean["combined_text"] = drug_clean["combined_text"].apply(clean_text)

out = DATA / "drug_clean.csv"
drug_clean.to_csv(str(out), index=False)
print(f"Done: {len(drug_clean)} rows -> {out}")
