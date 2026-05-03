"""
ROI Detector - YOLOv8-based prescription zone extraction
Optimized for 2GB VRAM (uses YOLOv8-nano, ~3.2M parameters)
"""

import cv2
import numpy as np
import torch
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ROIBox:
    """Region of Interest box with metadata"""
    zone_type: str  # 'medication', 'patient', 'header', 'instructions', 'signature'
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float
    
    @property
    def coords(self) -> Tuple[int, int, int, int]:
        return (self.x1, self.y1, self.x2, self.y2)
    
    @property
    def area(self) -> int:
        return (self.x2 - self.x1) * (self.y2 - self.y1)


class PrescriptionROIDetector:
    """
    YOLOv8-nano based detector for prescription zones.
    VRAM Usage: ~0.1GB (3.2M parameters)
    """
    
    ZONE_LABELS = {
        0: 'header',
        1: 'patient', 
        2: 'medication',
        3: 'instructions',
        4: 'signature'
    }
    
    def __init__(self, 
                 model_path: Optional[str] = None,
                 confidence_threshold: float = 0.5,
                 use_gpu: bool = True,
                 device: str = 'auto'):
        """
        Initialize ROI detector.
        
        Args:
            model_path: Path to custom trained YOLOv8 model. If None, uses pretrained.
            confidence_threshold: Minimum confidence for zone detection
            use_gpu: Whether to use GPU (will auto-fallback to CPU if VRAM insufficient)
            device: 'cuda', 'cpu', or 'auto'
        """
        self.confidence_threshold = confidence_threshold
        self.device = self._setup_device(device, use_gpu)
        self.model = None
        self._load_model(model_path)
        
    def _setup_device(self, device: str, use_gpu: bool) -> str:
        """Setup device with VRAM checking for 2GB constraint"""
        if device == 'auto':
            if use_gpu and torch.cuda.is_available():
                # Check available VRAM
                vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
                if vram_gb >= 1.5:  # Need at least 1.5GB free for full pipeline
                    logger.info(f"Using CUDA with {vram_gb:.1f}GB VRAM")
                    return 'cuda'
                else:
                    logger.warning(f"VRAM ({vram_gb:.1f}GB) may be tight, using CPU for safety")
                    return 'cpu'
            return 'cpu'
        return device
    
    def _load_model(self, model_path: Optional[str]):
        """Load YOLOv8-nano model"""
        try:
            from ultralytics import YOLO
            
            if model_path and Path(model_path).exists():
                # Use custom trained model on Sri Lankan prescriptions
                logger.info(f"Loading custom model: {model_path}")
                self.model = YOLO(model_path)
            else:
                # Use pretrained nano (smallest, fastest)
                logger.info("Loading YOLOv8-nano (pretrained)")
                self.model = YOLO('yolov8n.pt')  # nano = 3.2M params
                
            # Move to device
            self.model.to(self.device)
            
            # Warmup
            dummy = torch.zeros(1, 3, 640, 640).to(self.device)
            self.model.predict(dummy, verbose=False)
            logger.info(f"ROI Detector ready on {self.device}")
            
        except ImportError:
            logger.error("ultralytics not installed. Run: pip install ultralytics")
            raise
    
    def detect_zones(self, 
                     image: np.ndarray,
                     target_zones: Optional[List[str]] = None) -> List[ROIBox]:
        """
        Detect prescription zones in image.
        
        Args:
            image: BGR or RGB image (numpy array)
            target_zones: List of zone types to extract (None = all)
            
        Returns:
            List of ROIBox with zone coordinates
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        # Convert to RGB if needed
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif image.shape[2] == 3 and image[0,0,0] > image[0,0,2]:
            # Likely BGR (OpenCV default)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Run detection
        results = self.model(image, verbose=False)
        
        rois = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
                
            for box in boxes:
                conf = float(box.conf[0])
                if conf < self.confidence_threshold:
                    continue
                
                cls_id = int(box.cls[0])
                zone_type = self.ZONE_LABELS.get(cls_id, 'unknown')
                
                if target_zones and zone_type not in target_zones:
                    continue
                
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                rois.append(ROIBox(
                    zone_type=zone_type,
                    x1=max(0, x1),
                    y1=max(0, y1),
                    x2=min(image.shape[1], x2),
                    y2=min(image.shape[0], y2),
                    confidence=conf
                ))
        
        # Sort by confidence and area (prioritize large medication zones)
        rois.sort(key=lambda r: (r.zone_type != 'medication', -r.confidence, -r.area))
        
        return rois
    
    def extract_roi_image(self, 
                          image: np.ndarray, 
                          roi: ROIBox,
                          padding: int = 10) -> np.ndarray:
        """Extract ROI image with optional padding"""
        h, w = image.shape[:2]
        
        x1 = max(0, roi.x1 - padding)
        y1 = max(0, roi.y1 - padding)
        x2 = min(w, roi.x2 + padding)
        y2 = min(h, roi.y2 + padding)
        
        return image[y1:y2, x1:x2]
    
    def get_medication_zones(self, image: np.ndarray) -> List[Tuple[ROIBox, np.ndarray]]:
        """
        Convenience method: Get all medication zones with their images.
        Primary entry point for OCR pipeline.
        """
        zones = self.detect_zones(image, target_zones=['medication'])
        
        results = []
        for zone in zones:
            roi_img = self.extract_roi_image(image, zone)
            results.append((zone, roi_img))
        
        if not results:
            # Fallback: Use entire image as one zone
            logger.warning("No medication zones detected, using full image")
            h, w = image.shape[:2]
            full_zone = ROIBox('medication', 0, 0, w, h, 0.5)
            results.append((full_zone, image))
        
        return results


# Sri Lankan Prescription Training Data Schema
SRI_LANKA_PRESCRIPTION_SCHEMA = {
    "zones": {
        "header": {
            "typical_content": ["doctor_name", "clinic", "date", "reg_no"],
            "common_positions": "top_15%",
            "priority": 2
        },
        "patient": {
            "typical_content": ["patient_name", "age", "gender", "address"],
            "common_positions": "top_15-30%",
            "priority": 3
        },
        "medication": {
            "typical_content": ["drug_names", "dosage", "frequency", "duration"],
            "common_positions": "middle_30-70%",
            "priority": 1,  # HIGHEST - critical for OCR
            "sri_lanka_specific": {
                "common_abbreviations": ["tds", "bd", "sos", "od", "nocte"],
                "drug_prefixes": ["Tab.", "Cap.", "Syp.", "Inj.", "Oint."]
            }
        },
        "instructions": {
            "typical_content": ["special_notes", "dietary_advice", "follow_up"],
            "common_positions": "bottom_15-30%",
            "priority": 4
        },
        "signature": {
            "typical_content": ["doctor_signature", "stamp", "reg_number"],
            "common_positions": "bottom_10%",
            "priority": 5
        }
    }
}


def create_synthetic_training_data():
    """
    Generate synthetic training data for Sri Lankan prescription formats.
    Use this to bootstrap YOLOv8 training before collecting real data.
    """
    # Would generate synthetic prescriptions with labeled zones
    # For actual training, you'd need ~500-1000 real prescription images
    pass


if __name__ == "__main__":
    # Quick test
    detector = PrescriptionROIDetector(use_gpu=False)
    print(f"Detector initialized on {detector.device}")
    print(f"Zone labels: {detector.ZONE_LABELS}")
