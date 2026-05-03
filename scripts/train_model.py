#scripts/train_model.py
import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

# Paths
DATA_PATH = Path("data/patient_narratives_restructured.csv")
MODEL_PATH = Path("model/interaction_model.joblib")

# Load dataset
df = pd.read_csv(DATA_PATH)

# Keep only needed columns
df = df[["text", "interaction_category"]].copy()

# Drop missing rows
df = df.dropna(subset=["text", "interaction_category"])

# Convert to string
df["text"] = df["text"].astype(str)
df["interaction_category"] = df["interaction_category"].astype(str)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    df["text"],
    df["interaction_category"],
    test_size=0.2,
    random_state=42,
    stratify=df["interaction_category"]
)

# Build pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=1
    )),
    ("clf", LogisticRegression(
        max_iter=2000,
        class_weight="balanced"
    ))
])

# Train
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)

# Evaluate
print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))

# Save model
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(model, MODEL_PATH)

print(f"\nModel saved to: {MODEL_PATH}")