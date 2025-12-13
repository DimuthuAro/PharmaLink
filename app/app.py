from pathlib import Path
from typing import List, Optional
from math import inf

import joblib
import pandas as pd
import scipy.sparse as sp
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Load model and data at startup
# ---------------------------------------------------------
rf = joblib.load(MODEL_DIR / "food_drug_risk_model.pkl")
tfidf = joblib.load(MODEL_DIR / "tfidf_vectorizer.pkl")
encoders = joblib.load(MODEL_DIR / "category_encoders.pkl")  # not used directly

drug_clean = pd.read_csv(DATA_DIR / "drug_clean.csv")
food_subset = pd.read_csv(DATA_DIR / "food_subset.csv")

# 🆕 NEW: meal planning dataset (your new_foodset.csv)
meal_foods = pd.read_csv(DATA_DIR / "new_foodset.csv")

cat_cols = ["Chemical_Class", "Habit_Forming", "Therapeutic_Class", "Action_Class"]

for col in cat_cols:
    if col in drug_clean.columns:
        drug_clean[col] = (
            pd.to_numeric(drug_clean[col], errors="coerce")
            .fillna(0)
            .astype(int)
        )

meal_foods = meal_foods.rename(
    columns={
        "Food_Item": "Food",
        "Calories": "energy",
        "Calories (kcal)": "energy",
        "Protein (g)": "protein",
        "Protein(g)": "protein",
        "Carbohydrate (g)": "carbs",
        "Carbohydrate(g)": "carbs",
        "Fat (g)": "fat",
        "Fat(g)": "fat",
        "Fiber (g)": "fiber",
        "Fiber(g)": "fiber",
        "Meal_Type": "meal_type",
    }
)


required_cols = [
    "Food", "energy", "protein", "fat", "carbs", "fiber",
    "calcium", "iron", "vitamin_c", "vitamin_a",
    "vitamin_k_proxy", "is_alcohol", "is_leafy_green", "meal_type",
]

for col in required_cols:
    if col not in food_subset.columns:
        food_subset[col] = 0
    if col not in meal_foods.columns:
        meal_foods[col] = 0

nutrient_cols = [
    "energy",
    "protein",
    "fat",
    "carbs",
    "fiber",
    "calcium",
    "iron",
    "vitamin_c",
    "folate",
    "vitamin_a",
    "vitamin_e",
    "vitamin_k_proxy",
]

for col in nutrient_cols:
    if col in food_subset.columns:
        food_subset[col] = pd.to_numeric(food_subset[col], errors="coerce").fillna(0.0)
    if col in meal_foods.columns:
        meal_foods[col] = pd.to_numeric(meal_foods[col], errors="coerce").fillna(0.0)

for flag_col in ["is_alcohol", "is_leafy_green"]:
    if flag_col in food_subset.columns:
        food_subset[flag_col] = pd.to_numeric(
            food_subset[flag_col], errors="coerce"
        ).fillna(0).astype(int)
    if flag_col in meal_foods.columns:
        meal_foods[flag_col] = pd.to_numeric(
            meal_foods[flag_col], errors="coerce"
        ).fillna(0).astype(int)


food_subset = food_subset.fillna(0)
meal_foods = meal_foods.fillna(0)

unified_foods = pd.concat([food_subset, meal_foods], ignore_index=True)

for col in nutrient_cols:
    if col in unified_foods.columns:
        unified_foods[col] = pd.to_numeric(unified_foods[col], errors="coerce").fillna(0.0)

for flag_col in ["is_alcohol", "is_leafy_green"]:
    if flag_col in unified_foods.columns:
        unified_foods[flag_col] = pd.to_numeric(
            unified_foods[flag_col], errors="coerce"
        ).fillna(0).astype(int)

unified_foods = unified_foods.fillna(0)
unified_foods = unified_foods.drop_duplicates(subset=["Food"], keep="first")




# ---------------------------------------------------------
# Globals
# ---------------------------------------------------------
risk_map = {
    0: "Safe – No major interaction identified.",
    1: "Moderate – Use with caution and follow food/alcohol advice.",
    2: "High Risk – Avoid this combination; consult a doctor or pharmacist.",
}

cns_keywords = ["antipsychotic", "antidepressant", "antihistamine", "sedative", "antiepileptic"]
abx_keywords = ["amoxycillin", "ciprofloxacin", "tetracycline", "doxycycline"]
leafy_words = [
    "spinach",
    "mukunuwenna",
    "gotu kola",
    "gotukola",
    "kankun",
    "kale",
    "cabbage",
    "lettuce",
    "amaranth",
    "green leaves",
    "leafy",
]

# ---------------------------------------------------------
# Helper functions
# ---------------------------------------------------------
def build_feature_for_drug(index: int):
    if index < 0 or index >= len(drug_clean):
        raise IndexError("Drug index out of range")

    text = str(drug_clean.loc[index, "combined_text"])
    text_vec = tfidf.transform([text])

    cat_series = drug_clean.loc[index, cat_cols]
    cat_vals = (
        pd.to_numeric(cat_series, errors="coerce")
        .fillna(0)
        .to_numpy()
        .reshape(1, -1)
    )
    cat_sparse = sp.csr_matrix(cat_vals)

    X_input = sp.hstack([text_vec, cat_sparse]).tocsr()
    return X_input


def predict_drug_risk(index: int) -> int:
    X_input = build_feature_for_drug(index)
    pred = rf.predict(X_input)[0]
    return int(pred)


def check_food_drug_interaction(
    drug_index: int,
    food_row: pd.Series,
    base_risk: int | None = None,
) -> int:
    drug_contains = str(drug_clean.loc[drug_index, "Contains"]).lower()
    drug_text = str(drug_clean.loc[drug_index, "combined_text"]).lower()

    if base_risk is None:
        base_risk = predict_drug_risk(drug_index)
    risk = base_risk

    calcium = float(food_row.get("calcium", 0.0))
    iron = float(food_row.get("iron", 0.0))
    fat = float(food_row.get("fat", 0.0))
    fiber = float(food_row.get("fiber", 0.0))
    vitk = float(food_row.get("vitamin_k_proxy", 0.0))
    is_alcohol = int(food_row.get("is_alcohol", 0))

    if is_alcohol == 1 and any(kw in drug_text for kw in cns_keywords):
        risk = max(risk, 2)

    if any(kw in drug_contains for kw in abx_keywords) and calcium > 200:
        risk = max(risk, 1)

    if "levothyroxine" in drug_contains and iron > 5:
        risk = max(risk, 2)

    if fat > 20 and "take on an empty stomach" in drug_text:
        risk = max(risk, 1)

    if fiber > 5 and "slow absorption" in drug_text:
        risk = max(risk, 1)

    if ("warfarin" in drug_contains or "anticoagulant" in drug_text) and vitk > 100:
        risk = max(risk, 2)

    return int(risk)


def explain_food_drug_interaction(drug_index: int, food_name: str):
    matches = unified_foods[unified_foods["Food"].str.lower() == food_name.lower()]
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
    """Recommender for /safe-foods using unified_foods."""
    base_risk = predict_drug_risk(drug_index)

    safe = []
    moderate = []

    for _, row in unified_foods.iterrows():
        if int(row.get("is_alcohol", 0)) == 1:
            continue

        r = check_food_drug_interaction(drug_index, row, base_risk=base_risk)

        if r == 0:
            safe.append(row)
        elif r == 1:
            moderate.append(row)

        if len(safe) >= top_n:
            break

    selected = safe if safe else moderate[:top_n]

    if not selected:
        return []

    df = pd.DataFrame(selected)
    cols_show = ["Food", "energy", "protein", "fat", "carbs", "fiber"]
    return df[cols_show].to_dict(orient="records")


# 🆕 NEW: recommender that uses meal_foods for meal planning
def recommend_safe_meal_foods(drug_index: int, top_n: int = 30):
    base_risk = predict_drug_risk(drug_index)

    safe = []
    moderate = []

    for _, row in meal_foods.iterrows():
        r = check_food_drug_interaction(drug_index, row, base_risk=base_risk)

        if r == 0:
            safe.append(row)
        elif r == 1:
            moderate.append(row)

        if len(safe) >= top_n:
            break

    selected = safe if safe else moderate[:top_n]

    if not selected:
        return []

    df = pd.DataFrame(selected)
    cols_show = ["Food", "energy", "protein", "fat", "carbs", "fiber", "meal_type"]
    for c in cols_show:
        if c not in df.columns:
            df[c] = None
    return df[cols_show].to_dict(orient="records")


def filter_by_dietary_restrictions(
    foods: List[dict],
    restrictions: List[str],
) -> List[dict]:
    """
    Simple rule-based filter for meal planning.
    Assumes `foods` are dicts from recommend_safe_meal_foods (contain 'Food').
    """
    if not restrictions:
        return foods

    allowed: List[dict] = []

    for f in foods:
        name = f.get("Food")
        if not name:
            continue

        # 🔁 NOW LOOKUP IN meal_foods (not food_subset)
        row = meal_foods[meal_foods["Food"] == name]
        if row.empty:
            continue
        row = row.iloc[0]

        if "no_alcohol" in restrictions and int(row.get("is_alcohol", 0)) == 1:
            continue

        if "vegetarian" in restrictions and "is_meat" in meal_foods.columns:
            if int(row.get("is_meat", 0)) == 1:
                continue

        allowed.append(f)

    return allowed

def safe_float(value, default: float = 0.0) -> float:
    """
    Convert a value to float, treating None/NaN/empty as default.
    """
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


import random  # at top of file if not already

def build_meal_from_pool(
    pool: List[dict],
    target_kcal: float,
    max_items: int = 2,
    tolerance: float = 0.35,
) -> List[dict]:
    """
    Pick 1–2 foods from pool whose total energy is close to target_kcal.
    Very simple greedy search (tries singles and pairs).
    """
    if not pool:
        return []

    # Pre-compute kcal
    items = []
    for f in pool:
        kcal = safe_float(f.get("energy"), 0.0)
        # skip zero-calorie entries for calorie planning
        if kcal <= 0:
            continue
        items.append((f, kcal))

    if not items:
        return []

    best_combo: List[dict] | None = None
    best_diff: float = inf

    # 1) Try single items
    for f, kcal in items:
        diff = abs(kcal - target_kcal)
        if diff < best_diff:
            best_diff = diff
            best_combo = [f]

    # 2) Try pairs (enough for simple plans)
    if max_items >= 2:
        n = len(items)
        for i in range(n):
            f1, c1 = items[i]
            for j in range(i + 1, n):
                f2, c2 = items[j]
                total = c1 + c2
                diff = abs(total - target_kcal)
                if diff < best_diff:
                    best_diff = diff
                    best_combo = [f1, f2]

    if best_combo is None:
        return []

    # Optional: enforce tolerance window (± tolerance * target)
    lower = target_kcal * (1 - tolerance)
    upper = target_kcal * (1 + tolerance)
    total_best = sum(safe_float(f.get("energy"), 0.0) for f in best_combo)

    # If everything is far away, still return best_combo so user gets something
    if lower <= total_best <= upper:
        return best_combo
    else:
        return best_combo


# ---------------------------------------------------------
# Pydantic models
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


class MealItem(BaseModel):
    food: str
    energy: float
    protein: float
    carbs: float


class Meal(BaseModel):
    name: str
    items: List[MealItem]


class DayPlan(BaseModel):
    day: int
    meals: List[Meal]


class MealPlanRequest(BaseModel):
    drug_indices: List[int] = Field(
        ..., description="Indexes into drug_clean for active medications"
    )
    dietary_restrictions: List[str] = Field(
        default_factory=list,
        description="e.g. ['no_alcohol', 'vegetarian']",
    )
    days: int = 3
    meals_per_day: int = 3
    calories_per_day: int = Field (
        1800,
        description="Target calories per day for this plan",
        ge=100,
    )


class MealPlanResponse(BaseModel):
    days: List[DayPlan]

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
    df = unified_foods
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


@app.post("/meal-plan", response_model=MealPlanResponse)
def create_meal_plan(body: MealPlanRequest):
    # --- 1) Validate input ---
    if not body.drug_indices:
        raise HTTPException(
            status_code=400,
            detail="At least one active medication is required to generate a meal plan.",
        )

    # --- 2) Collect safe foods for all active drugs (from meal_foods) ---
    safe_union: List[dict] = []
    for idx in body.drug_indices:
        if idx < 0 or idx >= len(drug_clean):
            raise HTTPException(status_code=404, detail=f"Drug index {idx} out of range")

        safe_for_drug = recommend_safe_meal_foods(idx, top_n=200)
        safe_union.extend(safe_for_drug)

    if not safe_union:
        raise HTTPException(
            status_code=400,
            detail="No safe foods found for the selected medications.",
        )

    # --- 3) Deduplicate by Food name ---
    merged_by_name: dict[str, dict] = {}
    for f in safe_union:
        name = f.get("Food")
        if name and name not in merged_by_name:
            merged_by_name[name] = f

    foods = list(merged_by_name.values())

    # --- 4) Apply dietary restrictions ---
    foods = filter_by_dietary_restrictions(foods, body.dietary_restrictions)
    if not foods:
        raise HTTPException(
            status_code=400,
            detail="No foods match both safety rules and dietary restrictions.",
        )

    # --- 5) Split foods by meal_type from meal_foods ---
    def _is_type(f: dict, t: str) -> bool:
        mt = str(f.get("meal_type") or "").strip().lower()
        return mt == t

    breakfast_pool = [f for f in foods if _is_type(f, "breakfast")]
    lunch_pool     = [f for f in foods if _is_type(f, "lunch")]
    dinner_pool    = [f for f in foods if _is_type(f, "dinner")]
    snack_pool     = [f for f in foods if _is_type(f, "snack")]

    # fall back to all foods if a pool is empty
    if not breakfast_pool:
        breakfast_pool = foods
    if not lunch_pool:
        lunch_pool = foods
    if not dinner_pool:
        dinner_pool = foods
    if not snack_pool:
        snack_pool = foods

    # --- 6) Calories per day and per meal ---
    target_kcal = float(body.calories_per_day or 1800)

    if body.meals_per_day == 3:
        # Breakfast / Lunch / Dinner
        meal_types = ["Breakfast", "Lunch", "Dinner"]
        fractions  = [0.30, 0.40, 0.30]
    elif body.meals_per_day == 4:
        # Breakfast / Lunch / Dinner / Snack
        meal_types = ["Breakfast", "Lunch", "Dinner", "Snack"]
        fractions  = [0.25, 0.35, 0.30, 0.10]
    else:
        # generic: equal calories per meal
        meal_types = []
        for i in range(body.meals_per_day):
            if i == 0:
                meal_types.append("Breakfast")
            elif i == 1:
                meal_types.append("Lunch")
            elif i == 2:
                meal_types.append("Dinner")
            else:
                meal_types.append(f"Meal {i+1}")
        fractions = [1.0 / body.meals_per_day] * body.meals_per_day

    # --- 7) Build days & meals (avoid repeating foods in a day AND across days) ---
    days = max(1, body.days)
    meals_per_day = max(1, min(body.meals_per_day, 5))

    day_plans: List[DayPlan] = []

    # foods we’ve already used on earlier days
    used_global: set[str] = set()

    for d in range(1, days + 1):
        day_meals: List[Meal] = []
        used_today: set[str] = set()  # foods used on this day

        for i in range(meals_per_day):
            meal_name = meal_types[i] if i < len(meal_types) else f"Meal {i+1}"
            frac = fractions[i] if i < len(fractions) else (1.0 / meals_per_day)
            target_for_meal = target_kcal * frac

            # choose correct pool
            lname = meal_name.lower()
            base_pool = foods
            if "breakfast" in lname:
                base_pool = breakfast_pool
            elif "lunch" in lname:
                base_pool = lunch_pool
            elif "dinner" in lname:
                base_pool = dinner_pool
            elif "snack" in lname:
                base_pool = snack_pool

            # 1st preference: not used today AND not used on previous days
            pool = [
                f for f in base_pool
                if f.get("Food") not in used_today
                and f.get("Food") not in used_global
            ]

            # 2nd preference: not used today (but maybe used on past days)
            if not pool:
                pool = [f for f in base_pool if f.get("Food") not in used_today]

            # final fallback: anything
            if not pool:
                pool = base_pool

            chosen_foods = build_meal_from_pool(pool, target_for_meal, max_items=2)

            items: List[MealItem] = []
            for f in chosen_foods:
                fname = f.get("Food", "")
                used_today.add(fname)

                items.append(
                    MealItem(
                        food=fname,
                        energy=safe_float(f.get("energy")),
                        protein=safe_float(f.get("protein")),
                        carbs=safe_float(f.get("carbs")),
                    )
                )

            day_meals.append(Meal(name=meal_name, items=items))

        # mark everything used today as “used globally” for later days
        used_global.update(used_today)
        day_plans.append(DayPlan(day=d, meals=day_meals))

    return MealPlanResponse(days=day_plans)
