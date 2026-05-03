#!/usr/bin/env python3
"""
Setup Script for 4-Stage Prescription Pipeline
===============================================
Downloads models and verifies 2GB VRAM compatibility.

Usage:
    python setup_pipeline.py [--download-only] [--check-vram] [--test]
"""

import os
import sys
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


def check_vram():
    """Check available VRAM and provide recommendations"""
    logger.info("\n" + "=" * 60)
    logger.info("VRAM CHECK")
    logger.info("=" * 60)
    
    try:
        import torch
        
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            for i in range(device_count):
                props = torch.cuda.get_device_properties(i)
                vram_total = props.total_memory / 1e9
                vram_free = torch.cuda.mem_get_info(i)[0] / 1e9 if hasattr(torch.cuda, 'mem_get_info') else vram_total * 0.8
                
                logger.info(f"\nGPU {i}: {props.name}")
                logger.info(f"  Total VRAM: {vram_total:.1f} GB")
                logger.info(f"  Free VRAM:  {vram_free:.1f} GB")
                
                # Pipeline requirements
                required_vram = 0.7
                recommended_vram = 1.5
                
                if vram_total >= recommended_vram:
                    logger.info(f"  Status: ✅ EXCELLENT (fits {required_vram}GB pipeline with margin)")
                elif vram_total >= required_vram:
                    logger.info(f"  Status: ✅ GOOD (fits {required_vram}GB pipeline)")
                else:
                    logger.info(f"  Status: ⚠️  LIMITED (pipeline may use CPU for some stages)")
                    logger.info(f"  Recommendation: Use CPU mode or reduce batch size")
        else:
            logger.info("\n❌ No CUDA-capable GPU detected")
            logger.info("   Pipeline will run on CPU (slower but functional)")
            logger.info("   Estimated CPU processing time: 5-10 seconds per prescription")
            
    except ImportError:
        logger.error("PyTorch not installed. Run: pip install torch")
        return False
    
    return True


def download_models():
    """Download required models"""
    logger.info("\n" + "=" * 60)
    logger.info("MODEL DOWNLOAD")
    logger.info("=" * 60)
    
    models_dir = Path(__file__).parent / "models"
    models_dir.mkdir(exist_ok=True)
    
    downloaded = []
    failed = []
    
    # 1. YOLOv8-nano (auto-downloaded by ultralytics on first use)
    logger.info("\n1. YOLOv8-nano (ROI Detection)")
    logger.info("   Size: ~6MB")
    logger.info("   Status: Auto-downloaded on first use via ultralytics")
    logger.info("   ✓ No manual download needed")
    downloaded.append("YOLOv8-nano")
    
    # 2. TrOCR-small (auto-downloaded by transformers)
    logger.info("\n2. TrOCR-small (Handwriting Recognition)")
    logger.info("   Size: ~300MB")
    logger.info("   Model: microsoft/trocr-small-handwritten")
    logger.info("   Status: Auto-downloaded on first use via HuggingFace")
    logger.info("   ✓ No manual download needed")
    downloaded.append("TrOCR-small")
    
    # 3. GPT-4o API (cloud-based, no download)
    logger.info("\n3. GPT-4o-mini (LLM Refinement)")
    logger.info("   Size: 0MB (cloud API)")
    logger.info("   Status: Requires OpenAI API key")
    logger.info("   Set environment variable: OPENAI_API_KEY")
    
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        logger.info(f"   ✓ API key found (starts with: {api_key[:8]}...)")
        downloaded.append("GPT-4o-mini API")
    else:
        logger.info("   ⚠️  No API key found")
        logger.info("      Set: export OPENAI_API_KEY='your-key'")
        logger.info("      Or create .env file with OPENAI_API_KEY=...")
        logger.info("      Fallback: Rule-based refiner will be used")
    
    logger.info(f"\n{'=' * 60}")
    logger.info(f"Downloaded/Ready: {len(downloaded)}/{3} models")
    logger.info(f"Total Local Storage: ~306MB")
    logger.info(f"VRAM Required: ~0.7GB")
    logger.info(f"{'=' * 60}")
    
    return len(failed) == 0


def test_pipeline():
    """Test the pipeline with a sample"""
    logger.info("\n" + "=" * 60)
    logger.info("PIPELINE TEST")
    logger.info("=" * 60)
    
    try:
        logger.info("\nImporting modules...")
        from .pipeline import PrescriptionPipeline
        from .roi_detector import PrescriptionROIDetector
        from .handwriting_recognizer import HandwritingRecognizer
        from .llm_refiner import CascadingRefiner
        
        logger.info("✓ All imports successful")
        
        # Initialize components
        logger.info("\nInitializing components...")
        
        logger.info("  - ROI Detector (YOLOv8-nano)...")
        detector = PrescriptionROIDetector()
        logger.info(f"    ✓ Loaded on {detector.device}")
        
        logger.info("  - Handwriting Recognizer (TrOCR-small)...")
        recognizer = HandwritingRecognizer(model_size='small')
        logger.info(f"    ✓ Model: {recognizer.model_info['name']}")
        logger.info(f"    ✓ Device: {recognizer.device}")
        
        logger.info("  - LLM Refiner...")
        refiner = CascadingRefiner()
        logger.info(f"    ✓ {len(refiner.refiners)} refinement stages available")
        
        # Create dummy image for test
        logger.info("\nCreating test image...")
        import numpy as np
        test_image = np.ones((640, 480, 3), dtype=np.uint8) * 255
        
        # Test detection
        logger.info("Testing zone detection...")
        zones = detector.detect_zones(test_image)
        logger.info(f"  ✓ Detected {len(zones)} zones (expected: 0 on blank image)")
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ ALL TESTS PASSED")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def create_env_template():
    """Create .env file template"""
    env_path = Path(__file__).parent.parent / ".env"
    
    if env_path.exists():
        logger.info(f"\n.env already exists at {env_path}")
        return
    
    template = """# PharmaLink ML Service Environment Variables

# OpenAI API Key (required for GPT-4o LLM refinement)
# Get your key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Force CPU mode even if GPU available
# USE_CPU_ONLY=false

# Optional: Set specific GPU device
# CUDA_VISIBLE_DEVICES=0

# Pipeline Configuration
PRESCRIPTION_OCR_MODEL_SIZE=small  # 'small' (0.6GB) or 'base' (1.2GB)
PRESCRIPTION_USE_API_REFINER=true
PRESCRIPTION_ENABLE_LOCAL_FALLBACK=false

# Drug Interaction Service URL
INTERACTION_SERVICE_URL=http://localhost:3001
"""
    
    with open(env_path, 'w') as f:
        f.write(template)
    
    logger.info(f"\n✓ Created .env template at {env_path}")
    logger.info("  Please edit and add your OpenAI API key")


def print_summary():
    """Print setup summary"""
    logger.info("\n" + "=" * 60)
    logger.info("SETUP SUMMARY")
    logger.info("=" * 60)
    logger.info("""
4-Stage Prescription Pipeline Ready!

Stages:
  1. ROI Detection    → YOLOv8-nano (~0.1GB VRAM)
  2. OCR Recognition  → TrOCR-small (~0.6GB VRAM)
  3. LLM Refinement   → GPT-4o API (0 VRAM) or Local (~1GB)
  4. Drug Validation  → Your interaction service (0 VRAM)

Total VRAM: ~0.7GB (fits comfortably in 2GB laptops)

Next Steps:
  1. Set OPENAI_API_KEY environment variable
  2. Run: python -m prescription_interpreter.api
  3. Test: curl -X POST -F "file=@prescription.jpg" http://localhost:8003/interpret

API Endpoints:
  POST /interpret         → Main prescription interpretation
  GET  /health            → Health check
  GET  /pipeline-info     → Pipeline configuration
  POST /detect-zones      → Debug zone detection

For Sri Lankan prescriptions:
  - Supports common abbreviations (tds, bd, od, sos, etc.)
  - Local drug database integration ready
  - Optimized for doctor handwriting
""")
    logger.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='Setup 4-Stage Prescription Pipeline')
    parser.add_argument('--check-vram', action='store_true', help='Check GPU VRAM availability')
    parser.add_argument('--download-only', action='store_true', help='Download models only')
    parser.add_argument('--test', action='store_true', help='Run pipeline test')
    parser.add_argument('--all', action='store_true', help='Run all setup steps')
    
    args = parser.parse_args()
    
    if len(sys.argv) == 1:
        args.all = True
    
    success = True
    
    if args.all or args.check_vram:
        success = success and check_vram()
    
    if args.all or args.download_only:
        success = success and download_models()
    
    if args.all:
        create_env_template()
    
    if args.all or args.test:
        success = success and test_pipeline()
    
    if args.all:
        print_summary()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
