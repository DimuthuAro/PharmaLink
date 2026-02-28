# Artifacts Directory

This directory stores datasets and credentials for model training.

## Required Files

### 1. kaggle.json (Kaggle API Credentials)
**Status:** 🔴 Required for auto-download

**How to get:**
1. Go to https://www.kaggle.com/account
2. Scroll to "API" section
3. Click "Create New Token"
4. Save the downloaded `kaggle.json` here

**Format:**
```json
{
  "username": "your_kaggle_username",
  "key": "your_api_key_here"
}
```

### 2. MID.xlsx (Medical Information Dataset)
**Status:** 🟢 Auto-downloaded by script

**Source:** Kaggle - imtkaggleteam/medical-information-dataset

**Contains:**
- Drug names
- Active ingredients
- Therapeutic classes
- Action classes
- Safety advice

### 3. Drug to Food interactions Dataset.json
**Status:** 🟢 Auto-downloaded by script

**Source:** Kaggle - shayanhusain/drug-food-interactions-dataset

**Contains:**
- Drug active ingredients
- Food interaction warnings
- Interaction categories (alcohol, herbs, iron, etc.)
- Reference information

### 4. Sri Lanka Food Composition Table .csv
**Status:** 🟡 Manual download required

**Contains:**
- Food names
- Nutritional information (calories, protein, fat, carbs)
- Fiber and starch content
- Iron content
- Recipe vs single food classification

**Note:** This file must be downloaded manually and placed in this directory with the exact filename: `Sri Lanka Food Composition Table .csv`

## Auto-Download Process

Run the download script from ml_service directory:

```powershell
cd ml_service
python download_datasets.py
```

This will:
1. ✅ Check for kaggle.json
2. ✅ Download MID.xlsx
3. ✅ Download Drug to Food interactions Dataset.json
4. ✅ Extract all ZIP files
5. ⚠️  Notify about manual Sri Lanka food data

## After Download

Your artifacts directory should contain:

```
artifacts/
├── kaggle.json
├── MID.xlsx
├── Drug to Food interactions Dataset.json
├── Sri Lanka Food Composition Table .csv
└── (zip files - can be deleted after extraction)
```

## File Sizes (Approximate)

- kaggle.json: < 1 KB
- MID.xlsx: ~2-5 MB
- Drug to Food interactions Dataset.json: ~500 KB
- Sri Lanka Food Composition Table .csv: ~500 KB - 2 MB

## Security Notice

⚠️ **IMPORTANT:** The `kaggle.json` file contains your Kaggle API credentials.

- Never commit this file to version control
- Never share this file publicly
- The file is already in `.gitignore`

## Troubleshooting

### kaggle.json not recognized
- Check file format is valid JSON
- Ensure no extra spaces or characters
- Verify username and key are correct

### Download fails with 404
- Dataset may have been renamed on Kaggle
- Check dataset is still available
- Ensure you've accepted dataset terms on Kaggle website

### Can't find Sri Lanka food data
- Contact your data provider
- Alternative: Use another food nutrition database
- Ensure CSV has required columns (Food, Calories, Protein, Fat, Carbs, Iron, etc.)

## Next Steps

Once all files are in place:
1. ✅ Verify files with: `python download_datasets.py` (it will check existing files)
2. ✅ Train model: `python drug_interactions_model_train.py`
3. ✅ Check results in `ml_service/models/`
