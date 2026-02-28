"""Build optimized drug search index from MID dataset."""
import json
from pathlib import Path

ARTIFACTS = Path(__file__).resolve().parent.parent / "artifacts"

with open(ARTIFACTS / "drug_names_database.json", "r", encoding="utf-8") as f:
    drugs = json.load(f)

brand_to_generic = {}
generic_set = set()

for d in drugs:
    name = d["name"]
    generic = d["generic"]
    cls = d.get("class", "")
    brand_to_generic[name] = {"generic": generic, "class": cls}
    generic_set.add(generic)

print(f"Unique brand names: {len(brand_to_generic)}")
print(f"Unique generics: {len(generic_set)}")

search_index = []
seen = set()

# Add generics first (higher priority)
for g in sorted(generic_set):
    key = g.lower()
    if key not in seen:
        seen.add(key)
        search_index.append({"name": g, "type": "generic"})

# Add brands
for name, info in brand_to_generic.items():
    key = name.lower()
    if key not in seen:
        seen.add(key)
        entry = {"name": name, "generic": info["generic"], "type": "brand"}
        if info["class"]:
            entry["class"] = info["class"]
        search_index.append(entry)

print(f"Total search index entries: {len(search_index)}")

out = ARTIFACTS / "drug_search_index.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(search_index, f, ensure_ascii=False)

print(f"Saved: {out}")
print(f"Size: {out.stat().st_size / 1024 / 1024:.1f} MB")
