"""
FastAPI Endpoints for 4-Stage Prescription Pipeline
====================================================
New endpoints using YOLOv8 + TrOCR + GPT-4o + Validation
Maintains backward compatibility with existing API contract.
"""

import io
import os
import time
from typing import Optional, List
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import cv2
import logging

# Import pipeline
from .pipeline import PrescriptionPipeline, PipelineResult, interpret_prescription
from .roi_detector import PrescriptionROIDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="PharmaLink Prescription Interpreter v3",
    description="4-Stage Pipeline: YOLOv8 Detection → TrOCR Recognition → GPT-4o Refinement → Drug Validation",
    version="3.0.0"
)

# Global pipeline instance (lazy loaded)
_pipeline: Optional[PrescriptionPipeline] = None


def get_pipeline() -> PrescriptionPipeline:
    """Get or initialize the prescription pipeline (singleton)"""
    global _pipeline
    if _pipeline is None:
        logger.info("Initializing prescription pipeline...")
        _pipeline = PrescriptionPipeline(
            ocr_model_size='small',  # 0.6GB VRAM
            use_api_refiner=True,
            openai_api_key=os.getenv('OPENAI_API_KEY'),
            max_vram_gb=1.5
        )
        logger.info("Pipeline ready")
    return _pipeline


# =============================================================================
# Pydantic Models for API
# =============================================================================

class PatientContext(BaseModel):
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    gender: Optional[str] = None
    conditions: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    current_medications: List[str] = Field(default_factory=list)


class PrescriptionInterpretRequest(BaseModel):
    check_interactions: bool = True
    patient_context: Optional[PatientContext] = None


class MedicationResponse(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    route: str = "oral"
    instructions: str = ""
    confidence: float


class InteractionResponse(BaseModel):
    drug1: str
    drug2: str
    severity: str  # 'low', 'medium', 'high'
    description: str
    recommendation: str


class StageTiming(BaseModel):
    stage: str
    latency_ms: float


class PrescriptionInterpretResponse(BaseModel):
    success: bool
    medications: List[MedicationResponse]
    interactions: List[InteractionResponse]
    warnings: List[str]
    raw_ocr_text: str
    refined_text: str
    
    # Quality metrics
    confidence_score: float = Field(..., ge=0, le=1)
    requires_manual_review: bool
    review_reasons: List[str]
    
    # Performance metrics
    processing_time_ms: float
    stage_timings: List[StageTiming]
    vram_usage_gb: float
    
    # Metadata
    timestamp: str
    pipeline_version: str = "3.0.0"
    disclaimer: str = "This tool is for educational purposes. Always verify with a healthcare professional."


class HealthResponse(BaseModel):
    status: str
    version: str
    pipeline_version: str
    stages_available: List[str]
    vram_status: dict
    models_loaded: dict


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint - reports pipeline status"""
    try:
        pipeline = get_pipeline()
        info = pipeline.pipeline_info
        
        import torch
        vram_total = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
        
        return HealthResponse(
            status="healthy",
            version="3.0.0",
            pipeline_version="3.0.0",
            stages_available=["detection", "recognition", "refinement", "validation"],
            vram_status={
                "available_gb": round(vram_total, 1),
                "estimated_usage_gb": 0.7,
                "fits_in_2gb": vram_total >= 2.0 or vram_total == 0  # 0 means CPU
            },
            models_loaded={
                "detector": "YOLOv8-nano",
                "ocr": f"TrOCR-{pipeline.recognizer.model_size}",
                "refiner": "GPT-4o-mini API"
            }
        )
    except Exception as e:
        return HealthResponse(
            status=f"degraded: {str(e)}",
            version="3.0.0",
            pipeline_version="3.0.0",
            stages_available=[],
            vram_status={"error": str(e)},
            models_loaded={}
        )


@app.post("/interpret", response_model=PrescriptionInterpretResponse)
async def interpret_prescription_endpoint(
    file: UploadFile = File(..., description="Prescription image file (JPG, PNG)"),
    check_interactions: bool = Form(True, description="Check for drug interactions"),
    patient_age: Optional[int] = Form(None, description="Patient age for context"),
    patient_conditions: Optional[str] = Form(None, description="Comma-separated conditions (e.g., 'diabetes,hypertension')"),
):
    """
    Main endpoint: 4-Stage Prescription Interpretation
    
    Pipeline:
    1. YOLOv8-nano detects medication zones (~100ms)
    2. TrOCR-small recognizes handwriting (~500ms per zone)
    3. GPT-4o-mini corrects medical text (~500-1000ms)
    4. Drug interaction validation (~100ms)
    
    Total: ~2-3 seconds for typical prescription
    VRAM: ~0.7GB (fits in 2GB laptops)
    """
    start_time = time.time()
    
    # Validate file
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image (JPG, PNG).")
    
    try:
        # Read image
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        
        # Convert to numpy array (RGB)
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)
        
        logger.info(f"Processing prescription: {file.filename}, size: {pil_image.size}")
        
        # Build patient context
        context = None
        if patient_age or patient_conditions:
            conditions = [c.strip() for c in patient_conditions.split(",")] if patient_conditions else []
            context = {
                "age": patient_age,
                "conditions": conditions
            }
        
        # Run pipeline
        pipeline = get_pipeline()
        result = pipeline.process(
            image=image_array,
            patient_context=context,
            check_interactions=check_interactions
        )
        
        # Convert to response model
        response = PrescriptionInterpretResponse(
            success=result.success,
            medications=[
                MedicationResponse(
                    name=m.name,
                    dosage=m.dosage,
                    frequency=m.frequency,
                    duration=m.duration,
                    route=m.route,
                    instructions=m.instructions,
                    confidence=m.confidence
                )
                for m in result.medications
            ],
            interactions=[
                InteractionResponse(
                    drug1=i.get('drug1', ''),
                    drug2=i.get('drug2', ''),
                    severity=i.get('severity', 'unknown'),
                    description=i.get('description', ''),
                    recommendation=i.get('recommendation', 'Consult healthcare provider')
                )
                for i in result.interactions
            ],
            warnings=result.warnings,
            raw_ocr_text=result.raw_ocr_text,
            refined_text=result.refined_text,
            confidence_score=result.confidence_score,
            requires_manual_review=result.requires_manual_review,
            review_reasons=result.review_reasons,
            processing_time_ms=result.processing_time_ms,
            stage_timings=[
                StageTiming(stage=k, latency_ms=v)
                for k, v in result.stage_timings.items()
            ],
            vram_usage_gb=result.vram_usage_gb,
            timestamp=datetime.utcnow().isoformat()
        )
        
        total_time = (time.time() - start_time) * 1000
        logger.info(f"Request complete in {total_time:.0f}ms (pipeline: {result.processing_time_ms:.0f}ms)")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Interpretation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/analyze-text")
async def analyze_text_endpoint(text: str = Form(..., description="Raw prescription text to analyze")):
    """
    Analyze raw text (bypasses OCR - use for typed/digital prescriptions).
    Skips Stage 1 (Detection) and Stage 2 (OCR), goes directly to Stage 3 (Refinement).
    """
    try:
        from .llm_refiner import CascadingRefiner
        
        refiner = CascadingRefiner(prefer_api=True)
        refinement = refiner.refine(text)
        
        return {
            "success": True,
            "original_text": text,
            "refined_text": refinement.refined_text,
            "corrections": refinement.corrections,
            "confidence": refinement.confidence,
            "model_used": refinement.model_used,
            "latency_ms": refinement.latency_ms,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/detect-zones")
async def detect_zones_endpoint(file: UploadFile = File(...)):
    """
    Debug endpoint: Show detected zones without OCR.
    Useful for testing YOLOv8 detection.
    """
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        image_array = np.array(pil_image)
        
        detector = PrescriptionROIDetector()
        zones = detector.detect_zones(image_array)
        
        return {
            "success": True,
            "zones_detected": len(zones),
            "zones": [
                {
                    "type": z.zone_type,
                    "coordinates": [z.x1, z.y1, z.x2, z.y2],
                    "confidence": round(z.confidence, 3),
                    "area": z.area
                }
                for z in zones
            ],
            "image_size": pil_image.size
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Zone detection failed: {str(e)}")


@app.get("/pipeline-info")
async def pipeline_info():
    """Get detailed pipeline configuration and VRAM estimates"""
    try:
        pipeline = get_pipeline()
        info = pipeline.pipeline_info
        
        import torch
        
        return {
            "pipeline_version": "3.0.0",
            "architecture": "4-Stage",
            "stages": info['stages'],
            "total_vram_estimate_gb": info['total_vram_estimate_gb'],
            "max_vram_limit_gb": info['max_vram_limit_gb'],
            "fits_2gb_vram": info['total_vram_estimate_gb'] <= 2.0,
            "hardware": {
                "cuda_available": torch.cuda.is_available(),
                "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
                "current_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
            },
            "recommended_for": "Sri Lankan prescriptions, 2GB VRAM laptops"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Legacy API Compatibility (maintains contract with existing frontend)
# =============================================================================

@app.post("/prescription/interpret")
async def legacy_interpret(
    file: UploadFile = File(...),
    engine: str = Form(default="auto"),
    enhance_mode: str = Form(default="medical"),
):
    """
    Legacy endpoint - redirects to new pipeline.
    Maintains backward compatibility with existing frontend.
    """
    return await interpret_prescription_endpoint(
        file=file,
        check_interactions=True,
        patient_age=None,
        patient_conditions=None
    )


@app.get("/prescription/health")
async def legacy_health():
    """Legacy health check - redirects to new health endpoint"""
    return await health_check()


# =============================================================================
# Startup Event
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Pre-load models on startup"""
    logger.info("=" * 60)
    logger.info("PharmaLink Prescription Interpreter v3.0")
    logger.info("4-Stage Pipeline Starting...")
    logger.info("=" * 60)
    
    # Pre-initialize pipeline
    try:
        get_pipeline()
        logger.info("✓ Pipeline pre-loaded and ready")
    except Exception as e:
        logger.warning(f"⚠ Pipeline pre-load failed: {e}")
        logger.warning("Will lazy-load on first request")
    
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    
    print("Starting Prescription Interpreter API...")
    print("Endpoints:")
    print("  - POST /interpret          → Main interpretation endpoint")
    print("  - GET  /health             → Health check")
    print("  - GET  /pipeline-info      → Pipeline configuration")
    print("  - POST /detect-zones       → Debug: zone detection only")
    print("")
    print("VRAM Budget: ~0.7GB (fits in 2GB laptops)")
    
    uvicorn.run(
        "prescription_interpreter.api:app",
        host="0.0.0.0",
        port=8003,
        reload=False,
        log_level="info"
    )
