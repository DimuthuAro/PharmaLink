"""
Test script for the Cross-Brand DDI Prediction Pipeline.

Tests the complete flow:
1. Drug input parsing
2. Brand resolution to ingredients
3. Base DDI risk prediction
4. Formulation-based risk adjustment
"""

import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))


def test_pipeline():
    """Test the complete Cross-Brand Prediction Pipeline."""
    print("=" * 70)
    print("🧪 Testing Cross-Brand DDI Prediction Pipeline")
    print("=" * 70)
    
    # Import components
    from services.cross_brand_pipeline import get_prediction_pipeline
    from models.formulation_risk_model import get_formulation_model
    
    # Initialize pipeline
    print("\n📦 Initializing Pipeline...")
    pipeline = get_prediction_pipeline()
    pipeline.initialize()
    
    # Test 1: Drug Parsing
    print("\n" + "-" * 70)
    print("Test 1: Drug Input Parsing")
    print("-" * 70)
    
    test_inputs = [
        "Paxil CR 12.5mg tablet",
        "Tamoxifen 20mg tablet",
        "Glucophage XR 500mg",
        "Lipitor 10mg",
        "Metformin 850mg extended release"
    ]
    
    for drug_input in test_inputs:
        parsed = pipeline.parse_drug_input(drug_input)
        print(f"\n  Input: '{drug_input}'")
        print(f"    Brand: {parsed.brand_name}")
        print(f"    Strength: {parsed.strength}")
        print(f"    Form: {parsed.dosage_form}")
    
    # Test 2: Drug Resolution
    print("\n" + "-" * 70)
    print("Test 2: Drug Resolution to Ingredients")
    print("-" * 70)
    
    for drug_input in test_inputs:
        parsed = pipeline.parse_drug_input(drug_input)
        resolved = pipeline.resolve_drug(parsed)
        print(f"\n  Input: '{drug_input}'")
        print(f"    Ingredient: {resolved.ingredient}")
        print(f"    Extended Release: {resolved.is_extended_release}")
        print(f"    Method: {resolved.resolution_method}")
        print(f"    Confidence: {resolved.resolution_confidence:.0%}")
    
    # Test 3: Formulation Model
    print("\n" + "-" * 70)
    print("Test 3: Formulation Risk Model")
    print("-" * 70)
    
    formulation_model = get_formulation_model()
    
    # Check if model needs training
    if not formulation_model._is_trained:
        print("\n  Training formulation model...")
        metrics = formulation_model.train()
        print(f"  ✅ Model trained - MAE: {metrics['regressor']['mae']:.4f}")
        formulation_model.save_model()
        print("  ✅ Model saved")
    else:
        print("  ✅ Model already trained")
    
    # Test predictions
    test_cases = [
        {"base_risk": 0.72, "is_extended_release_a": 1, "is_extended_release_b": 0},
        {"base_risk": 0.72, "is_extended_release_a": 0, "is_extended_release_b": 0},
        {"base_risk": 0.45, "is_extended_release_a": 1, "is_extended_release_b": 1},
    ]
    
    for i, features in enumerate(test_cases, 1):
        base_risk = features.pop("base_risk")
        full_features = {
            "is_extended_release_a": features.get("is_extended_release_a", 0),
            "is_extended_release_b": features.get("is_extended_release_b", 0),
            "is_delayed_release_a": 0,
            "is_delayed_release_b": 0,
            "route_match": 1,
            "strength_ratio": 1.0,
            "same_manufacturer": 0,
            "has_patent_a": 0,
            "has_patent_b": 0
        }
        
        result = formulation_model.predict(base_risk, full_features)
        print(f"\n  Case {i}: Base Risk = {base_risk:.0%}")
        print(f"    Extended Release A: {features.get('is_extended_release_a', 0)}")
        print(f"    Extended Release B: {features.get('is_extended_release_b', 0)}")
        print(f"    Adjusted Risk: {result['adjusted_risk']:.0%}")
        print(f"    Modifier: {result['risk_modifier']}")
    
    # Test 4: Full Pipeline Predictions
    print("\n" + "-" * 70)
    print("Test 4: Full Pipeline Predictions")
    print("-" * 70)
    
    test_pairs = [
        ("Paxil CR 12.5mg tablet", "Tamoxifen 20mg tablet"),
        ("Paxil 20mg tablet", "Tamoxifen 20mg tablet"),
        ("Glucophage XR 500mg", "Glucotrol XL 5mg"),
        ("Glucophage 500mg", "Glucotrol 5mg"),
        ("Warfarin 5mg", "Aspirin 81mg"),
        ("Prilosec 20mg", "Plavix 75mg"),
    ]
    
    for drug_a, drug_b in test_pairs:
        print(f"\n  📊 {drug_a} + {drug_b}")
        print("  " + "-" * 60)
        
        result = pipeline.predict(drug_a, drug_b)
        
        drug_a_info = result["drug_a"]["resolved"]
        drug_b_info = result["drug_b"]["resolved"]
        base = result["base_interaction"]
        final = result["final_prediction"]
        adjustment = result["formulation_adjustment"]
        
        print(f"    Ingredients: {drug_a_info['ingredient_base']} + {drug_b_info['ingredient_base']}")
        print(f"    Base Risk: {base['risk']:.0%} ({base['severity']})")
        print(f"    Formulation Adjustment: {adjustment['risk_change']:+.0%} ({adjustment['modifier']})")
        print(f"    Final Risk: {final['adjusted_risk']:.0%} ({final['severity']})")
        print(f"\n    💡 {final['explanation']}")
        
        if result.get("recommendations"):
            print(f"\n    📋 Recommendations:")
            for rec in result["recommendations"][:2]:
                print(f"       • {rec}")
    
    # Test 5: Batch Prediction
    print("\n" + "-" * 70)
    print("Test 5: Batch Prediction (Multiple Drugs)")
    print("-" * 70)
    
    drugs = [
        "Paxil CR 12.5mg",
        "Tamoxifen 20mg",
        "Warfarin 5mg",
        "Aspirin 81mg"
    ]
    
    print(f"\n  Testing drugs: {', '.join(drugs)}")
    
    predictions = []
    for i in range(len(drugs)):
        for j in range(i + 1, len(drugs)):
            result = pipeline.predict(drugs[i], drugs[j])
            predictions.append({
                "pair": (drugs[i], drugs[j]),
                "risk": result["final_prediction"]["adjusted_risk"],
                "severity": result["final_prediction"]["severity"]
            })
    
    # Sort by risk
    predictions.sort(key=lambda x: x["risk"], reverse=True)
    
    print(f"\n  Found {len(predictions)} drug pairs:")
    for pred in predictions:
        risk_bar = "█" * int(pred["risk"] * 10)
        print(f"    {pred['pair'][0]} + {pred['pair'][1]}")
        print(f"      Risk: {pred['risk']:.0%} [{risk_bar:<10}] ({pred['severity']})")
    
    print("\n" + "=" * 70)
    print("✅ All Pipeline Tests Completed!")
    print("=" * 70)
    
    return True


def test_api_endpoints():
    """Test the API endpoints (requires running server)."""
    import requests
    
    base_url = "http://localhost:8000"
    
    print("\n" + "=" * 70)
    print("🌐 Testing API Endpoints")
    print("=" * 70)
    
    # Check if server is running
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code != 200:
            print("⚠️ Server not responding. Start with: python main.py")
            return False
    except requests.exceptions.ConnectionError:
        print("⚠️ Server not running. Start with: python main.py")
        return False
    
    # Test brand interaction prediction
    print("\n📡 POST /api/predict/brand-interaction")
    response = requests.post(
        f"{base_url}/api/predict/brand-interaction",
        json={
            "drug_a": "Paxil CR 12.5mg tablet",
            "drug_b": "Tamoxifen 20mg tablet"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Success!")
        print(f"   Final Risk: {result['final_prediction']['adjusted_risk']:.0%}")
        print(f"   Severity: {result['final_prediction']['severity']}")
    else:
        print(f"   ❌ Error: {response.status_code}")
        print(f"   {response.text}")
    
    # Test drug parsing
    print("\n📡 POST /api/drug/parse")
    response = requests.post(
        f"{base_url}/api/drug/parse?drug_input=Glucophage%20XR%20500mg"
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Success!")
        print(f"   Ingredient: {result['resolved']['ingredient']}")
        print(f"   Extended Release: {result['resolved']['is_extended_release']}")
    else:
        print(f"   ❌ Error: {response.status_code}")
    
    # Test formulation model info
    print("\n📡 GET /api/formulation/model-info")
    response = requests.get(f"{base_url}/api/formulation/model-info")
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Success!")
        print(f"   Model Version: {result['model_info']['version']}")
        print(f"   Is Trained: {result['model_info']['is_trained']}")
    else:
        print(f"   ❌ Error: {response.status_code}")
    
    print("\n" + "=" * 70)
    print("✅ API Endpoint Tests Completed!")
    print("=" * 70)
    
    return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test the Cross-Brand Prediction Pipeline")
    parser.add_argument("--api", action="store_true", help="Test API endpoints (requires running server)")
    args = parser.parse_args()
    
    if args.api:
        test_api_endpoints()
    else:
        test_pipeline()
