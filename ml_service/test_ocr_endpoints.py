"""
Test script for OCR endpoints
Run: python test_ocr_endpoints.py
"""
import requests
from PIL import Image, ImageDraw, ImageFont
import io
import os

BASE_URL = "http://localhost:8000"

def create_test_prescription_image():
    """Create a simple test prescription image with text"""
    # Create a white image
    img = Image.new('RGB', (600, 400), color='white')
    draw = ImageDraw.Draw(img)
    
    # Add prescription-like text
    text_lines = [
        "Dr. John Smith, MD",
        "123 Medical Center",
        "Date: 01/06/2026",
        "",
        "Patient: Jane Doe",
        "",
        "Rx:",
        "  Amoxicillin 500mg",
        "  Take 1 tablet twice daily",
        "  Duration: 7 days",
        "",
        "  Metformin 850mg",
        "  Take 1 tablet with meals",
        "  Duration: 30 days"
    ]
    
    y_position = 20
    for line in text_lines:
        draw.text((20, y_position), line, fill='black')
        y_position += 25
    
    return img

def test_health():
    """Test health endpoint"""
    print("\n" + "="*50)
    print("TEST 1: Health Check")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Service Status: {data['status']}")
    print(f"Drug Model: {data['model']['status']} ({data['model']['drugs']} drugs)")
    print(f"EasyOCR: {'✅ Loaded' if data['ocr_models']['easyocr']['loaded'] else '❌ Not loaded'}")
    print(f"DeepSeek-OCR: {'✅ Enabled' if data['ocr_models']['deepseek']['enabled'] else '⏭️ Disabled'}")
    print(f"Gemini: {'✅ Available' if data['gemini']['available'] else '❌ Not available'}")
    return response.status_code == 200

def test_easyocr():
    """Test EasyOCR endpoint"""
    print("\n" + "="*50)
    print("TEST 2: EasyOCR Endpoint (/api/easy-ocr)")
    print("="*50)
    
    # Create test image
    img = create_test_prescription_image()
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    # Send request
    files = {'file': ('test_prescription.png', img_bytes, 'image/png')}
    data = {'preprocess': 'true'}
    
    response = requests.post(f"{BASE_URL}/api/easy-ocr", files=files, data=data)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Model Used: {result.get('model', 'unknown')}")
        print(f"Preprocessed: {result.get('preprocessed', 'unknown')}")
        print(f"\nExtracted Text:\n{'-'*40}")
        print(result.get('extracted_text', 'No text extracted')[:500])
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_full_pipeline():
    """Test full OCR pipeline with interpretation"""
    print("\n" + "="*50)
    print("TEST 3: Full Pipeline (/prescription/ocr)")
    print("="*50)
    
    # Create test image
    img = create_test_prescription_image()
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    # Send request
    files = {'file': ('test_prescription.png', img_bytes, 'image/png')}
    data = {
        'preprocess': 'true',
        'interpret': 'true',
        'use_fallback': 'true'
    }
    
    response = requests.post(f"{BASE_URL}/prescription/ocr", files=files, data=data)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"OCR Method: {result.get('ocr_method', 'unknown')}")
        print(f"Interpretation Method: {result.get('interpretation_method', 'unknown')}")
        print(f"Processing Time: {result.get('processing_time_seconds', 'unknown')}s")
        print(f"\nExtracted Text:\n{'-'*40}")
        print(result.get('extracted_text', 'No text')[:300])
        
        if result.get('parsed_prescription'):
            print(f"\nParsed Prescription:\n{'-'*40}")
            parsed = result['parsed_prescription']
            if parsed.get('doctor_name'):
                print(f"Doctor: {parsed['doctor_name']}")
            if parsed.get('medications'):
                print(f"Medications Found: {len(parsed['medications'])}")
                for med in parsed['medications'][:3]:
                    print(f"  - {med.get('name', 'Unknown')}: {med.get('dosage', 'N/A')}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_deepseek_disabled():
    """Test that DeepSeek returns proper error when disabled"""
    print("\n" + "="*50)
    print("TEST 4: DeepSeek-OCR Disabled Check")
    print("="*50)
    
    # Create test image
    img = create_test_prescription_image()
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    files = {'file': ('test.png', img_bytes, 'image/png')}
    response = requests.post(f"{BASE_URL}/api/deepseek-ocr", files=files)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 503:
        print("✅ Correctly returns 503 (Service Unavailable) when DeepSeek is disabled")
        return True
    elif response.status_code == 200:
        print("⚠️ DeepSeek-OCR is actually enabled!")
        return True
    else:
        print(f"Unexpected response: {response.text}")
        return False

if __name__ == "__main__":
    print("\n" + "🧪 "*20)
    print("    ML SERVICE OCR ENDPOINT TESTS")
    print("🧪 "*20)
    
    results = []
    
    results.append(("Health Check", test_health()))
    results.append(("EasyOCR", test_easyocr()))
    results.append(("Full Pipeline", test_full_pipeline()))
    results.append(("DeepSeek Disabled", test_deepseek_disabled()))
    
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    total_passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
