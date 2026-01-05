import requests
import json
import time
import sys

def check_all_services():
    print("🔍 COMPLETE INTEGRATION CHECK")
    print("="*60)
    
    services = {
        "ML Service": "http://localhost:8000",
        "Backend API": "http://localhost:3000",
        "Frontend": "http://localhost:5173"
    }
    
    results = {}
    
    # Check ML Service
    print("\n1. Checking ML Service...")
    try:
        resp = requests.get("http://localhost:8000/health", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            model_status = data.get("model", "unknown")
            results["ML Service"] = {
                "status": "✅ ONLINE",
                "model": model_status == "loaded"
            }
            print(f"   ✅ Status: {data.get('status')}")
            print(f"   🤖 Model: {model_status}")
        else:
            results["ML Service"] = {"status": "❌ OFFLINE"}
            print(f"   ❌ Status: {resp.status_code}")
    except:
        results["ML Service"] = {"status": "❌ OFFLINE"}
        print("   ❌ Cannot connect to ML Service")
    
    # Check Backend
    print("\n2. Checking Backend API...")
    try:
        resp = requests.get("http://localhost:3000/health", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            results["Backend API"] = {
                "status": "✅ ONLINE",
                "db_status": data.get("services", {}).get("database", "unknown")
            }
            print(f"   ✅ Status: {data.get('status')}")
            print(f"   🔗 Database: {data.get('services', {}).get('database', 'unknown')}")
        else:
            results["Backend API"] = {"status": "❌ OFFLINE"}
            print(f"   ❌ Status: {resp.status_code}")
    except:
        results["Backend API"] = {"status": "❌ OFFLINE"}
        print("   ❌ Cannot connect to Backend")
    
    # Test Real Prediction
    print("\n3. Testing Real Prediction...")
    try:
        test_drugs = ["Aspirin", "Warfarin"]
        resp = requests.post(
            "http://localhost:8000/predict/interactions",
            json={"drugs": test_drugs},
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            results["Prediction Test"] = {
                "status": "✅ WORKING",
                "pairs": data.get("summary", {}).get("total_pairs", 0),
                "model": data.get("model_info", {}).get("model_type", "unknown")
            }
            print(f"   ✅ Prediction successful")
            print(f"   📊 Pairs analyzed: {data['summary']['total_pairs']}")
            print(f"   🤖 Model used: {data.get('model_info', {}).get('model_type')}")
            
            # Show prediction details
            if data.get("interactions"):
                item = data["interactions"][0]
                pred = item.get("prediction", {})
                print(f"   📈 Sample prediction:")
                print(f"      • Drugs: {pred.get('drug1', '?')} + {pred.get('drug2', '?')}")
                print(f"      • Interaction: {pred.get('interaction', False)}")
                print(f"      • Probability: {pred.get('probability', 0):.1%}")
                print(f"      • Severity: {pred.get('severity', 'unknown').upper()}")
                print(f"      • Source: {pred.get('source', 'unknown')}")
        else:
            results["Prediction Test"] = {"status": "❌ FAILED"}
            print(f"   ❌ Prediction failed: {resp.status_code}")
    except Exception as e:
        results["Prediction Test"] = {"status": "❌ FAILED"}
        print(f"   ❌ Error: {e}")
    
    # Print Summary
    print("\n" + "="*60)
    print("📊 INTEGRATION SUMMARY")
    print("="*60)
    
    for service, info in results.items():
        status = info.get("status", "UNKNOWN")
        print(f"{service:20} {status}")
    
    print("\n🎯 NEXT STEPS:")
    
    if all("✅" in str(info.get("status")) for info in results.values()):
        print("1. ✅ All systems operational!")
        print("2. Test frontend at: http://localhost:5173")
        print("3. Enter drugs to see REAL ML predictions")
        print("\n🎉 CONGRATULATIONS! Your ML model is LIVE!")
    else:
        print("1. ❌ Some services are offline")
        print("2. Check that all services are running:")
        print("   - ML Service: python ml_service/main.py")
        print("   - Backend: cd backend && npm start")
        print("   - Frontend: cd frontend && npm run dev")
        print("3. Verify model files exist in model/ folder")
    
    return results

if __name__ == "__main__":
    check_all_services()
