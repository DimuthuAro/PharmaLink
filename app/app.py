# PharmaLink/app/app.py
from __future__ import annotations

import io
import re
import json
import secrets
from difflib import get_close_matches
from pathlib import Path
from typing import List, Optional, Set, Dict, Any, Tuple

import joblib
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms, models

from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# =========================================================
# PATHS
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent  # if app.py is inside PharmaLink/
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "model"

print("BASE_DIR:", BASE_DIR)
print("DATA_DIR:", DATA_DIR, "exists:", DATA_DIR.exists())
print("MODEL_DIR:", MODEL_DIR, "exists:", MODEL_DIR.exists())


# =========================================================
# SETTINGS
# =========================================================
USE_PURE_ML = True

# Cluster model (optional)
CLUSTER_MODEL_NAME = "food_cluster_model.pkl"
SEVERITY_MODEL_NAME = "severity_model.pkl"
REASON_MODEL_NAME = "reason_model.pkl"

# Food type model
FOODTYPE_MODEL_NAME = "food_type_model.pkl"
FOODTYPE_CONF_THRESHOLD = 0.55  # if low confidence -> keep existing

# Preference models
VEG_MODEL_NAME = "vegetarian_model.pkl"
DIAB_MODEL_NAME = "diabetic_model.pkl"
LOWNA_MODEL_NAME = "low_sodium_model.pkl"
PREF_PROBA_THRESHOLD = 0.50

# Drug pill image model
DRUG_VISION_WEIGHTS = MODEL_DIR / "drug_classifier_best.pth"
DRUG_VISION_CLASSES = MODEL_DIR / "class_names.json"
DRUG_VISION_INFO_CSV = DATA_DIR / "drug_vision_infoo.csv"


# =========================================================
# LOAD CSVs
# =========================================================
def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    df = pd.read_csv(path)
    if df.empty:
        raise ValueError(f"CSV loaded but is empty: {path}")
    return df


def _read_csv_optional(path: Path) -> Optional[pd.DataFrame]:
    if not path.exists():
        return None
    df = pd.read_csv(path)
    if df.empty:
        return None
    return df


drug_clean = _read_csv(DATA_DIR / "drug_clean.csv")
food_subset = _read_csv(DATA_DIR / "food_subset.csv")
meal_foods_raw = _read_csv(DATA_DIR / "new_foodset.csv")


# =========================================================
# NORMALIZE FOOD COLUMNS
# =========================================================
meal_foods = meal_foods_raw.rename(
    columns={
        "Food_Item": "Food",
        "Food Product": "Food",
        "Food": "Food",
        "Calories": "energy",
        "Calories (kcal)": "energy",
        "Energy": "energy",
        "Protein (g)": "protein",
        "Protein(g)": "protein",
        "Protein": "protein",
        "Carbohydrate (g)": "carbs",
        "Carbohydrate(g)": "carbs",
        "Carbs": "carbs",
        "Carbohydrates": "carbs",
        "Fat (g)": "fat",
        "Fat(g)": "fat",
        "Fat": "fat",
        "Fiber (g)": "fiber",
        "Fiber(g)": "fiber",
        "Fibre (g)": "fiber",
        "Fiber": "fiber",
        "Sugars (g)": "sugars",
        "Sugar (g)": "sugars",
        "Sugars": "sugars",
        "Sodium (mg)": "sodium",
        "Sodium": "sodium",
        "Meal_Type": "meal_type",
        "Meal type": "meal_type",
        "Food_type": "food_type",
        "Food Type": "food_type",
        "food_type": "food_type",
    }
)

core_cols = [
    "Food",
    "energy", "protein", "fat", "carbs", "fiber",
    "sugars", "sodium",
    "calcium", "iron", "vitamin_c", "vitamin_a", "vitamin_k_proxy",
    "is_alcohol", "is_leafy_green",
    "meal_type", "food_type",
]

for c in core_cols:
    if c not in food_subset.columns:
        food_subset[c] = 0
    if c not in meal_foods.columns:
        meal_foods[c] = 0

food_subset[core_cols] = food_subset[core_cols].fillna(0)
meal_foods[core_cols] = meal_foods[core_cols].fillna(0)

unified_foods = pd.concat([food_subset, meal_foods], ignore_index=True)
unified_foods["Food"] = unified_foods["Food"].astype(str).str.strip()
unified_foods = unified_foods[unified_foods["Food"] != ""]
unified_foods = unified_foods.drop_duplicates(subset=["Food"], keep="first").reset_index(drop=True)

num_cols = [
    "energy", "protein", "fat", "carbs", "fiber",
    "sugars", "sodium",
    "calcium", "iron", "vitamin_c", "vitamin_a", "vitamin_k_proxy",
]
for c in num_cols:
    unified_foods[c] = pd.to_numeric(unified_foods[c], errors="coerce").fillna(0.0)

for c in ["is_alcohol", "is_leafy_green"]:
    unified_foods[c] = pd.to_numeric(unified_foods[c], errors="coerce").fillna(0).astype(int)

unified_foods["meal_type"] = unified_foods["meal_type"].astype(str).str.strip().str.lower()
unified_foods["food_type"] = unified_foods["food_type"].astype(str).str.strip().str.lower()
unified_foods.loc[unified_foods["food_type"].isin(["0", "nan", "none", ""]), "food_type"] = "unknown"


# =========================================================
# DRUG CATEGORY NUMERIC
# =========================================================
cat_cols = ["Chemical_Class", "Habit_Forming", "Therapeutic_Class", "Action_Class"]
for c in cat_cols:
    if c not in drug_clean.columns:
        drug_clean[c] = 0
    drug_clean[c] = pd.to_numeric(drug_clean[c], errors="coerce").fillna(0).astype(int)


# =========================================================
# ALLERGEN LOOKUP (optional dataset)
# =========================================================
def normalize_food_name(name: str) -> str:
    return str(name).strip().lower()


allergen_lookup: Dict[str, Set[str]] = {}
allergen_df_path = DATA_DIR / "food_ingredients_and_allergens.csv"
if allergen_df_path.exists():
    allergen_df = pd.read_csv(allergen_df_path)
    if "Food Product" in allergen_df.columns and "Allergens" in allergen_df.columns:
        allergen_df["Food Product"] = allergen_df["Food Product"].astype(str).str.strip().str.lower()
        allergen_df["Allergens"] = allergen_df["Allergens"].astype(str).fillna("").str.strip().str.lower()
        for _, r in allergen_df.iterrows():
            name = r["Food Product"]
            allergens = [a.strip() for a in str(r["Allergens"]).split(",") if a.strip()]
            if name:
                allergen_lookup[name] = set(allergens)


# =========================================================
# LOAD MODELS
# =========================================================
# Cluster model
cluster_model = None
cluster_path = MODEL_DIR / CLUSTER_MODEL_NAME
if cluster_path.exists():
    try:
        cluster_model = joblib.load(cluster_path)
        print("Loaded food_cluster_model.pkl")
    except Exception as e:
        print("WARNING: failed to load food_cluster_model.pkl:", repr(e))
        cluster_model = None
else:
    print("WARNING: food_cluster_model.pkl not found (cluster variety disabled).")

# Add cluster_id to foods (safe even if model missing)
unified_foods["cluster_id"] = -1
if cluster_model is not None:
    try:
        unified_foods["cluster_id"] = cluster_model.predict(unified_foods["Food"].astype(str).tolist())
    except Exception as e:
        print("WARNING: failed to assign cluster_id:", repr(e))
        unified_foods["cluster_id"] = -1

# Severity/reason models (required)
severity_model_path = MODEL_DIR / SEVERITY_MODEL_NAME
reason_model_path = MODEL_DIR / REASON_MODEL_NAME

if not severity_model_path.exists():
    raise FileNotFoundError(f"Missing severity model: {severity_model_path}")
if not reason_model_path.exists():
    raise FileNotFoundError(f"Missing reason model: {reason_model_path}")

severity_model = joblib.load(severity_model_path)
reason_model = joblib.load(reason_model_path)

# Food type classifier (optional but recommended)
food_type_model = None
foodtype_model_path = MODEL_DIR / FOODTYPE_MODEL_NAME
if foodtype_model_path.exists():
    food_type_model = joblib.load(foodtype_model_path)
    print("Loaded food_type_model.pkl")
else:
    print("WARNING: food_type_model.pkl not found (food_type autofix disabled).")

# Preference models (optional but recommended)
vegetarian_model = None
diabetic_model = None
low_sodium_model = None

veg_path = MODEL_DIR / VEG_MODEL_NAME
dia_path = MODEL_DIR / DIAB_MODEL_NAME
low_path = MODEL_DIR / LOWNA_MODEL_NAME

if veg_path.exists():
    vegetarian_model = joblib.load(veg_path)
    print("Loaded vegetarian_model.pkl")
else:
    print("WARNING: vegetarian_model.pkl not found (will fallback to rule).")

if dia_path.exists():
    diabetic_model = joblib.load(dia_path)
    print("Loaded diabetic_model.pkl")
else:
    print("WARNING: diabetic_model.pkl not found (will fallback to rule).")

if low_path.exists():
    low_sodium_model = joblib.load(low_path)
    print("Loaded low_sodium_model.pkl")
else:
    print("WARNING: low_sodium_model.pkl not found (will fallback to rule).")

# optional allergen ML fallback
allergen_model = None
allergen_mlb = None
allergen_model_path = MODEL_DIR / "allergen_model.pkl"
allergen_mlb_path = MODEL_DIR / "allergen_mlb.pkl"
if allergen_model_path.exists() and allergen_mlb_path.exists():
    allergen_model = joblib.load(allergen_model_path)
    allergen_mlb = joblib.load(allergen_mlb_path)

# Drug image enrichment CSV (optional but recommended)
drug_vision_info = _read_csv_optional(DRUG_VISION_INFO_CSV)
if drug_vision_info is not None:
    print("drug_vision_info columns:", list(drug_vision_info.columns))
    print("drug_vision_info sample:", drug_vision_info.head(2).to_dict("records"))
    drug_vision_info.columns = [c.strip().lower() for c in drug_vision_info.columns]

    if "brand_name" not in drug_vision_info.columns:
        print("WARNING: drug_vision_info.csv must contain column: brand_name")
        drug_vision_info = None
    else:
        drug_vision_info["brand_name"] = drug_vision_info["brand_name"].astype(str).str.strip().str.lower()
        print("Loaded drug_vision_info.csv")
else:
    print("drug_vision_info.csv not found (image enrichment disabled)")

# Drug pill image model
drug_vision_model = None
drug_vision_classes: List[str] = []
drug_vision_device = "cuda" if torch.cuda.is_available() else "cpu"

drug_vision_tfms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

if DRUG_VISION_CLASSES.exists() and DRUG_VISION_WEIGHTS.exists():
    drug_vision_classes = json.loads(DRUG_VISION_CLASSES.read_text(encoding="utf-8"))
    num_classes = len(drug_vision_classes)

    m = models.efficientnet_b0(weights=None)
    in_features = m.classifier[1].in_features
    m.classifier[1] = nn.Linear(in_features, num_classes)

    state = torch.load(DRUG_VISION_WEIGHTS, map_location=drug_vision_device)
    m.load_state_dict(state)
    m.eval()
    m.to(drug_vision_device)

    drug_vision_model = m
    print("Loaded drug vision model:", num_classes, "classes on", drug_vision_device)
else:
    print("Drug vision model not loaded. Missing weights or class_names.json")


# =========================================================
# FEATURE LIST (severity/reason)
# =========================================================
features_json_path = MODEL_DIR / "severity_features.json"
DEFAULT_FEATURE_COLS = [
    "Chemical_Class", "Habit_Forming", "Therapeutic_Class", "Action_Class",
    "energy", "protein", "fat", "carbs", "fiber",
    "calcium", "iron", "vitamin_c", "vitamin_a", "vitamin_k_proxy",
    "is_alcohol", "is_leafy_green",
]
if features_json_path.exists():
    feature_cols = json.loads(features_json_path.read_text(encoding="utf-8"))
else:
    feature_cols = DEFAULT_FEATURE_COLS

ALL_REASON_TAGS = [
    "cns_alcohol",
    "calcium_antibiotic",
    "high_fat_empty_stomach",
    "iron_levothyroxine",
    "vitk_warfarin",
]

risk_map = {
    0: "Safe – No major interaction identified.",
    1: "Moderate – Use with caution and follow food/alcohol advice.",
    2: "High Risk – Avoid this combination; consult a doctor or pharmacist.",
}


# =========================================================
# DRUG NAME -> INDEX RESOLUTION (for /meal-plan + /ml-food-drug-risk)
# =========================================================
def _norm_drug(s: str) -> str:
    s = str(s).strip().lower()
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


def _build_drug_name_index() -> Dict[str, int]:
    if "Name" not in drug_clean.columns:
        raise RuntimeError("drug_clean.csv must contain 'Name' column")
    mp: Dict[str, int] = {}
    for i, name in enumerate(drug_clean["Name"].astype(str).fillna("").tolist()):
        k = _norm_drug(name)
        if k and k not in mp:
            mp[k] = int(i)
    return mp


_DRUG_NAME_INDEX = _build_drug_name_index()


def resolve_indices_from_names(drug_names: List[str]) -> List[int]:
    if not drug_names:
        return []
    keys = list(_DRUG_NAME_INDEX.keys())
    out: List[int] = []

    for name in drug_names:
        raw = str(name).strip()
        if not raw:
            continue
        k = _norm_drug(raw)

        # exact
        if k in _DRUG_NAME_INDEX:
            out.append(_DRUG_NAME_INDEX[k])
            continue

        # fuzzy
        close = get_close_matches(k, keys, n=1, cutoff=0.8)
        if close:
            out.append(_DRUG_NAME_INDEX[close[0]])
            continue

        raise HTTPException(status_code=404, detail=f"Drug name not found: '{raw}'")

    # de-dup keep order
    seen = set()
    dedup: List[int] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            dedup.append(int(x))
    return dedup


def indices_to_names(drug_indices: List[int]) -> List[str]:
    names: List[str] = []
    for idx in drug_indices:
        if idx < 0 or idx >= len(drug_clean):
            names.append(f"drug#{idx}")
        else:
            names.append(str(drug_clean.iloc[int(idx)]["Name"]))
    return names


# =========================================================
# HELPERS
# =========================================================
def safe_float(x, default=0.0) -> float:
    try:
        if x is None:
            return default
        return float(x)
    except Exception:
        return default


def severity_to_score(sev: int) -> float:
    if sev == 0:
        return 1.0
    if sev == 1:
        return -0.5
    return -3.0


def calorie_fit_score(total_kcal: float, target_kcal: float) -> float:
    if target_kcal <= 0:
        return 0.0
    err = abs(total_kcal - target_kcal) / target_kcal
    return max(0.0, 1.0 - err)


def variety_penalty(food_names: List[str], used_foods: Set[str]) -> float:
    if not used_foods:
        return 0.0
    hits = sum(1 for f in food_names if normalize_food_name(f) in used_foods)
    return -1.0 * hits


def cluster_variety_penalty(cluster_ids: List[int], used_clusters: Set[int]) -> float:
    if not used_clusters:
        return 0.0
    hits = sum(1 for c in cluster_ids if int(c) in used_clusters and int(c) != -1)
    return -1.2 * hits


# =========================================================
# FOOD TYPE ML AUTOFIX
# =========================================================
def predict_food_type_safe(food_name: str) -> Tuple[str, float]:
    if food_type_model is None:
        return "unknown", 0.0
    txt = normalize_food_name(food_name)
    try:
        probs = food_type_model.predict_proba([txt])[0]
        best_i = int(probs.argmax())
        label = str(food_type_model.classes_[best_i])
        conf = float(probs[best_i])
        return label, conf
    except Exception:
        return "unknown", 0.0


def apply_food_type_autofix(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "food_type" not in df.columns:
        df["food_type"] = "unknown"
    bad = df["food_type"].isin(["unknown", "", "0", "nan", "none"])
    if bad.any() and food_type_model is not None:
        def fix_one(name: str) -> str:
            label, conf = predict_food_type_safe(name)
            return label if conf >= FOODTYPE_CONF_THRESHOLD else "unknown"
        df.loc[bad, "food_type"] = df.loc[bad, "Food"].apply(fix_one)
    return df


unified_foods = apply_food_type_autofix(unified_foods)


# =========================================================
# ALLERGEN FUNCTIONS
# =========================================================
def resolve_allergens(food_name: str) -> List[str]:
    fname = normalize_food_name(food_name)

    if allergen_lookup and fname in allergen_lookup:
        return sorted(list(allergen_lookup[fname]))

    if allergen_model is not None and allergen_mlb is not None:
        pred = allergen_model.predict([fname])
        labels = allergen_mlb.inverse_transform(pred)
        return list(labels[0]) if labels else []

    return []


def violates_allergy(food_allergens: List[str], avoid_set: Set[str]) -> bool:
    fa = {a.strip().lower() for a in food_allergens}
    return len(fa.intersection(avoid_set)) > 0


# =========================================================
# FALLBACK RULE LABELS (only used if preference models missing)
# =========================================================
MEAT_KEYWORDS = [
    "chicken", "beef", "pork", "mutton", "lamb", "fish", "tuna", "salmon", "shrimp",
    "bacon", "sausage", "ham", "anchovy",
    "bison", "turkey", "duck", "crab", "prawn", "steak", "burger"
]
HIGH_SUGAR_KEYWORDS = ["cake", "cookie", "soda", "cola", "candy", "ice cream", "chocolate", "sweet", "syrup"]
HIGH_SODIUM_KEYWORDS = ["pickle", "canned", "processed", "instant", "soy sauce", "chips", "noodles", "salted"]


def rule_is_vegetarian(food_name: str) -> bool:
    s = normalize_food_name(food_name)
    return not any(k in s for k in MEAT_KEYWORDS)


def rule_is_diabetic_friendly(food_row: pd.Series) -> bool:
    name = normalize_food_name(food_row.get("Food", ""))
    carbs = float(food_row.get("carbs", 0.0))
    fiber = float(food_row.get("fiber", 0.0))
    sugars = float(food_row.get("sugars", 0.0))

    if any(k in name for k in HIGH_SUGAR_KEYWORDS):
        return False
    if sugars > 0:
        return sugars <= 15
    if carbs > 45 and fiber < 5:
        return False
    return True


def rule_is_low_sodium(food_row: pd.Series) -> bool:
    sodium = float(food_row.get("sodium", 0.0))
    if sodium > 0:
        return sodium <= 140
    name = normalize_food_name(food_row.get("Food", ""))
    return not any(k in name for k in HIGH_SODIUM_KEYWORDS)


# =========================================================
# PREFERENCE ML PREDICTION (FAST: batch)
# =========================================================
PREF_NUM = ["energy", "carbs", "fiber", "sugars", "sodium", "fat", "protein"]


def _pref_features_df(df: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame({
        "Food": df["Food"].astype(str),
        "energy": df.get("energy", 0).astype(float),
        "carbs": df.get("carbs", 0).astype(float),
        "fiber": df.get("fiber", 0).astype(float),
        "sugars": df.get("sugars", 0).astype(float),
        "sodium": df.get("sodium", 0).astype(float),
        "fat": df.get("fat", 0).astype(float),
        "protein": df.get("protein", 0).astype(float),
    })
    for c in PREF_NUM:
        X[c] = pd.to_numeric(X[c], errors="coerce").fillna(0.0)
    return X


def add_preference_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    out["pref_vegetarian"] = out["Food"].apply(rule_is_vegetarian)
    out["pref_diabetic"] = out.apply(rule_is_diabetic_friendly, axis=1)
    out["pref_low_sodium"] = out.apply(rule_is_low_sodium, axis=1)

    X = _pref_features_df(out)

    if vegetarian_model is not None:
        try:
            proba_v = vegetarian_model.predict_proba(X)[:, 1]
            out["pref_vegetarian"] = out["pref_vegetarian"] & (proba_v >= PREF_PROBA_THRESHOLD)
        except Exception:
            pass

    if diabetic_model is not None:
        try:
            proba_d = diabetic_model.predict_proba(X)[:, 1]
            out["pref_diabetic"] = out["pref_diabetic"] & (proba_d >= PREF_PROBA_THRESHOLD)
        except Exception:
            pass

    if low_sodium_model is not None:
        try:
            proba_l = low_sodium_model.predict_proba(X)[:, 1]
            out["pref_low_sodium"] = out["pref_low_sodium"] & (proba_l >= PREF_PROBA_THRESHOLD)
        except Exception:
            pass

    return out


# =========================================================
# MEAL-LIKE FILTERING
# =========================================================
BAD_FOOD_WORDS = [
    "sauce", "dressing", "oil", "butter", "margarine", "mayonnaise", "ketchup", "mustard",
    "gravy", "seasoning", "spice", "powder", "drizzle", "tbsp", "tsp", "tablespoon", "teaspoon",
    "broth", "stock", "extract", "syrup", "jam", "honey", "vinegar",
    "marinade", "dip", "spread"
]


def is_meal_like(food_name: str) -> bool:
    s = normalize_food_name(food_name)
    if len(s) < 3:
        return False
    return not any(w in s for w in BAD_FOOD_WORDS)


def quality_filter(pool: pd.DataFrame) -> pd.DataFrame:
    pool2 = pool.copy()

    if "is_alcohol" in pool2.columns:
        pool2 = pool2[pool2["is_alcohol"] != 1]

    backup = pool2.copy()
    pool2 = pool2[pool2["energy"].fillna(0) >= 120]
    pool2 = pool2[pool2["Food"].apply(is_meal_like)]

    if pool2.empty:
        pool2 = backup
        pool2 = pool2[pool2["Food"].astype(str).str.len() >= 3]

    return pool2


# =========================================================
# SEVERITY/REASON FEATURE BUILDER
# =========================================================
def build_feature_df(drug_row: pd.Series, foods_df: pd.DataFrame) -> pd.DataFrame:
    base = {
        "Chemical_Class": int(drug_row.get("Chemical_Class", 0)),
        "Habit_Forming": int(drug_row.get("Habit_Forming", 0)),
        "Therapeutic_Class": int(drug_row.get("Therapeutic_Class", 0)),
        "Action_Class": int(drug_row.get("Action_Class", 0)),
    }

    X = foods_df.copy()
    needed_food_cols = [
        "energy", "protein", "fat", "carbs", "fiber",
        "calcium", "iron", "vitamin_c", "vitamin_a", "vitamin_k_proxy",
        "is_alcohol", "is_leafy_green",
    ]
    for c in needed_food_cols:
        if c not in X.columns:
            X[c] = 0

    for k, v in base.items():
        X[k] = v

    for c in feature_cols:
        if c not in X.columns:
            X[c] = 0

    return X[feature_cols]


def predict_severity_batch(drug_row: pd.Series, foods_df: pd.DataFrame) -> List[int]:
    X = build_feature_df(drug_row, foods_df)
    return list(severity_model.predict(X))


def predict_reasons_one(drug_row: pd.Series, food_row: pd.Series) -> List[str]:
    X = build_feature_df(drug_row, pd.DataFrame([food_row]))
    vec = reason_model.predict(X)[0]
    return [tag for tag, v in zip(ALL_REASON_TAGS, vec) if int(v) == 1]


def ml_predict_one(drug_row: pd.Series, food_row: pd.Series) -> Tuple[int, List[str]]:
    X = build_feature_df(drug_row, pd.DataFrame([food_row]))
    sev = int(severity_model.predict(X)[0])
    vec = reason_model.predict(X)[0]
    reasons = [tag for tag, v in zip(ALL_REASON_TAGS, vec) if int(v) == 1]
    return sev, reasons


# =========================================================
# EXPLAINABILITY
# =========================================================
def explain_features(drug_row: pd.Series, food_row: pd.Series) -> dict:
    notes = []

    calcium = float(food_row.get("calcium", 0.0))
    iron = float(food_row.get("iron", 0.0))
    vitk = float(food_row.get("vitamin_k_proxy", 0.0))
    fat = float(food_row.get("fat", 0.0))
    fiber = float(food_row.get("fiber", 0.0))
    alcohol = int(food_row.get("is_alcohol", 0))
    leafy = int(food_row.get("is_leafy_green", 0))

    drug_contains = str(drug_row.get("Contains", "")).lower()
    drug_text = str(drug_row.get("combined_text", "")).lower()

    if alcohol == 1:
        notes.append("Food is alcohol → can increase sedation/side effects with CNS drugs.")
    if calcium >= 200:
        notes.append(f"High calcium (~{calcium:.0f}mg) → may reduce absorption of some antibiotics.")
    if iron >= 5:
        notes.append(f"Iron present (~{iron:.1f}mg) → may interact with levothyroxine.")
    if vitk >= 100 or leafy == 1:
        notes.append(f"Vitamin K / leafy signal (vitK≈{vitk:.0f}) → may affect warfarin.")
    if fat >= 20:
        notes.append(f"High fat (~{fat:.1f}g) → may change absorption for ‘empty stomach’ drugs.")
    if fiber >= 5:
        notes.append(f"High fiber (~{fiber:.1f}g) → may slow absorption for some medicines.")

    if "warfarin" in drug_contains or "anticoagulant" in drug_text:
        notes.append("Drug looks like warfarin/anticoagulant → watch vitamin K foods.")
    if "levothyroxine" in drug_contains:
        notes.append("Drug contains levothyroxine → separate from iron/calcium foods.")

    if not notes:
        notes.append("No strong nutrient-based warning signals detected for this food.")

    return {
        "food_signals": {
            "calcium": calcium,
            "iron": iron,
            "vitamin_k_proxy": vitk,
            "fat": fat,
            "fiber": fiber,
            "is_alcohol": alcohol,
            "is_leafy_green": leafy,
        },
        "explanation_points": notes,
    }


# =========================================================
# REALISTIC SRI LANKAN MEAL: main + protein + vegetable
# =========================================================
ROLE_MAP = {
    "main": "main",
    "protein": "protein",
    "curry": "protein",
    "vegetable": "vegetable",
    "side": "side",
    "unknown": "side",
    "drink": "side",
    "dessert": "side",
}


def _role(food_type: str) -> str:
    ft = str(food_type).strip().lower()
    return ROLE_MAP.get(ft, "side")


def pick_srilankan_plate(safe_df: pd.DataFrame, target_kcal: float) -> Dict[str, Optional[pd.Series]]:
    df = safe_df.copy()
    df["energy"] = df["energy"].fillna(0.0)
    df["Food_norm"] = df["Food"].astype(str).str.strip().str.lower()
    df = df.drop_duplicates(subset=["Food_norm"], keep="first").reset_index(drop=True)
    df["role"] = df["food_type"].apply(_role)

    mains = df[df["role"] == "main"].copy()
    prots = df[df["role"] == "protein"].copy()
    vegs = df[df["role"] == "vegetable"].copy()

    main_target = target_kcal * 0.55
    prot_target = target_kcal * 0.30
    veg_target = target_kcal * 0.15

    def pick_near(pool: pd.DataFrame, tgt: float) -> Optional[pd.Series]:
        if pool.empty:
            return None
        pool = pool.copy()
        pool["diff"] = (pool["energy"] - tgt).abs()
        return pool.sort_values("diff").iloc[0]

    chosen_main = pick_near(mains, main_target)
    chosen_prot = pick_near(prots, prot_target)
    chosen_veg = pick_near(vegs, veg_target)

    used = set()
    for r in [chosen_main, chosen_prot, chosen_veg]:
        if r is not None:
            used.add(str(r["Food_norm"]))

    def pick_fallback(exclude: Set[str], tgt: float) -> Optional[pd.Series]:
        pool = df[~df["Food_norm"].isin(exclude)].copy()
        if pool.empty:
            return None
        pool["diff"] = (pool["energy"] - tgt).abs()
        return pool.sort_values("diff").iloc[0]

    if chosen_main is None:
        chosen_main = pick_fallback(used, main_target)
        if chosen_main is not None:
            used.add(str(chosen_main["Food_norm"]))
    if chosen_prot is None:
        chosen_prot = pick_fallback(used, prot_target)
        if chosen_prot is not None:
            used.add(str(chosen_prot["Food_norm"]))
    if chosen_veg is None:
        chosen_veg = pick_fallback(used, veg_target)
        if chosen_veg is not None:
            used.add(str(chosen_veg["Food_norm"]))

    return {"main": chosen_main, "protein": chosen_prot, "vegetable": chosen_veg}


def pick_best_scored_plate(
    safe_df: pd.DataFrame,
    target_kcal: float,
    used_foods: Set[str],
    used_clusters: Set[int],
    want_veg: bool,
    want_diabetic: bool,
    want_low_sodium: bool,
    num_candidates: int = 60
) -> Tuple[Dict[str, Optional[pd.Series]], Dict[str, Any]]:

    best_plate = None
    best_score = -1e9
    best_debug: Dict[str, Any] = {}

    w_safety = 5.0
    w_calorie = 2.0
    w_pref = 1.5
    w_variety = 1.0
    w_cluster = 1.0

    for _ in range(num_candidates):
        seed = secrets.randbits(32)
        df_rand = safe_df.sample(frac=1.0, random_state=seed).reset_index(drop=True)

        plate = pick_srilankan_plate(df_rand, target_kcal)

        items = [plate.get("main"), plate.get("protein"), plate.get("vegetable")]
        items = [x for x in items if x is not None]
        if not items:
            continue

        names = [str(x["Food"]) for x in items]
        total_kcal = sum(float(x.get("energy", 0.0)) for x in items)

        max_sev = max(int(x.get("pred_severity", x.get("max_severity", 0))) for x in items)

        plate_is_veg = all(bool(x.get("pref_vegetarian", False)) for x in items)
        plate_is_diab = all(bool(x.get("pref_diabetic", False)) for x in items)
        plate_is_low = all(bool(x.get("pref_low_sodium", False)) for x in items)

        pref_score = 0.0
        if want_veg:
            pref_score += (1.0 if plate_is_veg else -1.0)
        if want_diabetic:
            pref_score += (1.0 if plate_is_diab else -1.0)
        if want_low_sodium:
            pref_score += (1.0 if plate_is_low else -1.0)

        cal_fit = calorie_fit_score(total_kcal, target_kcal)
        var_pen = variety_penalty(names, used_foods)

        cluster_ids = [int(x.get("cluster_id", -1)) for x in items]
        clu_pen = cluster_variety_penalty(cluster_ids, used_clusters)

        score = (
            w_safety * severity_to_score(max_sev) +
            w_calorie * cal_fit +
            w_pref * pref_score +
            w_variety * var_pen +
            w_cluster * clu_pen
        )

        if score > best_score:
            best_score = score
            best_plate = plate
            best_debug = {
                "final_score": round(score, 3),
                "max_severity": int(max_sev),
                "total_kcal": round(total_kcal, 1),
                "calorie_fit": round(cal_fit, 3),
                "pref_score": round(pref_score, 3),
                "variety_penalty": round(var_pen, 3),
                "cluster_penalty": round(clu_pen, 3),
                "items": names,
                "cluster_ids": cluster_ids,
            }

    if best_plate is None:
        filtered = safe_df.copy()
        if want_veg:
            filtered = filtered[filtered["pref_vegetarian"] == True]
        if want_diabetic:
            filtered = filtered[filtered["pref_diabetic"] == True]
        if want_low_sodium:
            filtered = filtered[filtered["pref_low_sodium"] == True]
        if filtered.empty:
            filtered = safe_df

        best_plate = pick_srilankan_plate(filtered, target_kcal)
        best_debug = {"note": "fallback_used"}

    return best_plate, best_debug


# =========================================================
# FASTAPI APP
# =========================================================
app = FastAPI(title="PharmaLink Meal Plan API", version="4.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API MODELS
# =========================================================
class FoodDrugRequest(BaseModel):
    drug_name: str
    food_name: str
    safe_food_limit: int = 10


class SafeFoodItem(BaseModel):
    food: str
    food_type: str
    energy: float
    severity: int
    reasons: List[str] = []
    explanation: Dict[str, Any] = {}


class FoodDrugResponse(BaseModel):
    drug: str
    food: str
    severity: int
    message: str
    reasons: List[str] = []
    explanation: dict = {}
    safe_foods: List[SafeFoodItem] = []


class MealPlanRequest(BaseModel):
    drug_names: List[str] = Field(default_factory=list)

    days: int = 3
    meals_per_day: int = 3
    calories_per_day: int = 1800
    meal_types: Optional[List[str]] = None
    allergies: List[str] = Field(default_factory=list)
    vegetarian: bool = False
    diabetic_friendly: bool = False
    low_sodium: bool = False


class MealItem(BaseModel):
    food: str
    food_type: str
    energy: float
    severity: int
    reasons: List[str] = []
    allergens_detected: List[str] = []
    preferences: Dict[str, bool] = {}
    explanation: Dict[str, Any] = {}


class Meal(BaseModel):
    name: str
    target_kcal: float
    estimated_kcal: float
    main: MealItem
    protein: Optional[MealItem] = None
    vegetable: Optional[MealItem] = None


class DayPlan(BaseModel):
    day: int
    meals: List[Meal]


class MealPlanResponse(BaseModel):
    drug_names: List[str]
    drug_indices: List[int]
    days: List[DayPlan]


# =========================================================
# SAFE FOODS SUGGESTION (for HIGH RISK)
# =========================================================
def suggest_safe_foods_for_drug(drug_row: pd.Series, limit: int = 10) -> List[Dict[str, Any]]:
    pool = unified_foods.copy()
    pool = quality_filter(pool)

    pool["pred_severity"] = predict_severity_batch(drug_row, pool)

    safe_df = pool[pool["pred_severity"] <= 1].copy()
    if safe_df.empty:
        return []

    # simple ranking: severity0 first, then higher protein, then closer to ~300kcal
    if "protein" not in safe_df.columns:
        safe_df["protein"] = 0

    safe_df["rank_score"] = (
        (safe_df["pred_severity"] * 10)
        - safe_df["protein"].fillna(0)
        + (safe_df["energy"].fillna(0) - 300).abs() / 100
    )

    safe_df = safe_df.sort_values("rank_score").head(int(limit))

    out: List[Dict[str, Any]] = []
    for _, r in safe_df.iterrows():
        out.append({
            "food": str(r["Food"]),
            "food_type": str(r.get("food_type", "unknown")),
            "energy": safe_float(r.get("energy")),
            "severity": int(r.get("pred_severity", 0)),
            "reasons": predict_reasons_one(drug_row, r),
            "explanation": explain_features(drug_row, r),
        })
    return out


# =========================================================
# CORE: build 1 meal for 1 drug
# =========================================================
def build_one_srilankan_meal_for_drug(
    drug_row: pd.Series,
    meal_type: str,
    calories_target: float,
    avoid_set: Set[str],
    vegetarian: bool,
    diabetic_friendly: bool,
    low_sodium: bool,
    exclude_foods: Set[str],
    exclude_clusters: Set[int],
) -> Dict[str, Any]:
    mt = meal_type.strip().lower()

    pool = unified_foods[
        unified_foods["meal_type"].astype(str).str.lower().str.contains(mt, na=False)
    ].copy()
    if pool.empty:
        pool = unified_foods.copy()

    pool = quality_filter(pool)

    pool["Food_norm"] = pool["Food"].astype(str).str.strip().str.lower()
    if exclude_foods:
        pool = pool[~pool["Food_norm"].isin(exclude_foods)]

    if exclude_clusters:
        pool = pool[~pool["cluster_id"].fillna(-1).astype(int).isin(exclude_clusters)]

    if pool.empty:
        return {"message": "No foods available after exclusions.", "meal": None}

    seed = secrets.randbits(32)
    pool = pool.sample(n=min(len(pool), 800), random_state=seed).reset_index(drop=True)

    pool["pred_severity"] = predict_severity_batch(drug_row, pool)
    safe_df = pool[pool["pred_severity"] <= 1].copy()
    if safe_df.empty:
        return {"message": "No safe foods found.", "meal": None}

    if avoid_set:
        kept = []
        for _, rr in safe_df.iterrows():
            al = resolve_allergens(rr["Food"])
            if not violates_allergy(al, avoid_set):
                kept.append(rr)
        safe_df = pd.DataFrame(kept) if kept else pd.DataFrame(columns=safe_df.columns)
        if safe_df.empty:
            return {"message": "No foods left after allergy filtering.", "meal": None}

    safe_df = add_preference_columns(safe_df)

    if vegetarian:
        safe_df = safe_df[safe_df["pref_vegetarian"] == True]
    if diabetic_friendly:
        safe_df = safe_df[safe_df["pref_diabetic"] == True]
    if low_sodium:
        safe_df = safe_df[safe_df["pref_low_sodium"] == True]

    if safe_df.empty:
        return {"message": "No foods left after preference filtering.", "meal": None}

    chosen, score_debug = pick_best_scored_plate(
        safe_df=safe_df,
        target_kcal=calories_target,
        used_foods=exclude_foods,
        used_clusters=exclude_clusters,
        want_veg=vegetarian,
        want_diabetic=diabetic_friendly,
        want_low_sodium=low_sodium,
        num_candidates=60
    )

    def pack_item(r: Optional[pd.Series]) -> Optional[Dict[str, Any]]:
        if r is None:
            return None
        allergens = resolve_allergens(r["Food"])
        prefs = {
            "vegetarian": bool(r.get("pref_vegetarian", False)),
            "diabetic_friendly": bool(r.get("pref_diabetic", False)),
            "low_sodium": bool(r.get("pref_low_sodium", False)),
        }
        return {
            "food": str(r["Food"]),
            "food_type": str(r.get("food_type", "unknown")),
            "energy": safe_float(r.get("energy")),
            "severity": int(r.get("pred_severity", 0)),
            "reasons": predict_reasons_one(drug_row, r),
            "allergens_detected": allergens,
            "preferences": prefs,
            "explanation": explain_features(drug_row, r),
            "cluster_id": int(r.get("cluster_id", -1)),
        }

    main_item = pack_item(chosen.get("main"))
    prot_item = pack_item(chosen.get("protein"))
    veg_item = pack_item(chosen.get("vegetable"))

    if main_item is None:
        return {"message": "Could not build plate (no main found).", "meal": None}

    total = float(main_item["energy"])
    if prot_item:
        total += float(prot_item["energy"])
    if veg_item:
        total += float(veg_item["energy"])

    return {
        "message": "ok",
        "target_kcal": float(calories_target),
        "estimated_kcal": float(round(total, 1)),
        "score_debug": score_debug,
        "meal": {"main": main_item, "protein": prot_item, "vegetable": veg_item},
    }


# =========================================================
# MULTI-DRUG SAFETY (MAX severity <= 1)
# =========================================================
def compute_safe_foods_for_all_drugs(
    drug_indices: List[int],
    base_foods: pd.DataFrame,
) -> pd.DataFrame:
    if base_foods.empty:
        return base_foods

    foods = base_foods.copy().reset_index(drop=True)
    foods["max_severity"] = 0

    for idx in drug_indices:
        if idx < 0 or idx >= len(drug_clean):
            raise HTTPException(status_code=404, detail=f"Drug index {idx} out of range")
        drug_row = drug_clean.iloc[idx]
        sevs = predict_severity_batch(drug_row, foods)
        foods["max_severity"] = foods[["max_severity"]].join(pd.Series(sevs, name="sev")).max(axis=1)

    return foods[foods["max_severity"] <= 1].copy()


# =========================================================
# DRUG IMAGE PREDICTION
# =========================================================
def predict_drug_from_image_core(img: Image.Image, topk: int = 3):
    if drug_vision_model is None:
        raise HTTPException(status_code=500, detail="Drug vision model not loaded.")

    x = drug_vision_tfms(img.convert("RGB")).unsqueeze(0).to(drug_vision_device)

    with torch.no_grad():
        logits = drug_vision_model(x)
        probs = F.softmax(logits, dim=1)[0].cpu()

    k = min(int(topk), len(drug_vision_classes))
    confs, idxs = torch.topk(probs, k=k)

    out = []
    for conf, idx in zip(confs.tolist(), idxs.tolist()):
        out.append({"drug_name": drug_vision_classes[idx], "confidence": round(float(conf), 4)})
    return out


# =========================================================
# ENDPOINTS
# =========================================================
@app.get("/")
def root():
    return {
        "status": "ok",
        "mode": "pure_ml" if USE_PURE_ML else "hybrid",
        "cluster_model_loaded": bool(cluster_model is not None),
        "food_type_model_loaded": bool(food_type_model is not None),
        "veg_model_loaded": bool(vegetarian_model is not None),
        "diabetic_model_loaded": bool(diabetic_model is not None),
        "low_sodium_model_loaded": bool(low_sodium_model is not None),
    }


@app.get("/drugs")
def list_drugs(q: Optional[str] = None, limit: int = 50):
    df = drug_clean
    if q:
        mask = df["Name"].astype(str).str.lower().str.contains(q.lower(), na=False)
        df = df[mask]
    df = df.head(limit)
    return [{"index": int(i), "name": str(r["Name"]), "contains": str(r.get("Contains", ""))} for i, r in df.iterrows()]


@app.get("/foods")
def list_foods(q: Optional[str] = None, limit: int = 50):
    df = unified_foods
    if q:
        mask = df["Food"].astype(str).str.lower().str.contains(q.lower(), na=False)
        df = df[mask]
    df = df.head(limit)
    return [{
        "name": str(r["Food"]),
        "meal_type": str(r.get("meal_type", "")),
        "food_type": str(r.get("food_type", "")),
        "cluster_id": int(r.get("cluster_id", -1)),
    } for _, r in df.iterrows()]


# ✅ FOOD-DRUG by NAME + safe foods if high risk
@app.post("/ml-food-drug-risk", response_model=FoodDrugResponse)
def ml_food_drug_risk(body: FoodDrugRequest):
    if not body.drug_name or not body.food_name:
        raise HTTPException(status_code=400, detail="drug_name and food_name are required")

    drug_indices = resolve_indices_from_names([body.drug_name])
    if not drug_indices:
        raise HTTPException(status_code=404, detail="Drug name not found")

    idx = drug_indices[0]
    drug_row = drug_clean.iloc[idx]

    matches = unified_foods[unified_foods["Food"].astype(str).str.lower() == str(body.food_name).lower()]
    if matches.empty:
        raise HTTPException(status_code=404, detail=f"Food '{body.food_name}' not found")

    food_row = matches.iloc[0]
    sev_ml, reasons_ml = ml_predict_one(drug_row, food_row)

    safe_foods: List[Dict[str, Any]] = []
    if int(sev_ml) == 2:
        safe_foods = suggest_safe_foods_for_drug(drug_row, limit=int(body.safe_food_limit or 10))

    return FoodDrugResponse(
        drug=str(drug_row["Name"]),
        food=str(food_row["Food"]),
        severity=int(sev_ml),
        message=risk_map[int(sev_ml)],
        reasons=reasons_ml,
        explanation=explain_features(drug_row, food_row),
        safe_foods=safe_foods
    )


@app.get("/ml-meal-plan")
def ml_meal_plan(
    drug_index: int = Query(...),
    meal_type: str = Query("lunch"),
    calories_target: int = Query(650),
    avoid_allergens: Optional[str] = Query(None),
    vegetarian: bool = Query(False),
    diabetic_friendly: bool = Query(False),
    low_sodium: bool = Query(False),
    debug_score: bool = Query(False),
):
    if drug_index < 0 or drug_index >= len(drug_clean):
        raise HTTPException(status_code=404, detail="Drug index out of range")

    drug_row = drug_clean.iloc[drug_index]
    avoid_set: Set[str] = set()
    if avoid_allergens:
        avoid_set = {a.strip().lower() for a in avoid_allergens.split(",") if a.strip()}

    result = build_one_srilankan_meal_for_drug(
        drug_row=drug_row,
        meal_type=meal_type,
        calories_target=float(calories_target),
        avoid_set=avoid_set,
        vegetarian=vegetarian,
        diabetic_friendly=diabetic_friendly,
        low_sodium=low_sodium,
        exclude_foods=set(),
        exclude_clusters=set(),
    )

    out = {
        "drug": str(drug_row["Name"]),
        "meal_type": meal_type,
        "target_kcal": calories_target,
        "estimated_kcal": result.get("estimated_kcal", 0),
        "meal": result["meal"],
        "message": result["message"],
    }

    if debug_score:
        out["score_debug"] = result.get("score_debug", {})

    return out


@app.get("/ml-meal-plan-days")
def ml_meal_plan_days(
    drug_index: int = Query(...),
    meal_type: str = Query("lunch"),
    days: int = Query(7, ge=1, le=30),
    calories_target: int = Query(650),
    avoid_allergens: Optional[str] = Query(None),
    vegetarian: bool = Query(False),
    diabetic_friendly: bool = Query(False),
    low_sodium: bool = Query(False),
):
    if drug_index < 0 or drug_index >= len(drug_clean):
        raise HTTPException(status_code=404, detail="Drug index out of range")

    drug_row = drug_clean.iloc[drug_index]

    avoid_set: Set[str] = set()
    if avoid_allergens:
        avoid_set = {a.strip().lower() for a in avoid_allergens.split(",") if a.strip()}

    used_foods_global: Set[str] = set()
    used_clusters_global: Set[int] = set()
    plans = []

    for d in range(1, days + 1):
        res = build_one_srilankan_meal_for_drug(
            drug_row=drug_row,
            meal_type=meal_type,
            calories_target=float(calories_target),
            avoid_set=avoid_set,
            vegetarian=vegetarian,
            diabetic_friendly=diabetic_friendly,
            low_sodium=low_sodium,
            exclude_foods=used_foods_global,
            exclude_clusters=used_clusters_global,
        )
        plans.append({"day": d, **res})

        if res.get("meal"):
            m = res["meal"]
            for k in ["main", "protein", "vegetable"]:
                if m.get(k) and m[k].get("food"):
                    used_foods_global.add(normalize_food_name(m[k]["food"]))
                    cid = int(m[k].get("cluster_id", -1))
                    if cid != -1:
                        used_clusters_global.add(cid)

    return {
        "drug": str(drug_row["Name"]),
        "meal_type": meal_type,
        "days": days,
        "target_kcal": calories_target,
        "plans": plans,
        "note": "score_debug is included per day inside plans"
    }


@app.post("/meal-plan", response_model=MealPlanResponse)
def create_meal_plan(body: MealPlanRequest):
    if not body.drug_names:
        raise HTTPException(status_code=400, detail="At least one active medication name is required.")

    drug_indices = resolve_indices_from_names(body.drug_names)
    if not drug_indices:
        raise HTTPException(status_code=400, detail="No valid drug names provided.")

    days = max(1, int(body.days))
    meals_per_day = max(1, min(int(body.meals_per_day), 5))
    calories_per_day = float(body.calories_per_day or 1800)

    if meals_per_day == 3:
        default_types = ["breakfast", "lunch", "dinner"]
        fractions = [0.30, 0.40, 0.30]
    elif meals_per_day == 4:
        default_types = ["breakfast", "lunch", "dinner", "snack"]
        fractions = [0.25, 0.35, 0.30, 0.10]
    else:
        default_types = ["breakfast", "lunch", "dinner"][:meals_per_day]
        if len(default_types) < meals_per_day:
            default_types += [f"meal{i+1}" for i in range(len(default_types), meals_per_day)]
        fractions = [1.0 / meals_per_day] * meals_per_day

    meal_types = [m.lower() for m in (body.meal_types or default_types)]
    avoid_set = {a.strip().lower() for a in body.allergies if a.strip()}

    used_foods_global: Set[str] = set()
    used_clusters_global: Set[int] = set()

    day_plans: List[DayPlan] = []

    for d in range(1, days + 1):
        used_today_foods: Set[str] = set()
        used_today_clusters: Set[int] = set()
        meals_out: List[Meal] = []

        for i in range(meals_per_day):
            mt = meal_types[i] if i < len(meal_types) else f"meal{i+1}"
            target_meal_kcal = calories_per_day * (fractions[i] if i < len(fractions) else (1.0 / meals_per_day))

            base = unified_foods[unified_foods["meal_type"].astype(str).str.contains(mt, na=False)].copy()
            if base.empty:
                base = unified_foods.copy()

            base = quality_filter(base)

            base["Food_norm"] = base["Food"].astype(str).str.strip().str.lower()
            avoid_foods_now = used_today_foods.union(used_foods_global)
            avoid_clusters_now = used_today_clusters.union(used_clusters_global)

            base_pref = base[~base["Food_norm"].isin(avoid_foods_now)].copy()
            if not base_pref.empty and avoid_clusters_now:
                base_pref = base_pref[~base_pref["cluster_id"].fillna(-1).astype(int).isin(avoid_clusters_now)].copy()

            if base_pref.empty:
                base_pref = base[~base["Food_norm"].isin(used_today_foods)].copy()
            if base_pref.empty:
                base_pref = base.copy()

            seed = secrets.randbits(32)
            base_pref = base_pref.sample(n=min(len(base_pref), 900), random_state=seed).reset_index(drop=True)

            safe_all = compute_safe_foods_for_all_drugs(drug_indices, base_pref)
            if safe_all.empty:
                empty = MealItem(food="", food_type="", energy=0.0, severity=0,
                                 reasons=[], allergens_detected=[], preferences={}, explanation={})
                meals_out.append(Meal(
                    name=mt.title(),
                    target_kcal=round(target_meal_kcal, 1),
                    estimated_kcal=0.0,
                    main=empty,
                    protein=None,
                    vegetable=None,
                ))
                continue

            if avoid_set:
                kept = []
                for _, rr in safe_all.iterrows():
                    al = resolve_allergens(rr["Food"])
                    if not violates_allergy(al, avoid_set):
                        kept.append(rr)
                safe_all = pd.DataFrame(kept) if kept else pd.DataFrame(columns=safe_all.columns)
                if safe_all.empty:
                    empty = MealItem(food="", food_type="", energy=0.0, severity=0,
                                     reasons=[], allergens_detected=[], preferences={}, explanation={})
                    meals_out.append(Meal(
                        name=mt.title(),
                        target_kcal=round(target_meal_kcal, 1),
                        estimated_kcal=0.0,
                        main=empty,
                        protein=None,
                        vegetable=None,
                    ))
                    continue

            safe_all = add_preference_columns(safe_all)
            if body.vegetarian:
                safe_all = safe_all[safe_all["pref_vegetarian"] == True]
            if body.diabetic_friendly:
                safe_all = safe_all[safe_all["pref_diabetic"] == True]
            if body.low_sodium:
                safe_all = safe_all[safe_all["pref_low_sodium"] == True]

            if safe_all.empty:
                empty = MealItem(food="", food_type="", energy=0.0, severity=0,
                                 reasons=[], allergens_detected=[], preferences={}, explanation={})
                meals_out.append(Meal(
                    name=mt.title(),
                    target_kcal=round(target_meal_kcal, 1),
                    estimated_kcal=0.0,
                    main=empty,
                    protein=None,
                    vegetable=None,
                ))
                continue

            plate, _score_debug = pick_best_scored_plate(
                safe_df=safe_all,
                target_kcal=float(target_meal_kcal),
                used_foods=used_today_foods.union(used_foods_global),
                used_clusters=used_today_clusters.union(used_clusters_global),
                want_veg=body.vegetarian,
                want_diabetic=body.diabetic_friendly,
                want_low_sodium=body.low_sodium,
                num_candidates=60
            )

            display_drug_row = drug_clean.iloc[drug_indices[0]]

            def pack(r: Optional[pd.Series]) -> Optional[MealItem]:
                if r is None:
                    return None
                prefs = {
                    "vegetarian": bool(r.get("pref_vegetarian", False)),
                    "diabetic_friendly": bool(r.get("pref_diabetic", False)),
                    "low_sodium": bool(r.get("pref_low_sodium", False)),
                }
                return MealItem(
                    food=str(r["Food"]),
                    food_type=str(r.get("food_type", "unknown")),
                    energy=safe_float(r.get("energy")),
                    severity=int(r.get("max_severity", 0)),
                    reasons=predict_reasons_one(display_drug_row, r),
                    allergens_detected=resolve_allergens(r["Food"]),
                    preferences=prefs,
                    explanation=explain_features(display_drug_row, r),
                )

            main_item = pack(plate["main"])
            prot_item = pack(plate["protein"])
            veg_item = pack(plate["vegetable"])

            if main_item is None:
                empty = MealItem(food="", food_type="", energy=0.0, severity=0,
                                 reasons=[], allergens_detected=[], preferences={}, explanation={})
                meals_out.append(Meal(
                    name=mt.title(),
                    target_kcal=round(target_meal_kcal, 1),
                    estimated_kcal=0.0,
                    main=empty,
                    protein=None,
                    vegetable=None,
                ))
                continue

            est = float(main_item.energy) + (float(prot_item.energy) if prot_item else 0.0) + (float(veg_item.energy) if veg_item else 0.0)

            meals_out.append(Meal(
                name=mt.title(),
                target_kcal=round(target_meal_kcal, 1),
                estimated_kcal=round(est, 1),
                main=main_item,
                protein=prot_item,
                vegetable=veg_item,
            ))

            def _add_used_from_series(s: Optional[pd.Series]):
                if s is None:
                    return
                used_today_foods.add(normalize_food_name(str(s.get("Food", ""))))
                cid = int(s.get("cluster_id", -1))
                if cid != -1:
                    used_today_clusters.add(cid)

            _add_used_from_series(plate.get("main"))
            _add_used_from_series(plate.get("protein"))
            _add_used_from_series(plate.get("vegetable"))

        used_foods_global.update(used_today_foods)
        used_clusters_global.update(used_today_clusters)
        day_plans.append(DayPlan(day=d, meals=meals_out))

    return MealPlanResponse(
        drug_names=indices_to_names(drug_indices),
        drug_indices=drug_indices,
        days=day_plans
    )


def _norm(s: str) -> str:
    s = str(s).strip().lower()
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


@app.post("/predict-drug-from-image")
async def predict_drug_from_image_api(file: UploadFile = File(...), topk: int = 3):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload a valid image.")

    img_bytes = await file.read()
    try:
        img = Image.open(io.BytesIO(img_bytes))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    preds = predict_drug_from_image_core(img, topk=topk)

    enriched: List[Dict[str, Any]] = []
    for p in preds:
        pred_name = str(p["drug_name"])
        key = _norm(pred_name)

        if drug_vision_info is None:
            enriched.append(p)
            continue

        if "_brand_key" not in drug_vision_info.columns:
            drug_vision_info["_brand_key"] = drug_vision_info["brand_name"].apply(_norm)

        m = drug_vision_info[drug_vision_info["_brand_key"] == key]

        if m.empty:
            choices = drug_vision_info["_brand_key"].tolist()
            close = get_close_matches(key, choices, n=1, cutoff=0.8)
            if close:
                m = drug_vision_info[drug_vision_info["_brand_key"] == close[0]]

        if not m.empty:
            row = m.iloc[0].drop(labels=[c for c in ["_brand_key"] if c in m.columns]).to_dict()
            enriched.append({**p, **row})
        else:
            enriched.append(p)

    return {"predictions": enriched}
