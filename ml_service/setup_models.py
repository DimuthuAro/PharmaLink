"""
Quick setup script to copy trained models from notebooks to ML service
Run this after training models in notebooks
"""
import shutil
from pathlib import Path
import sys

def setup_models():
    """Copy trained models to ML service directory"""
    
    # Paths
    notebook_models = Path("../model")
    ml_service_models = Path("models")
    
    print("=" * 60)
    print("PharmaLink ML Models Setup")
    print("=" * 60)
    
    # Check if notebook models exist
    if not notebook_models.exists():
        print(f"\n⚠️  Notebook models directory not found: {notebook_models.absolute()}")
        print("\n📝 To train models:")
        print("   1. cd ../notebooks")
        print("   2. jupyter notebook")
        print("   3. Run training notebooks in order")
        print("   4. Come back and run this script again")
        return False
    
    # Create ML service models directory
    ml_service_models.mkdir(exist_ok=True)
    print(f"\n✓ ML service models directory: {ml_service_models.absolute()}")
    
    # Model files to copy
    model_files = [
        "interaction_binary_model.pkl",
        "food_drug_risk_model.pkl",
        "tfidf_vectorizer.pkl",
        "category_encoders.pkl"
    ]
    
    copied = 0
    missing = 0
    
    print("\n📦 Copying models...")
    print("-" * 60)
    
    for model_file in model_files:
        source = notebook_models / model_file
        dest = ml_service_models / model_file
        
        if source.exists():
            try:
                shutil.copy2(source, dest)
                size_mb = dest.stat().st_size / (1024 * 1024)
                print(f"✓ {model_file:<35} ({size_mb:.2f} MB)")
                copied += 1
            except Exception as e:
                print(f"✗ {model_file:<35} Error: {e}")
                missing += 1
        else:
            print(f"⚠️  {model_file:<35} Not found in {notebook_models}")
            missing += 1
    
    print("-" * 60)
    print(f"\n📊 Summary: {copied} models copied, {missing} missing")
    
    if copied > 0:
        print("\n✅ Setup complete!")
        print("\n🚀 Next steps:")
        print("   1. Restart ML service: uvicorn main:app --reload --port 8000")
        print("   2. Or call: curl -X POST http://localhost:8000/models/load")
        print("   3. Check status: curl http://localhost:8000/models/status")
        return True
    else:
        print("\n⚠️  No models were copied. Train models first.")
        print("\n📚 Training notebooks location: ../notebooks/")
        return False

if __name__ == "__main__":
    try:
        success = setup_models()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
