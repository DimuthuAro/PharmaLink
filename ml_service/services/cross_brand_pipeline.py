"""
Cross-Brand DDI Prediction Pipeline

This pipeline integrates:
1. Cross-Brand Service: Maps brand names to active ingredients and extracts formulation features
2. Drug Interaction Model: Predicts base interaction risk between active ingredients
3. Formulation Risk Model: Adjusts risk based on formulation characteristics

Example:
    Input: "Paxil CR 12.5mg tablet" + "Tamoxifen 20mg tablet"
    
    Step 1: Cross-Brand Service extracts:
        - Drug A: paroxetine (extended release)
        - Drug B: tamoxifen (immediate release)
    
    Step 2: DDI Model predicts base_risk = 0.72
    
    Step 3: Formulation Model adjusts to final_risk = 0.68
    
    Output: Detailed prediction with explanation
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DrugInput:
    """Parsed drug input with brand, strength, and form."""
    original_input: str
    brand_name: str
    strength: Optional[str]
    strength_value: Optional[float]
    strength_unit: Optional[str]
    dosage_form: Optional[str]
    
    
@dataclass 
class ResolvedDrug:
    """Drug resolved to active ingredient with formulation features."""
    input: DrugInput
    ingredient: str
    ingredient_base: str
    is_extended_release: bool
    is_delayed_release: bool
    route: str
    manufacturer: Optional[str]
    has_patent: bool
    te_code: Optional[str]
    resolution_confidence: float
    resolution_method: str


class CrossBrandPredictionPipeline:
    """
    End-to-end pipeline for brand-aware drug interaction prediction.
    """
    
    def __init__(self):
        """Initialize the prediction pipeline."""
        self.cross_brand_service = None
        self.ddi_model = None
        self.formulation_model = None
        self._is_initialized = False
        
        # Known brand-to-ingredient mappings for common drugs
        self._brand_ingredient_cache = self._build_brand_cache()
    
    def _build_brand_cache(self) -> Dict[str, Dict[str, Any]]:
        """Build a cache of known brand-to-ingredient mappings."""
        return {
            # SSRIs
            "PAXIL": {"ingredient": "PAROXETINE", "is_er": False},
            "PAXIL CR": {"ingredient": "PAROXETINE", "is_er": True},
            "PROZAC": {"ingredient": "FLUOXETINE", "is_er": False},
            "PROZAC WEEKLY": {"ingredient": "FLUOXETINE", "is_er": True},
            "ZOLOFT": {"ingredient": "SERTRALINE", "is_er": False},
            "LEXAPRO": {"ingredient": "ESCITALOPRAM", "is_er": False},
            "CELEXA": {"ingredient": "CITALOPRAM", "is_er": False},
            "EFFEXOR": {"ingredient": "VENLAFAXINE", "is_er": False},
            "EFFEXOR XR": {"ingredient": "VENLAFAXINE", "is_er": True},
            
            # Cancer drugs
            "NOLVADEX": {"ingredient": "TAMOXIFEN", "is_er": False},
            "TAMOXIFEN": {"ingredient": "TAMOXIFEN", "is_er": False},
            
            # Diabetes
            "GLUCOPHAGE": {"ingredient": "METFORMIN", "is_er": False},
            "GLUCOPHAGE XR": {"ingredient": "METFORMIN", "is_er": True},
            "FORTAMET": {"ingredient": "METFORMIN", "is_er": True},
            "GLUMETZA": {"ingredient": "METFORMIN", "is_er": True},
            "GLUCOTROL": {"ingredient": "GLIPIZIDE", "is_er": False},
            "GLUCOTROL XL": {"ingredient": "GLIPIZIDE", "is_er": True},
            
            # Cardiovascular
            "LIPITOR": {"ingredient": "ATORVASTATIN", "is_er": False},
            "CRESTOR": {"ingredient": "ROSUVASTATIN", "is_er": False},
            "ZOCOR": {"ingredient": "SIMVASTATIN", "is_er": False},
            "NORVASC": {"ingredient": "AMLODIPINE", "is_er": False},
            "COZAAR": {"ingredient": "LOSARTAN", "is_er": False},
            "PRINIVIL": {"ingredient": "LISINOPRIL", "is_er": False},
            "ZESTRIL": {"ingredient": "LISINOPRIL", "is_er": False},
            "COUMADIN": {"ingredient": "WARFARIN", "is_er": False},
            "PLAVIX": {"ingredient": "CLOPIDOGREL", "is_er": False},
            "LANOXIN": {"ingredient": "DIGOXIN", "is_er": False},
            "CORDARONE": {"ingredient": "AMIODARONE", "is_er": False},
            "CARDIZEM": {"ingredient": "DILTIAZEM", "is_er": False},
            "CARDIZEM CD": {"ingredient": "DILTIAZEM", "is_er": True},
            
            # Thyroid
            "SYNTHROID": {"ingredient": "LEVOTHYROXINE", "is_er": False},
            "LEVOXYL": {"ingredient": "LEVOTHYROXINE", "is_er": False},
            "TIROSINT": {"ingredient": "LEVOTHYROXINE", "is_er": False},  # Liquid capsule
            
            # Antacids/GI
            "PRILOSEC": {"ingredient": "OMEPRAZOLE", "is_er": False, "is_dr": True},
            "PRILOSEC OTC": {"ingredient": "OMEPRAZOLE", "is_er": False, "is_dr": True},
            "NEXIUM": {"ingredient": "ESOMEPRAZOLE", "is_er": False, "is_dr": True},
            
            # Antibiotics
            "CIPRO": {"ingredient": "CIPROFLOXACIN", "is_er": False},
            "CIPRO XR": {"ingredient": "CIPROFLOXACIN", "is_er": True},
            
            # Neurological
            "NEURONTIN": {"ingredient": "GABAPENTIN", "is_er": False},
            "GRALISE": {"ingredient": "GABAPENTIN", "is_er": True},
            "DILANTIN": {"ingredient": "PHENYTOIN", "is_er": False},
            "TEGRETOL": {"ingredient": "CARBAMAZEPINE", "is_er": False},
            "TEGRETOL XR": {"ingredient": "CARBAMAZEPINE", "is_er": True},
            "DEPAKOTE": {"ingredient": "VALPROIC ACID", "is_er": False, "is_dr": True},
            "DEPAKENE": {"ingredient": "VALPROIC ACID", "is_er": False},
            "LITHOBID": {"ingredient": "LITHIUM", "is_er": True},
            "ESKALITH": {"ingredient": "LITHIUM", "is_er": False},
            
            # Pain
            "ULTRAM": {"ingredient": "TRAMADOL", "is_er": False},
            "ULTRAM ER": {"ingredient": "TRAMADOL", "is_er": True},
            "MS CONTIN": {"ingredient": "MORPHINE", "is_er": True},
            "KADIAN": {"ingredient": "MORPHINE", "is_er": True},
        }
    
    def initialize(self):
        """Initialize all pipeline components."""
        if self._is_initialized:
            return
        
        logger.info("Initializing Cross-Brand Prediction Pipeline...")
        
        # Initialize Cross-Brand Service
        try:
            from services.cross_brand_service import get_cross_brand_service
            self.cross_brand_service = get_cross_brand_service()
            logger.info("✅ Cross-Brand Service initialized")
        except Exception as e:
            logger.warning(f"Cross-Brand Service not available: {e}")
            self.cross_brand_service = None
        
        # Initialize DDI Model
        try:
            from models.drug_interaction_model import get_model
            self.ddi_model = get_model()
            logger.info("✅ DDI Model initialized")
        except Exception as e:
            logger.warning(f"DDI Model not available: {e}")
            self.ddi_model = None
        
        # Initialize Formulation Model
        try:
            from models.formulation_risk_model import get_formulation_model
            self.formulation_model = get_formulation_model()
            logger.info("✅ Formulation Risk Model initialized")
        except Exception as e:
            logger.warning(f"Formulation Risk Model not available: {e}")
            self.formulation_model = None
        
        self._is_initialized = True
        logger.info("Pipeline initialization complete")
    
    def parse_drug_input(self, drug_string: str) -> DrugInput:
        """
        Parse a drug input string into components.
        
        Examples:
            "Paxil CR 12.5mg tablet" -> DrugInput(brand="PAXIL CR", strength="12.5MG", form="TABLET")
            "Metformin 500mg" -> DrugInput(brand="METFORMIN", strength="500MG", form=None)
        """
        original = drug_string.strip()
        text = original.upper()
        
        # Extract strength (number + unit)
        strength_pattern = r'(\d+\.?\d*)\s*(MG|MCG|G|ML|%|IU|UNITS?)'
        strength_match = re.search(strength_pattern, text, re.IGNORECASE)
        
        strength = None
        strength_value = None
        strength_unit = None
        
        if strength_match:
            strength_value = float(strength_match.group(1))
            strength_unit = strength_match.group(2).upper()
            strength = f"{strength_value}{strength_unit}"
            # Remove strength from text to get brand name
            text = text[:strength_match.start()] + text[strength_match.end():]
        
        # Extract dosage form
        dosage_forms = [
            'TABLET', 'CAPSULE', 'SOLUTION', 'SUSPENSION', 'INJECTION',
            'CREAM', 'OINTMENT', 'GEL', 'PATCH', 'INHALER', 'SUPPOSITORY',
            'DROPS', 'SPRAY', 'SYRUP', 'POWDER', 'FILM', 'LOZENGE'
        ]
        
        dosage_form = None
        for form in dosage_forms:
            if form in text:
                dosage_form = form
                text = text.replace(form, '')
                break
        
        # Clean up brand name
        brand_name = re.sub(r'\s+', ' ', text).strip()
        brand_name = re.sub(r'[^\w\s-]', '', brand_name).strip()
        
        return DrugInput(
            original_input=original,
            brand_name=brand_name,
            strength=strength,
            strength_value=strength_value,
            strength_unit=strength_unit,
            dosage_form=dosage_form
        )
    
    def resolve_drug(self, drug_input: DrugInput) -> ResolvedDrug:
        """
        Resolve a drug input to its active ingredient and formulation features.
        """
        brand_upper = drug_input.brand_name.upper().strip()
        
        # Try direct cache lookup first
        if brand_upper in self._brand_ingredient_cache:
            cached = self._brand_ingredient_cache[brand_upper]
            return ResolvedDrug(
                input=drug_input,
                ingredient=cached["ingredient"],
                ingredient_base=cached["ingredient"],
                is_extended_release=cached.get("is_er", False),
                is_delayed_release=cached.get("is_dr", False),
                route="ORAL",
                manufacturer=None,
                has_patent=False,
                te_code=None,
                resolution_confidence=0.95,
                resolution_method="brand_cache"
            )
        
        # Try Cross-Brand Service
        if self.cross_brand_service:
            try:
                results = self.cross_brand_service.search_by_trade_name(brand_upper)
                if results:
                    best_match = results[0]
                    return ResolvedDrug(
                        input=drug_input,
                        ingredient=best_match.get('ingredient', brand_upper),
                        ingredient_base=best_match.get('ingredient_base', brand_upper),
                        is_extended_release=best_match.get('is_extended_release', False),
                        is_delayed_release=best_match.get('is_delayed_release', False),
                        route=best_match.get('route', 'ORAL'),
                        manufacturer=best_match.get('manufacturer'),
                        has_patent=best_match.get('has_active_patent', False),
                        te_code=best_match.get('te_code'),
                        resolution_confidence=0.90,
                        resolution_method="cross_brand_service"
                    )
            except Exception as e:
                logger.warning(f"Cross-Brand Service lookup failed: {e}")
        
        # Check if input looks like a generic name
        # Extended release indicators in the name
        is_er = any(x in brand_upper for x in ['XR', 'XL', 'ER', 'CR', 'SR', 'LA', 'EXTENDED'])
        is_dr = any(x in brand_upper for x in ['DR', 'EC', 'DELAYED', 'ENTERIC'])
        
        # Use the input as the ingredient (assume it's a generic name)
        clean_name = re.sub(r'\s+(XR|XL|ER|CR|SR|LA|DR|EC)$', '', brand_upper)
        
        return ResolvedDrug(
            input=drug_input,
            ingredient=clean_name,
            ingredient_base=clean_name,
            is_extended_release=is_er,
            is_delayed_release=is_dr,
            route="ORAL",
            manufacturer=None,
            has_patent=False,
            te_code=None,
            resolution_confidence=0.60,
            resolution_method="name_parsing"
        )
    
    def get_base_interaction_risk(self, drug_a: ResolvedDrug, drug_b: ResolvedDrug) -> Dict[str, Any]:
        """
        Get base interaction risk between two resolved drugs using the DDI model.
        """
        if self.ddi_model is None:
            # Return estimated risk based on known high-risk pairs
            return self._estimate_base_risk(drug_a, drug_b)
        
        try:
            # Use the DDI model to predict (method is predict_interaction)
            result = self.ddi_model.predict_interaction(
                drug_a.ingredient_base,
                drug_b.ingredient_base
            )
            
            return {
                "base_risk": result.get("interaction_probability", 0.5),
                "severity": result.get("severity", "moderate"),
                "interaction_type": result.get("interaction_type"),
                "description": result.get("description"),
                "confidence": result.get("confidence", 0.7),
                "source": "ddi_model"
            }
        except Exception as e:
            logger.warning(f"DDI Model prediction failed: {e}")
            return self._estimate_base_risk(drug_a, drug_b)
    
    def _estimate_base_risk(self, drug_a: ResolvedDrug, drug_b: ResolvedDrug) -> Dict[str, Any]:
        """Estimate base risk for known drug pairs when model unavailable."""
        
        # Known high-risk drug interaction pairs
        high_risk_pairs = {
            ("PAROXETINE", "TAMOXIFEN"): {
                "base_risk": 0.72,
                "severity": "high",
                "description": "Paroxetine strongly inhibits CYP2D6, which is required to convert tamoxifen to its active metabolite endoxifen. This can significantly reduce tamoxifen efficacy."
            },
            ("FLUOXETINE", "TRAMADOL"): {
                "base_risk": 0.82,
                "severity": "high",
                "description": "Risk of serotonin syndrome and seizures. SSRIs inhibit tramadol metabolism and add serotonergic effects."
            },
            ("WARFARIN", "ASPIRIN"): {
                "base_risk": 0.85,
                "severity": "high",
                "description": "Increased bleeding risk due to combined anticoagulant and antiplatelet effects."
            },
            ("OMEPRAZOLE", "CLOPIDOGREL"): {
                "base_risk": 0.78,
                "severity": "high",
                "description": "Omeprazole inhibits CYP2C19, reducing clopidogrel activation and antiplatelet efficacy."
            },
            ("SIMVASTATIN", "AMIODARONE"): {
                "base_risk": 0.75,
                "severity": "high",
                "description": "Increased risk of myopathy and rhabdomyolysis due to CYP3A4 inhibition."
            },
            ("METFORMIN", "GLIPIZIDE"): {
                "base_risk": 0.45,
                "severity": "moderate",
                "description": "Additive hypoglycemic effect. Monitor blood glucose closely."
            },
            ("LITHIUM", "IBUPROFEN"): {
                "base_risk": 0.73,
                "severity": "high",
                "description": "NSAIDs reduce lithium excretion, leading to potential toxicity."
            },
            ("DIGOXIN", "AMIODARONE"): {
                "base_risk": 0.80,
                "severity": "high",
                "description": "Amiodarone increases digoxin levels by ~70%. Dose reduction required."
            },
            ("PHENYTOIN", "VALPROIC ACID"): {
                "base_risk": 0.72,
                "severity": "high",
                "description": "Complex interaction affecting protein binding and metabolism of both drugs."
            },
            ("SERTRALINE", "MAOI"): {
                "base_risk": 0.95,
                "severity": "critical",
                "description": "Potentially fatal serotonin syndrome. Contraindicated combination."
            }
        }
        
        # Check both orderings
        key1 = (drug_a.ingredient_base.upper(), drug_b.ingredient_base.upper())
        key2 = (drug_b.ingredient_base.upper(), drug_a.ingredient_base.upper())
        
        if key1 in high_risk_pairs:
            result = high_risk_pairs[key1].copy()
            result["source"] = "known_pairs_database"
            result["confidence"] = 0.85
            return result
        
        if key2 in high_risk_pairs:
            result = high_risk_pairs[key2].copy()
            result["source"] = "known_pairs_database"
            result["confidence"] = 0.85
            return result
        
        # Default moderate risk for unknown pairs
        return {
            "base_risk": 0.35,
            "severity": "low",
            "description": "No significant interaction documented in our database.",
            "confidence": 0.50,
            "source": "default_estimate"
        }
    
    def adjust_for_formulation(self, base_risk: float, 
                                drug_a: ResolvedDrug, 
                                drug_b: ResolvedDrug) -> Dict[str, Any]:
        """
        Adjust risk based on formulation features using the Formulation Model.
        """
        # Build formulation features
        formulation_features = {
            "is_extended_release_a": int(drug_a.is_extended_release),
            "is_extended_release_b": int(drug_b.is_extended_release),
            "is_delayed_release_a": int(drug_a.is_delayed_release),
            "is_delayed_release_b": int(drug_b.is_delayed_release),
            "route_match": int(drug_a.route == drug_b.route),
            "strength_ratio": self._calculate_strength_ratio(drug_a, drug_b),
            "same_manufacturer": int(drug_a.manufacturer == drug_b.manufacturer) if drug_a.manufacturer and drug_b.manufacturer else 0,
            "has_patent_a": int(drug_a.has_patent),
            "has_patent_b": int(drug_b.has_patent)
        }
        
        if self.formulation_model:
            try:
                result = self.formulation_model.predict(base_risk, formulation_features)
                return result
            except Exception as e:
                logger.warning(f"Formulation model prediction failed: {e}")
        
        # Fallback: rule-based adjustment
        return self._rule_based_formulation_adjustment(base_risk, formulation_features, drug_a, drug_b)
    
    def _calculate_strength_ratio(self, drug_a: ResolvedDrug, drug_b: ResolvedDrug) -> float:
        """Calculate the strength ratio between two drugs."""
        strength_a = drug_a.input.strength_value
        strength_b = drug_b.input.strength_value
        
        if strength_a and strength_b and strength_b > 0:
            # Normalize to same unit if possible
            unit_a = drug_a.input.strength_unit or "MG"
            unit_b = drug_b.input.strength_unit or "MG"
            
            if unit_a == unit_b:
                return strength_a / strength_b
        
        return 1.0  # Default ratio
    
    def _rule_based_formulation_adjustment(self, base_risk: float,
                                           features: Dict[str, Any],
                                           drug_a: ResolvedDrug,
                                           drug_b: ResolvedDrug) -> Dict[str, Any]:
        """Apply rule-based formulation risk adjustment."""
        
        risk_change = 0.0
        factors = []
        
        # Extended release reduces peak concentrations
        if features["is_extended_release_a"]:
            risk_change -= 0.03
            factors.append(f"{drug_a.input.brand_name} uses extended-release formulation")
        
        if features["is_extended_release_b"]:
            risk_change -= 0.03
            factors.append(f"{drug_b.input.brand_name} uses extended-release formulation")
        
        # Both extended release has compounding effect
        if features["is_extended_release_a"] and features["is_extended_release_b"]:
            risk_change -= 0.02
        
        # Delayed release
        if features["is_delayed_release_a"]:
            risk_change -= 0.02
            factors.append(f"{drug_a.input.brand_name} has delayed-release coating")
        
        if features["is_delayed_release_b"]:
            risk_change -= 0.02
            factors.append(f"{drug_b.input.brand_name} has delayed-release coating")
        
        # Different routes reduce interaction
        if not features["route_match"]:
            risk_change -= 0.05
            factors.append("Different administration routes")
        
        # Strength ratio effects
        strength_ratio = features["strength_ratio"]
        if strength_ratio > 1.5:
            risk_change += 0.02
            factors.append("Higher relative dosage")
        elif strength_ratio < 0.5:
            risk_change -= 0.02
            factors.append("Lower relative dosage")
        
        # Determine modifier
        if risk_change < -0.02:
            modifier = "mitigates"
        elif risk_change > 0.02:
            modifier = "potentiates"
        else:
            modifier = "neutral"
        
        adjusted_risk = max(0.0, min(1.0, base_risk + risk_change))
        
        # Generate explanation
        base_pct = int(base_risk * 100)
        adjusted_pct = int(adjusted_risk * 100)
        
        if factors:
            factor_text = ". ".join(factors) + "."
        else:
            factor_text = "Standard formulations used."
        
        if modifier == "mitigates":
            explanation = (f"Base risk for {drug_a.ingredient_base.lower()} + {drug_b.ingredient_base.lower()} "
                          f"is {base_pct}%. {factor_text} These factors may reduce the interaction risk "
                          f"to approximately {adjusted_pct}%.")
        elif modifier == "potentiates":
            explanation = (f"Base risk for {drug_a.ingredient_base.lower()} + {drug_b.ingredient_base.lower()} "
                          f"is {base_pct}%. {factor_text} These factors may increase the interaction risk "
                          f"to approximately {adjusted_pct}%.")
        else:
            explanation = (f"Base risk for {drug_a.ingredient_base.lower()} + {drug_b.ingredient_base.lower()} "
                          f"is {base_pct}%. {factor_text} Formulation factors have minimal impact on this interaction.")
        
        return {
            "base_risk": round(base_risk, 4),
            "risk_change": round(risk_change, 4),
            "adjusted_risk": round(adjusted_risk, 4),
            "risk_modifier": modifier,
            "explanation": explanation,
            "formulation_factors": factors
        }
    
    def predict(self, drug_a_input: str, drug_b_input: str) -> Dict[str, Any]:
        """
        Full prediction pipeline for two drug inputs.
        
        Args:
            drug_a_input: First drug (e.g., "Paxil CR 12.5mg tablet")
            drug_b_input: Second drug (e.g., "Tamoxifen 20mg tablet")
            
        Returns:
            Complete prediction with adjusted risk and explanations
        """
        self.initialize()
        
        # Step 1: Parse drug inputs
        parsed_a = self.parse_drug_input(drug_a_input)
        parsed_b = self.parse_drug_input(drug_b_input)
        
        # Step 2: Resolve to active ingredients and features
        resolved_a = self.resolve_drug(parsed_a)
        resolved_b = self.resolve_drug(parsed_b)
        
        # Step 3: Get base interaction risk
        base_interaction = self.get_base_interaction_risk(resolved_a, resolved_b)
        base_risk = base_interaction["base_risk"]
        
        # Step 4: Adjust for formulation
        formulation_result = self.adjust_for_formulation(base_risk, resolved_a, resolved_b)
        
        # Build complete response
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            
            # Input drugs
            "drug_a": {
                "input": drug_a_input,
                "parsed": {
                    "brand_name": parsed_a.brand_name,
                    "strength": parsed_a.strength,
                    "dosage_form": parsed_a.dosage_form
                },
                "resolved": {
                    "ingredient": resolved_a.ingredient,
                    "ingredient_base": resolved_a.ingredient_base,
                    "is_extended_release": resolved_a.is_extended_release,
                    "is_delayed_release": resolved_a.is_delayed_release,
                    "route": resolved_a.route,
                    "manufacturer": resolved_a.manufacturer,
                    "resolution_confidence": resolved_a.resolution_confidence,
                    "resolution_method": resolved_a.resolution_method
                }
            },
            "drug_b": {
                "input": drug_b_input,
                "parsed": {
                    "brand_name": parsed_b.brand_name,
                    "strength": parsed_b.strength,
                    "dosage_form": parsed_b.dosage_form
                },
                "resolved": {
                    "ingredient": resolved_b.ingredient,
                    "ingredient_base": resolved_b.ingredient_base,
                    "is_extended_release": resolved_b.is_extended_release,
                    "is_delayed_release": resolved_b.is_delayed_release,
                    "route": resolved_b.route,
                    "manufacturer": resolved_b.manufacturer,
                    "resolution_confidence": resolved_b.resolution_confidence,
                    "resolution_method": resolved_b.resolution_method
                }
            },
            
            # Base interaction
            "base_interaction": {
                "risk": base_risk,
                "severity": base_interaction.get("severity", "unknown"),
                "description": base_interaction.get("description"),
                "confidence": base_interaction.get("confidence"),
                "source": base_interaction.get("source")
            },
            
            # Formulation adjustment
            "formulation_adjustment": {
                "risk_change": formulation_result["risk_change"],
                "modifier": formulation_result["risk_modifier"],
                "factors": formulation_result.get("formulation_factors", [])
            },
            
            # Final result
            "final_prediction": {
                "adjusted_risk": formulation_result["adjusted_risk"],
                "risk_percentage": int(formulation_result["adjusted_risk"] * 100),
                "severity": self._risk_to_severity(formulation_result["adjusted_risk"]),
                "explanation": formulation_result["explanation"]
            },
            
            # Recommendations
            "recommendations": self._generate_recommendations(
                resolved_a, resolved_b, 
                formulation_result["adjusted_risk"],
                base_interaction.get("severity", "moderate")
            )
        }
    
    def _risk_to_severity(self, risk: float) -> str:
        """Convert risk score to severity category."""
        if risk >= 0.8:
            return "critical"
        elif risk >= 0.6:
            return "high"
        elif risk >= 0.4:
            return "moderate"
        elif risk >= 0.2:
            return "low"
        else:
            return "minimal"
    
    def _generate_recommendations(self, drug_a: ResolvedDrug, drug_b: ResolvedDrug,
                                   adjusted_risk: float, severity: str) -> List[str]:
        """Generate clinical recommendations based on the prediction."""
        recommendations = []
        
        if adjusted_risk >= 0.8:
            recommendations.append("⚠️ CRITICAL: Consider alternative medications. This combination carries significant risk.")
            recommendations.append("Consult with a pharmacist or physician before proceeding.")
        elif adjusted_risk >= 0.6:
            recommendations.append("⚠️ HIGH RISK: Close monitoring required if this combination is used.")
            recommendations.append("Consider dose adjustments or alternative timing of administration.")
        elif adjusted_risk >= 0.4:
            recommendations.append("Monitor for potential interaction effects.")
            recommendations.append("Report any unusual symptoms to your healthcare provider.")
        else:
            recommendations.append("Low interaction risk. Standard monitoring recommended.")
        
        # Formulation-specific recommendations
        if drug_a.is_extended_release or drug_b.is_extended_release:
            recommendations.append("Extended-release formulation may help reduce peak concentration overlap.")
        
        if drug_a.route != drug_b.route:
            recommendations.append("Different administration routes may reduce interaction potential.")
        
        return recommendations


# Singleton instance
_pipeline: Optional[CrossBrandPredictionPipeline] = None


def get_prediction_pipeline() -> CrossBrandPredictionPipeline:
    """Get or create the prediction pipeline singleton."""
    global _pipeline
    
    if _pipeline is None:
        _pipeline = CrossBrandPredictionPipeline()
    
    return _pipeline
