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
from fastapi.staticfiles import StaticFiles

import numpy as np


# =========================================================
# PATHS
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent  # PharmaLink/
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "model"

print("BASE_DIR:", BASE_DIR)
print("DATA_DIR:", DATA_DIR, "exists:", DATA_DIR.exists())
print("MODEL_DIR:", MODEL_DIR, "exists:", MODEL_DIR.exists())


# =========================================================
# SETTINGS
# =========================================================
USE_PURE_ML = True

CLUSTER_MODEL_NAME = "food_cluster_model.pkl"
SEVERITY_MODEL_NAME = "severity_model.pkl"
REASON_MODEL_NAME = "reason_model.pkl"

FOODTYPE_MODEL_NAME = "food_type_model.pkl"
FOODTYPE_CONF_THRESHOLD = 0.55

VEG_MODEL_NAME = "vegetarian_model.pkl"
DIAB_MODEL_NAME = "diabetic_model.pkl"
LOWNA_MODEL_NAME = "low_sodium_model.pkl"
PREF_PROBA_THRESHOLD = 0.50

SYMPTOM_MODEL_NAME = "symptom_classifier.pkl"
SYMPTOM_FEATURES_NAME = "symptom_feature_cols.pkl"

DRUG_VISION_WEIGHTS = MODEL_DIR / "drug_classifier_best.pth"
DRUG_VISION_CLASSES = MODEL_DIR / "class_names.json"

DRUG_VISION_INFO_CSV = DATA_DIR / "drug_vision_infoo.csv"


# =========================================================
# CSV LOADERS
# =========================================================
def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")

    try:
        df = pd.read_csv(path)
    except pd.errors.ParserError as e:
        print(f"WARNING: CSV parse error in {path}: {e}")
        print("Falling back to python engine + skipping bad lines...")
        df = pd.read_csv(path, engine="python", on_bad_lines="skip")

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


def _find_csv(filename: str, required: bool = True) -> Optional[Path]:
    """
    Robust lookup:
      1) PharmaLink/data/<file>
      2) PharmaLink/<file>
      3) CWD/<file>
    """
    candidates = [
        DATA_DIR / filename,
        BASE_DIR / filename,
        Path.cwd() / filename,
    ]
    for p in candidates:
        if p.exists():
            return p
    if required:
        raise FileNotFoundError(f"Missing required file '{filename}'. Tried: {candidates}")
    return None


# =========================================================
# LOAD CSVs
# =========================================================
drug_clean = _read_csv(_find_csv("drug_clean.csv"))
food_subset = _read_csv(_find_csv("food_subset.csv"))

new_food_path = _find_csv("new_foodset.csv", required=True)
meal_foods_raw = _read_csv(new_food_path)

print("Loaded new_foodset.csv from:", new_food_path)

# =========================================================
# LOAD RECOMMENDER CSVs
# =========================================================
symptom_drug_reco = _read_csv(_find_csv("symptom_drug_reco.csv", required=True))
contra_rules = _read_csv(_find_csv("contra_rules.csv", required=True))

# normalize columns (lower)
symptom_drug_reco.columns = [c.strip().lower() for c in symptom_drug_reco.columns]
contra_rules.columns = [c.strip().lower() for c in contra_rules.columns]

# basic required cols check
req_cols = ["symptom", "first_line_drugs", "second_line_drugs", "avoid_drugs"]
for c in req_cols:
    if c not in symptom_drug_reco.columns:
        raise RuntimeError(f"symptom_drug_reco.csv missing column: {c}")

for c in ["rule_id", "condition", "avoid_drugs", "message"]:
    if c not in contra_rules.columns:
        raise RuntimeError(f"contra_rules.csv missing column: {c}")

# normalize symptom column
symptom_drug_reco["symptom"] = symptom_drug_reco["symptom"].astype(str).str.strip().str.lower()

disease_drug_reco = _read_csv(_find_csv("disease_drug_reco.csv", required=True))
#contra_rules = _read_csv(_find_csv("contra_rules.csv", required=True))

# normalize columns (lower)
disease_drug_reco.columns = [c.strip().lower() for c in disease_drug_reco.columns]
contra_rules.columns = [c.strip().lower() for c in contra_rules.columns]

# basic required cols check
req_cols = ["disease", "first_line_drugs", "second_line_drugs", "avoid_drugs"]
for c in req_cols:
    if c not in disease_drug_reco.columns:
        raise RuntimeError(f"disease_drug_reco.csv missing column: {c}")

for c in ["rule_id", "condition", "avoid_drugs", "message"]:
    if c not in contra_rules.columns:
        raise RuntimeError(f"contra_rules.csv missing column: {c}")

# normalize symptom column
disease_drug_reco["disease"] = disease_drug_reco["disease"].astype(str).str.strip().str.lower()


# =========================================================
# NORMALIZE FOODS
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
        "Diet_Type": "diet_type",
        "diet_type": "diet_type",
        "Quantity": "quantity",
        "quantity": "quantity",
        "Image": "image",
        "image": "image",
    }
)

core_cols = [
    "Food",
    "energy", "protein", "fat", "carbs", "fiber",
    "sugars", "sodium",
    "calcium", "iron", "vitamin_c", "vitamin_a", "vitamin_k_proxy",
    "is_alcohol", "is_leafy_green",
    "meal_type", "food_type",
    "diet_type", "category",
    "quantity","image",
]

num_cols = [
    "energy", "protein", "fat", "carbs", "fiber",
    "sugars", "sodium",
    "calcium", "iron", "vitamin_c", "vitamin_a", "vitamin_k_proxy",
]

flag_cols = ["is_alcohol", "is_leafy_green"]
text_cols = ["Food", "category", "meal_type", "food_type", "diet_type",]
raw_text_cols = ["quantity", "image"]


def _ensure_cols(df: pd.DataFrame, cols: List[str]) -> pd.DataFrame:
    df = df.copy()
    for c in cols:
        if c not in df.columns:
            df[c] = None
    return df


food_subset = _ensure_cols(food_subset, core_cols)
meal_foods = _ensure_cols(meal_foods, core_cols)


def _clean_food_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # numeric columns
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    # flag columns
    for c in flag_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)

    # normal text (lower)
    for c in text_cols:
        if c in df.columns:
            df[c] = df[c].fillna("").astype(str).str.strip().str.lower()

    # raw text (keep original case)
    for c in raw_text_cols:
        if c in df.columns:
            df[c] = df[c].where(df[c].notna(), "")  # NaN -> ""
            df[c] = df[c].astype(str).str.strip()
            df.loc[df[c].str.lower().isin(["nan", "none"]), c] = ""

    # normalize unknown tags
    for c in ["food_type", "meal_type", "diet_type"]:
        if c in df.columns:
            df.loc[df[c].isin(["0", "nan", "none", ""]), c] = "unknown"

    df["Food"] = df["Food"].astype(str).str.strip()
    df = df[df["Food"] != ""].copy()
    return df



food_subset = _clean_food_df(food_subset)
meal_foods = _clean_food_df(meal_foods)

# unified foods (food_subset + new_foodset)
unified_foods = pd.concat([food_subset[core_cols], meal_foods[core_cols]], ignore_index=True)
unified_foods = unified_foods.drop_duplicates(subset=["Food"], keep="first").reset_index(drop=True)
unified_foods = _clean_food_df(unified_foods)

# meal-plan foods ONLY (new_foodset)
mealplan_foods = meal_foods[core_cols].copy()
mealplan_foods = mealplan_foods.drop_duplicates(subset=["Food"], keep="first").reset_index(drop=True)
mealplan_foods = _clean_food_df(mealplan_foods)


# =========================================================
# DRUG CATEGORY NUMERIC
# =========================================================
cat_cols = ["Chemical_Class", "Habit_Forming", "Therapeutic_Class", "Action_Class"]
for c in cat_cols:
    if c not in drug_clean.columns:
        drug_clean[c] = 0
    drug_clean[c] = pd.to_numeric(drug_clean[c], errors="coerce").fillna(0).astype(int)


# =========================================================
# ALLERGEN LOOKUP
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
            nm = r["Food Product"]
            allergens = [a.strip() for a in str(r["Allergens"]).split(",") if a.strip()]
            if nm:
                allergen_lookup[nm] = set(allergens)


# =========================================================
# LOAD MODELS
# =========================================================
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

unified_foods["cluster_id"] = -1
mealplan_foods["cluster_id"] = -1

if cluster_model is not None:
    try:
        unified_foods["cluster_id"] = cluster_model.predict(unified_foods["Food"].astype(str).tolist())
    except Exception as e:
        print("WARNING: failed to assign unified cluster_id:", repr(e))
        unified_foods["cluster_id"] = -1

    try:
        mealplan_foods["cluster_id"] = cluster_model.predict(mealplan_foods["Food"].astype(str).tolist())
    except Exception as e:
        print("WARNING: failed to assign mealplan cluster_id:", repr(e))
        mealplan_foods["cluster_id"] = -1


severity_model_path = MODEL_DIR / SEVERITY_MODEL_NAME
reason_model_path = MODEL_DIR / REASON_MODEL_NAME

if not severity_model_path.exists():
    raise FileNotFoundError(f"Missing severity model: {severity_model_path}")
if not reason_model_path.exists():
    raise FileNotFoundError(f"Missing reason model: {reason_model_path}")

severity_model = joblib.load(severity_model_path)
reason_model = joblib.load(reason_model_path)

food_type_model = None
foodtype_model_path = MODEL_DIR / FOODTYPE_MODEL_NAME
if foodtype_model_path.exists():
    food_type_model = joblib.load(foodtype_model_path)
    print("Loaded food_type_model.pkl")
else:
    print("WARNING: food_type_model.pkl not found (food_type autofix disabled).")

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

allergen_model = None
allergen_mlb = None
allergen_model_path = MODEL_DIR / "allergen_model.pkl"
allergen_mlb_path = MODEL_DIR / "allergen_mlb.pkl"
if allergen_model_path.exists() and allergen_mlb_path.exists():
    allergen_model = joblib.load(allergen_model_path)
    allergen_mlb = joblib.load(allergen_mlb_path)

drug_vision_info = _read_csv_optional(DRUG_VISION_INFO_CSV)
if drug_vision_info is not None:
    drug_vision_info.columns = [c.strip().lower() for c in drug_vision_info.columns]
    if "brand_name" not in drug_vision_info.columns:
        print("WARNING: drug_vision_info.csv must contain column: brand_name")
        drug_vision_info = None
    else:
        drug_vision_info["brand_name"] = drug_vision_info["brand_name"].astype(str).str.strip().str.lower()
        print("Loaded drug_vision_info.csv")
else:
    print("drug_vision_info.csv not found (image enrichment disabled)")

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


# -----------------------------
# SYMPTOM MODEL (disease classifier)
# -----------------------------
symptom_model = None
symptom_feature_cols: List[str] = []
symptom_col_index: Dict[str, int] = {}

symptom_model_path = MODEL_DIR / SYMPTOM_MODEL_NAME
symptom_features_path = MODEL_DIR / SYMPTOM_FEATURES_NAME

if symptom_model_path.exists() and symptom_features_path.exists():
    try:
        symptom_model = joblib.load(symptom_model_path)
        symptom_feature_cols = joblib.load(symptom_features_path)
        symptom_col_index = {c.strip().lower(): i for i, c in enumerate(symptom_feature_cols)}
        print("Loaded symptom model + feature cols:", len(symptom_feature_cols))
    except Exception as e:
        print("WARNING: failed to load symptom model:", repr(e))
        symptom_model = None
else:
    print("WARNING: symptom model files not found in model/.")

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
    "glycemic_control",
    "high_fiber_absorption",
]


REASON_UI: Dict[str, Dict[str, str]] = {
    "glycemic_control": {
        "title": "Blood Sugar Control",
        "template": (
            "High-carbohydrate foods, such as {food_name}, may raise blood sugar levels. "
            "When taking {drug_name}, this can affect how well your medicine controls your glucose. "
            "{portion_advice}"
        ),
        "advice": "Keep portions moderate and monitor blood sugar after meals."
    },

    "high_fiber_absorption": {
        "title": "High Fiber – Slower Absorption",
        "template": (
            "High-fiber foods, such as {food_name} which has about {fiber_g}g of fiber, "
            "may slow the absorption of some medicines, including {drug_name}. "
            "This can affect how well the medicine works."
        ),
        "advice": "If you notice changes, separate timing and consult a pharmacist."
    },

    "calcium_antibiotic": {
        "title": "Calcium – Reduced Antibiotic Absorption",
        "template": (
            "Foods high in calcium (about {calcium_mg} mg in {food_name}) can reduce absorption of "
            "some antibiotics like {drug_name}."
        ),
        "advice": "Separate the antibiotic and high-calcium foods by 2–4 hours."
    },

    "iron_levothyroxine": {
        "title": "Iron – Reduced Thyroid Medicine Absorption",
        "template": (
            "{food_name} contains iron (about {iron_mg} mg), which may reduce absorption of {drug_name}."
        ),
        "advice": "Take thyroid medicine on an empty stomach and separate iron by ~4 hours."
    },

    "vitk_warfarin": {
        "title": "Vitamin K – Warfarin Control",
        "template": (
            "{food_name} has vitamin K / leafy signals (vitK≈{vitk} ), which may affect {drug_name} effectiveness."
        ),
        "advice": "Keep vitamin K intake consistent and follow INR monitoring."
    },

    "cns_alcohol": {
        "title": "Alcohol + Sedating Medicines",
        "template": (
            "{food_name} contains alcohol, which can increase drowsiness and side effects when taken with {drug_name}."
        ),
        "advice": "Avoid alcohol while using this medicine."
    },
}

def _pretty_food(food_row: pd.Series) -> str:
    return str(food_row.get("Food", "")).strip()

def _pretty_drug(drug_row: pd.Series) -> str:
    name = str(drug_row.get("Name", "")).strip()
    if name:
        return name
    return str(drug_row.get("Contains", "")).strip() or "this medicine"

def _format_reason_template(tag: str, drug_row: pd.Series, food_row: pd.Series) -> str:
    meta = REASON_UI.get(tag, {})
    tpl = meta.get("template", "{food_name} + {drug_name} may require caution.")

    food_name = _pretty_food(food_row)
    drug_name = _pretty_drug(drug_row)

    fiber_g = round(float(food_row.get("fiber", 0.0)), 1)
    calcium_mg = round(float(food_row.get("calcium", 0.0)), 1)
    iron_mg = round(float(food_row.get("iron", 0.0)), 1)
    vitk_val = float(food_row.get("vitamin_k_proxy", 0.0))
    vitk = f"{vitk_val:.0f}" if vitk_val else "unknown"

    carbs = float(food_row.get("carbs", 0.0))
    portion_advice = "Try smaller portions and avoid eating it alone."
    if carbs >= 45:
        portion_advice = "Prefer a smaller portion and pair with protein/vegetables."

    try:
        return tpl.format(
            food_name=food_name,
            drug_name=drug_name,
            fiber_g=fiber_g,
            calcium_mg=calcium_mg,
            iron_mg=iron_mg,
            vitk=vitk,
            portion_advice=portion_advice,
        )
    except Exception:
        return f"{food_name} + {drug_name}: use with caution."

def build_reason_details(drug_row: pd.Series, food_row: pd.Series, reasons: List[str]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for tag in reasons or []:
        meta = REASON_UI.get(tag, {})
        title = meta.get("title", tag.replace("_", " ").title())
        advice = meta.get("advice", "Follow professional advice and medicine instructions.")
        generated = _format_reason_template(tag, drug_row, food_row)
        out.append({
            "tag": tag,
            "title": title,
            "generated_text": generated,   # ✅ මේකම ඔයාට ඕන sentence එක
            "advice": advice,
        })
    return out


ANTIDIABETIC_KEYWORDS = [
    "metformin", "glimepiride", "gliclazide", "glipizide", "glyburide",
    "insulin", "antidiabetic", "anti-diabetic", "diabetes", "hypoglyc"
]

HIGH_CARB_KEYWORDS = ["cassava", "manioc", "tapioca", "rice", "bread", "noodles", "pasta", "potato", "yam"]

def drug_looks_antidiabetic(drug_row: pd.Series) -> bool:
    txt = (
        str(drug_row.get("Name", "")) + " " +
        str(drug_row.get("Contains", "")) + " " +
        str(drug_row.get("combined_text", ""))
    ).lower()
    return any(k in txt for k in ANTIDIABETIC_KEYWORDS)

def food_is_high_carb(food_row: pd.Series) -> bool:
    name = str(food_row.get("Food", "")).lower()
    carbs = float(food_row.get("carbs", 0.0))
    fiber = float(food_row.get("fiber", 0.0))

    if any(k in name for k in HIGH_CARB_KEYWORDS):
        return True
    if carbs >= 30 and fiber < 5:
        return True
    return False

def apply_rule_overrides(drug_row, food_row, sev_ml: int, reasons: List[str]):
    sev = int(sev_ml)
    rs = list(reasons)


    # inside apply_rule_overrides
    vitk = float(food_row.get("vitamin_k_proxy", 0.0))
    leafy = int(food_row.get("is_leafy_green", 0))
    
    if ("warfarin" in str(drug_row.get("Contains","")).lower() or "anticoagulant" in str(drug_row.get("combined_text","")).lower()) and (vitk >= 100 or leafy == 1):
        sev = max(sev, 1)
        if "vitk_warfarin" not in rs:
            rs.append("vitk_warfarin")

    # 1) Diabetes + high-carb
    if drug_looks_antidiabetic(drug_row) and food_is_high_carb(food_row):
        sev = max(sev, 1)
        if "glycemic_control" not in rs:
            rs.append("glycemic_control")

    # 2) High fiber -> slow absorption (dynamic explanation use කරගන්න)
    fiber = float(food_row.get("fiber", 0.0))
    if fiber >= 5.0:
        if "high_fiber_absorption" not in rs:
            rs.append("high_fiber_absorption")

    return sev, rs




risk_map = {
    0: "Safe – No major interaction identified.",
    1: "Moderate – Use with caution and follow food/alcohol advice.",
    2: "High Risk – Avoid this combination; consult a doctor or pharmacist.",
}


# =========================================================
# DRUG NAME -> INDEX RESOLUTION
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

        if k in _DRUG_NAME_INDEX:
            out.append(_DRUG_NAME_INDEX[k])
            continue

        close = get_close_matches(k, keys, n=1, cutoff=0.8)
        if close:
            out.append(_DRUG_NAME_INDEX[close[0]])
            continue

        raise HTTPException(status_code=404, detail=f"Drug name not found: '{raw}'")

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
    bad = df["food_type"].astype(str).str.strip().str.lower().isin(["unknown", "", "0", "nan", "none"])
    if bad.any() and food_type_model is not None:
        def fix_one(name: str) -> str:
            label, conf = predict_food_type_safe(name)
            return label if conf >= FOODTYPE_CONF_THRESHOLD else "unknown"
        df.loc[bad, "food_type"] = df.loc[bad, "Food"].apply(fix_one)
    return df


# Apply to both
unified_foods = apply_food_type_autofix(unified_foods)
mealplan_foods = apply_food_type_autofix(mealplan_foods)


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
# FALLBACK RULE LABELS
# =========================================================
MEAT_KEYWORDS = [
    "chicken", "beef", "pork", "mutton", "lamb",
    "fish", "tuna", "salmon", "anchovy", "sardine",
    "shrimp", "prawn", "crab", "lobster",
    "bacon", "sausage", "ham", "steak", "burger",
    "turkey", "duck"
]
EGG_KEYWORDS = ["egg", "omelet", "omelette", "boiled egg", "fried egg", "scrambled"]

HIGH_SUGAR_KEYWORDS = ["cake", "cookie", "soda", "cola", "candy", "ice cream", "chocolate", "sweet", "syrup"]
HIGH_SODIUM_KEYWORDS = ["pickle", "canned", "processed", "instant", "soy sauce", "chips", "noodles", "salted"]


def rule_is_vegetarian(food_name: str) -> bool:
    s = normalize_food_name(food_name)
    if any(k in s for k in MEAT_KEYWORDS):
        return False
    if any(k in s for k in EGG_KEYWORDS):
        return False
    return True


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
# PREFERENCE ML PREDICTION
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

    # Vegetarian: diet_type if known else fallback rules
    if "diet_type" in out.columns:
        dt = out["diet_type"].astype(str).str.strip().str.lower()
        pref_from_dt = dt.isin(["veg", "vegetarian"])
        fallback = out["Food"].apply(rule_is_vegetarian)
        out["pref_vegetarian"] = pref_from_dt.where(dt != "unknown", fallback)
    else:
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
# SRI LANKAN PLATE PICKING
# =========================================================
ROLE_MAP = {
    "main": "main",
    "rice": "main",
    "grain": "main",
    "bread": "main",
    "pasta": "main",

    "protein": "protein",
    "meat": "protein",
    "fish": "protein",
    "egg": "protein",
    "legume": "protein",
    "pulse": "protein",

    "vegetable": "vegetable",

    "drink": "drink",
    "dessert": "side",
    "side": "side",
    "snack": "side",
    "condiment": "side",
    "unknown": "main",
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

    used: Set[str] = set()
    for r in [chosen_main, chosen_prot, chosen_veg]:
        if r is not None:
            used.add(str(r["Food_norm"]))

    def pick_fallback(exclude, tgt, allowed_roles):
        pool = df[~df["Food_norm"].isin(exclude)].copy()
        pool = pool[pool["role"] != "drink"]
        pool = pool[pool["role"].isin(list(allowed_roles))]
        if pool.empty:
            return None
        pool["diff"] = (pool["energy"] - tgt).abs()
        return pool.sort_values("diff").iloc[0]

    if chosen_main is None:
        # if no "main" in dataset after filtering, allow any non-drink item
        chosen_main = pick_fallback(used, main_target, {"main", "protein", "vegetable", "side"})
        if chosen_main is not None:
            used.add(str(chosen_main["Food_norm"]))


    if chosen_prot is None:
        chosen_prot = pick_fallback(used, prot_target, {"protein", "vegetable", "side"})
        if chosen_prot is not None:
            used.add(str(chosen_prot["Food_norm"]))

    if chosen_veg is None:
        chosen_veg = pick_fallback(used, veg_target, {"vegetable", "side"})
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


def predict_reasons_multi(drug_indices: List[int], food_row: pd.Series) -> List[str]:
    reasons: Set[str] = set()
    for idx in drug_indices:
        drug_row = drug_clean.iloc[idx]
        for r in predict_reasons_one(drug_row, food_row):
            reasons.add(r)
    return sorted(list(reasons))


def explain_features_multi(drug_indices: List[int], food_row: pd.Series) -> Dict[str, Any]:
    per_drug = []
    for idx in drug_indices:
        drug_row = drug_clean.iloc[idx]
        per_drug.append({
            "drug": str(drug_row.get("Name", f"drug#{idx}")),
            "explanation": explain_features(drug_row, food_row),
        })
    return {"per_drug": per_drug}


# =========================================================
# CORE: build 1 meal for many drugs (variety across days)
# =========================================================
def build_one_meal_for_drugs(
    drug_indices: List[int],
    meal_type: str,
    calories_target: float,
    avoid_set: Set[str],
    vegetarian: bool,
    diabetic_friendly: bool,
    low_sodium: bool,
    exclude_foods: Set[str],
    exclude_clusters: Set[int],
    foods_source: pd.DataFrame = unified_foods,
) -> Dict[str, Any]:
    mt = meal_type.strip().lower()

    pool = foods_source[
        foods_source["meal_type"].astype(str).str.lower().str.contains(mt, na=False)
    ].copy()
    if pool.empty:
        pool = foods_source.copy()

    pool = quality_filter(pool)

    pool["Food_norm"] = pool["Food"].astype(str).str.strip().str.lower()
    if exclude_foods:
        pool = pool[~pool["Food_norm"].isin(exclude_foods)]

    if exclude_clusters:
        pool = pool[~pool["cluster_id"].fillna(-1).astype(int).isin(exclude_clusters)]

    if pool.empty:
        return {"message": "No foods available after exclusions.", "meal": None}

    seed = secrets.randbits(32)
    pool = pool.sample(n=min(len(pool), 900), random_state=seed).reset_index(drop=True)

    safe_df = compute_safe_foods_for_all_drugs(drug_indices, pool) if drug_indices else pool.copy()
    if safe_df.empty:
        return {"message": "No safe foods found for these drugs.", "meal": None}

    if drug_indices:
        safe_df["max_severity"] = safe_df.get("max_severity", 0)

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

    safe_df = safe_df.copy()
    safe_df["pred_severity"] = safe_df.get("max_severity", 0) if drug_indices else 0

    chosen, score_debug = pick_best_scored_plate(
        safe_df=safe_df,
        target_kcal=calories_target,
        used_foods=exclude_foods,
        used_clusters=exclude_clusters,
        want_veg=vegetarian,
        want_diabetic=diabetic_friendly,
        want_low_sodium=low_sodium,
        num_candidates=70,
    )

    def pack_item(r: Optional[pd.Series]) -> Optional[Dict[str, Any]]:
        if r is None:
            return None
        q = str(r.get("quantity") or "").strip()
        img = str(r.get("image") or "").strip()
        allergens = resolve_allergens(r["Food"])
        prefs = {
            "vegetarian": bool(r.get("pref_vegetarian", False)),
            "diabetic_friendly": bool(r.get("pref_diabetic", False)),
            "low_sodium": bool(r.get("pref_low_sodium", False)),
        }
        return {
            "food": str(r["Food"]),
            "food_type": str(r.get("food_type", "unknown")),
            "diet_type": str(r.get("diet_type", "unknown")),
            "energy": safe_float(r.get("energy")),
            "quantity": q if q else None,
            "image": img if img else None, 
            "severity": int(r.get("max_severity", r.get("pred_severity", 0))),
            "reasons": predict_reasons_multi(drug_indices, r) if drug_indices else [],
            "allergens_detected": allergens,
            "preferences": prefs,
            "explanation": explain_features_multi(drug_indices, r) if drug_indices else {"note": "no-drug mode"},
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
# FASTAPI APP
# =========================================================
app = FastAPI(title="PharmaLink Meal Plan API", version="4.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = DATA_DIR / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# =========================================================
# API MODELS
# =========================================================
class FoodDrugRequest(BaseModel):
    drug_name: str
    food_name: str
    safe_food_limit: int = 10
    diversify_seed: Optional[int] = None


class SafeFoodItem(BaseModel):
    food: str
    food_type: str
    energy: float
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0
    fiber: float = 0.0
    sugars: float = 0.0
    sodium: float = 0.0
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
    # drug_names OPTIONAL now
    drug_names: List[str] = Field(default_factory=list)

    days: int = 3
    meals_per_day: int = 3
    calories_per_day: int = 1800
    meal_types: Optional[List[str]] = None
    allergies: List[str] = Field(default_factory=list)

    vegetarian: bool = False
    diabetic_friendly: bool = False
    low_sodium: bool = False
    debug_score: bool = False


class MealItem(BaseModel):
    food: str
    food_type: str
    energy: float
    severity: int
    quantity: Optional[str] = None   
    image: Optional[str] = None 
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

class SymptomPredictRequest(BaseModel):
    symptoms: List[str] = Field(default_factory=list)
    top_k: int = 5

class SymptomPredictItem(BaseModel):
    disease: str
    prob: float

class SymptomPredictResponse(BaseModel):
    results: List[SymptomPredictItem]

class PatientProfile(BaseModel):
    age: Optional[int] = None
    sex: Optional[str] = None  # "male"/"female"
    pregnant: int = 0
    diabetes: int = 0
    hypertension: int = 0
    asthma: int = 0
    kidney_disease: int = 0
    liver_disease: int = 0
    allergy_penicillin: int = 0

class RecommendDrugsRequest(BaseModel):
    symptoms: List[str] = Field(default_factory=list)
    top_k_diseases: int = 3
    patient: PatientProfile = Field(default_factory=PatientProfile)

class DiseaseDrugRecoItem(BaseModel):
    disease: str
    prob: float
    first_line_drugs: List[str] = []
    second_line_drugs: List[str] = []
    avoid_drugs: List[str] = []
    safety_warnings: List[str] = []

class RecommendDrugsResponse(BaseModel):
    results: List[DiseaseDrugRecoItem]

class SymptomDrugRecoItem(BaseModel):
    symptom: str
    prob: float = 1.0
    first_line_drugs: List[str] = []
    second_line_drugs: List[str] = []
    avoid_drugs: List[str] = []
    safety_warnings: List[str] = []

class CombinedRecoResponse(BaseModel):
    direct_symptom_recommendations: List[SymptomDrugRecoItem] = []
    predicted_disease_recommendations: List[DiseaseDrugRecoItem] = []

# =========================================================
# SAFE FOODS SUGGESTION (SINGLE DRUG)
# =========================================================
def suggest_safe_foods_for_drug(
    drug_row: pd.Series,
    limit: int = 10,
    foods_source: pd.DataFrame = mealplan_foods,
    exclude_foods: Optional[Set[str]] = None,
    recent_clusters: Optional[Set[int]] = None,
    rng: Optional[np.random.Generator] = None, 
) -> List[Dict[str, Any]]:
    pool = foods_source.copy()
    pool = quality_filter(pool)

    if pool.empty:
        return []

    exclude_foods = {normalize_food_name(x) for x in (exclude_foods or set())}
    recent_clusters = set(recent_clusters or set())

    pool["pred_severity"] = predict_severity_batch(drug_row, pool)
    safe_df = pool[pool["pred_severity"] == 0].copy()

    if safe_df.empty:
        return []

    # fallback missing numeric cols
    for col in ["protein", "carbs", "fat", "fiber", "sugars", "sodium", "energy"]:
        if col not in safe_df.columns:
            safe_df[col] = 0.0
        safe_df[col] = pd.to_numeric(safe_df[col], errors="coerce").fillna(0.0)

    if "food_type" not in safe_df.columns:
        safe_df["food_type"] = "unknown"

    if "cluster_id" not in safe_df.columns:
        safe_df["cluster_id"] = -1

    safe_df["Food_norm"] = safe_df["Food"].astype(str).str.strip().str.lower()
    safe_df = safe_df.drop_duplicates(subset=["Food_norm"], keep="first").reset_index(drop=True)

    # remove explicitly excluded foods
    if exclude_foods:
        safe_df = safe_df[~safe_df["Food_norm"].isin(exclude_foods)].copy()

    if safe_df.empty:
        return []

    # Base ranking
    safe_df["rank_score"] = (
        (safe_df["energy"].fillna(0) - 250).abs() / 100
        + safe_df["sodium"].fillna(0) / 1000
        + safe_df["fat"].fillna(0) / 100
    )

    # preference for more balanced foods
    safe_df["nutrition_bonus"] = (
        safe_df["protein"].fillna(0) * 0.04
        + safe_df["fiber"].fillna(0) * 0.06
        - safe_df["sugars"].fillna(0) * 0.03
    )

    # penalties to reduce repetition
    safe_df["repeat_food_penalty"] = safe_df["Food_norm"].apply(
        lambda x: 3.0 if x in exclude_foods else 0.0
    )
    safe_df["repeat_cluster_penalty"] = safe_df["cluster_id"].apply(
        lambda x: 1.5 if int(x) in recent_clusters and int(x) != -1 else 0.0
    )

    # final score: lower is better
    safe_df["final_rank"] = (
        safe_df["rank_score"]
        + safe_df["repeat_food_penalty"]
        + safe_df["repeat_cluster_penalty"]
        - safe_df["nutrition_bonus"]
    )

    # keep only good candidates, not always the exact same top rows
    candidate_pool = safe_df.sort_values("final_rank").head(min(len(safe_df), 40)).copy()

    # random shuffle inside similar quality bands
    if rng is None:
        rng = np.random.default_rng()

    candidate_pool["noise"] = rng.uniform(0.0, 0.35, size=len(candidate_pool))
    #candidate_pool["noise"] = np.random.uniform(0.0, 0.35, size=len(candidate_pool))
    candidate_pool["sample_rank"] = candidate_pool["final_rank"] + candidate_pool["noise"]
    candidate_pool = candidate_pool.sort_values("sample_rank").reset_index(drop=True)

    selected_rows = []
    used_food_types = set()
    used_clusters = set()

    # pass 1: maximize diversity by food_type + cluster
    for _, row in candidate_pool.iterrows():
        ft = str(row.get("food_type", "unknown")).strip().lower() or "unknown"
        cid = int(row.get("cluster_id", -1))

        if ft in used_food_types:
            continue
        if cid in used_clusters and cid != -1:
            continue

        selected_rows.append(row)
        used_food_types.add(ft)
        if cid != -1:
            used_clusters.add(cid)

        if len(selected_rows) >= int(limit):
            break

    # pass 2: allow same food_type but avoid same cluster
    if len(selected_rows) < int(limit):
        chosen_foods = {str(r["Food"]).strip().lower() for r in selected_rows}
        for _, row in candidate_pool.iterrows():
            fname = str(row["Food"]).strip().lower()
            cid = int(row.get("cluster_id", -1))
            if fname in chosen_foods:
                continue
            if cid in used_clusters and cid != -1:
                continue

            selected_rows.append(row)
            chosen_foods.add(fname)
            if cid != -1:
                used_clusters.add(cid)

            if len(selected_rows) >= int(limit):
                break

    # pass 3: fill remaining from rest
    if len(selected_rows) < int(limit):
        chosen_foods = {str(r["Food"]).strip().lower() for r in selected_rows}
        for _, row in candidate_pool.iterrows():
            fname = str(row["Food"]).strip().lower()
            if fname in chosen_foods:
                continue

            selected_rows.append(row)
            chosen_foods.add(fname)

            if len(selected_rows) >= int(limit):
                break

    out: List[Dict[str, Any]] = []
    for _, r in pd.DataFrame(selected_rows).head(int(limit)).iterrows():
        out.append({
            "food": str(r["Food"]),
            "food_type": str(r.get("food_type", "unknown")),
            "energy": safe_float(r.get("energy")),
            "protein": safe_float(r.get("protein")),
            "carbs": safe_float(r.get("carbs")),
            "fat": safe_float(r.get("fat")),
            "fiber": safe_float(r.get("fiber")),
            "sugars": safe_float(r.get("sugars")),
            "sodium": safe_float(r.get("sodium")),
            "severity": int(r.get("pred_severity", 0)),
            "reasons": predict_reasons_one(drug_row, r),
            "explanation": explain_features(drug_row, r),
            "cluster_id": int(r.get("cluster_id", -1)),
        })
    return out

def _split_pipe_list(s: Any) -> List[str]:
    if s is None:
        return []
    txt = str(s).strip()
    if not txt or txt.lower() in ["nan", "none"]:
        return []
    # accept both "|" and "," if user typed
    txt = txt.replace(",", "|")
    items = [x.strip().lower() for x in txt.split("|") if x.strip()]
    # dedup keep order
    seen = set()
    out = []
    for it in items:
        if it not in seen:
            seen.add(it)
            out.append(it)
    return out

def _symptom_row_lookup(symptom_name: str) -> Optional[pd.Series]:
    s = str(symptom_name).strip().lower()
    if not s:
        return None

    m = symptom_drug_reco[symptom_drug_reco["symptom"] == s]
    if not m.empty:
        return m.iloc[0]

    # fuzzy match (optional)
    choices = symptom_drug_reco["symptom"].dropna().astype(str).tolist()
    close = get_close_matches(s, choices, n=1, cutoff=0.85)
    if close:
        m2 = symptom_drug_reco[symptom_drug_reco["symptom"] == close[0]]
        if not m2.empty:
            return m2.iloc[0]

    return None

def _disease_row_lookup(disease_name: str) -> Optional[pd.Series]:
    d = str(disease_name).strip().lower()
    if not d:
        return None

    m = disease_drug_reco[disease_drug_reco["disease"] == d]
    if not m.empty:
        return m.iloc[0]

    choices = disease_drug_reco["disease"].dropna().astype(str).tolist()
    close = get_close_matches(d, choices, n=1, cutoff=0.80)
    if close:
        m2 = disease_drug_reco[disease_drug_reco["disease"] == close[0]]
        if not m2.empty:
            return m2.iloc[0]

    return None

def _eval_condition(condition: str, patient: PatientProfile) -> bool:
    """
    super-simple condition parser:
      examples:
        pregnant=1
        diabetes=1
        kidney_disease=1
        age>=65
        sex=female
    """
    cond = str(condition).strip().lower()
    if not cond:
        return False

    # age comparisons
    m = re.match(r"age\s*(>=|<=|>|<|==)\s*(\d+)", cond)
    if m:
        op, num = m.group(1), int(m.group(2))
        if patient.age is None:
            return False
        a = int(patient.age)
        if op == ">=": return a >= num
        if op == "<=": return a <= num
        if op == ">":  return a > num
        if op == "<":  return a < num
        if op == "==": return a == num
        return False

    # sex
    m = re.match(r"sex\s*=\s*(male|female)", cond)
    if m:
        want = m.group(1)
        return str(patient.sex or "").strip().lower() == want

    # boolean flags like pregnant=1
    m = re.match(r"([a-z_]+)\s*=\s*(0|1)", cond)
    if m:
        field, val = m.group(1), int(m.group(2))
        if not hasattr(patient, field):
            return False
        return int(getattr(patient, field) or 0) == val

    return False

def apply_contra_safety(drug_list: List[str], patient: PatientProfile) -> Tuple[List[str], List[str]]:
    """
    returns: (filtered_drugs, warnings)
    """
    drugs = [d.strip().lower() for d in drug_list if str(d).strip()]
    if not drugs:
        return [], []

    avoid_union: Set[str] = set()
    warnings: List[str] = []

    for _, r in contra_rules.iterrows():
        cond = str(r.get("condition", "")).strip()
        if _eval_condition(cond, patient):
            avoid = _split_pipe_list(r.get("avoid_drugs", ""))
            avoid_union.update(avoid)
            msg = str(r.get("message", "")).strip()
            rid = str(r.get("rule_id", "")).strip()
            if msg:
                warnings.append(f"{rid}: {msg}" if rid else msg)

    filtered = [d for d in drugs if d not in avoid_union]
    return filtered, warnings

def _build_symptom_input(symptoms: List[str]) -> pd.DataFrame:
    """
    Build model input with correct feature names to avoid sklearn warning.
    """
    x = np.zeros(len(symptom_feature_cols), dtype=np.uint8)

    for s in symptoms or []:
        key = str(s).strip().lower()
        if key in symptom_col_index:
            x[symptom_col_index[key]] = 1

    # IMPORTANT: use DataFrame with column names
    X_df = pd.DataFrame([x], columns=symptom_feature_cols)
    return X_df

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
        "new_foodset_path": str(new_food_path),
        "unified_foods_count": int(len(unified_foods)),
        "mealplan_foods_count": int(len(mealplan_foods)),
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
    # unified foods (food_subset + new_foodset)
    df = unified_foods
    if q:
        mask = df["Food"].astype(str).str.lower().str.contains(q.lower(), na=False)
        df = df[mask]
    df = df.head(limit)
    return [{
        "name": str(r["Food"]),
        "meal_type": str(r.get("meal_type", "")),
        "food_type": str(r.get("food_type", "")),
        "diet_type": str(r.get("diet_type", "")),
        "cluster_id": int(r.get("cluster_id", -1)),
    } for _, r in df.iterrows()]


@app.get("/foods-mealplan")
def list_mealplan_foods(q: Optional[str] = None, limit: int = 50):
    # meal-plan foods ONLY (new_foodset)
    df = mealplan_foods
    if q:
        mask = df["Food"].astype(str).str.lower().str.contains(q.lower(), na=False)
        df = df[mask]
    df = df.head(limit)
    return [{
        "name": str(r["Food"]),
        "meal_type": str(r.get("meal_type", "")),
        "food_type": str(r.get("food_type", "")),
        "diet_type": str(r.get("diet_type", "")),
        "cluster_id": int(r.get("cluster_id", -1)),
    } for _, r in df.iterrows()]


@app.post("/ml-food-drug-risk", response_model=FoodDrugResponse)
def ml_food_drug_risk(body: FoodDrugRequest):
    rng = np.random.default_rng(
      body.diversify_seed if body.diversify_seed is not None else secrets.randbits(32)
    )
    if not body.drug_name or not body.food_name:
        raise HTTPException(status_code=400, detail="drug_name and food_name are required")

    drug_indices = resolve_indices_from_names([body.drug_name])
    if not drug_indices:
        raise HTTPException(status_code=404, detail="Drug name not found")

    idx = drug_indices[0]
    drug_row = drug_clean.iloc[idx]

    matches = unified_foods[
        unified_foods["Food"].astype(str).str.lower() == str(body.food_name).strip().lower()
    ]
    if matches.empty:
        raise HTTPException(status_code=404, detail=f"Food '{body.food_name}' not found")

    food_row = matches.iloc[0]

    sev_ml, reasons_ml = ml_predict_one(drug_row, food_row)
    sev_ml, reasons_ml = apply_rule_overrides(drug_row, food_row, sev_ml, reasons_ml)

    exp = explain_features(drug_row, food_row)
    exp["reason_details"] = build_reason_details(drug_row, food_row, reasons_ml)

    safe_foods: List[Dict[str, Any]] = []
    if int(sev_ml) >= 1:
        safe_foods = suggest_safe_foods_for_drug(
            drug_row=drug_row,
            limit=int(body.safe_food_limit or 10),
            foods_source=mealplan_foods,
            exclude_foods={str(food_row["Food"])},
            recent_clusters={int(food_row.get("cluster_id", -1))} if "cluster_id" in food_row else set(),
            rng=rng,   
        )

    return FoodDrugResponse(
        drug=str(drug_row["Name"]),
        food=str(food_row["Food"]),
        severity=int(sev_ml),
        message=risk_map[int(sev_ml)],
        reasons=reasons_ml,
        explanation=exp,
        safe_foods=safe_foods,
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

    avoid_set: Set[str] = set()
    if avoid_allergens:
        avoid_set = {a.strip().lower() for a in avoid_allergens.split(",") if a.strip()}

    result = build_one_meal_for_drugs(
        drug_indices=[drug_index],
        meal_type=meal_type,
        calories_target=float(calories_target),
        avoid_set=avoid_set,
        vegetarian=vegetarian,
        diabetic_friendly=diabetic_friendly,
        low_sodium=low_sodium,
        exclude_foods=set(),
        exclude_clusters=set(),
        foods_source=mealplan_foods,  # meal plan dataset
    )

    out = {
        "drug": str(drug_clean.iloc[drug_index]["Name"]),
        "meal_type": meal_type,
        "target_kcal": calories_target,
        "estimated_kcal": result.get("estimated_kcal", 0),
        "meal": result["meal"],
        "message": result["message"],
    }
    if debug_score:
        out["score_debug"] = result.get("score_debug", {})
    return out


@app.post("/ml-meal-plan-generate", response_model=MealPlanResponse)
def ml_meal_plan_generate(body: MealPlanRequest):
    # drug_names optional now (no-drug mode ok)

    if body.days <= 0 or body.days > 30:
        raise HTTPException(status_code=400, detail="days must be between 1 and 30")

    # FIX: 1..6 and message match
    if body.meals_per_day <= 0 or body.meals_per_day > 6:
        raise HTTPException(status_code=400, detail="meals_per_day must be between 1 and 6")

    if body.calories_per_day <= 0:
        raise HTTPException(status_code=400, detail="calories_per_day must be > 0")

    drug_indices = resolve_indices_from_names(body.drug_names) if body.drug_names else []
    # if user provided drug_names but none valid -> error
    if body.drug_names and not drug_indices:
        raise HTTPException(status_code=404, detail="No valid drug names found")

    if body.meal_types and len(body.meal_types) > 0:
        meal_types = [str(x).strip().lower() for x in body.meal_types if str(x).strip()]
    else:
        meal_types = ["breakfast", "lunch", "dinner", "snack", "snack2", "supper"]
    meal_types = meal_types[:body.meals_per_day]

    avoid_set = {a.strip().lower() for a in body.allergies if a and a.strip()}
    per_meal_kcal = float(body.calories_per_day) / float(body.meals_per_day)

    used_foods: Set[str] = set()
    used_clusters: Set[int] = set()

    days_out: List[DayPlan] = []

    for d in range(1, body.days + 1):
        meals_out: List[Meal] = []

        for mt in meal_types:
            res = build_one_meal_for_drugs(
                drug_indices=drug_indices,
                meal_type=mt,
                calories_target=per_meal_kcal,
                avoid_set=avoid_set,
                vegetarian=body.vegetarian,
                diabetic_friendly=body.diabetic_friendly,
                low_sodium=body.low_sodium,
                exclude_foods=used_foods,
                exclude_clusters=used_clusters,
                foods_source=mealplan_foods,  # always generate from new_foodset
            )

            if not res.get("meal"):
                raise HTTPException(
                    status_code=404,
                    detail=f"Could not generate meal for day {d}, meal '{mt}': {res.get('message')}"
                )

            meal_dict = res["meal"]

            for key in ["main", "protein", "vegetable"]:
                it = meal_dict.get(key)
                if it:
                    used_foods.add(normalize_food_name(it["food"]))
                    cid = int(it.get("cluster_id", -1))
                    if cid != -1:
                        used_clusters.add(cid)

            def to_meal_item(it: Dict[str, Any]) -> MealItem:
                return MealItem(
                    food=str(it["food"]),
                    food_type=str(it.get("food_type", "unknown")),
                    energy=float(it.get("energy", 0.0)),
                    severity=int(it.get("severity", 0)),
                    quantity=(str(it.get("quantity")).strip() if it.get("quantity") else None),
                    image=(str(it.get("image")).strip() if it.get("image") else None),
                    reasons=list(it.get("reasons", [])),
                    allergens_detected=list(it.get("allergens_detected", [])),
                    preferences=dict(it.get("preferences", {})),
                    explanation=dict(it.get("explanation", {})),
                )

            main_item = to_meal_item(meal_dict["main"])
            prot_item = to_meal_item(meal_dict["protein"]) if meal_dict.get("protein") else None
            veg_item = to_meal_item(meal_dict["vegetable"]) if meal_dict.get("vegetable") else None

            meals_out.append(Meal(
                name=f"{mt}",
                target_kcal=float(res.get("target_kcal", per_meal_kcal)),
                estimated_kcal=float(res.get("estimated_kcal", 0.0)),
                main=main_item,
                protein=prot_item,
                vegetable=veg_item,
            ))

        days_out.append(DayPlan(day=d, meals=meals_out))

    return MealPlanResponse(
        drug_names=body.drug_names,
        drug_indices=drug_indices,
        days=days_out
    )


def _norm(s: str) -> str:
    s = str(s).strip().lower()
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


@app.post("/predict-drug-from-image")
async def predict_drug_from_image_api(
    file: UploadFile = File(...),
    topk: int = 1,   # default topk=1
):
    # validate image file
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload a valid image.")

    img_bytes = await file.read()
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    # sanitize topk (force >=1)
    try:
        topk_int = int(topk)
    except Exception:
        topk_int = 1
    if topk_int <= 0:
        topk_int = 1

    #  predict (but we will still return only 1)
    preds = predict_drug_from_image_core(img, topk=topk_int)

    #  enrich predictions (if drug_vision_info.csv exists)
    enriched: List[Dict[str, Any]] = []

    # cache _brand_key only once (avoid recompute each request)
    if drug_vision_info is not None and "_brand_key" not in drug_vision_info.columns:
        drug_vision_info["_brand_key"] = drug_vision_info["brand_name"].apply(_norm)

    for p in preds:
        pred_name = str(p.get("drug_name", ""))
        key = _norm(pred_name)

        # no csv => return raw prediction
        if drug_vision_info is None:
            enriched.append(p)
            continue

        m = drug_vision_info[drug_vision_info["_brand_key"] == key]

        # fallback: fuzzy match
        if m.empty:
            choices = drug_vision_info["_brand_key"].tolist()
            close = get_close_matches(key, choices, n=1, cutoff=0.8)
            if close:
                m = drug_vision_info[drug_vision_info["_brand_key"] == close[0]]

        if not m.empty:
            row = m.iloc[0].drop(
                labels=[c for c in ["_brand_key"] if c in m.columns],
                errors="ignore"
            ).to_dict()
            enriched.append({**p, **row})
        else:
            enriched.append(p)

    # ALWAYS return ONLY 1 prediction
    return {"predictions": enriched[:1]}


@app.post("/symptom-predict", response_model=SymptomPredictResponse)
def symptom_predict(body: SymptomPredictRequest):
    if symptom_model is None:
        raise HTTPException(status_code=500, detail="Symptom model not loaded. Check model files in /model folder.")

    X_df = _build_symptom_input(body.symptoms)

    probs = symptom_model.predict_proba(X_df)[0]
    classes = symptom_model.classes_

    top_k = int(body.top_k or 5)
    top_k = max(1, min(top_k, 20))

    top_idx = np.argsort(probs)[::-1][:top_k]

    results = [{"disease": str(classes[i]), "prob": float(round(probs[i], 4))} for i in top_idx]
    return {"results": results}

@app.post("/recommend-drugs-from-symptoms", response_model=CombinedRecoResponse)
def recommend_drugs_from_sypmtoms(body: RecommendDrugsRequest):

    input_symptoms = [str(s).strip().lower() for s in (body.symptoms or []) if str(s).strip()]
    if not input_symptoms:
        return {"direct_symptom_recommendations": [], "predicted_disease_recommendations": []}

    # -------------------------
    # A) DIRECT: symptom -> drugs
    # -------------------------
    direct_out = []
    for sym in input_symptoms:
        row = _symptom_row_lookup(sym)

        first_line = _split_pipe_list(row.get("first_line_drugs")) if row is not None else []
        second_line = _split_pipe_list(row.get("second_line_drugs")) if row is not None else []
        avoid_drugs = _split_pipe_list(row.get("avoid_drugs")) if row is not None else []

        combined = first_line + second_line
        safe_drugs, warnings = apply_contra_safety(combined, body.patient)

        direct_out.append({
            "symptom": sym,
            "prob": 1.0,
            "first_line_drugs": [d for d in first_line if d in safe_drugs],
            "second_line_drugs": [d for d in second_line if d in safe_drugs],
            "avoid_drugs": avoid_drugs,
            "safety_warnings": warnings,
        })

    # -------------------------
    # B) PREDICT: symptoms -> diseases -> drugs
    # -------------------------
    disease_out = []
    if symptom_model is not None:
        X_df = _build_symptom_input(input_symptoms)
        probs = symptom_model.predict_proba(X_df)[0]
        classes = symptom_model.classes_

        k = int(body.top_k_diseases or 3)
        k = max(1, min(k, 10))
        top_idx = np.argsort(probs)[::-1][:k]

        for i in top_idx:
            dis = str(classes[i]).strip().lower()
            prob = float(round(probs[i], 4))

            row = _disease_row_lookup(dis)
            first_line = _split_pipe_list(row.get("first_line_drugs")) if row is not None else []
            second_line = _split_pipe_list(row.get("second_line_drugs")) if row is not None else []
            avoid_drugs = _split_pipe_list(row.get("avoid_drugs")) if row is not None else []

            combined = first_line + second_line
            safe_drugs, warnings = apply_contra_safety(combined, body.patient)

            disease_out.append({
                "disease": dis,
                "prob": prob,
                "first_line_drugs": [d for d in first_line if d in safe_drugs],
                "second_line_drugs": [d for d in second_line if d in safe_drugs],
                "avoid_drugs": avoid_drugs,
                "safety_warnings": warnings,
            })

    return {
        "direct_symptom_recommendations": direct_out,
        "predicted_disease_recommendations": disease_out
    }