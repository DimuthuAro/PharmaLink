# ml_service/train_twosides_correct.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import json
from datetime import datetime
import os
import warnings
warnings.filterwarnings('ignore')

print("🚀 TWO-SIDES MODEL TRAINING WITH CORRECT COLUMNS")
print("="*60)

# Create directories
os.makedirs('../model', exist_ok=True)
os.makedirs('data/processed', exist_ok=True)

# Step 1: Load the TwoSIDES data with correct column names
print("📥 Loading TwoSIDES data...")
try:
    # Read the data with the correct column names
    df = pd.read_csv('data/twosides_sample.csv', low_memory=False)
    print(f"✅ Loaded {len(df):,} rows")
    print(f"📊 Columns: {list(df.columns)}")
    
except FileNotFoundError:
    print("❌ Data file not found. Check the path.")
    exit(1)

# Step 2: Explore the data structure
print("\n🔍 Exploring data structure...")
print(f"• Shape: {df.shape}")
print(f"• First few rows:")
print(df.head(3))

# Step 3: Process the data for ML
print("\n🔧 Processing data for ML...")

# We need to create drug-drug interaction pairs from the data
# Each row is: drug1 + drug2 + condition + PRR score

# Group by drug pairs to aggregate interaction strength
print("Grouping by drug pairs...")

# Check if we have the expected columns
if 'drug_1_rxnorn_id' in df.columns and 'drug_2_rxnorm_id' in df.columns and 'PRR' in df.columns:
    # Rename for convenience
    df = df.rename(columns={
        'drug_1_rxnorn_id': 'drug1_id',
        'drug_2_rxnorm_id': 'drug2_id',
        'condition_meddra_id': 'condition_id',
        'condition_concept_name': 'condition_name',
        'PRR': 'prr',
        'PRR_error': 'prr_error',
        'mean_reporting_frequency': 'report_freq'
    })
    
    # Convert PRR and report_freq to numeric, handle errors
    df['prr'] = pd.to_numeric(df['prr'], errors='coerce')
    df['report_freq'] = pd.to_numeric(df['report_freq'], errors='coerce')
    df = df.dropna(subset=['prr'])
    
    print(f"✅ Processed {len(df):,} valid rows with PRR values")
    
    # Group by drug pairs to get aggregated features
    print("\nAggregating drug pair statistics...")
    
    # Create drug pair aggregation
    drug_pair_stats = df.groupby(['drug1_id', 'drug2_id']).agg({
        'prr': ['mean', 'max', 'min', 'std', 'count'],
        'report_freq': 'mean'
    }).reset_index()
    
    # Flatten column names
    drug_pair_stats.columns = [
        'drug1_id', 'drug2_id',
        'prr_mean', 'prr_max', 'prr_min', 'prr_std', 'prr_count',
        'report_freq_mean'
    ]
    
    print(f"✅ Found {len(drug_pair_stats):,} unique drug pairs")
    
    # Create binary labels based on PRR threshold
    # PRR > 2 is commonly used threshold for significant signals
    drug_pair_stats['has_interaction'] = (drug_pair_stats['prr_mean'] > 2.0).astype(int)
    
    # Add severity categories
    def categorize_severity(prr_mean):
        if prr_mean > 5.0:
            return 'high'
        elif prr_mean > 2.0:
            return 'medium'
        elif prr_mean > 1.0:
            return 'low'
        else:
            return 'none'
    
    drug_pair_stats['severity'] = drug_pair_stats['prr_mean'].apply(categorize_severity)
    
    # Step 4: Add negative samples (non-interacting pairs)
    print("\nAdding negative samples...")
    
    # Get unique drugs
    all_drugs = pd.concat([drug_pair_stats['drug1_id'], drug_pair_stats['drug2_id']]).unique()
    print(f"• Total unique drugs: {len(all_drugs):,}")
    
    # Create some negative samples (drug pairs with no interaction)
    n_positive = len(drug_pair_stats[drug_pair_stats['has_interaction'] == 1])
    n_negative = min(n_positive, 10000)  # Balance the dataset
    
    np.random.seed(42)
    negative_samples = []
    
    for _ in range(n_negative):
        drug1, drug2 = np.random.choice(all_drugs, 2, replace=False)
        # Check if this pair doesn't exist or has no interaction
        mask = ((drug_pair_stats['drug1_id'] == drug1) & (drug_pair_stats['drug2_id'] == drug2)) | \
               ((drug_pair_stats['drug1_id'] == drug2) & (drug_pair_stats['drug2_id'] == drug1))
        
        if not mask.any():
            negative_samples.append({
                'drug1_id': drug1,
                'drug2_id': drug2,
                'prr_mean': 0,
                'prr_max': 0,
                'prr_min': 0,
                'prr_std': 0,
                'prr_count': 0,
                'report_freq_mean': 0,
                'has_interaction': 0,
                'severity': 'none'
            })
    
    # Combine positive and negative
    if negative_samples:
        all_data = pd.concat([drug_pair_stats, pd.DataFrame(negative_samples)], ignore_index=True)
    else:
        all_data = drug_pair_stats
    
    print(f"✅ Final dataset: {len(all_data):,} samples")
    print(f"   • Positive interactions: {(all_data['has_interaction'] == 1).sum():,}")
    print(f"   • Negative interactions: {(all_data['has_interaction'] == 0).sum():,}")
    
    # Step 5: Prepare features for ML
    print("\n🔧 Preparing ML features...")
    
    # Encode drug IDs
    le = LabelEncoder()
    # Combine all drug IDs
    all_drugs_combined = pd.concat([all_data['drug1_id'], all_data['drug2_id']]).unique()
    le.fit(all_drugs_combined)
    
    all_data['drug1_encoded'] = le.transform(all_data['drug1_id'])
    all_data['drug2_encoded'] = le.transform(all_data['drug2_id'])
    
    # Encode severity
    severity_map = {'none': 0, 'low': 1, 'medium': 2, 'high': 3}
    all_data['severity_encoded'] = all_data['severity'].map(severity_map).fillna(0)
    
    # Create features
    feature_cols = [
        'drug1_encoded', 'drug2_encoded',
        'prr_mean', 'prr_max', 'prr_min', 'prr_std', 'prr_count',
        'report_freq_mean', 'severity_encoded'
    ]
    
    # Keep only columns that exist
    available_features = [col for col in feature_cols if col in all_data.columns]
    
    X = all_data[available_features].fillna(0)
    y = all_data['has_interaction']
    
    print(f"• Using {len(available_features)} features")
    print(f"• Feature names: {available_features}")
    
    # Step 6: Split data
    print("\n📊 Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"   • Training samples: {len(X_train):,}")
    print(f"   • Testing samples:  {len(X_test):,}")
    
    # Step 7: Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Step 8: Train model
    print("\n🤖 Training Random Forest model...")
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,  # Use all CPU cores
        class_weight='balanced'
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Step 9: Evaluate
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
    
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    print("\n📈 Model Performance:")
    print(f"   • Accuracy:  {accuracy:.4f}")
    print(f"   • Precision: {precision:.4f}")
    print(f"   • Recall:    {recall:.4f}")
    print(f"   • F1-Score:  {f1:.4f}")
    print(f"   • ROC-AUC:   {roc_auc:.4f}")
    
    # Step 10: Save everything
    print("\n💾 Saving model artifacts...")
    
    # Save model
    model_path = '../model/drug_interaction_model.pkl'
    joblib.dump(model, model_path)
    print(f"   • Model saved: {model_path}")
    
    # Save scaler
    scaler_path = '../model/scaler.pkl'
    joblib.dump(scaler, scaler_path)
    print(f"   • Scaler saved: {scaler_path}")
    
    # Save encoder
    encoder_path = '../model/drug_encoder.pkl'
    joblib.dump(le, encoder_path)
    print(f"   • Drug encoder saved: {encoder_path} ({len(le.classes_):,} drugs)")
    
    # Save severity encoder mapping
    severity_path = '../model/severity_encoder.pkl'
    joblib.dump(severity_map, severity_path)
    print(f"   • Severity mapping saved: {severity_path}")
    
    # Save the processed training data for reference
    all_data.to_csv('data/processed/training_data_processed.csv', index=False)
    print(f"   • Processed data saved: data/processed/training_data_processed.csv")
    
    # Save metadata
    metadata = {
        "model_name": "TwoSIDES Drug Interaction Model",
        "version": "1.0.0",
        "training_date": datetime.now().isoformat(),
        "dataset": "TwoSIDES",
        "original_samples": len(df),
        "drug_pairs": len(drug_pair_stats),
        "unique_drugs": len(all_drugs),
        "features": available_features,
        "performance": {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "roc_auc": float(roc_auc)
        },
        "hyperparameters": {
            "n_estimators": 100,
            "max_depth": 15,
            "random_state": 42
        },
        "prr_threshold": 2.0,
        "class_distribution": {
            "positive": int((all_data['has_interaction'] == 1).sum()),
            "negative": int((all_data['has_interaction'] == 0).sum())
        }
    }
    
    metadata_path = '../model/model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"   • Metadata saved: {metadata_path}")
    
    # Step 11: Quick test
    print("\n🧪 Quick test predictions...")
    
    # Get some sample drugs
    sample_drugs = all_drugs[:5] if len(all_drugs) >= 5 else all_drugs
    
    for i in range(len(sample_drugs)):
        for j in range(i+1, len(sample_drugs)):
            try:
                d1 = sample_drugs[i]
                d2 = sample_drugs[j]
                
                # Encode drugs
                d1_enc = le.transform([d1])[0] if d1 in le.classes_ else 0
                d2_enc = le.transform([d2])[0] if d2 in le.classes_ else 0
                
                # Prepare features (using default values)
                features = np.zeros((1, len(available_features)))
                features[0, 0] = d1_enc  # drug1_encoded
                features[0, 1] = d2_enc  # drug2_encoded
                
                # Scale features
                features_scaled = scaler.transform(features)
                
                # Predict
                proba = model.predict_proba(features_scaled)[0][1]
                pred = model.predict(features_scaled)[0]
                
                print(f"   • {d1[:20]} + {d2[:20]}:")
                print(f"      Interaction: {'YES' if pred == 1 else 'NO'}")
                print(f"      Probability: {proba:.1%}")
                print(f"      Confidence: {'HIGH' if proba > 0.8 else 'MEDIUM' if proba > 0.5 else 'LOW'}")
                
            except Exception as e:
                print(f"   • Error predicting: {e}")
    
    print("\n" + "="*60)
    print("🎯 TWO-SIDES MODEL TRAINING COMPLETE!")
    print("="*60)
    print(f"\n📊 Summary:")
    print(f"   • Model accuracy: {accuracy:.1%}")
    print(f"   • Drugs encoded: {len(le.classes_):,}")
    print(f"   • Drug pairs: {len(drug_pair_stats):,}")
    print(f"   • ROC-AUC: {roc_auc:.3f}")
    
    print("\n🚀 Next steps:")
    print("1. Restart ML service: python main.py")
    print("2. Test with: python test_model.py")
    print("3. Verify integration")
    
else:
    print("❌ Required columns not found in the dataset!")
    print("   Expected: drug_1_rxnorn_id, drug_2_rxnorm_id, PRR")
    print(f"   Found: {list(df.columns)}")