"""
Handwriting Recognizer - TrOCR-based handwritten text recognition
Optimized for 2GB VRAM (uses TrOCR-small, ~39M parameters = ~0.6GB VRAM)
"""

import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import logging
import re

logger = logging.getLogger(__name__)

@dataclass
class RecognitionResult:
    """Text recognition result with confidence scores"""
    text: str
    confidence: float
    line_details: List[Dict]
    preprocessing_applied: List[str]
    raw_output: str  # Before post-processing


class HandwritingRecognizer:
    """
    TrOCR-based handwriting recognition.
    
    Model variants (VRAM requirements):
    - microsoft/trocr-small-handwritten: ~39M params, ~0.6GB VRAM ✅ (USE THIS)
    - microsoft/trocr-base-handwritten: ~334M params, ~1.2GB VRAM (tight for 2GB)
    - microsoft/trocr-large-handwritten: ~558M params, ~2GB+ VRAM (too big)
    """
    
    AVAILABLE_MODELS = {
        'small': {
            'name': 'microsoft/trocr-small-handwritten',
            'params': '39M',
            'vram_gb': 0.6,
            'speed': 'fast',
            'accuracy': 'good'
        },
        'base': {
            'name': 'microsoft/trocr-base-handwritten',
            'params': '334M',
            'vram_gb': 1.2,
            'speed': 'medium',
            'accuracy': 'very_good'
        }
    }
    
    def __init__(self,
                 model_size: str = 'small',
                 device: str = 'auto',
                 max_vram_gb: float = 1.5):
        """
        Initialize handwriting recognizer.
        
        Args:
            model_size: 'small' (0.6GB) or 'base' (1.2GB)
            device: 'cuda', 'cpu', or 'auto'
            max_vram_gb: Maximum VRAM to use (will fallback if insufficient)
        """
        self.model_size = model_size
        self.device = self._setup_device(device, max_vram_gb)
        self.processor = None
        self.model = None
        
        # Medical abbreviation patterns for post-processing
        self.medical_patterns = self._load_medical_patterns()
        
        self._load_model()
    
    def _setup_device(self, device: str, max_vram_gb: float) -> str:
        """Setup device with VRAM constraint checking"""
        if device == 'auto':
            if torch.cuda.is_available():
                vram_total = torch.cuda.get_device_properties(0).total_memory / 1e9
                model_vram = self.AVAILABLE_MODELS[self.model_size]['vram_gb']
                
                if vram_total >= model_vram + 0.5:  # Model + overhead
                    logger.info(f"Using CUDA (Total: {vram_total:.1f}GB, Model: {model_vram}GB)")
                    return 'cuda'
                else:
                    logger.warning(f"VRAM {vram_total:.1f}GB insufficient for {self.model_size} model, using CPU")
                    return 'cpu'
            return 'cpu'
        return device
    
    def _load_medical_patterns(self) -> Dict:
        """Load medical abbreviation and pattern mappings"""
        return {
            # Common doctor abbreviations (global + Sri Lankan)
            'abbreviations': {
                r'\btab\b': 'tablet',
                r'\bcap\b': 'capsule',
                r'\bsyp\b': 'syrup',
                r'\bsusp\b': 'suspension',
                r'\binj\b': 'injection',
                r'\bung\b': 'ointment',
                r'\btds\b': 'three times daily',
                r'\bbid?\b': 'twice daily',
                r'\bbd\b': 'twice daily',
                r'\bqd\b': 'once daily',
                r'\bod\b': 'once daily',
                r'\bsos\b': 'as needed',
                r'\bprn\b': 'as needed',
                r'\bpc\b': 'after meals',
                r'\bac\b': 'before meals',
                r'\bnocte\b': 'at night',
                r'\bmane\b': 'in the morning',
                r'\bstat\b': 'immediately',
                r'\botc\b': 'over the counter',
                r'\bhs\b': 'at bedtime',
                r'\bq\d+h\b': lambda m: f"every {m.group(0)[1:-1]} hours",
                r'\bqam\b': 'every morning',
                r'\bqpm\b': 'every evening',
                r'\bqhs\b': 'at bedtime',
                r'\bq4h\b': 'every 4 hours',
                r'\bq6h\b': 'every 6 hours',
                r'\bq8h\b': 'every 8 hours',
                r'\bq12h\b': 'every 12 hours',
            },
            # Number word corrections
            'numbers': {
                'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
                'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
                'once': '1', 'twice': '2', 'thrice': '3'
            },
            # Unit corrections
            'units': {
                r'\bmg\b': 'mg',
                r'\bgm\b': 'g',
                r'\bml\b': 'ml',
                r'\bmcg\b': 'mcg',
                r'\bug\b': 'mcg',
                r'\bunits?\b': 'units',
                r'\btsp\b': 'teaspoon',
                r'\btbsp\b': 'tablespoon'
            }
        }
    
    def _load_model(self):
        """Load TrOCR model and processor"""
        model_name = self.AVAILABLE_MODELS[self.model_size]['name']
        
        logger.info(f"Loading TrOCR model: {model_name}")
        
        try:
            self.processor = TrOCRProcessor.from_pretrained(model_name)
            self.model = VisionEncoderDecoderModel.from_pretrained(model_name)
            self.model.to(self.device)
            self.model.eval()  # Inference mode
            
            logger.info(f"Model loaded on {self.device}")
            
            # Set generation config for better handwritten text
            self.model.config.decoder_start_token_id = self.processor.tokenizer.cls_token_id
            self.model.config.pad_token_id = self.processor.tokenizer.pad_token_id
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def preprocess_image(self, 
                         image: np.ndarray,
                         enhance_contrast: bool = True,
                         denoise: bool = True) -> np.ndarray:
        """
        Preprocess image for optimal handwriting recognition.
        
        Args:
            image: Input image (numpy array, BGR/RGB/Gray)
            enhance_contrast: Apply CLAHE contrast enhancement
            denoise: Apply non-local means denoising
        """
        preprocessing = []
        
        # Convert to grayscale
        if len(image.shape) == 3:
            if image.shape[2] == 4:
                image = cv2.cvtColor(image, cv2.COLOR_RGBA2GRAY)
            elif image.shape[2] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            preprocessing.append('grayscale')
        
        # Denoise
        if denoise:
            image = cv2.fastNlMeansDenoising(image, None, 10, 7, 21)
            preprocessing.append('denoise')
        
        # Enhance contrast
        if enhance_contrast:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            image = clahe.apply(image)
            preprocessing.append('contrast_enhance')
        
        # Resize if too small (TrOCR prefers reasonable resolution)
        h, w = image.shape[:2]
        if h < 64:
            scale = 64 / h
            image = cv2.resize(image, (int(w * scale), 64), interpolation=cv2.INTER_CUBIC)
            preprocessing.append('upscale')
        
        return image, preprocessing
    
    def recognize(self, 
                  image: np.ndarray,
                  apply_postprocessing: bool = True) -> RecognitionResult:
        """
        Recognize handwritten text from image.
        
        Args:
            image: Input image (numpy array)
            apply_postprocessing: Apply medical abbreviation expansion
            
        Returns:
            RecognitionResult with text and metadata
        """
        # Preprocess
        processed_image, preprocessing = self.preprocess_image(image)
        
        # Convert to PIL
        pil_image = Image.fromarray(processed_image).convert('RGB')
        
        # Process
        pixel_values = self.processor(pil_image, return_tensors="pt").pixel_values
        pixel_values = pixel_values.to(self.device)
        
        # Generate
        with torch.no_grad():
            generated_ids = self.model.generate(
                pixel_values,
                max_length=512,
                num_beams=4,
                early_stopping=True,
                temperature=1.0
            )
        
        # Decode
        generated_text = self.processor.batch_decode(
            generated_ids, 
            skip_special_tokens=True
        )[0]
        
        raw_text = generated_text.strip()
        
        # Post-process
        if apply_postprocessing:
            final_text = self._postprocess_medical_text(raw_text)
        else:
            final_text = raw_text
        
        # Calculate confidence (approximate from generation scores)
        confidence = self._estimate_confidence(pixel_values, generated_ids)
        
        return RecognitionResult(
            text=final_text,
            confidence=confidence,
            line_details=[{
                'text': final_text,
                'raw_text': raw_text,
                'confidence': confidence
            }],
            preprocessing_applied=preprocessing,
            raw_output=raw_text
        )
    
    def recognize_batch(self,
                        images: List[np.ndarray],
                        apply_postprocessing: bool = True) -> List[RecognitionResult]:
        """Batch recognition for multiple ROI images"""
        results = []
        for img in images:
            result = self.recognize(img, apply_postprocessing)
            results.append(result)
        return results
    
    def _postprocess_medical_text(self, text: str) -> str:
        """Apply medical abbreviation expansion and corrections"""
        text = text.lower().strip()
        
        # Apply abbreviation expansions
        for pattern, replacement in self.medical_patterns['abbreviations'].items():
            if callable(replacement):
                text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
            else:
                text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # Capitalize first letter of sentences
        text = '. '.join(s.capitalize() for s in text.split('. '))
        
        return text
    
    def _estimate_confidence(self, 
                             pixel_values: torch.Tensor,
                             generated_ids: torch.Tensor) -> float:
        """
        Estimate confidence from generation probabilities.
        Simplified - actual implementation would use model scores.
        """
        # Placeholder - in production, you'd extract log probs from model
        # For now, return heuristic based on text length and character types
        text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        if not text:
            return 0.0
        
        # Heuristics for confidence estimation
        confidence = 0.7  # Base confidence
        
        # Penalize very short outputs
        if len(text) < 3:
            confidence -= 0.2
        
        # Penalize outputs with many non-alphanumeric characters
        special_ratio = sum(1 for c in text if not c.isalnum() and not c.isspace()) / len(text)
        confidence -= special_ratio * 0.3
        
        return max(0.0, min(1.0, confidence))
    
    @property
    def model_info(self) -> Dict:
        """Get model information"""
        return {
            'name': self.AVAILABLE_MODELS[self.model_size]['name'],
            'size': self.model_size,
            'params': self.AVAILABLE_MODELS[self.model_size]['params'],
            'vram_gb': self.AVAILABLE_MODELS[self.model_size]['vram_gb'],
            'device': self.device
        }


# Medical text validator
class MedicalTextValidator:
    """Validate and correct medical text from OCR output"""
    
    def __init__(self, drug_database_path: Optional[str] = None):
        self.drug_names = set()
        if drug_database_path:
            self._load_drug_database(drug_database_path)
    
    def _load_drug_database(self, path: str):
        """Load drug names for fuzzy matching"""
        # Would load from your existing drug database
        pass
    
    def validate_dosage(self, text: str) -> Tuple[bool, List[str]]:
        """Validate dosage information in text"""
        errors = []
        
        # Check for dosage patterns
        dosage_pattern = r'(\d+\s*(?:mg|g|ml|mcg|units?|%))'
        if not re.search(dosage_pattern, text, re.IGNORECASE):
            errors.append("No dosage found")
        
        # Check for frequency patterns
        freq_pattern = r'(once|twice|three times|daily|every|q\d+h|tds|bd|od)'
        if not re.search(freq_pattern, text, re.IGNORECASE):
            errors.append("No frequency found")
        
        return len(errors) == 0, errors


if __name__ == "__main__":
    # Quick test
    recognizer = HandwritingRecognizer(model_size='small', device='cpu')
    print(f"Recognizer: {recognizer.model_info}")
