# ml_service/train_quick_model.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
import os

def train_and_save_model():
    print("Training quick drug interaction model...")
    
    # Load or create data
    data_file = "data/drug_interactions_final.csv"
    if os.path.exists(data_file):
        df = pd.read_csv(data_file)
        print(f"Loaded {len(df)} interactions")
    else:
        print("No data file found. Creating synthetic data...")
        df = create_synthetic_data()
    
    # Prepare features
    print("Preparing features...")
    
    # Get all unique drugs
    all_drugs = set()
    if 'drug1' in df.columns:
        all_drugs.update(df['drug1'].unique())
    if 'drug2' in df.columns:
        all_drugs.update(df['drug2'].unique())
    
    # Create encoder
    le = LabelEncoder()
    le.fit(list(all_drugs)[:1000])  # Limit to 1000 drugs
    
    # Encode drugs
    df['drug1_encoded'] = df['drug1'].map(lambda x: le.transform([x])[0] if x in le.classes_ else 0)
    df['drug2_encoded'] = df['drug2'].map(lambda x: le.transform([x])[0] if x in le.classes_ else 0)

    # Create features
    df['interaction'] = 1  # All are interactions
    
    # Generate negative samples
    n_negative = min(5000, len(df))
    negative_samples = []
    
    drugs_list = list(all_drugs)[:500]
    for _ in range(n_negative):
        drug_a, drug_b = np.random.choice(drugs_list, 2, replace=False)
        # Check if not already an interaction
        if not ((df['drug1'] == drug_a) & (df['drug2'] == drug_b)).any():
            negative_samples.append({
                'drug1': drug_a,
                'drug2': drug_b,
                'drug1_encoded': le.transform([drug_a])[0] if drug_a in le.classes_ else 0,
                'drug2_encoded': le.transform([drug_b])[0] if drug_b in le.classes_ else 0,
                'interaction': 0
            })
    
    # Combine
    negative_df = pd.DataFrame(negative_samples)
    all_data = pd.concat([df[['drug1_encoded', 'drug2_encoded', 'interaction']], 
                         negative_df[['drug1_encoded', 'drug2_encoded', 'interaction']]], 
                         ignore_index=True)
    
    # Shuffle
    all_data = all_data.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Prepare X, y
    X = all_data[['drug1_encoded', 'drug2_encoded']].values
    y = all_data['interaction'].values
    
    # Add some engineered features
    X_enhanced = np.column_stack([
        X,
        np.abs(X[:, 0] - X[:, 1]),  # Difference
        (X[:, 0] + X[:, 1]) / 2,    # Average
        X[:, 0] * X[:, 1] % 100     # Interaction hash
    ])
    
    # Train model
    print("Training Random Forest...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_enhanced, y, test_size=0.2, random_state=42
    )
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    
    print(f"Training accuracy: {train_score:.4f}")
    print(f"Testing accuracy: {test_score:.4f}")
    
    # Save model
    os.makedirs("../model", exist_ok=True)
    joblib.dump(model, "../model/drug_interaction_model.pkl")
    joblib.dump(le, "../model/drug_encoder.pkl")
    
    # Save metadata
    metadata = {
        "version": "1.0.0",
        "training_date": pd.Timestamp.now().isoformat(),
        "model_type": "RandomForest",
        "n_estimators": 100,
        "accuracy_train": float(train_score),
        "accuracy_test": float(test_score),
        "n_features": X_enhanced.shape[1],
        "n_samples": len(X_enhanced),
        "drugs_encoded": len(le.classes_)
    }
    
    import json
    with open("../model/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    print("✅ Model saved to ../model/")
    print(f"✓ Model: drug_interaction_model.pkl")
    print(f"✓ Encoder: drug_encoder.pkl")
    print(f"✓ Metadata: model_metadata.json")
    
    return model, le

def create_synthetic_data():
    """Create synthetic data if real data is missing"""
    drugs = [f"Drug_{i}" for i in range(1, 101)]
    interactions = []
    
    # Create some known interactions
    known_pairs = [
        ("Warfarin", "Aspirin"),
        ("Metformin", "Insulin"),
        ("Simvastatin", "Grapefruit"),
        ("Digoxin", "Furosemide"),
        ("Lithium", "Ibuprofen")
    ]
    
    for drug1, drug2 in known_pairs:
        interactions.append({
            'drug1': drug1,
            'drug2': drug2,
            'severity': 'high',
            'description': f'Interaction between {drug1} and {drug2}'
        })
    
    # Add random interactions
    import random
    for _ in range(1000):
        drug1, drug2 = random.sample(drugs, 2)
        interactions.append({
            'drug1': drug1,
            'drug2': drug2,
            'severity': random.choice(['low', 'medium', 'high']),
            'description': f'Potential interaction'
        })
    
    df = pd.DataFrame(interactions)
    df.to_csv("data/drug_interactions_final.csv", index=False)
    return df

if __name__ == "__main__":
    train_and_save_model()