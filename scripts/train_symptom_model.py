# scripts/train_symptom_model.py

from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import BernoulliNB
from sklearn.metrics import accuracy_score, classification_report

# -----------------------------
# PATHS
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "symptom_dataset.csv"

MODEL_DIR = BASE_DIR / "model"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_OUT = MODEL_DIR / "symptom_classifier.pkl"
FEATURES_OUT = MODEL_DIR / "symptom_feature_cols.pkl"
CLASSES_OUT = MODEL_DIR / "disease_classes.pkl"

print("Loading:", DATA_PATH) 

# -----------------------------
# LOAD DATA
# -----------------------------
df = pd.read_csv(DATA_PATH)

if "diseases" not in df.columns:
    raise ValueError("CSV එකේ 'diseases' column එක නැ. header check කරන්න.")

# Target
y = df["diseases"].astype(str)

# Features
X = df.drop(columns=["diseases"])
X = X.apply(pd.to_numeric, errors="coerce").fillna(0).astype(np.uint8)

print("Original Rows:", len(df))
print("Original Classes:", len(y.unique()))

# -----------------------------
# REMOVE RARE CLASSES (<2 rows)
# -----------------------------
class_counts = y.value_counts()
valid_classes = class_counts[class_counts >= 2].index

rare_classes = class_counts[class_counts < 2]

if len(rare_classes) > 0:
    print(f"⚠ Removing {len(rare_classes)} rare classes (less than 2 samples)")
    df = df[df["diseases"].isin(valid_classes)].copy()

    y = df["diseases"].astype(str)
    X = df.drop(columns=["diseases"])
    X = X.apply(pd.to_numeric, errors="coerce").fillna(0).astype(np.uint8)

print("After Filter Rows:", len(df))
print("After Filter Classes:", len(y.unique()))

feature_cols = X.columns.tolist()
classes = sorted(y.unique().tolist())

# -----------------------------
# SPLIT DATA
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# -----------------------------
# TRAIN MODEL (Memory Friendly)
# -----------------------------
model = BernoulliNB()
model.fit(X_train, y_train)

# -----------------------------
# EVALUATE
# -----------------------------
pred = model.predict(X_test)
acc = accuracy_score(y_test, pred)

print("\nAccuracy:", round(acc, 4))
print("\nClassification Report:")
print(classification_report(y_test, pred, zero_division=0))

# -----------------------------
# SAVE FILES
# -----------------------------
joblib.dump(model, MODEL_OUT)
joblib.dump(feature_cols, FEATURES_OUT)
joblib.dump(classes, CLASSES_OUT)

print("\nModel Saved Successfully!")
print(" -", MODEL_OUT)
print(" -", FEATURES_OUT)
print(" -", CLASSES_OUT)