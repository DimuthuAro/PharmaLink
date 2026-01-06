"""
ML Service - Services Module

Contains service classes for various ML functionalities:
- CrossBrandService: FDA Orange Book based drug brand comparison
- CrossBrandPredictionPipeline: Complete brand-aware DDI prediction pipeline
"""

from .cross_brand_service import (
    CrossBrandService,
    get_cross_brand_service,
    compare_brands_handler,
    search_ingredient_handler,
    therapeutic_equivalents_handler,
    formulation_variants_handler
)

from .cross_brand_pipeline import (
    CrossBrandPredictionPipeline,
    get_prediction_pipeline,
    DrugInput,
    ResolvedDrug
)

__all__ = [
    # Cross-Brand Service
    "CrossBrandService",
    "get_cross_brand_service",
    "compare_brands_handler",
    "search_ingredient_handler",
    "therapeutic_equivalents_handler",
    "formulation_variants_handler",
    # Cross-Brand Pipeline
    "CrossBrandPredictionPipeline",
    "get_prediction_pipeline",
    "DrugInput",
    "ResolvedDrug"
]
