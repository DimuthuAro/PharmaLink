# Drug-Food Interaction Model Training Guide

Complete guide for training the drug-food interaction prediction model.

## 📋 Prerequisites

1. **Python Environment**
   ```powershell
   # Navigate to ml_service directory
   cd ml_service
   
   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Kaggle API Credentials**
   - Go to [Kaggle Account Settings](https://www.kaggle.com/account)
   - Scroll to "API" section
   - Click "Create New Token"
   - Download `kaggle.json`
   - Create artifacts directory and place kaggle.json there:
     ```powershell
     mkdir ..\artifacts
     # Copy kaggle.json to artifacts folder
     ```

## 🚀 Quick Start

### Step 1: Download Datasets

Run the dataset download script:

```powershell
cd ml_service
python download_datasets.py
```

This will download:
- ✅ Medical Information Dataset (MID.xlsx) - Drug data
- ✅ Drug-Food Interactions Dataset (JSON) - Interaction rules

**Manual Download Required:**
- 📄 Sri Lanka Food Composition Table.csv
  - Download from your source
  - Place in `artifacts/` folder
  - This contains nutritional data for foods

### Step 2: Train Model

Once all datasets are in `artifacts/`, run:

```powershell
python drug_interactions_model_train.py
```

This will:
1. Load and clean drug data (MID.xlsx)
2. Load interaction rules (JSON)
3. Load food nutrition data (CSV)
4. Create training dataset with positive/negative examples
5. Train RandomForest classifier
6. Evaluate model performance
7. Save model to `models/drug_food_interaction_model.pkl`

### Step 3: Verify Model

After training, verify the model exists:

```powershell
ls models/
```

Expected files:
- `drug_food_interaction_model.pkl` - Trained model
- `drug_food_interaction_metadata.json` - Model info

## 📁 Directory Structure

```
PharmaLink/
├── artifacts/               # Downloaded datasets
│   ├── kaggle.json         # Your Kaggle credentials
│   ├── MID.xlsx            # Drug dataset
│   ├── Drug to Food interactions Dataset.json
│   └── Sri Lanka Food Composition Table .csv
│
├── ml_service/
│   ├── download_datasets.py          # Dataset downloader
│   ├── drug_interactions_model_train.py  # Model trainer
│   ├── models/                       # Trained models output
│   │   ├── drug_food_interaction_model.pkl
│   │   └── drug_food_interaction_metadata.json
│   └── requirements.txt
│
└── data/                    # Processed training data
    ├── training_pairs_final.csv
    ├── food_features_final.csv
    └── drug_interactions_final.csv
```

## 🔧 Training Details

### Model Architecture

**Algorithm:** RandomForest Classifier
- 200 decision trees
- Class-balanced weighting
- Handles mixed feature types

### Features Used

**Numeric Features (4):**
- Calories
- Protein
- Fat
- Carbs

**Binary Features (5):**
- Herbal_Risk (garlic, ginger, ginkgo, etc.)
- Alcohol_Risk
- Iron_Rich (>10mg iron)
- High_Fat (>10g)
- High_Protein (>10g)

**Categorical Features (2):**
- Therapeutic_Class (drug category)
- Action_Class (drug mechanism)

**Total: 11 features**

### Training Data

- **Positive Examples:** Harmful drug-food pairs from known interactions
- **Negative Examples:** Random safe drug-food combinations
- **Train/Test Split:** 80/20
- **Stratified:** Balanced class distribution

### Expected Performance

Typical metrics:
- Accuracy: 85-95%
- Precision (Harmful): High (minimize false alarms)
- Recall (Harmful): High (catch real interactions)

## 🐛 Troubleshooting

### Issue: Kaggle credentials not found

```
❌ ERROR: Kaggle credentials not found
```

**Solution:**
1. Download kaggle.json from Kaggle
2. Place in `artifacts/kaggle.json`
3. Ensure format: `{"username":"...", "key":"..."}`

### Issue: Dataset not downloading

```
❌ Error downloading medical dataset: 401 Unauthorized
```

**Solution:**
- Check kaggle.json credentials are correct
- Ensure you've accepted dataset terms on Kaggle website

### Issue: Sri Lanka food data missing

```
❌ MISSING: Food Nutrition Data
```

**Solution:**
- This dataset requires manual download
- Contact data provider or use alternative food nutrition database
- Place CSV in `artifacts/` with exact name

### Issue: Memory error during training

```
MemoryError: Unable to allocate array
```

**Solution:**
- Reduce `n_estimators` in RandomForestClassifier
- Use smaller sample size for negative examples
- Close other applications

## 📊 Model Outputs

After training completes:

```
============================================================
MODEL PERFORMANCE
============================================================
Accuracy: 92.45%

              precision    recall  f1-score   support

        Safe       0.93      0.91      0.92       120
     Harmful       0.92      0.94      0.93       135

    accuracy                           0.92       255
   macro avg       0.92      0.92      0.92       255
weighted avg       0.92      0.92      0.92       255

✅ Model saved: models/drug_food_interaction_model.pkl
```

## 🔄 Retraining

To retrain with updated data:

1. Update datasets in `artifacts/`
2. Run training script again:
   ```powershell
   python drug_interactions_model_train.py
   ```
3. Old model will be overwritten
4. ML service will pick up new model on restart

## 🚢 Deployment

After training, the model is ready for production:

1. **Model file:** `models/drug_food_interaction_model.pkl`
2. **Start ML service:**
   ```powershell
   cd ..
   python ml_service/main.py
   ```
3. **Test API:**
   ```powershell
   curl http://localhost:8000/health
   ```

## 📝 Notes

- Training takes 2-10 minutes depending on hardware
- Model size: ~50-100 MB
- Requires ~2 GB RAM during training
- GPU not required (CPU training is fast enough)

## 🆘 Support

If you encounter issues:

1. Check all datasets are in `artifacts/`
2. Verify Python version (3.8+)
3. Ensure all dependencies installed
4. Check console output for specific error messages

---

**Next Steps:**
- ✅ Train model using this guide
- ✅ Verify model in `models/` directory
- ✅ Start ML service to test predictions
- ✅ Integrate with frontend
