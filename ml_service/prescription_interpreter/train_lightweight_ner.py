"""
Lightweight NER Training & Dataset Generator
==============================================
Generates BIO-tagged training data from existing resources, then
fine-tunes a DistilBERT model for drug/dosage token classification.

Pipeline:
  1. Generate synthetic training samples from drug database + patterns
  2. Auto-annotate with BIO tags using rule-based extraction
  3. Fine-tune distilbert-base-uncased for token classification
  4. Evaluate on held-out test set
  5. Save model + metrics

BIO Tags:
  B-DRUG   = Beginning of drug name
  I-DRUG   = Inside drug name (multi-word)
  B-DOSAGE = Beginning of dosage (e.g., "500")
  I-DOSAGE = Inside dosage (e.g., "mg")
  B-FREQ   = Beginning of frequency
  I-FREQ   = Inside frequency
  B-DUR    = Beginning of duration
  I-DUR    = Inside duration
  O        = Outside (not an entity)

Usage:
  python -m prescription_interpreter.train_lightweight_ner
  python -m prescription_interpreter.train_lightweight_ner --generate-only
  python -m prescription_interpreter.train_lightweight_ner --epochs 5
"""

import json
import re
import random
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

# ── Tag set ──────────────────────────────────────────────────────
TAGS = ["O", "B-DRUG", "I-DRUG", "B-DOSAGE", "I-DOSAGE", "B-FREQ", "I-FREQ", "B-DUR", "I-DUR"]
TAG2ID = {t: i for i, t in enumerate(TAGS)}
ID2TAG = {i: t for t, i in TAG2ID.items()}

# ── Prescription templates for data generation ───────────────────
TEMPLATES = [
    "1. {drug} {dosage} {freq} for {dur}",
    "Tab. {drug} {dosage} {freq}",
    "Cap. {drug} {dosage} {freq} for {dur}",
    "{drug} {dosage} - Take {freq} for {dur}",
    "Rx: {drug} {dosage} {freq}",
    "Tab {drug} {dosage} {freq} {dur}",
    "{drug} {dosage} {freq}",
    "2. {drug} {dosage} {freq} for {dur}",
    "Syrup {drug} {dosage} {freq} for {dur}",
    "Inj. {drug} {dosage} {freq}",
    "{drug} {dosage} - {freq} x {dur}",
    "Take {drug} {dosage} {freq} for {dur}",
]

DOSAGES = [
    "50mg", "100mg", "150mg", "200mg", "250mg", "300mg", "400mg", "500mg",
    "750mg", "1g", "5mg", "10mg", "15mg", "20mg", "25mg", "40mg", "75mg",
    "850mg", "0.5mg", "1.5mg", "2.5mg", "5ml", "10ml", "15ml",
    "100 mg", "200 mg", "500 mg", "250 mg", "50 mg", "10 mg", "5 mg",
]

FREQUENCIES = [
    "OD", "BD", "TDS", "TID", "QID", "PRN", "SOS", "HS",
    "once daily", "twice daily", "three times daily",
    "1-0-1", "1-1-1", "1-0-0", "0-0-1", "1-1-0",
    "every 6 hours", "every 8 hours", "every 12 hours",
    "before meals", "after meals", "at bedtime",
]

DURATIONS = [
    "3 days", "5 days", "7 days", "10 days", "14 days", "21 days",
    "30 days", "1 week", "2 weeks", "3 weeks", "1 month", "2 months",
]


def load_drug_names(max_drugs: int = 500) -> List[str]:
    """Load a representative sample of drug names from database."""
    # Common generics (always include)
    common_generics = [
        "Amoxicillin", "Paracetamol", "Ibuprofen", "Metformin", "Amlodipine",
        "Omeprazole", "Atorvastatin", "Losartan", "Metoprolol", "Aspirin",
        "Ciprofloxacin", "Azithromycin", "Doxycycline", "Cetirizine", "Loratadine",
        "Diclofenac", "Naproxen", "Prednisolone", "Dexamethasone", "Warfarin",
        "Clopidogrel", "Pantoprazole", "Lisinopril", "Ramipril", "Enalapril",
        "Valsartan", "Telmisartan", "Rosuvastatin", "Simvastatin", "Levothyroxine",
        "Furosemide", "Glimepiride", "Insulin", "Salbutamol", "Montelukast",
        "Tramadol", "Gabapentin", "Pregabalin", "Fluoxetine", "Sertraline",
        "Escitalopram", "Amitriptyline", "Alprazolam", "Diazepam", "Lorazepam",
        "Carbamazepine", "Phenytoin", "Erythromycin", "Clarithromycin",
        "Fluconazole", "Acyclovir", "Ranitidine", "Domperidone", "Ondansetron",
        "Levofloxacin", "Cefixime", "Ceftriaxone", "Amikacin", "Gentamicin",
        "Clindamycin", "Moxifloxacin", "Norfloxacin", "Tinidazole",
        "Metronidazole", "Albendazole", "Ivermectin", "Hydroxychloroquine",
        "Piroxicam", "Meloxicam", "Etoricoxib", "Celecoxib", "Acetaminophen",
    ]

    # Load additional from database
    index_path = MODEL_DIR / "drug_search_index.json"
    if index_path.exists():
        with open(index_path, "r", encoding="utf-8") as f:
            index = json.load(f)
        generics = index.get("generic_names", [])
        # Sample from generics, capitalize
        additional = [g.capitalize() for g in random.sample(generics, min(max_drugs - len(common_generics), len(generics)))]
        all_drugs = common_generics + additional
    else:
        all_drugs = common_generics

    return all_drugs[:max_drugs]


def generate_bio_sample(drug: str, dosage: str, freq: str, duration: str, template: str) -> Tuple[List[str], List[str]]:
    """Generate a single BIO-tagged training sample."""
    text = template.format(drug=drug, dosage=dosage, freq=freq, dur=duration)
    tokens = text.split()
    tags = ["O"] * len(tokens)

    drug_tokens = drug.split()
    dosage_tokens = dosage.split()
    freq_tokens = freq.split()
    dur_tokens = duration.split()

    def tag_span(target_tokens, b_tag, i_tag):
        """Find and tag a span of tokens in the token list."""
        tlen = len(target_tokens)
        for i in range(len(tokens) - tlen + 1):
            # Clean tokens for comparison (strip punctuation)
            match = all(
                tokens[i + j].strip('.,;:-()').lower() == target_tokens[j].strip('.,;:-()').lower()
                for j in range(tlen)
            )
            if match and all(tags[i + j] == "O" for j in range(tlen)):
                tags[i] = b_tag
                for j in range(1, tlen):
                    tags[i + j] = i_tag
                return True
        return False

    # Tag in order of priority
    tag_span(drug_tokens, "B-DRUG", "I-DRUG")
    tag_span(dosage_tokens, "B-DOSAGE", "I-DOSAGE")
    tag_span(freq_tokens, "B-FREQ", "I-FREQ")
    tag_span(dur_tokens, "B-DUR", "I-DUR")

    return tokens, tags


def generate_training_dataset(num_samples: int = 2000) -> List[Dict]:
    """Generate synthetic BIO-tagged training dataset."""
    drugs = load_drug_names(500)
    samples = []

    for _ in range(num_samples):
        drug = random.choice(drugs)
        dosage = random.choice(DOSAGES)
        freq = random.choice(FREQUENCIES)
        duration = random.choice(DURATIONS)
        template = random.choice(TEMPLATES)

        tokens, tags = generate_bio_sample(drug, dosage, freq, duration, template)
        samples.append({
            "tokens": tokens,
            "tags": tags,
            "text": " ".join(tokens),
        })

    return samples


def generate_and_save_dataset(num_samples: int = 2000):
    """Generate dataset and save to disk."""
    print(f"Generating {num_samples} synthetic training samples...")
    samples = generate_training_dataset(num_samples)

    # Split: 70% train, 15% val, 15% test
    random.shuffle(samples)
    n = len(samples)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    splits = {
        "train": samples[:train_end],
        "val": samples[train_end:val_end],
        "test": samples[val_end:],
    }

    out_path = DATA_DIR / "prescription_ner_dataset.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(splits, f, indent=2)

    print(f"Dataset saved to {out_path}")
    print(f"  Train: {len(splits['train'])} samples")
    print(f"  Val:   {len(splits['val'])} samples")
    print(f"  Test:  {len(splits['test'])} samples")
    return splits


def train_lightweight_ner(epochs: int = 5, batch_size: int = 16, lr: float = 5e-5):
    """
    Fine-tune DistilBERT for prescription NER.
    Falls back to saving just the dataset if transformers not available.
    """
    # Load or generate dataset
    dataset_path = DATA_DIR / "prescription_ner_dataset.json"
    if dataset_path.exists():
        print("Loading existing dataset...")
        with open(dataset_path, "r", encoding="utf-8") as f:
            splits = json.load(f)
    else:
        splits = generate_and_save_dataset()

    try:
        from transformers import (
            DistilBertTokenizerFast,
            DistilBertForTokenClassification,
            TrainingArguments,
            Trainer,
            DataCollatorForTokenClassification,
        )
        import torch
        from torch.utils.data import Dataset as TorchDataset
    except ImportError:
        print("transformers/torch not available — dataset saved but model not trained.")
        print("Install with: pip install transformers torch")
        return

    print(f"Training DistilBERT NER model ({epochs} epochs, batch_size={batch_size})...")

    # Prepare tokenizer
    model_name = "distilbert-base-uncased"
    tokenizer = DistilBertTokenizerFast.from_pretrained(model_name)

    class NERDataset(TorchDataset):
        def __init__(self, samples):
            self.samples = samples

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx):
            sample = self.samples[idx]
            tokens = sample["tokens"]
            tags = sample["tags"]

            # Tokenize with word-level alignment
            encoding = tokenizer(
                tokens,
                is_split_into_words=True,
                truncation=True,
                max_length=128,
                padding=False,
            )

            # Align tags to subword tokens
            word_ids = encoding.word_ids()
            label_ids = []
            prev_word_id = None
            for word_id in word_ids:
                if word_id is None:
                    label_ids.append(-100)
                elif word_id != prev_word_id:
                    # First subtoken of a word
                    tag = tags[word_id] if word_id < len(tags) else "O"
                    label_ids.append(TAG2ID.get(tag, 0))
                else:
                    # Subsequent subtokens → use I- variant or -100
                    tag = tags[word_id] if word_id < len(tags) else "O"
                    if tag.startswith("B-"):
                        label_ids.append(TAG2ID.get("I-" + tag[2:], 0))
                    else:
                        label_ids.append(TAG2ID.get(tag, 0))
                prev_word_id = word_id

            encoding["labels"] = label_ids
            return {k: torch.tensor(v) for k, v in encoding.items()}

    train_dataset = NERDataset(splits["train"])
    val_dataset = NERDataset(splits["val"])

    # Initialize model
    model = DistilBertForTokenClassification.from_pretrained(
        model_name,
        num_labels=len(TAGS),
        id2label=ID2TAG,
        label2id=TAG2ID,
    )

    training_args = TrainingArguments(
        output_dir=str(MODEL_DIR / "ner_checkpoints"),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        logging_steps=50,
        warmup_steps=100,
        weight_decay=0.01,
        learning_rate=lr,
        fp16=torch.cuda.is_available(),
        report_to="none",
    )

    data_collator = DataCollatorForTokenClassification(tokenizer)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
        tokenizer=tokenizer,
    )

    # Train
    print("Starting training...")
    trainer.train()

    # Save model
    save_path = MODEL_DIR / "lightweight_ner"
    model.save_pretrained(save_path)
    tokenizer.save_pretrained(save_path)
    print(f"Model saved to {save_path}")

    # Evaluate on test set
    test_dataset = NERDataset(splits["test"])
    results = trainer.evaluate(test_dataset)
    print(f"Test loss: {results.get('eval_loss', 'N/A'):.4f}")

    # Save metadata
    metadata = {
        "model": model_name,
        "tags": TAGS,
        "tag2id": TAG2ID,
        "epochs": epochs,
        "train_samples": len(splits["train"]),
        "val_samples": len(splits["val"]),
        "test_samples": len(splits["test"]),
        "test_loss": results.get("eval_loss"),
    }
    with open(MODEL_DIR / "lightweight_ner_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("Training complete!")
    return model, tokenizer


class LightweightNERPredictor:
    """
    Loads and runs the fine-tuned DistilBERT NER model.
    Falls back to rule-based extraction if model not available.
    """

    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._loaded = False
        self._available = False

    def load(self):
        if self._loaded:
            return
        self._loaded = True

        model_path = MODEL_DIR / "lightweight_ner"
        if not model_path.exists():
            logger.info("Lightweight NER model not found — using rule-based extraction only")
            return

        try:
            from transformers import (
                DistilBertTokenizerFast,
                DistilBertForTokenClassification,
            )
            import torch

            self._tokenizer = DistilBertTokenizerFast.from_pretrained(str(model_path))
            self._model = DistilBertForTokenClassification.from_pretrained(str(model_path))
            self._model.eval()
            self._available = True
            logger.info("Lightweight NER model loaded")
        except Exception as e:
            logger.warning(f"Failed to load lightweight NER model: {e}")

    @property
    def is_available(self) -> bool:
        self.load()
        return self._available

    def predict(self, text: str) -> Dict[str, List[Dict]]:
        """
        Run NER prediction on text.
        Returns dict with entity lists.
        """
        self.load()
        if not self._available:
            return {}

        import torch

        tokens = text.split()
        encoding = self._tokenizer(
            tokens,
            is_split_into_words=True,
            truncation=True,
            max_length=128,
            return_tensors="pt",
        )

        with torch.no_grad():
            outputs = self._model(**encoding)

        predictions = torch.argmax(outputs.logits, dim=2)[0].tolist()
        word_ids = encoding.word_ids()

        # Map predictions back to words
        word_tags = {}
        for idx, word_id in enumerate(word_ids):
            if word_id is not None and word_id not in word_tags:
                pred_tag = ID2TAG.get(predictions[idx], "O")
                word_tags[word_id] = pred_tag

        # Extract entities
        entities = {"medications": [], "dosages": [], "frequencies": [], "durations": []}
        current_entity = None
        current_tokens = []

        tag_to_entity = {
            "DRUG": "medications", "DOSAGE": "dosages",
            "FREQ": "frequencies", "DUR": "durations",
        }

        for word_idx in range(len(tokens)):
            tag = word_tags.get(word_idx, "O")

            if tag.startswith("B-"):
                # Save previous entity
                if current_entity and current_tokens:
                    entity_key = tag_to_entity.get(current_entity)
                    if entity_key:
                        entities[entity_key].append({
                            "text": " ".join(current_tokens),
                            "score": 0.85,
                        })
                # Start new entity
                current_entity = tag[2:]
                current_tokens = [tokens[word_idx]]
            elif tag.startswith("I-") and current_entity == tag[2:]:
                current_tokens.append(tokens[word_idx])
            else:
                # Save previous entity
                if current_entity and current_tokens:
                    entity_key = tag_to_entity.get(current_entity)
                    if entity_key:
                        entities[entity_key].append({
                            "text": " ".join(current_tokens),
                            "score": 0.85,
                        })
                current_entity = None
                current_tokens = []

        # Don't forget last entity
        if current_entity and current_tokens:
            entity_key = tag_to_entity.get(current_entity)
            if entity_key:
                entities[entity_key].append({
                    "text": " ".join(current_tokens),
                    "score": 0.85,
                })

        return entities


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train lightweight prescription NER")
    parser.add_argument("--generate-only", action="store_true", help="Only generate dataset")
    parser.add_argument("--epochs", type=int, default=5, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--samples", type=int, default=2000, help="Training samples to generate")
    args = parser.parse_args()

    if args.generate_only:
        generate_and_save_dataset(args.samples)
    else:
        generate_and_save_dataset(args.samples)
        train_lightweight_ner(epochs=args.epochs, batch_size=args.batch_size)
