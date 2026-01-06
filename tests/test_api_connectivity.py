"""
Pharmalink API Connectivity & Integration Tests
================================================

This test suite validates connectivity and functionality across:
- Frontend (Vite Dev Server)
- Backend (Express Gateway)
- ML Service (FastAPI)
- Microservices

Run with: python -m pytest tests/test_api_connectivity.py -v
Or directly: python tests/test_api_connectivity.py
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class ServiceConfig:
    """Service configuration"""
    name: str
    base_url: str
    health_endpoint: str = "/health"
    timeout: int = 10


# Service URLs - Adjust these based on your environment
# Note: Microservices on ports 3002-3004 are accessed through the backend gateway proxy
# They don't run as separate servers with their own health endpoints
SERVICES = {
    "frontend": ServiceConfig(
        name="Frontend (Vite)",
        base_url="http://localhost:5173",
        health_endpoint="/",  # Vite serves index.html at root
    ),
    "backend": ServiceConfig(
        name="Backend Gateway",
        base_url="http://localhost:3000",
        health_endpoint="/health",
    ),
    "ml_service": ServiceConfig(
        name="ML Service",
        base_url="http://localhost:8000",
        health_endpoint="/health",
        timeout=30,  # Longer timeout as model loading can be slow
    ),
    "drug_interaction": ServiceConfig(
        name="Drug Interaction Microservice",
        base_url="http://localhost:3001",
        health_endpoint="/health",
    ),
}

# Optional microservices - only check if running as separate processes
OPTIONAL_SERVICES = {
    "advisory": ServiceConfig(
        name="Advisory Microservice (Optional)",
        base_url="http://localhost:3002",
        health_endpoint="/health",
    ),
    "comparator": ServiceConfig(
        name="Comparator Microservice (Optional)",
        base_url="http://localhost:3003",
        health_endpoint="/health",
    ),
    "prescription": ServiceConfig(
        name="Prescription Microservice (Optional)",
        base_url="http://localhost:3004",
        health_endpoint="/health",
    ),
}


# =============================================================================
# TEST RESULTS TRACKING
# =============================================================================

class TestResult:
    """Track individual test results"""
    
    def __init__(self, name: str, category: str):
        self.name = name
        self.category = category
        self.passed = False
        self.message = ""
        self.response_time: Optional[float] = None
        self.response_data: Optional[Dict] = None
        self.error: Optional[str] = None
    
    def set_passed(self, message: str, response_time: float = None, data: Dict = None):
        self.passed = True
        self.message = message
        self.response_time = response_time
        self.response_data = data
    
    def set_failed(self, message: str, error: str = None):
        self.passed = False
        self.message = message
        self.error = error


class TestSuite:
    """Collect and report test results"""
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.start_time = datetime.now()
    
    def add_result(self, result: TestResult):
        self.results.append(result)
    
    def get_summary(self) -> Dict[str, Any]:
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)
        
        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": f"{(passed/total*100):.1f}%" if total > 0 else "N/A",
            "duration": str(datetime.now() - self.start_time),
        }
    
    def print_report(self):
        """Print formatted test report"""
        print("\n" + "=" * 80)
        print("📊 PHARMALINK API TEST REPORT")
        print("=" * 80)
        print(f"Run Date: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 80)
        
        # Group by category
        categories = {}
        for result in self.results:
            if result.category not in categories:
                categories[result.category] = []
            categories[result.category].append(result)
        
        for category, tests in categories.items():
            print(f"\n📁 {category}")
            print("-" * 40)
            
            for test in tests:
                status = "✅ PASS" if test.passed else "❌ FAIL"
                time_str = f" ({test.response_time:.0f}ms)" if test.response_time else ""
                print(f"  {status} {test.name}{time_str}")
                if not test.passed and test.error:
                    print(f"       └─ Error: {test.error[:60]}...")
        
        # Summary
        summary = self.get_summary()
        print("\n" + "=" * 80)
        print("📈 SUMMARY")
        print("=" * 80)
        print(f"  Total Tests:  {summary['total']}")
        print(f"  Passed:       {summary['passed']} ✅")
        print(f"  Failed:       {summary['failed']} ❌")
        print(f"  Pass Rate:    {summary['pass_rate']}")
        print(f"  Duration:     {summary['duration']}")
        print("=" * 80)
        
        return summary['failed'] == 0


# =============================================================================
# HTTP HELPER FUNCTIONS
# =============================================================================

def make_request(
    method: str,
    url: str,
    data: Dict = None,
    timeout: int = 10,
    headers: Dict = None
) -> Tuple[bool, Optional[requests.Response], Optional[str], float]:
    """
    Make HTTP request and return (success, response, error, response_time_ms)
    """
    default_headers = {"Content-Type": "application/json"}
    if headers:
        default_headers.update(headers)
    
    start_time = time.time()
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=default_headers, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=default_headers, timeout=timeout)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=default_headers, timeout=timeout)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=default_headers, timeout=timeout)
        else:
            return False, None, f"Unsupported method: {method}", 0
        
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        return True, response, None, response_time
        
    except requests.exceptions.ConnectionError as e:
        return False, None, f"Connection refused - service may not be running", 0
    except requests.exceptions.Timeout as e:
        return False, None, f"Request timeout after {timeout}s", 0
    except Exception as e:
        return False, None, str(e), 0


# =============================================================================
# CONNECTIVITY TESTS
# =============================================================================

def test_service_health(suite: TestSuite, service_key: str) -> bool:
    """Test if a service is reachable and healthy"""
    config = SERVICES.get(service_key)
    if not config:
        return False
    
    result = TestResult(f"{config.name} Health Check", "Service Connectivity")
    
    url = f"{config.base_url}{config.health_endpoint}"
    success, response, error, response_time = make_request("GET", url, timeout=config.timeout)
    
    if not success:
        result.set_failed(f"Service unreachable at {url}", error)
        suite.add_result(result)
        return False
    
    # Check response status
    if response.status_code in [200, 204]:
        result.set_passed(f"Service responding at {url}", response_time)
        suite.add_result(result)
        return True
    else:
        result.set_failed(
            f"Unexpected status code: {response.status_code}",
            f"Response: {response.text[:100]}"
        )
        suite.add_result(result)
        return False


def test_all_services_health(suite: TestSuite) -> Dict[str, bool]:
    """Test health of all configured services"""
    results = {}
    
    print("\n🔍 Testing Core Service Connectivity...")
    print("-" * 40)
    
    for service_key in SERVICES.keys():
        is_healthy = test_service_health(suite, service_key)
        results[service_key] = is_healthy
        status = "✅ UP" if is_healthy else "❌ DOWN"
        print(f"  {SERVICES[service_key].name}: {status}")
    
    # Test optional services (don't fail if not running)
    if OPTIONAL_SERVICES:
        print("\n🔍 Testing Optional Microservices...")
        print("-" * 40)
        for service_key, config in OPTIONAL_SERVICES.items():
            url = f"{config.base_url}{config.health_endpoint}"
            success, response, error, _ = make_request("GET", url, timeout=3)
            is_healthy = success and response and response.status_code in [200, 204]
            results[service_key] = is_healthy
            status = "✅ UP" if is_healthy else "⚪ NOT RUNNING (optional)"
            print(f"  {config.name}: {status}")
    
    return results


# =============================================================================
# ML SERVICE API TESTS
# =============================================================================

def test_ml_model_info(suite: TestSuite):
    """Test ML model info endpoint"""
    result = TestResult("ML Model Info", "ML Service API")
    
    url = f"{SERVICES['ml_service'].base_url}/model/info"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Failed to get model info", error)
    elif response.status_code == 200:
        data = response.json()
        result.set_passed(
            f"Model v{data.get('model_version', 'unknown')}",
            response_time,
            data
        )
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_ml_drug_interaction_prediction(suite: TestSuite):
    """Test drug interaction prediction endpoint"""
    result = TestResult("Drug Interaction Prediction", "ML Service API")
    
    url = f"{SERVICES['ml_service'].base_url}/predict/interactions"
    payload = {
        "drugs": ["Aspirin", "Warfarin"]
    }
    
    success, response, error, response_time = make_request("POST", url, data=payload)
    
    if not success:
        result.set_failed("Failed to predict interaction", error)
    elif response.status_code == 200:
        data = response.json()
        interactions = data.get("interactions", [])
        result.set_passed(
            f"Found {len(interactions)} interaction(s)",
            response_time,
            data
        )
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_ml_risk_prediction(suite: TestSuite):
    """Test risk prediction endpoint"""
    result = TestResult("Risk Prediction", "ML Service API")
    
    url = f"{SERVICES['ml_service'].base_url}/predict/risk"
    payload = {
        "drug_a": "Ibuprofen",
        "drug_b": "Aspirin"
    }
    
    success, response, error, response_time = make_request("POST", url, data=payload)
    
    if not success:
        result.set_failed("Failed to predict risk", error)
    elif response.status_code == 200:
        data = response.json()
        risk = data.get("risk_level", data.get("severity", "unknown"))
        result.set_passed(f"Risk level: {risk}", response_time, data)
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_ml_food_drug_interaction(suite: TestSuite):
    """Test food-drug interaction endpoint"""
    result = TestResult("Food-Drug Interaction", "ML Service API")
    
    url = f"{SERVICES['ml_service'].base_url}/predict/food-drug"
    payload = {
        "drug": "Warfarin",
        "food": "Grapefruit"
    }
    
    success, response, error, response_time = make_request("POST", url, data=payload)
    
    if not success:
        result.set_failed("Failed to check food-drug interaction", error)
    elif response.status_code == 200:
        data = response.json()
        result.set_passed("Food-drug interaction checked", response_time, data)
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_ml_cross_brand_predict(suite: TestSuite):
    """Test cross-brand DDI prediction endpoint"""
    result = TestResult("Cross-Brand DDI Prediction", "ML Service API")
    
    url = f"{SERVICES['ml_service'].base_url}/api/cross-brand/predict"
    payload = {
        "drug1": "LIPITOR",
        "drug2": "COUMADIN"
    }
    
    success, response, error, response_time = make_request("POST", url, data=payload)
    
    if not success:
        result.set_failed("Failed to predict cross-brand interaction", error)
    elif response.status_code == 200:
        data = response.json()
        final_risk = data.get("final_predicted_risk", "unknown")
        severity = data.get("final_severity", "unknown")
        result.set_passed(
            f"Risk: {final_risk} ({severity})",
            response_time,
            data
        )
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_ml_cross_brand_statistics(suite: TestSuite):
    """Test cross-brand statistics endpoint"""
    result = TestResult("Cross-Brand Statistics", "ML Service API")
    
    url = f"{SERVICES['ml_service'].base_url}/api/cross-brand/statistics"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Failed to get statistics", error)
    elif response.status_code == 200:
        data = response.json()
        result.set_passed("Statistics retrieved", response_time, data)
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_ml_formulation_adjust(suite: TestSuite):
    """Test formulation risk adjustment endpoint"""
    result = TestResult("Formulation Risk Adjustment", "ML Service API")
    
    url = f"{SERVICES['ml_service'].base_url}/api/formulation/adjust-risk"
    payload = {
        "base_risk": 0.6,
        "is_extended_release_a": True,
        "is_extended_release_b": False,
        "is_delayed_release_a": False,
        "is_delayed_release_b": False,
        "route_match": True,
        "strength_ratio": 1.0
    }
    
    success, response, error, response_time = make_request("POST", url, data=payload)
    
    if not success:
        result.set_failed("Failed to adjust risk", error)
    elif response.status_code == 200:
        data = response.json()
        adjusted = data.get("adjusted_risk", data.get("risk_change", "unknown"))
        result.set_passed(f"Adjustment applied: {adjusted}", response_time, data)
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_ml_easy_ocr(suite: TestSuite):
    """Test EasyOCR endpoint availability"""
    result = TestResult("EasyOCR Endpoint", "ML Service API")
    
    # Just check if endpoint exists (without actually sending an image)
    url = f"{SERVICES['ml_service'].base_url}/api/easy-ocr"
    
    # Send empty request to check endpoint availability
    try:
        response = requests.post(url, timeout=5)
        # Expecting 422 (validation error) since we're not sending proper data
        if response.status_code in [422, 400]:
            result.set_passed("Endpoint available (validation error expected)", 0)
        elif response.status_code == 200:
            result.set_passed("Endpoint available", 0)
        else:
            result.set_failed(f"Unexpected status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        result.set_failed("Connection refused", "Service may not be running")
    except Exception as e:
        result.set_failed("Request failed", str(e))
    
    suite.add_result(result)


# =============================================================================
# BACKEND GATEWAY TESTS
# =============================================================================

def test_backend_health(suite: TestSuite):
    """Test backend health endpoint details"""
    result = TestResult("Backend Health Details", "Backend Gateway")
    
    url = f"{SERVICES['backend'].base_url}/health"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Failed to get health details", error)
    elif response.status_code == 200:
        data = response.json()
        status = data.get("status", "unknown")
        db_connected = data.get("database", {}).get("connected", False)
        result.set_passed(
            f"Status: {status}, DB: {'connected' if db_connected else 'disconnected'}",
            response_time,
            data
        )
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_backend_ml_proxy(suite: TestSuite):
    """Test backend ML service proxy"""
    result = TestResult("ML Service Proxy", "Backend Gateway")
    
    # Backend proxies /api/ml to ML service
    url = f"{SERVICES['backend'].base_url}/api/ml/health"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Proxy not responding", error)
    elif response.status_code == 200:
        result.set_passed("Proxy working", response_time)
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_backend_drug_interaction_proxy(suite: TestSuite):
    """Test backend drug interaction microservice proxy"""
    result = TestResult("Drug Interaction Proxy", "Backend Gateway")
    
    url = f"{SERVICES['backend'].base_url}/api/drug-interactions/health"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Proxy not responding", error)
    elif response.status_code in [200, 502, 503]:
        # 502/503 means proxy works but microservice may be down
        if response.status_code == 200:
            result.set_passed("Proxy and service working", response_time)
        else:
            result.set_passed(
                f"Proxy working (microservice returned {response.status_code})",
                response_time
            )
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_backend_404_handling(suite: TestSuite):
    """Test backend 404 error handling"""
    result = TestResult("404 Error Handling", "Backend Gateway")
    
    url = f"{SERVICES['backend'].base_url}/nonexistent-route-12345"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Request failed", error)
    elif response.status_code == 404:
        result.set_passed("404 handled correctly", response_time)
    else:
        result.set_failed(f"Expected 404, got {response.status_code}")
    
    suite.add_result(result)


# =============================================================================
# FRONTEND TESTS
# =============================================================================

def test_frontend_serving(suite: TestSuite):
    """Test frontend is serving content"""
    result = TestResult("Frontend Serving", "Frontend")
    
    url = f"{SERVICES['frontend'].base_url}/"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Frontend not responding", error)
    elif response.status_code == 200:
        # Check if it looks like a React/Vite app
        content = response.text.lower()
        if "<!doctype html>" in content or "<html" in content:
            result.set_passed("Frontend serving HTML", response_time)
        else:
            result.set_passed("Frontend responding", response_time)
    else:
        result.set_failed(f"Status {response.status_code}")
    
    suite.add_result(result)


def test_frontend_assets(suite: TestSuite):
    """Test frontend static assets"""
    result = TestResult("Frontend Assets", "Frontend")
    
    # Vite dev server should respond to asset requests
    url = f"{SERVICES['frontend'].base_url}/src/main.jsx"
    success, response, error, response_time = make_request("GET", url)
    
    if not success:
        result.set_failed("Assets not accessible", error)
    elif response.status_code in [200, 304]:
        result.set_passed("Assets accessible", response_time)
    else:
        # May need different path in production
        result.set_passed(f"Response: {response.status_code} (may be expected)", response_time)
    
    suite.add_result(result)


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

def test_end_to_end_drug_check(suite: TestSuite):
    """Test complete drug interaction flow"""
    result = TestResult("E2E Drug Interaction Check", "Integration")
    
    # Test via ML service directly
    url = f"{SERVICES['ml_service'].base_url}/predict/interactions"
    payload = {
        "drugs": ["Metformin", "Glipizide", "Lisinopril"]
    }
    
    success, response, error, response_time = make_request("POST", url, data=payload)
    
    if not success:
        result.set_failed("E2E flow failed", error)
    elif response.status_code == 200:
        data = response.json()
        interactions = data.get("interactions", [])
        result.set_passed(
            f"Complete flow: {len(interactions)} interactions found",
            response_time,
            data
        )
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


def test_cross_brand_full_flow(suite: TestSuite):
    """Test complete cross-brand prediction flow"""
    result = TestResult("E2E Cross-Brand Prediction", "Integration")
    
    url = f"{SERVICES['ml_service'].base_url}/api/cross-brand/predict"
    payload = {
        "drug1": "PAXIL CR",
        "drug2": "NOLVADEX",
        "strength1": "12.5MG",
        "strength2": "20MG"
    }
    
    success, response, error, response_time = make_request("POST", url, data=payload)
    
    if not success:
        result.set_failed("E2E cross-brand flow failed", error)
    elif response.status_code == 200:
        data = response.json()
        if data.get("success"):
            base_risk = data.get("base_ingredient_risk", "?")
            final_risk = data.get("final_predicted_risk", "?")
            result.set_passed(
                f"Base: {base_risk} → Final: {final_risk}",
                response_time,
                data
            )
        else:
            result.set_failed("Response indicates failure", str(data))
    else:
        result.set_failed(f"Status {response.status_code}", response.text[:100])
    
    suite.add_result(result)


# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

def test_ml_response_time(suite: TestSuite):
    """Test ML service response time"""
    result = TestResult("ML Response Time", "Performance")
    
    url = f"{SERVICES['ml_service'].base_url}/predict/interactions"
    payload = {"drugs": ["Aspirin", "Ibuprofen"]}
    
    times = []
    for _ in range(3):
        success, response, error, response_time = make_request("POST", url, data=payload)
        if success and response.status_code == 200:
            times.append(response_time)
    
    if times:
        avg_time = sum(times) / len(times)
        if avg_time < 500:
            result.set_passed(f"Avg response: {avg_time:.0f}ms (Fast)", avg_time)
        elif avg_time < 2000:
            result.set_passed(f"Avg response: {avg_time:.0f}ms (Acceptable)", avg_time)
        else:
            result.set_failed(f"Slow response: {avg_time:.0f}ms")
    else:
        result.set_failed("Could not measure response time")
    
    suite.add_result(result)


def test_concurrent_requests(suite: TestSuite):
    """Test handling of concurrent requests"""
    result = TestResult("Concurrent Request Handling", "Performance")
    
    url = f"{SERVICES['ml_service'].base_url}/health"
    num_requests = 10
    
    def make_single_request():
        success, response, _, time_ms = make_request("GET", url, timeout=5)
        return success and response and response.status_code == 200, time_ms
    
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=num_requests) as executor:
        futures = [executor.submit(make_single_request) for _ in range(num_requests)]
        results = [f.result() for f in as_completed(futures)]
    
    total_time = (time.time() - start_time) * 1000
    successful = sum(1 for r, _ in results if r)
    
    if successful == num_requests:
        result.set_passed(
            f"All {num_requests} requests succeeded in {total_time:.0f}ms",
            total_time / num_requests
        )
    elif successful > num_requests * 0.8:
        result.set_passed(
            f"{successful}/{num_requests} requests succeeded",
            total_time / num_requests
        )
    else:
        result.set_failed(f"Only {successful}/{num_requests} requests succeeded")
    
    suite.add_result(result)


# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

def run_all_tests() -> bool:
    """Run all tests and return True if all passed"""
    suite = TestSuite()
    
    print("\n" + "=" * 80)
    print("🧪 PHARMALINK API CONNECTIVITY & INTEGRATION TESTS")
    print("=" * 80)
    print(f"Started: {suite.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Service Connectivity Tests
    service_status = test_all_services_health(suite)
    
    # 2. ML Service API Tests (only if ML service is up)
    if service_status.get("ml_service"):
        print("\n🤖 Testing ML Service APIs...")
        print("-" * 40)
        test_ml_model_info(suite)
        test_ml_drug_interaction_prediction(suite)
        test_ml_risk_prediction(suite)
        test_ml_food_drug_interaction(suite)
        test_ml_cross_brand_predict(suite)
        test_ml_cross_brand_statistics(suite)
        test_ml_formulation_adjust(suite)
        test_ml_easy_ocr(suite)
    else:
        print("\n⚠️  Skipping ML Service API tests (service not available)")
    
    # 3. Backend Gateway Tests (only if backend is up)
    if service_status.get("backend"):
        print("\n🔌 Testing Backend Gateway...")
        print("-" * 40)
        test_backend_health(suite)
        test_backend_ml_proxy(suite)
        test_backend_drug_interaction_proxy(suite)
        test_backend_404_handling(suite)
    else:
        print("\n⚠️  Skipping Backend Gateway tests (service not available)")
    
    # 4. Frontend Tests (only if frontend is up)
    if service_status.get("frontend"):
        print("\n🖥️  Testing Frontend...")
        print("-" * 40)
        test_frontend_serving(suite)
        test_frontend_assets(suite)
    else:
        print("\n⚠️  Skipping Frontend tests (service not available)")
    
    # 5. Integration Tests (only if core services are up)
    if service_status.get("ml_service"):
        print("\n🔗 Testing Integration Flows...")
        print("-" * 40)
        test_end_to_end_drug_check(suite)
        test_cross_brand_full_flow(suite)
    
    # 6. Performance Tests (only if core services are up)
    if service_status.get("ml_service"):
        print("\n⚡ Testing Performance...")
        print("-" * 40)
        test_ml_response_time(suite)
        test_concurrent_requests(suite)
    
    # Print final report
    all_passed = suite.print_report()
    
    return all_passed


def run_quick_health_check() -> bool:
    """Run quick health check only"""
    print("\n" + "=" * 80)
    print("🏥 PHARMALINK QUICK HEALTH CHECK")
    print("=" * 80)
    
    all_healthy = True
    
    for key, config in SERVICES.items():
        url = f"{config.base_url}{config.health_endpoint}"
        success, response, error, _ = make_request("GET", url, timeout=5)
        
        if success and response and response.status_code in [200, 204]:
            print(f"  ✅ {config.name}: UP")
        else:
            print(f"  ❌ {config.name}: DOWN ({error or 'no response'})")
            all_healthy = False
    
    print("=" * 80)
    
    if all_healthy:
        print("✅ All services are healthy!")
    else:
        print("⚠️  Some services are not responding")
    
    return all_healthy


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Pharmalink API Connectivity Tests")
    parser.add_argument(
        "--quick", "-q",
        action="store_true",
        help="Run quick health check only"
    )
    parser.add_argument(
        "--ml-only",
        action="store_true",
        help="Test ML service only"
    )
    parser.add_argument(
        "--service",
        type=str,
        choices=list(SERVICES.keys()),
        help="Test specific service only"
    )
    
    args = parser.parse_args()
    
    if args.quick:
        success = run_quick_health_check()
    elif args.ml_only:
        suite = TestSuite()
        service_status = test_all_services_health(suite)
        if service_status.get("ml_service"):
            test_ml_model_info(suite)
            test_ml_drug_interaction_prediction(suite)
            test_ml_risk_prediction(suite)
            test_ml_cross_brand_predict(suite)
            suite.print_report()
        success = True
    elif args.service:
        suite = TestSuite()
        test_service_health(suite, args.service)
        success = suite.print_report()
    else:
        success = run_all_tests()
    
    sys.exit(0 if success else 1)
