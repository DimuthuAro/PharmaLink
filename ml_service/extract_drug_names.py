"""Extract all drug names from MID.xlsx into a compact JSON for search."""
import pandas as pd
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
ARTIFACTS = BASE / "artifacts"

df = pd.read_excel(ARTIFACTS / "MID.xlsx")
df = df.dropna(subset=["Name", "Contains"])
df = df.drop_duplicates(subset=["Name"])

def extract_generic(contains):
    m = re.match(r"^(.+?)\s*\(", str(contains))
    return m.group(1).strip() if m else str(contains).strip()

df["GenericName"] = df["Contains"].apply(extract_generic)

drugs = []
for _, row in df.iterrows():
    entry = {
        "name": str(row["Name"]).strip(),
        "generic": str(row["GenericName"]).strip(),
    }
    tc = row.get("Therapeutic_Class")
    if pd.notna(tc):
        entry["class"] = str(tc).strip()
    drugs.append(entry)

unique_generics = df["GenericName"].nunique()
print(f"Total brand drugs: {len(drugs)}")
print(f"Unique generic names: {unique_generics}")

out = ARTIFACTS / "drug_names_database.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(drugs, f, ensure_ascii=False)

print(f"Saved: {out}")
print(f"File size: {out.stat().st_size / 1024 / 1024:.1f} MB")

for d in drugs[:5]:
    print(d)
