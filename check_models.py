from pathlib import Path
import joblib

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"

model_files = [
    "severity_model.pkl",
    "reason_model.pkl",
    "food_type_model.pkl",
    "food_cluster_model.pkl",
    "vegetarian_model.pkl",
    "diabetic_model.pkl",
    "low_sodium_model.pkl",
    "allergen_model.pkl",
    "symptom_classifier.pkl",
]

for f in model_files:
    p = MODEL_DIR / f
    if not p.exists():
        print(f"[MISSING] {f}")
        continue

    try:
        m = joblib.load(p)
        print(f"\n✅ {f}")
        print("  type:", type(m))
        if hasattr(m, "estimator"):
            print("  estimator:", type(m.estimator))
        if hasattr(m, "named_steps"):
            print("  pipeline steps:", m.named_steps.keys())
    except Exception as e:
        print(f"[ERROR] {f} -> {e}")