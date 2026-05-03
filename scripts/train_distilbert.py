# scripts/train_distilbert.py
import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, classification_report

import torch
from datasets import Dataset
from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
    Trainer,
    TrainingArguments
)

# ----------------------------
# Paths
# ----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # PharmaLink/

DATA_PATH = Path("data/patient_narratives_restructured.csv")
MODEL_DIR = Path(BASE_DIR / "PharmaLink_model")
LABEL_ENCODER_PATH = Path(BASE_DIR / "model" / "distilbert_label_encoder.joblib")

# ----------------------------
# Load data
# ----------------------------
df = pd.read_csv(DATA_PATH)

TEXT_COL = "text"
LABEL_COL = "interaction_category"

df = df[[TEXT_COL, LABEL_COL]].dropna().copy()
df[TEXT_COL] = df[TEXT_COL].astype(str)
df[LABEL_COL] = df[LABEL_COL].astype(str)

# ----------------------------
# Encode labels
# ----------------------------
label_encoder = LabelEncoder()
df["label"] = label_encoder.fit_transform(df[LABEL_COL])

LABEL_ENCODER_PATH.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(label_encoder, LABEL_ENCODER_PATH)

print("Labels:", list(label_encoder.classes_))

# ----------------------------
# Train/test split
# ----------------------------
train_df, test_df = train_test_split(
    df,
    test_size=0.2,
    random_state=42,
    stratify=df["label"]
)

train_dataset = Dataset.from_pandas(train_df[[TEXT_COL, "label"]], preserve_index=False)
test_dataset = Dataset.from_pandas(test_df[[TEXT_COL, "label"]], preserve_index=False)

# ----------------------------
# Tokenizer
# ----------------------------
MODEL_NAME = "distilbert-base-uncased"
tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_NAME)

def tokenize_function(batch):
    return tokenizer(
        batch[TEXT_COL],
        truncation=True,
        padding="max_length",
        max_length=128
    )

train_dataset = train_dataset.map(tokenize_function, batched=True)
test_dataset = test_dataset.map(tokenize_function, batched=True)

train_dataset = train_dataset.rename_column("label", "labels")
test_dataset = test_dataset.rename_column("label", "labels")

train_dataset.set_format("torch", columns=["input_ids", "attention_mask", "labels"])
test_dataset.set_format("torch", columns=["input_ids", "attention_mask", "labels"])

# ----------------------------
# Model
# ----------------------------
model = DistilBertForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(label_encoder.classes_)
)

# ----------------------------
# Metrics
# ----------------------------
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)

    acc = accuracy_score(labels, predictions)
    macro_f1 = f1_score(labels, predictions, average="macro")
    weighted_f1 = f1_score(labels, predictions, average="weighted")

    return {
        "accuracy": acc,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1
    }

# ----------------------------
# Training args
# ----------------------------
training_args = TrainingArguments(
    output_dir=str(MODEL_DIR / "checkpoints"),
    eval_strategy="epoch",
    save_strategy="no",   # disable checkpoint saving
    logging_strategy="epoch",
    num_train_epochs=5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    learning_rate=2e-5,
    weight_decay=0.01,
    report_to="none"
)

# ----------------------------
# Trainer
# ----------------------------
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    compute_metrics=compute_metrics
)

# ----------------------------
# Train
# ----------------------------
trainer.train()

# ----------------------------
# Evaluate
# ----------------------------
eval_results = trainer.evaluate()
print("\nEvaluation Results:")
for k, v in eval_results.items():
    print(f"{k}: {v}")

pred_output = trainer.predict(test_dataset)
y_pred = np.argmax(pred_output.predictions, axis=-1)
y_true = pred_output.label_ids

print("\nClassification Report:\n")
print(classification_report(
    y_true,
    y_pred,
    target_names=label_encoder.classes_,
    zero_division=0
))

# ----------------------------
# Save final model + tokenizer
# ----------------------------
MODEL_DIR.mkdir(parents=True, exist_ok=True)
trainer.save_model(str(MODEL_DIR))
tokenizer.save_pretrained(str(MODEL_DIR))

print(f"\nModel saved to: {MODEL_DIR}")
print(f"Label encoder saved to: {LABEL_ENCODER_PATH}")