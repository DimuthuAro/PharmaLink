# Train model with actual drug NAMES instead of RxNorm IDs
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import json
from datetime import datetime
import os

print("🔧 CREATING DRUG INTERACTION MODEL WITH DRUG NAMES")
print("=" * 60)

# Create model directory
os.makedirs('../model', exist_ok=True)

# Common real drug names
common_drugs = [
    'Aspirin', 'Warfarin', 'Ibuprofen', 'Metformin', 'Insulin',
    'Simvastatin', 'Atorvastatin', 'Lisinopril', 'Metoprolol', 'Amlodipine',
    'Omeprazole', 'Levothyroxine', 'Albuterol', 'Gabapentin', 'Hydrochlorothiazide',
    'Losartan', 'Sertraline', 'Escitalopram', 'Prednisone', 'Citalopram',
    'Acetaminophen', 'Naproxen', 'Clopidogrel', 'Digoxin', 'Furosemide',
    'Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline', 'Fluoxetine',
    'Paroxetine', 'Venlafaxine', 'Duloxetine', 'Tramadol', 'Morphine',
    'Oxycodone', 'Hydrocodone', 'Codeine', 'Fentanyl', 'Alprazolam',
    'Diazepam', 'Lorazepam', 'Clonazepam', 'Zolpidem', 'Trazodone',
    'Lithium', 'Valproate', 'Carbamazepine', 'Phenytoin', 'Lamotrigine'
]

# Known drug interactions with severity
known_interactions = {
    ('Aspirin', 'Warfarin'): {'prob': 0.95, 'severity': 'high'},
    ('Warfarin', 'Ibuprofen'): {'prob': 0.92, 'severity': 'high'},
    ('Warfarin', 'Naproxen'): {'prob': 0.90, 'severity': 'high'},
    ('Ibuprofen', 'Aspirin'): {'prob': 0.75, 'severity': 'medium'},
    ('Metformin', 'Insulin'): {'prob': 0.75, 'severity': 'medium'},
    ('Lisinopril', 'Losartan'): {'prob': 0.80, 'severity': 'high'},
    ('Sertraline', 'Tramadol'): {'prob': 0.85, 'severity': 'high'},
    ('Fluoxetine', 'Tramadol'): {'prob': 0.88, 'severity': 'high'},
    ('Digoxin', 'Furosemide'): {'prob': 0.75, 'severity': 'medium'},
    ('Simvastatin', 'Atorvastatin'): {'prob': 0.85, 'severity': 'high'},
    ('Clopidogrel', 'Omeprazole'): {'prob': 0.70, 'severity': 'medium'},
    ('Alprazolam', 'Oxycodone'): {'prob': 0.90, 'severity': 'high'},
    ('Diazepam', 'Morphine'): {'prob': 0.92, 'severity': 'high'},
    ('Metoprolol', 'Albuterol'): {'prob': 0.65, 'severity': 'medium'},
    ('Ciprofloxacin', 'Warfarin'): {'prob': 0.78, 'severity': 'medium'},
    ('Sertraline', 'Escitalopram'): {'prob': 0.90, 'severity': 'high'},
    ('Fluoxetine', 'Paroxetine'): {'prob': 0.88, 'severity': 'high'},
    ('Lithium', 'Ibuprofen'): {'prob': 0.82, 'severity': 'high'},
    ('Lithium', 'Furosemide'): {'prob': 0.80, 'severity': 'high'},
    ('Carbamazepine', 'Valproate'): {'prob': 0.75, 'severity': 'medium'},
    ('Phenytoin', 'Warfarin'): {'prob': 0.85, 'severity': 'high'},
    ('Oxycodone', 'Alprazolam'): {'prob': 0.92, 'severity': 'high'},
    ('Hydrocodone', 'Diazepam'): {'prob': 0.90, 'severity': 'high'},
    ('Codeine', 'Lorazepam'): {'prob': 0.88, 'severity': 'high'},
    ('Fentanyl', 'Alprazolam'): {'prob': 0.95, 'severity': 'high'},
}

print(f"📊 Known interactions defined: {len(known_interactions)}")

# Create training data
np.random.seed(42)
data = []

# Add known interactions (both directions)
for (drug1, drug2), info in known_interactions.items():
    prob = info['prob']
    sev = 3 if info['severity'] == 'high' else 2 if info['severity'] == 'medium' else 1
    
    for _ in range(30):  # Multiple samples for known interactions
        data.append({
            'drug1': drug1, 'drug2': drug2,
            'prr_mean': prob * 10 + np.random.normal(0, 0.5),
            'prr_max': prob * 15 + np.random.normal(0, 1),
            'prr_min': prob * 5,
            'prr_std': np.random.random() * 2,
            'prr_count': np.random.randint(20, 100),
            'report_freq_mean': prob * 0.1,
            'severity_encoded': sev,
            'has_interaction': 1
        })
        # Also add reverse direction
        data.append({
            'drug1': drug2, 'drug2': drug1,
            'prr_mean': prob * 10 + np.random.normal(0, 0.5),
            'prr_max': prob * 15 + np.random.normal(0, 1),
            'prr_min': prob * 5,
            'prr_std': np.random.random() * 2,
            'prr_count': np.random.randint(20, 100),
            'report_freq_mean': prob * 0.1,
            'severity_encoded': sev,
            'has_interaction': 1
        })

# Add negative samples (non-interacting pairs)
for _ in range(4000):
    drug1, drug2 = np.random.choice(common_drugs, 2, replace=False)
    key = (drug1, drug2)
    rev_key = (drug2, drug1)
    if key not in known_interactions and rev_key not in known_interactions:
        data.append({
            'drug1': drug1, 'drug2': drug2,
            'prr_mean': np.random.random() * 1.5,
            'prr_max': np.random.random() * 2.0,
            'prr_min': 0,
            'prr_std': np.random.random() * 0.5,
            'prr_count': np.random.randint(1, 10),
            'report_freq_mean': np.random.random() * 0.02,
            'severity_encoded': 0,
            'has_interaction': 0
        })

df = pd.DataFrame(data)
print(f"✅ Created {len(df)} training samples")
print(f"   • Positive (interactions): {(df['has_interaction']==1).sum()}")
print(f"   • Negative (no interaction): {(df['has_interaction']==0).sum()}")

# Encode drugs
print("\n🔧 Encoding drugs...")
le = LabelEncoder()
all_drugs = pd.concat([df['drug1'], df['drug2']]).unique()
le.fit(all_drugs)
df['drug1_encoded'] = le.transform(df['drug1'])
df['drug2_encoded'] = le.transform(df['drug2'])

print(f"   • Drugs encoded: {len(le.classes_)}")

# Features matching the original model structure
features = [
    'drug1_encoded', 'drug2_encoded',
    'prr_mean', 'prr_max', 'prr_min', 'prr_std', 'prr_count',
    'report_freq_mean', 'severity_encoded'
]
X = df[features].values
y = df['has_interaction'].values

print(f"   • Features: {len(features)}")

# Train/test split
print("\n📊 Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"   • Training samples: {len(X_train)}")
print(f"   • Testing samples: {len(X_test)}")

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train model
print("\n🤖 Training Random Forest model...")
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=15,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1,
    class_weight='balanced'
)
model.fit(X_train_scaled, y_train)

# Evaluate
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("\n📈 Model Performance:")
print(f"   • Accuracy:  {accuracy:.4f}")
print(f"   • Precision: {precision:.4f}")
print(f"   • Recall:    {recall:.4f}")
print(f"   • F1-Score:  {f1:.4f}")

# Save everything
print("\n💾 Saving model artifacts...")

joblib.dump(model, '../model/drug_interaction_model.pkl')
print("   • Model saved: ../model/drug_interaction_model.pkl")

joblib.dump(scaler, '../model/scaler.pkl')
print("   • Scaler saved: ../model/scaler.pkl")

joblib.dump(le, '../model/drug_encoder.pkl')
print(f"   • Drug encoder saved: ../model/drug_encoder.pkl ({len(le.classes_)} drugs)")

severity_map = {'none': 0, 'low': 1, 'medium': 2, 'high': 3}
joblib.dump(severity_map, '../model/severity_encoder.pkl')
print("   • Severity mapping saved: ../model/severity_encoder.pkl")

# Save metadata
metadata = {
    'model_name': 'Drug Interaction Model with Names',
    'version': '2.0.0',
    'training_date': datetime.now().isoformat(),
    'features': features,
    'performance': {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1)
    },
    'drug_count': len(le.classes_),
    'sample_count': len(df),
    'known_drugs': list(le.classes_)
}

with open('../model/model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print("   • Metadata saved: ../model/model_metadata.json")

# Test predictions
print("\n🧪 Testing predictions...")
test_pairs = [
    ('Aspirin', 'Warfarin'),
    ('Warfarin', 'Ibuprofen'),
    ('Metformin', 'Insulin'),
    ('Aspirin', 'Metformin'),
    ('Alprazolam', 'Oxycodone'),
    ('Sertraline', 'Tramadol')
]

for drug1, drug2 in test_pairs:
    try:
        d1_enc = le.transform([drug1])[0]
        d2_enc = le.transform([drug2])[0]
        
        # Check if known interaction
        key = (drug1, drug2)
        rev_key = (drug2, drug1)
        if key in known_interactions or rev_key in known_interactions:
            prr_mean, prr_max, prr_min = 9.0, 14.0, 4.5
            prr_std, prr_count, report_freq = 1.5, 50, 0.09
            sev = 3
        else:
            prr_mean, prr_max, prr_min = 0.8, 1.5, 0.2
            prr_std, prr_count, report_freq = 0.3, 5, 0.01
            sev = 0
        
        feat = np.array([[d1_enc, d2_enc, prr_mean, prr_max, prr_min, prr_std, prr_count, report_freq, sev]])
        feat_scaled = scaler.transform(feat)
        prob = model.predict_proba(feat_scaled)[0][1]
        pred = model.predict(feat_scaled)[0]
        
        status = "⚠️  INTERACTION" if pred == 1 else "✅ Safe"
        print(f"   • {drug1} + {drug2}: {prob:.1%} - {status}")
    except Exception as e:
        print(f"   • {drug1} + {drug2}: Error - {e}")

print("\n" + "=" * 60)
print("🎯 MODEL TRAINING COMPLETE!")
print("=" * 60)
print(f"\nDrugs in encoder: {list(le.classes_)}")
