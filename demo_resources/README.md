# PharmaLink Demo Resources

This folder contains all large files needed to run PharmaLink that are **not included in the git repository** (too large for version control).

## Contents

| Folder | Description | ~Size |
|--------|-------------|-------|
| `artifacts/` | Drug databases, search indexes, brand comparison data (JSON/CSV/XLSX) | ~5.3 GB |
| `data/` | Training datasets, drug/food CSVs | ~3.2 GB |
| `model/` | Apsara trained ML models (food-drug risk, severity, drug vision, symptom classifier) | ~100 MB |
| `ml_service/models/` | Microservice models (treatment identifier, brand comparison, prescription) | ~237 MB |
| `dataset/` | Drug image classification dataset (10,000+ images in train/test/val splits) | ~113 MB |

**Total: ~9 GB**

## Setup Instructions

### For Demo / First-Time Setup

1. Clone the PharmaLink repository
2. Place this entire `demo_resources/` folder at the project root
3. Run the setup script:

```powershell
.\setup_demo.ps1
```

This copies all files to their expected project locations.

### To Re-Package

After training new models or updating datasets, run:

```powershell
.\pack_demo.ps1
```

This collects all large files back into `demo_resources/` for sharing.

## File Details

### artifacts/
- `brand_similarity_index.json` - Brand similarity scores (~5 GB)
- `brand_comparison_database.json` - Brand comparison data (~42 MB)
- `generic_to_brands.json` - Generic-to-brand drug mappings (~39 MB)
- `drug_interaction_db.json` - Drug interaction database (~38 MB)
- `drug_search_index.json` - Drug search index (~15 MB)
- `drug_names_database.json` - Drug names database (~12 MB)
- `db_drug_interactions.csv` - Drug interactions CSV (~21 MB)
- `MID.xlsx` - Master interaction dataset (~189 MB)

### data/
- `drug_clean.csv` - Cleaned drug dataset (~1.7 GB)
- `food_drug_pairs_silver.csv` - Food-drug pair training data (~1 GB)
- `drug_interactions_final.csv` - Drug interactions final dataset (~222 MB)
- `symptom_dataset.csv` - Symptom-disease training data (~182 MB)
- `food_drug_pairs_train.csv` - Food-drug pairs for training (~28 MB)
- `brand_features.csv` - Brand feature data (~14 MB)

### model/
- `food_drug_risk_model.pkl` - Food-drug risk prediction model
- `drug_classifier_best.pth` - Drug image classification (EfficientNet)
- `severity_model.pkl` - Interaction severity predictor
- `reason_model.pkl` - Interaction reason classifier
- `symptom_classifier.pkl` - Symptom-to-disease classifier
- `food_cluster_model.pkl` - Food clustering model
- Plus: food_type, vegetarian, diabetic, low_sodium models, encoders, etc.

### ml_service/models/
- `treatment_identifier_model.pkl` - Treatment identification model (~170 MB)
- `food_drug_risk_model.pkl` - Food-drug risk model (~63 MB)
- `brand_comparison_model.pkl` - Brand comparison ML model
- `medication_classifier.pkl` - Prescription medication classifier
- Plus: encoders, metadata files, etc.

### dataset/
- `train/` - 7,000 drug images across 10 brand classes
- `test/` - 1,502 test images
- `val/` - 1,500 validation images
- Classes: Alaxan, Bactidol, Bioflu, Biogesic, DayZinc, Decolgen, Fish Oil, Kremil S, Medicol, Neozep
