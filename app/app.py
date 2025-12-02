from pathlib import Path
from typing import List, Optional

import joblib
import pandas as pd
import scipy.sparse as sp
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # .../PharmaLink
MODEL_DIR = BASE_DIR / "model"
DATA_DIR = BASE_DIR / "data"

# ---------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------
app = FastAPI(
    title="PharmaLink Food–Drug Interaction API",
    version="1.0.0",
    description="Backend service for drug risk and food–drug interaction checking.",
)

# Allow frontend (adjust origins if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # in production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Load model and data at startup
# ---------------------------------------------------------
# ML artifacts
rf = joblib.load(MODEL_DIR / "food_drug_risk_model.pkl")
tfidf = joblib.load(MODEL_DIR / "tfidf_vectorizer.pkl")
encoders = joblib.load(MODEL_DIR / "category_encoders.pkl")  # not used directly, but available

# Drug & food data
drug_clean = pd.read_csv(DATA_DIR / "drug_clean.csv")
food_subset = pd.read_csv(DATA_DIR / "food_subset.csv")

# Categorical columns used as numeric features
cat_cols = ["Chemical_Class", "Habit_Forming", "Therapeutic_Class", "Action_Class"]

# Ensure categorical columns are numeric (label-encoded)
for col in cat_cols:
    if col in drug_clean.columns:
        drug_clean[col] = pd.to_numeric(drug_clean[col], errors="coerce").fillna(0).astype(int)

# Ensure numeric types for food nutrients / flags
nutrient_cols = [
    "energy", "protein", "fat", "carbs", "fiber",
    "calcium", "iron", "vitamin_c", "folate",
    "vitamin_a", "vitamin_e", "vitamin_k_proxy",
]
for col in nutrient_cols:
    if col in food_subset.columns:
        food_subset[col] = pd.to_numeric(food_subset[col], errors="coerce").fillna(0.0)

for flag_col in ["is_alcohol", "is_leafy_green"]:
    if flag_col in food_subset.columns:
        food_subset[flag_col] = food_subset[flag_col].fillna(0).astype(int)

food_subset = food_subset.fillna(0)

# ---------------------------------------------------------
# Globals: risk messages and keyword lists
# ---------------------------------------------------------
risk_map = {
    0: "Safe – No major interaction identified.",
    1: "Moderate – Use with caution and follow food/alcohol advice.",
    2: "High Risk – Avoid this combination; consult a doctor or pharmacist.",
}

cns_keywords = ["antipsychotic", "antidepressant", "antihistamine", "sedative", "antiepileptic"]
abx_keywords = ["amoxycillin", "ciprofloxacin", "tetracycline", "doxycycline"]
leafy_words = [
    "spinach", "mukunuwenna", "gotu kola", "gotukola",
    "kankun", "kale", "cabbage", "lettuce",
    "amaranth", "green leaves", "leafy",
]

# ---------------------------------------------------------
# Helper functions (same logic as notebook)
# ---------------------------------------------------------
def build_feature_for_drug(index: int):
    """Build sparse feature vector (TFIDF + categorical) for a single drug row."""
    if index < 0 or index >= len(drug_clean):
        raise IndexError("Drug index out of range")

    # text feature
    text = str(drug_clean.loc[index, "combined_text"])
    text_vec = tfidf.transform([text])

    # categorical features (ensure numeric)
    cat_series = drug_clean.loc[index, cat_cols]
    cat_vals = pd.to_numeric(cat_series, errors="coerce").fillna(0).to_numpy().reshape(1, -1)
    cat_sparse = sp.csr_matrix(cat_vals)

    # combine
    X_input = sp.hstack([text_vec, cat_sparse]).tocsr()
    return X_input


def predict_drug_risk(index: int) -> int:
    X_input = build_feature_for_drug(index)
    pred = rf.predict(X_input)[0]
    return int(pred)


def check_food_drug_interaction(drug_index: int, food_row: pd.Series) -> int:
    # --- drug info ---
    drug_contains = str(drug_clean.loc[drug_index, "Contains"]).lower()
    drug_text = str(drug_clean.loc[drug_index, "combined_text"]).lower()

    # base risk from ML model
    risk = predict_drug_risk(drug_index)

    # --- food info ---
    calcium = float(food_row.get("calcium", 0.0))
    iron = float(food_row.get("iron", 0.0))
    fat = float(food_row.get("fat", 0.0))
    fiber = float(food_row.get("fiber", 0.0))
    vitk = float(food_row.get("vitamin_k_proxy", 0.0))
    is_alcohol = int(food_row.get("is_alcohol", 0))

    # 1) Alcohol + CNS/sedative/antipsychotic drugs -> high risk
    if is_alcohol == 1 and any(kw in drug_text for kw in cns_keywords):
        risk = max(risk, 2)

    # 2) Antibiotics + high calcium foods -> moderate/high risk
    if any(kw in drug_contains for kw in abx_keywords) and calcium > 200:
        risk = max(risk, 1)

    # 3) Thyroid (levothyroxine) + high iron -> high risk
    if "levothyroxine" in drug_contains and iron > 5:
        risk = max(risk, 2)

    # 4) Very high fat + "take on an empty stomach"
    if fat > 20 and "take on an empty stomach" in drug_text:
        risk = max(risk, 1)

    # 5) High fiber + "slow absorption"
    if fiber > 5 and "slow absorption" in drug_text:
        risk = max(risk, 1)

    # 6) Warfarin / anticoagulant + high vit K leafy greens -> high risk
    if ("warfarin" in drug_contains or "anticoagulant" in drug_text) and vitk > 100:
        risk = max(risk, 2)

    return int(risk)


def explain_food_drug_interaction(drug_index: int, food_name: str):
    # locate food row (case-insensitive exact match)
    matches = food_subset[food_subset["Food"].str.lower() == food_name.lower()]
    if matches.empty:
        raise ValueError(f"Food '{food_name}' not found in food table")
    row = matches.iloc[0]

    risk = check_food_drug_interaction(drug_index, row)

    reasons: List[str] = []
    drug_text = str(drug_clean.loc[drug_index, "combined_text"]).lower()
    drug_contains = str(drug_clean.loc[drug_index, "Contains"]).lower()

    calcium = float(row.get("calcium", 0.0))
    iron = float(row.get("iron", 0.0))
    fat = float(row.get("fat", 0.0))
    fiber = float(row.get("fiber", 0.0))
    vitk = float(row.get("vitamin_k_proxy", 0.0))
    is_alcohol = int(row.get("is_alcohol", 0))

    if is_alcohol == 1 and any(kw in drug_text for kw in cns_keywords):
        reasons.append(
            "Alcohol can increase drowsiness and central nervous system side effects of this medicine."
        )

    if any(kw in drug_contains for kw in abx_keywords) and calcium > 200:
        reasons.append(
            "High calcium content in this food may reduce the absorption of this antibiotic."
        )

    if "levothyroxine" in drug_contains and iron > 5:
        reasons.append(
            "High iron can reduce the effectiveness of thyroid medication such as levothyroxine."
        )

    if fat > 20 and "take on an empty stomach" in drug_text:
        reasons.append(
            "High fat may slow down or alter the absorption of medicines that should be taken on an empty stomach."
        )

    if fiber > 5 and "slow absorption" in drug_text:
        reasons.append("High fibre may further slow the absorption of this medicine.")

    if ("warfarin" in drug_contains or "anticoagulant" in drug_text) and vitk > 100:
        reasons.append(
            "Leafy green foods rich in vitamin K can reduce the blood-thinning effect of anticoagulant medicines."
        )

    base_msg = risk_map[risk]
    if reasons:
        explanation = base_msg + " " + " ".join(reasons)
    else:
        explanation = (
            base_msg
            + " No specific nutrient-triggered interaction was detected for this pair."
        )

    return risk, explanation


def recommend_safe_foods(drug_index: int, top_n: int = 10):
    # base risk for the drug from ML model
    base_risk = predict_drug_risk(drug_index)

    rows = []
    for _, row in food_subset.iterrows():
        r = check_food_drug_interaction(drug_index, row)
        # keep foods that DO NOT increase risk level
        if r == base_risk:
            rows.append(row)

    if not rows:
        return []

    safe_df = pd.DataFrame(rows)
    cols_show = ["Food", "energy", "protein", "fat", "carbs", "fiber"]
    return safe_df[cols_show].head(top_n).to_dict(orient="records")

# ---------------------------------------------------------
# Pydantic models for requests / responses
# ---------------------------------------------------------
class DrugRiskRequest(BaseModel):
    drug_index: int


class FoodDrugRequest(BaseModel):
    drug_index: int
    food_name: str


class FoodDrugResponse(BaseModel):
    drug: str
    food: str
    risk: int
    message: str


# ---------------------------------------------------------
# API endpoints
# ---------------------------------------------------------
@app.get("/")
def root():
    return {"status": "ok", "message": "PharmaLink Food–Drug Interaction API running."}


@app.get("/drugs")
def list_drugs(
    q: Optional[str] = Query(default=None, description="Optional search term"),
    limit: int = 50,
):
    df = drug_clean
    if q:
        q_lower = q.lower()
        mask = df["Name"].str.lower().str.contains(q_lower)
        df = df[mask]

    df = df.head(limit)
    return [
        {
            "index": int(idx),
            "name": row["Name"],
            "contains": row["Contains"],
        }
        for idx, row in df.iterrows()
    ]


@app.get("/foods")
def list_foods(
    q: Optional[str] = Query(default=None, description="Optional search term"),
    limit: int = 50,
):
    df = food_subset
    if q:
        q_lower = q.lower()
        mask = df["Food"].str.lower().str.contains(q_lower)
        df = df[mask]

    df = df.head(limit)
    return [
        {
            "name": row["Food"],
            "is_alcohol": int(row.get("is_alcohol", 0)),
            "is_leafy_green": int(row.get("is_leafy_green", 0)),
        }
        for _, row in df.iterrows()
    ]


@app.post("/drug-risk", response_model=FoodDrugResponse)
def drug_risk(body: DrugRiskRequest):
    idx = body.drug_index
    try:
        risk = predict_drug_risk(idx)
    except IndexError:
        raise HTTPException(status_code=404, detail="Drug index out of range")

    msg = risk_map[risk]
    name = drug_clean.loc[idx, "Name"]
    return FoodDrugResponse(drug=name, food="", risk=risk, message=msg)


@app.post("/food-drug-risk", response_model=FoodDrugResponse)
def food_drug_risk(body: FoodDrugRequest):
    idx = body.drug_index
    if idx < 0 or idx >= len(drug_clean):
        raise HTTPException(status_code=404, detail="Drug index out of range")

    try:
        risk, msg = explain_food_drug_interaction(idx, body.food_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    name = drug_clean.loc[idx, "Name"]
    return FoodDrugResponse(drug=name, food=body.food_name, risk=risk, message=msg)


@app.get("/safe-foods/{drug_index}")
def safe_foods(drug_index: int, top_n: int = 10):
    if drug_index < 0 or drug_index >= len(drug_clean):
        raise HTTPException(status_code=404, detail="Drug index out of range")

    safe_list = recommend_safe_foods(drug_index, top_n=top_n)
    return {"drug": drug_clean.loc[drug_index, "Name"], "foods": safe_list}
