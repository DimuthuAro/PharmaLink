"""
Test script for the Cross-Brand Comparator Service.
Run this to verify the service is working correctly.
"""

import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from services.cross_brand_service import CrossBrandService, get_cross_brand_service


def test_cross_brand_service():
    """Test the Cross-Brand Service functionality."""
    print("=" * 60)
    print("🧪 Testing Cross-Brand Comparator Service")
    print("=" * 60)
    
    # Get service instance
    service = get_cross_brand_service()
    
    # Test 1: Get statistics
    print("\n📊 Test 1: Get Lexicon Statistics")
    print("-" * 40)
    stats = service.get_statistics()
    print(json.dumps(stats, indent=2))
    
    # Test 2: Search by ingredient
    print("\n🔍 Test 2: Search by Ingredient (Metformin)")
    print("-" * 40)
    results = service.search_by_ingredient("metformin")
    print(f"Found {len(results)} results")
    if results:
        print(f"Sample: {results[0]}")
    
    # Test 3: Compare brands
    print("\n⚖️ Test 3: Compare Brands (Metformin)")
    print("-" * 40)
    comparison = service.compare_brands("metformin")
    print(f"Total brands: {comparison['total_brands']}")
    for brand in comparison['brands']:
        print(f"  - {brand['trade_name']} by {brand['manufacturer']}")
        print(f"    Strengths: {brand['available_strengths']}")
        print(f"    Extended Release: {brand['is_extended_release']}")
    
    # Test 4: Search by trade name
    print("\n🏷️ Test 4: Search by Trade Name (Lipitor)")
    print("-" * 40)
    results = service.search_by_trade_name("LIPITOR")
    print(f"Found {len(results)} results")
    for r in results:
        print(f"  - {r['trade_name']} {r['strength']} ({r['ingredient']})")
    
    # Test 5: Get therapeutic equivalents
    print("\n💊 Test 5: Therapeutic Equivalents (GLUCOPHAGE)")
    print("-" * 40)
    equivalents = service.get_therapeutic_equivalents("GLUCOPHAGE", "500MG")
    print(f"Found {len(equivalents)} equivalents")
    for eq in equivalents[:5]:  # Show first 5
        te_status = "✅ TE" if eq.get('is_therapeutic_equivalent') else "❌"
        print(f"  {te_status} {eq['trade_name']} {eq['strength']}")
    
    # Test 6: Get formulation variants
    print("\n📦 Test 6: Formulation Variants (Gabapentin)")
    print("-" * 40)
    variants = service.get_formulation_variants("gabapentin")
    for form_type, drugs in variants.items():
        print(f"  {form_type}: {len(drugs)} variants")
    
    # Test 7: Compare brands with filters
    print("\n🎯 Test 7: Compare Brands with Filters (Lisinopril 10MG)")
    print("-" * 40)
    comparison = service.compare_brands("lisinopril", strength="10MG")
    print(f"Total brands: {comparison['total_brands']}")
    for brand in comparison['brands']:
        print(f"  - {brand['trade_name']} ({brand['manufacturer']})")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    test_cross_brand_service()
