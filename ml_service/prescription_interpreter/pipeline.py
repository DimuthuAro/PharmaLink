"""
Integrated Prescription Interpreter Pipeline
============================================
4-Stage Architecture:
1. ROI Detection (YOLOv8-nano)     → Extract medication zones
2. OCR (TrOCR-small)               → Recognize handwriting
3. LLM Refinement (GPT-4o API)      → Correct medical text
4. Validation (Your interaction ID) → Check drug interactions

VRAM Budget: ~0.7GB (fits in 2GB laptops with room to spare)
"""

import cv2
import numpy as np
import torch
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import time
import logging
from enum import Enum

logger = logging.getLogger(__name__)

# Import our new modules
from .roi_detector import PrescriptionROIDetector, ROIBox
from .handwriting_recognizer import HandwritingRecognizer, RecognitionResult
from .llm_refiner import CascadingRefiner, RefinementResult, MedicalLLMRefiner


class PipelineStage(Enum):
    DETECTION = "detection"
    RECOGNITION = "recognition"
    REFINEMENT = "refinement"
    VALIDATION = "validation"


@dataclass
class MedicationExtracted:
    """Structured medication data"""
    name: str
    dosage: str
    frequency: str
    duration: str
    route: str = "oral"  # Default assumption
    instructions: str = ""
    confidence: float = 0.0
    raw_text: str = ""
    source_zone: str = ""


@dataclass
class PipelineResult:
    """Complete pipeline result"""
    success: bool
    medications: List[MedicationExtracted] = field(default_factory=list)
    interactions: List[Dict] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    raw_ocr_text: str = ""
    refined_text: str = ""
    
    # Metadata
    processing_time_ms: float = 0.0
    stages_completed: List[str] = field(default_factory=list)
    stage_timings: Dict[str, float] = field(default_factory=dict)
    vram_usage_gb: float = 0.0
    
    # Quality metrics
    confidence_score: float = 0.0
    requires_manual_review: bool = False
    review_reasons: List[str] = field(default_factory=list)


class PrescriptionPipeline:
    """
    4-Stage prescription interpretation pipeline.
    Optimized for 2GB VRAM laptops.
    """
    
    def __init__(self,
                 # ROI Detector config
                 detector_model_path: Optional[str] = None,
                 detector_confidence: float = 0.5,
                 
                 # OCR config
                 ocr_model_size: str = 'small',  # 'small' (0.6GB) or 'base' (1.2GB)
                 
                 # LLM Refiner config
                 use_api_refiner: bool = True,
                 openai_api_key: Optional[str] = None,
                 enable_local_fallback: bool = False,
                 
                 # Validation config
                 interaction_service_url: str = "http://localhost:3001",
                 
                 # Resource limits
                 max_vram_gb: float = 1.5):
        """
        Initialize the 4-stage pipeline.
        
        Args:
            detector_model_path: Path to YOLOv8 model (None = use default nano)
            detector_confidence: Minimum confidence for zone detection
            ocr_model_size: 'small' (0.6GB VRAM) or 'base' (1.2GB VRAM)
            use_api_refiner: Use GPT-4o API (0 VRAM, requires internet)
            openai_api_key: OpenAI API key
            enable_local_fallback: Enable local Phi-3 fallback (~1GB VRAM)
            interaction_service_url: URL to your drug interaction microservice
            max_vram_gb: Maximum VRAM to use across all models
        """
        self.max_vram_gb = max_vram_gb
        self.interaction_service_url = interaction_service_url
        
        # Stage 1: ROI Detection (~0.1GB VRAM)
        logger.info("Initializing Stage 1: ROI Detection (YOLOv8-nano)")
        self.detector = PrescriptionROIDetector(
            model_path=detector_model_path,
            confidence_threshold=detector_confidence,
            max_vram_gb=max_vram_gb * 0.2  # Allocate 20% of budget
        )
        
        # Stage 2: OCR (~0.6GB VRAM for 'small')
        logger.info(f"Initializing Stage 2: OCR (TrOCR-{ocr_model_size})")
        self.recognizer = HandwritingRecognizer(
            model_size=ocr_model_size,
            max_vram_gb=max_vram_gb * 0.5  # Allocate 50% of budget
        )
        
        # Stage 3: LLM Refinement (0 VRAM if API, ~1GB if local)
        logger.info("Initializing Stage 3: LLM Refinement")
        self.refiner = CascadingRefiner(
            prefer_api=use_api_refiner,
            api_key=openai_api_key,
            enable_local=enable_local_fallback
        )
        
        logger.info("Pipeline initialized successfully")
    
    def process(self,
                image: np.ndarray,
                patient_context: Optional[Dict] = None,
                check_interactions: bool = True) -> PipelineResult:
        """
        Process prescription image through all 4 stages.
        
        Args:
            image: Prescription image (numpy array, BGR/RGB)
            patient_context: Patient info for LLM context (age, conditions, etc.)
            check_interactions: Whether to check drug interactions (Stage 4)
            
        Returns:
            PipelineResult with extracted medications and interactions
        """
        start_time = time.time()
        stages_completed = []
        stage_timings = {}
        
        try:
            # === STAGE 1: ROI Detection ===
            stage_start = time.time()
            zones = self.detector.get_medication_zones(image)
            stage_timings['detection'] = (time.time() - stage_start) * 1000
            stages_completed.append('detection')
            
            if not zones:
                return PipelineResult(
                    success=False,
                    warnings=["No medication zones detected"],
                    requires_manual_review=True,
                    review_reasons=["no_zones_detected"]
                )
            
            logger.info(f"Detected {len(zones)} medication zone(s)")
            
            # === STAGE 2: OCR Recognition ===
            stage_start = time.time()
            zone_images = [zone_img for _, zone_img in zones]
            recognition_results = self.recognizer.recognize_batch(zone_images)
            stage_timings['recognition'] = (time.time() - stage_start) * 1000
            stages_completed.append('recognition')
            
            # Combine all recognized text
            raw_texts = [r.text for r in recognition_results]
            raw_combined = "\n".join(raw_texts)
            avg_ocr_confidence = sum(r.confidence for r in recognition_results) / len(recognition_results)
            
            logger.info(f"OCR complete: {len(raw_texts)} line(s), avg confidence: {avg_ocr_confidence:.2f}")
            
            # === STAGE 3: LLM Refinement ===
            stage_start = time.time()
            refinement = self.refiner.refine(
                raw_text=raw_combined,
                context=patient_context,
                min_confidence=0.6
            )
            stage_timings['refinement'] = (time.time() - stage_start) * 1000
            stages_completed.append('refinement')
            
            refined_text = refinement.refined_text
            logger.info(f"Refinement complete: confidence={refinement.confidence:.2f}, "
                       f"model={refinement.model_used}")
            
            # === Parse Medications from Refined Text ===
            medications = self._parse_medications(
                refined_text, 
                zones,
                recognition_results,
                refinement.confidence
            )
            
            # === STAGE 4: Validation (Drug Interactions) ===
            interactions = []
            if check_interactions and medications:
                stage_start = time.time()
                interactions = self._check_interactions(medications)
                stage_timings['validation'] = (time.time() - stage_start) * 1000
                stages_completed.append('validation')
            
            # === Calculate Overall Metrics ===
            total_time = (time.time() - start_time) * 1000
            
            # Confidence scoring
            stage_weights = {
                'detection': 0.2,
                'recognition': 0.35,
                'refinement': 0.35,
                'validation': 0.1
            }
            
            overall_confidence = (
                avg_ocr_confidence * stage_weights['recognition'] +
                refinement.confidence * stage_weights['refinement'] +
                (1.0 if zones else 0.0) * stage_weights['detection'] +
                (1.0 if not interactions else 0.7) * stage_weights['validation']
            )
            
            # Determine if manual review needed
            review_reasons = []
            if overall_confidence < 0.6:
                review_reasons.append("low_confidence")
            if not medications:
                review_reasons.append("no_medications_extracted")
            if any('severe' in str(i.get('severity', '')).lower() for i in interactions):
                review_reasons.append("severe_interactions_detected")
            
            # Build warnings
            warnings = []
            if refinement.corrections:
                corrections_list = [f"{c['original']}→{c['corrected']}" for c in refinement.corrections[:3]]
                warnings.append(f"Auto-corrected: {', '.join(corrections_list)}")
            
            for interaction in interactions:
                if interaction.get('severity') == 'high':
                    warnings.append(f"⚠️ High risk interaction: {interaction.get('description', '')}")
            
            # Current VRAM usage estimate
            vram_used = self._estimate_vram_usage()
            
            return PipelineResult(
                success=True,
                medications=medications,
                interactions=interactions,
                warnings=warnings,
                raw_ocr_text=raw_combined,
                refined_text=refined_text,
                processing_time_ms=total_time,
                stages_completed=stages_completed,
                stage_timings=stage_timings,
                vram_usage_gb=vram_used,
                confidence_score=overall_confidence,
                requires_manual_review=len(review_reasons) > 0,
                review_reasons=review_reasons
            )
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            return PipelineResult(
                success=False,
                warnings=[f"Processing error: {str(e)}"],
                requires_manual_review=True,
                review_reasons=["processing_error"],
                processing_time_ms=(time.time() - start_time) * 1000
            )
    
    def _parse_medications(self,
                          refined_text: str,
                          zones: List[Tuple[ROIBox, np.ndarray]],
                          recognition_results: List[RecognitionResult],
                          confidence: float) -> List[MedicationExtracted]:
        """
        Parse structured medication data from refined text.
        Uses regex patterns + Sri Lankan medical conventions.
        """
        import re
        
        medications = []
        lines = refined_text.split('\n')
        
        # Common patterns for Sri Lankan prescriptions
        patterns = {
            'drug_dosage_freq': re.compile(
                r'(\w[\w\s]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|units?|%))\s+(tds|bd|bid|od|qd|sos|qid|q\d+h?|once\s+daily|twice\s+daily|three\s+times\s+daily)',
                re.IGNORECASE
            ),
            'duration': re.compile(r'(?:for|x)\s*(\d+)\s*(days?|weeks?|months?|d|w|m)', re.IGNORECASE),
            'simple_drug': re.compile(r'^(\w[\w\s]+?)(?:\s+(\d+))?\s*$')
        }
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 3:
                continue
            
            med_data = {
                'name': '',
                'dosage': '',
                'frequency': '',
                'duration': '',
                'route': 'oral',
                'instructions': '',
                'confidence': confidence,
                'raw_text': line,
                'source_zone': zones[i][0].zone_type if i < len(zones) else 'unknown'
            }
            
            # Try full pattern match
            match = patterns['drug_dosage_freq'].search(line)
            if match:
                med_data['name'] = match.group(1).strip()
                med_data['dosage'] = match.group(2).strip()
                med_data['frequency'] = self._normalize_frequency(match.group(3))
                
                # Look for duration in same line or nearby
                dur_match = patterns['duration'].search(line)
                if dur_match:
                    med_data['duration'] = f"{dur_match.group(1)} {dur_match.group(2)}"
            else:
                # Fallback: simple extraction
                words = line.split()
                if len(words) >= 1:
                    med_data['name'] = words[0]
                    # Look for dosage in remaining words
                    for w in words[1:]:
                        if any(unit in w.lower() for unit in ['mg', 'g', 'ml', 'mcg', '%']):
                            med_data['dosage'] = w
                            break
            
            # Clean up drug name
            med_data['name'] = self._clean_drug_name(med_data['name'])
            
            if med_data['name']:
                medications.append(MedicationExtracted(**med_data))
        
        return medications
    
    def _normalize_frequency(self, freq: str) -> str:
        """Normalize frequency abbreviations"""
        freq = freq.lower().strip()
        mapping = {
            'tds': 'three times daily',
            'bd': 'twice daily',
            'bid': 'twice daily',
            'od': 'once daily',
            'qd': 'once daily',
            'sos': 'as needed',
            'qid': 'four times daily',
            'q4h': 'every 4 hours',
            'q6h': 'every 6 hours',
            'q8h': 'every 8 hours',
            'q12h': 'every 12 hours',
        }
        return mapping.get(freq, freq)
    
    def _clean_drug_name(self, name: str) -> str:
        """Clean and normalize drug name"""
        # Remove common prefixes that OCR might include
        prefixes = ['tab.', 'tab', 'cap.', 'cap', 'syp.', 'syp', 'inj.', 'inj']
        name = name.lower().strip()
        for prefix in prefixes:
            if name.startswith(prefix):
                name = name[len(prefix):].strip()
        return name.title()
    
    def _check_interactions(self, medications: List[MedicationExtracted]) -> List[Dict]:
        """
        Check drug interactions using your existing interaction service.
        Falls back to local knowledge base if service unavailable.
        """
        import requests
        
        drug_names = [m.name for m in medications if m.name]
        if len(drug_names) < 2:
            return []
        
        try:
            # Call your existing drug interaction microservice
            response = requests.post(
                f"{self.interaction_service_url}/check-interactions",
                json={"drugs": drug_names},
                timeout=5
            )
            
            if response.status_code == 200:
                return response.json().get('interactions', [])
            else:
                logger.warning(f"Interaction service returned {response.status_code}")
                return []
                
        except Exception as e:
            logger.warning(f"Could not reach interaction service: {e}")
            # Fallback: Use local knowledge base
            return self._check_local_interactions(drug_names)
    
    def _check_local_interactions(self, drug_names: List[str]) -> List[Dict]:
        """Fallback: Check interactions against local knowledge base"""
        # This would use your existing interaction database
        # For now, return empty - implement with your existing logic
        known_pairs = [
            ('warfarin', 'aspirin'),
            ('warfarin', 'ibuprofen'),
            ('metformin', 'contrast'),
            ('ace inhibitors', 'potassium'),
        ]
        
        interactions = []
        drugs_lower = [d.lower() for d in drug_names]
        
        for drug1, drug2 in known_pairs:
            if drug1 in drugs_lower and drug2 in drugs_lower:
                interactions.append({
                    'drug1': drug1,
                    'drug2': drug2,
                    'severity': 'high',
                    'description': f'Potential interaction between {drug1} and {drug2}'
                })
        
        return interactions
    
    def _estimate_vram_usage(self) -> float:
        """Estimate current VRAM usage in GB"""
        if torch.cuda.is_available():
            try:
                return torch.cuda.memory_allocated() / 1e9
            except:
                pass
        return 0.0
    
    @property
    def pipeline_info(self) -> Dict:
        """Get pipeline configuration info"""
        return {
            'stages': [
                {'name': 'detection', 'model': 'YOLOv8-nano', 'vram_gb': 0.1},
                {'name': 'recognition', 'model': f'TrOCR-{self.recognizer.model_size}', 'vram_gb': 0.6},
                {'name': 'refinement', 'model': 'GPT-4o-mini API', 'vram_gb': 0},
                {'name': 'validation', 'model': 'Interaction Service', 'vram_gb': 0}
            ],
            'total_vram_estimate_gb': 0.7,
            'max_vram_limit_gb': self.max_vram_gb
        }


# Convenience function for direct usage
def interpret_prescription(
    image_path: str,
    api_key: Optional[str] = None,
    check_interactions: bool = True,
    patient_context: Optional[Dict] = None
) -> PipelineResult:
    """
    One-shot prescription interpretation.
    
    Args:
        image_path: Path to prescription image
        api_key: OpenAI API key for LLM refinement
        check_interactions: Whether to check drug interactions
        patient_context: Optional patient info {'age': 65, 'conditions': ['diabetes']}
        
    Returns:
        PipelineResult with extracted medications
    """
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    # Convert BGR to RGB
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Run pipeline
    pipeline = PrescriptionPipeline(
        ocr_model_size='small',
        use_api_refiner=True,
        openai_api_key=api_key,
        max_vram_gb=1.5
    )
    
    return pipeline.process(
        image=image,
        patient_context=patient_context,
        check_interactions=check_interactions
    )


if __name__ == "__main__":
    # Example usage
    print("Prescription Pipeline Ready")
    print(f"VRAM Budget: ~0.7GB (fits in 2GB laptops)")
