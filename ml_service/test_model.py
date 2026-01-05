# ml_service/test_model.py
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

def test_trained_model():
    """Test the trained model with sample predictions"""
    print("🧪 Testing Trained Model")
    print("="*50)
    
    try:
        # Load model artifacts
        print("📥 Loading model artifacts...")
        model = joblib.load('../model/drug_interaction_model.pkl')
        scaler = joblib.load('../model/scaler.pkl')
        drug_encoder = joblib.load('../model/drug_encoder.pkl')
        
        print(f"✅ Model loaded: {type(model).__name__}")
        print(f"✅ Drug encoder: {len(drug_encoder.classes_)} drugs")
        
        # Load metadata
        with open('../model/model_metadata.json', 'r') as f:
            metadata = f.read()
        print(f"✅ Metadata loaded")
        
        # Test with known drug interactions
        test_cases = [
            ("Aspirin", "Warfarin", "Should have HIGH interaction"),
            ("Metformin", "Insulin", "Should have MEDIUM interaction"),
            ("Drug_1", "Drug_2", "Random pair - might or might not"),
            ("Drug_999", "Drug_1000", "Unknown drugs"),
        ]
        
        print(f"\n🔬 Running test predictions...")
        
        for drug1, drug2, description in test_cases:
            try:
                # Encode drugs
                d1_encoded = drug_encoder.transform([drug1])[0] if drug1 in drug_encoder.classes_ else 0
                d2_encoded = drug_encoder.transform([drug2])[0] if drug2 in drug_encoder.classes_ else 0
                
                # Create features (simplified)
                features = np.array([
                    d1_encoded, d2_encoded,
                    abs(d1_encoded - d2_encoded),
                    (d1_encoded + d2_encoded) / 2,
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0  # Placeholder for other features
                ]).reshape(1, -1)
                
                # Scale features
                features_scaled = scaler.transform(features)
                
                # Predict
                probability = model.predict_proba(features_scaled)[0][1]
                prediction = model.predict(features_scaled)[0]
                
                print(f"\n📊 {drug1} + {drug2}:")
                print(f"   • Interaction: {'YES' if prediction == 1 else 'NO'}")
                print(f"   • Probability: {probability:.1%}")
                print(f"   • Severity: {'HIGH' if probability > 0.8 else 'MEDIUM' if probability > 0.5 else 'LOW'}")
                print(f"   • Note: {description}")
                
            except Exception as e:
                print(f"\n❌ Error predicting {drug1}+{drug2}: {e}")
        
        # Test model metrics
        print(f"\n📈 Model Statistics:")
        print(f"   • Features: {model.n_features_in_}")
        print(f"   • Estimators: {model.n_estimators}")
        print(f"   • Classes: {model.n_classes_}")
        
        # Test with multiple drugs
        print(f"\n🧠 Batch Prediction Test:")
        drugs = ["Aspirin", "Warfarin", "Metformin", "Insulin"]
        
        interactions = []
        for i in range(len(drugs)):
            for j in range(i+1, len(drugs)):
                d1, d2 = drugs[i], drugs[j]
                interactions.append(f"{d1}+{d2}")
        
        print(f"   • Drug pairs to check: {', '.join(interactions)}")
        print(f"   • Total possible pairs: {len(interactions)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Run training script first: python train_production_model.py")
        print("2. Check if model files exist in ../model/")
        print("3. Verify file permissions")
        return False

def quick_performance_check():
    """Quick performance check"""
    print("\n⚡ Quick Performance Check")
    print("-"*50)
    
    import time
    
    try:
        model = joblib.load('../model/drug_interaction_model.pkl')
        
        # Create dummy data
        n_samples = 1000
        X_dummy = np.random.randn(n_samples, model.n_features_in_)
        
        # Time prediction
        start = time.time()
        predictions = model.predict(X_dummy)
        end = time.time()
        
        print(f"✅ Model performance:")
        print(f"   • Predictions per second: {n_samples/(end-start):.0f}")
        print(f"   • Single prediction time: {((end-start)/n_samples)*1000:.2f} ms")
        print(f"   • Memory usage: ~{model.__sizeof__()/1024/1024:.1f} MB")
        
    except Exception as e:
        print(f"❌ Performance check failed: {e}")

if __name__ == "__main__":
    success = test_trained_model()
    
    if success:
        quick_performance_check()
        
    print(f"\n{'='*50}")
    print(f"🎯 Test completed at {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*50}")