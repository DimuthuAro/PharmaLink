# Pharmalink/test_integration.py
import requests
import json
import time
import sys
from datetime import datetime

def print_step(step, message):
    """Pretty print test steps"""
    print(f"\n{'='*60}")
    print(f"STEP {step}: {message}")
    print(f"{'='*60}")

def test_ml_service():
    """Test the ML Service directly"""
    print_step(1, "Testing ML Service (Port 8000)")
    
    # Test 1: Health endpoint
    print("🔍 Testing /health endpoint...")
    try:
        resp = requests.get("http://localhost:8000/health", timeout=5)
        if resp.status_code == 200:
            health = resp.json()
            print(f"   ✅ ML Service is RUNNING")
            print(f"   📊 Status: {health.get('status', 'unknown')}")
            print(f"   🤖 Model: {health.get('model', 'unknown')}")
            print(f"   🕐 Response time: {resp.elapsed.total_seconds():.2f}s")
        else:
            print(f"   ❌ ML Service returned status: {resp.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ ML Service is NOT RUNNING on port 8000")
        print("   💡 Start it with: cd ml_service && python main.py")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: Root endpoint
    print("\n🔍 Testing root endpoint...")
    try:
        resp = requests.get("http://localhost:8000/", timeout=5)
        if resp.status_code == 200:
            print(f"   ✅ Root endpoint OK")
            print(f"   📝 Service: {resp.json().get('service', 'unknown')}")
        else:
            print(f"   ⚠ Root endpoint status: {resp.status_code}")
    except Exception as e:
        print(f"   ⚠ Root endpoint error: {e}")
    
    # Test 3: Prediction endpoint
    print("\n🔍 Testing prediction endpoint with sample drugs...")
    test_drugs = ["Aspirin", "Warfarin", "Metformin"]
    
    try:
        data = {
            "drugs": test_drugs,
            "include_food": False
        }
        
        start_time = time.time()
        resp = requests.post(
            "http://localhost:8000/predict/interactions", 
            json=data, 
            timeout=10
        )
        response_time = time.time() - start_time
        
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✅ Prediction SUCCESSFUL")
            print(f"   📊 Request ID: {result.get('request_id', 'N/A')}")
            print(f"   ⏱ Response time: {response_time:.2f}s")
            
            # Show summary
            summary = result.get('summary', {})
            print(f"   📈 Summary:")
            print(f"      • Total drug pairs: {summary.get('total_pairs', 0)}")
            print(f"      • Interacting pairs: {summary.get('interacting_pairs', 0)}")
            print(f"      • High-risk pairs: {summary.get('high_risk_pairs', 0)}")
            
            # Show first prediction details
            interactions = result.get('interactions', [])
            if interactions:
                first = interactions[0]
                pred = first.get('prediction', {})
                print(f"\n   🔬 Sample prediction:")
                print(f"      • Drugs: {pred.get('drug1', '?')} + {pred.get('drug2', '?')}")
                print(f"      • Interaction: {pred.get('interaction', False)}")
                print(f"      • Probability: {pred.get('probability', 0):.2%}")
                print(f"      • Severity: {pred.get('severity', 'unknown').upper()}")
                print(f"      • Source: {pred.get('source', 'unknown')}")
                print(f"      • Description: {pred.get('description', '')[:80]}...")
            
            return True
            
        else:
            print(f"   ❌ Prediction failed: {resp.status_code}")
            print(f"   📝 Response: {resp.text[:200]}")
            return False
            
    except Exception as e:
        print(f"   ❌ Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_backend_service():
    """Test the Backend Service (port 3000)"""
    print_step(2, "Testing Backend Service (Port 3000)")
    
    # Test 1: Health check
    print("🔍 Testing backend health...")
    try:
        resp = requests.get("http://localhost:3000/health", timeout=5)
        if resp.status_code == 200:
            health = resp.json()
            print(f"   ✅ Backend is RUNNING")
            print(f"   📊 Status: {health.get('status', 'unknown')}")
            
            # Check ML service connection
            ml_status = health.get('ml_service', {})
            if isinstance(ml_status, dict):
                print(f"   🤖 ML Service connection: {ml_status.get('status', 'unknown')}")
            return True
        else:
            print(f"   ❌ Backend returned status: {resp.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend is NOT RUNNING on port 3000")
        print("   💡 Start it with: cd backend && npm start")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    return True

def test_backend_ml_integration():
    """Test if backend can communicate with ML service"""
    print_step(3, "Testing Backend-ML Integration")
    
    test_drugs = ["Aspirin", "Ibuprofen"]
    
    try:
        print(f"🔍 Sending request for drugs: {test_drugs}")
        
        data = {
            "drugs": test_drugs,
            "includeFood": False
        }
        
        start_time = time.time()
        resp = requests.post(
            "http://localhost:3000/api/ml/interactions",
            json=data,
            timeout=15,
            headers={"Content-Type": "application/json"}
        )
        response_time = time.time() - start_time
        
        print(f"   ⏱ Response time: {response_time:.2f}s")
        
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✅ Backend API SUCCESS")
            
            # Check if response has the ML service format
            request_id = result.get('request_id')
            summary = result.get('summary', {})
            interactions = result.get('interactions', [])
            
            print(f"   📊 Request ID: {request_id or 'N/A'}")
            print(f"   📈 Summary:")
            print(f"      • Total pairs: {summary.get('total_pairs', 0)}")
            print(f"      • Interacting pairs: {summary.get('interacting_pairs', 0)}")
            print(f"      • High-risk pairs: {summary.get('high_risk_pairs', 0)}")
            
            # Show first interaction
            if interactions:
                first = interactions[0]
                pred = first.get('prediction', {})
                print(f"\n   🔬 First interaction:")
                print(f"      • Drugs: {pred.get('drug1', '?')} + {pred.get('drug2', '?')}")
                print(f"      • Has interaction: {pred.get('interaction', False)}")
                print(f"      • Probability: {pred.get('probability', 0):.2%}")
                print(f"      • Severity: {pred.get('severity', 'unknown').upper()}")
                print(f"      • Source: {pred.get('source', 'unknown')}")
            
            return True
        else:
            print(f"   ❌ Backend returned status: {resp.status_code}")
            print(f"   📝 Response: {resp.text[:500]}")
            return False
            
    except Exception as e:
        print(f"   ❌ Integration test error: {e}")
        return False

def test_full_stack():
    """Test the complete stack"""
    print("\n" + "🌟" * 30)
    print("FULL STACK INTEGRATION TEST")
    print("🌟" * 30)
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "ml_service": False,
        "backend_service": False,
        "integration": False
    }
    
    # Test ML Service
    results["ml_service"] = test_ml_service()
    
    # Test Backend Service
    results["backend_service"] = test_backend_service()
    
    # Test Integration (only if both services are up)
    if results["ml_service"] and results["backend_service"]:
        results["integration"] = test_backend_ml_integration()
    
    # Print Summary
    print_step(4, "TEST RESULTS SUMMARY")
    
    print("\n" + "📊" * 20)
    print("FINAL STATUS")
    print("📊" * 20)
    
    print(f"\n✅ ML Service: {'PASS' if results['ml_service'] else 'FAIL'}")
    print(f"✅ Backend Service: {'PASS' if results['backend_service'] else 'FAIL'}")
    print(f"✅ Integration: {'PASS' if results['integration'] else 'FAIL'}")
    
    if all(results.values()):
        print("\n🎉 ALL TESTS PASSED! Your integration is working!")
        print("\n🎯 NEXT STEPS:")
        print("1. Test frontend at: http://localhost:5173")
        print("2. Enter sample drugs (Aspirin, Warfarin, Metformin)")
        print("3. Verify real ML predictions appear")
    else:
        print("\n🔧 ISSUES DETECTED:")
        if not results["ml_service"]:
            print("• ML Service not running on port 8000")
            print("  Fix: cd ml_service && python main.py")
        if not results["backend_service"]:
            print("• Backend not running on port 3000")
            print("  Fix: cd backend && npm start")
        if results["ml_service"] and results["backend_service"] and not results["integration"]:
            print("• Services running but not communicating")
            print("  Check: backend/.env has ML_SERVICE_URL=http://localhost:8000")
    
    return results

def quick_test():
    """Quick test for impatient developers"""
    print("\n⚡ QUICK TEST MODE")
    
    try:
        # Just check if ML service responds
        resp = requests.get("http://localhost:8000/health", timeout=3)
        if resp.status_code == 200:
            print("✅ ML Service: RUNNING")
            
            # Quick prediction
            resp = requests.post(
                "http://localhost:8000/predict/interactions",
                json={"drugs": ["Aspirin", "Warfarin"]},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                print("✅ Predictions: WORKING")
                print(f"📊 Found {data.get('summary', {}).get('interacting_pairs', 0)} interactions")
                return True
        return False
    except:
        print("❌ ML Service: NOT RUNNING")
        return False

if __name__ == "__main__":
    print("🚀 Starting Integration Tests...")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check for quick mode
    if len(sys.argv) > 1 and sys.argv[1] == "--quick":
        quick_test()
    else:
        test_full_stack()
    
    print("\n" + "✨" * 30)
    print("Tests completed!")
    print("✨" * 30)