# ml_service/main.py - FINAL VERSION WITH REAL MODEL
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from datetime import datetime
import json
import io
import os
import re
import numpy as np
import cv2
from PIL import Image, ImageEnhance, ImageFilter
from transformers import AutoModel, AutoTokenizer
import torch
import easyocr

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Google Gemini for text interpretation
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Google Gemini not available. Install with: pip install google-genai")

# Import REAL model
from models.drug_interaction_model import get_model

app = FastAPI(
    title="Drug Interaction ML Service",
    description="Real ML model for drug interaction prediction using TwoSIDES data",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize REAL model
print("="*60)
print("🚀 INITIALIZING DRUG INTERACTION ML SERVICE")
print("="*60)
model = get_model()
print("="*60)

# Initialize EasyOCR (fallback)
print("\n" + "="*60)
print("📝 Loading EasyOCR reader...")
print("="*60)
easyocr_reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available())
print("✅ EasyOCR loaded")
print("="*60)

# Initialize Google Gemini client
gemini_client = None
if GEMINI_AVAILABLE:
    gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if gemini_api_key:
        try:
            gemini_client = genai.Client(api_key=gemini_api_key)
            print("\n✅ Google Gemini initialized")
        except Exception as e:
            print(f"⚠️ Gemini initialization failed: {e}")
    else:
        print("⚠️ GEMINI_API_KEY not set. Text interpretation will use rule-based parsing.")

# Initialize DeepSeek-OCR model (OPTIONAL - set to False to skip 7GB download)
ENABLE_DEEPSEEK_OCR = False  # Set to True when you want to use DeepSeek-OCR

ocr_model = None
ocr_tokenizer = None
ocr_device = "cpu"
deepseek_model_name = "deepseek-ai/DeepSeek-OCR"

if ENABLE_DEEPSEEK_OCR:
    print("\n" + "="*60)
    print("📷 Loading DeepSeek-OCR model... (This downloads ~7GB on first run)")
    print("="*60)
    try:
        ocr_tokenizer = AutoTokenizer.from_pretrained(deepseek_model_name, trust_remote_code=True)
        ocr_model = AutoModel.from_pretrained(deepseek_model_name, trust_remote_code=True)
        # Use GPU if available (highly recommended for speed)
        ocr_device = "cuda" if torch.cuda.is_available() else "cpu"
        ocr_model = ocr_model.to(ocr_device)
        ocr_model.eval()
        print(f"✅ DeepSeek-OCR model loaded on {ocr_device.upper()}")
    except Exception as e:
        print(f"⚠️ DeepSeek-OCR failed to load: {e}")
        print("   Will use EasyOCR as primary OCR engine.")
        ocr_model = None
    print("="*60)
else:
    print("\n" + "="*60)
    print("⏭️  DeepSeek-OCR DISABLED (ENABLE_DEEPSEEK_OCR = False)")
    print("   Using EasyOCR as primary OCR engine.")
    print("   To enable DeepSeek-OCR, set ENABLE_DEEPSEEK_OCR = True in main.py")
    print("="*60)

# =============================================================================
# IMAGE PREPROCESSING UTILITIES
# =============================================================================

def preprocess_image(image: Image.Image, enhance_contrast: bool = True, 
                     denoise: bool = True, sharpen: bool = True,
                     deskew: bool = True) -> Image.Image:
    """
    Preprocess image for optimal OCR performance.
    
    Args:
        image: PIL Image object
        enhance_contrast: Apply contrast enhancement
        denoise: Apply noise reduction
        sharpen: Apply sharpening filter
        deskew: Attempt to correct image rotation
    
    Returns:
        Preprocessed PIL Image
    """
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to numpy for OpenCV processing
    img_array = np.array(image)
    
    # Convert RGB to BGR for OpenCV
    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # 1. Denoise using Non-local Means Denoising
    if denoise:
        img_cv = cv2.fastNlMeansDenoisingColored(img_cv, None, 10, 10, 7, 21)
    
    # 2. Convert to grayscale for some operations
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    
    # 3. Deskew (correct rotation)
    if deskew:
        img_cv, gray = deskew_image(img_cv, gray)
    
    # 4. Adaptive thresholding for better text visibility
    # Use bilateral filter to reduce noise while keeping edges sharp
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Convert back to BGR
    img_cv = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    
    # Convert back to PIL Image
    img_array = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
    processed_image = Image.fromarray(img_array)
    
    # 5. Enhance contrast using PIL
    if enhance_contrast:
        enhancer = ImageEnhance.Contrast(processed_image)
        processed_image = enhancer.enhance(1.5)  # Increase contrast by 50%
        
        # Also enhance brightness slightly
        brightness = ImageEnhance.Brightness(processed_image)
        processed_image = brightness.enhance(1.1)
    
    # 6. Sharpen for clearer text edges
    if sharpen:
        processed_image = processed_image.filter(ImageFilter.SHARPEN)
    
    return processed_image


def deskew_image(img_cv: np.ndarray, gray: np.ndarray) -> tuple:
    """
    Detect and correct image skew/rotation.
    
    Returns:
        Tuple of (corrected BGR image, corrected grayscale image)
    """
    try:
        # Detect edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Detect lines using Hough Transform
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100,
                                minLineLength=100, maxLineGap=10)
        
        if lines is not None and len(lines) > 0:
            # Calculate angles of all lines
            angles = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi
                # Only consider near-horizontal lines
                if abs(angle) < 45:
                    angles.append(angle)
            
            if angles:
                # Use median angle to be robust to outliers
                median_angle = np.median(angles)
                
                # Only correct if skew is significant but not too extreme
                if 0.5 < abs(median_angle) < 10:
                    # Get image center
                    h, w = gray.shape
                    center = (w // 2, h // 2)
                    
                    # Rotate image
                    rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                    img_cv = cv2.warpAffine(img_cv, rotation_matrix, (w, h),
                                           flags=cv2.INTER_CUBIC,
                                           borderMode=cv2.BORDER_REPLICATE)
                    gray = cv2.warpAffine(gray, rotation_matrix, (w, h),
                                         flags=cv2.INTER_CUBIC,
                                         borderMode=cv2.BORDER_REPLICATE)
    except Exception as e:
        print(f"Deskew warning: {e}")
    
    return img_cv, gray


def enhance_for_handwriting(image: Image.Image) -> Image.Image:
    """
    Special preprocessing optimized for handwritten text.
    """
    # Convert to numpy
    img_array = np.array(image.convert('RGB'))
    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    
    # Morphological operations to connect broken strokes
    kernel = np.ones((2, 2), np.uint8)
    gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
    
    # Convert back to PIL
    return Image.fromarray(gray).convert('RGB')


# =============================================================================
# TEXT INTERPRETATION UTILITIES (Gemini + Rule-based fallback)
# =============================================================================

PRESCRIPTION_INTERPRETATION_PROMPT = '''
You are a medical prescription parser. Extract structured information from the following prescription text.

PRESCRIPTION TEXT:
{text}

Extract and return a JSON object with the following structure:
{{
    "patient_name": "string or null",
    "doctor_name": "string or null", 
    "date": "string or null",
    "medications": [
        {{
            "name": "medication name",
            "dosage": "dosage amount (e.g., 500mg)",
            "frequency": "how often (e.g., twice daily, every 8 hours)",
            "duration": "how long (e.g., 7 days, 2 weeks)",
            "instructions": "special instructions (e.g., take with food)",
            "quantity": "total quantity if mentioned"
        }}
    ],
    "diagnosis": "string or null",
    "allergies": ["list of mentioned allergies"],
    "notes": "any additional notes or warnings"
}}

Return ONLY the JSON object, no additional text.
'''

# EMERGENCY FLAG: Set to True to bypass Gemini API completely (quota issues)
FORCE_LOCAL_PARSER = True  # Set to False when Gemini quota is restored


async def interpret_with_gemini(extracted_text: str) -> Dict[str, Any]:
    """
    Use Google Gemini to interpret extracted prescription text into structured data.
    Falls back to rule-based parser if Gemini is unavailable or disabled.
    """
    # EMERGENCY: Force local parser to bypass Gemini quota issues
    if FORCE_LOCAL_PARSER:
        print("⚠️ FORCE_LOCAL_PARSER enabled - using rule-based parser")
        return await interpret_with_rules(extracted_text)
    
    if not gemini_client:
        return await interpret_with_rules(extracted_text)
    
    try:
        prompt = PRESCRIPTION_INTERPRETATION_PROMPT.format(text=extracted_text)
        
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        # Parse the JSON response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = re.sub(r'^```(?:json)?\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)
        
        parsed_data = json.loads(response_text)
        parsed_data["interpretation_method"] = "gemini"
        
        return parsed_data
        
    except Exception as e:
        print(f"Gemini interpretation error: {e}")
        # Fallback to rule-based parsing
        return await interpret_with_rules(extracted_text)


async def interpret_with_rules(extracted_text: str) -> Dict[str, Any]:
    """
    Rule-based prescription text interpretation (fallback when Gemini unavailable).
    """
    result = {
        "patient_name": None,
        "doctor_name": None,
        "date": None,
        "medications": [],
        "diagnosis": None,
        "allergies": [],
        "notes": None,
        "interpretation_method": "rule-based"
    }
    
    lines = extracted_text.split('\n')
    text_lower = extracted_text.lower()
    
    # Common medication patterns
    medication_patterns = [
        r'(?:Rx|rx|℞)[:\s]*(.+?)(?:\d+\s*(?:mg|ml|mcg|g|tab|cap))',
        r'(\w+(?:\s+\w+)?)\s+(\d+\s*(?:mg|ml|mcg|g))',
        r'(tablet|capsule|syrup|injection)s?\s+of\s+(\w+)',
    ]
    
    # Dosage patterns
    dosage_pattern = r'(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|tablet|capsule|cap|tab)s?'
    
    # Frequency patterns
    frequency_patterns = {
        r'once\s+(?:a\s+)?daily|od|qd': 'once daily',
        r'twice\s+(?:a\s+)?daily|bd|bid': 'twice daily',
        r'three\s+times\s+(?:a\s+)?daily|tid|tds': 'three times daily',
        r'four\s+times\s+(?:a\s+)?daily|qid|qds': 'four times daily',
        r'every\s+(\d+)\s+hours?': 'every \\1 hours',
        r'at\s+bedtime|hs|nocte': 'at bedtime',
        r'as\s+needed|prn': 'as needed',
        r'with\s+meals?': 'with meals',
        r'before\s+meals?|ac': 'before meals',
        r'after\s+meals?|pc': 'after meals',
    }
    
    # Duration patterns
    duration_pattern = r'(?:for\s+)?(\d+)\s*(day|week|month)s?'
    
    # Extract medications using common drug name patterns
    common_drugs = [
        'amoxicillin', 'metformin', 'lisinopril', 'atorvastatin', 'omeprazole',
        'amlodipine', 'metoprolol', 'losartan', 'gabapentin', 'sertraline',
        'hydrochlorothiazide', 'furosemide', 'prednisone', 'albuterol',
        'levothyroxine', 'ibuprofen', 'acetaminophen', 'aspirin', 'warfarin',
        'clopidogrel', 'pantoprazole', 'esomeprazole', 'montelukast',
        'fluticasone', 'cetirizine', 'loratadine', 'diphenhydramine',
        'azithromycin', 'ciprofloxacin', 'doxycycline', 'cephalexin',
        'paracetamol', 'diclofenac', 'naproxen', 'tramadol', 'codeine'
    ]
    
    found_medications = []
    
    for drug in common_drugs:
        if drug in text_lower:
            med_info = {"name": drug.capitalize()}
            
            # Find dosage near the drug name
            drug_context = re.search(rf'{drug}\s*[\w\s]{{0,30}}', text_lower)
            if drug_context:
                context = drug_context.group()
                dosage_match = re.search(dosage_pattern, context)
                if dosage_match:
                    med_info["dosage"] = f"{dosage_match.group(1)}{dosage_match.group(2)}"
            
            # Find frequency
            for pattern, freq_text in frequency_patterns.items():
                if re.search(pattern, text_lower):
                    med_info["frequency"] = freq_text
                    break
            
            # Find duration
            duration_match = re.search(duration_pattern, text_lower)
            if duration_match:
                med_info["duration"] = f"{duration_match.group(1)} {duration_match.group(2)}s"
            
            found_medications.append(med_info)
    
    result["medications"] = found_medications
    
    # Extract doctor name
    dr_pattern = r'(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'
    dr_match = re.search(dr_pattern, extracted_text)
    if dr_match:
        result["doctor_name"] = dr_match.group(1)
    
    # Extract date
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
    ]
    for pattern in date_patterns:
        date_match = re.search(pattern, extracted_text, re.IGNORECASE)
        if date_match:
            result["date"] = date_match.group(1)
            break
    
    return result


# =============================================================================
# OCR HELPER FUNCTIONS  
# =============================================================================

async def run_deepseek_ocr(image: Image.Image) -> str:
    """Run DeepSeek-OCR on preprocessed image."""
    if ocr_model is None:
        raise RuntimeError("DeepSeek-OCR model not loaded. Enable ENABLE_DEEPSEEK_OCR or use EasyOCR.")
    
    prompt = "<image>\nExtract all text from this medical prescription accurately, including handwritten parts."
    
    with torch.no_grad():
        result = ocr_model.infer(
            tokenizer=ocr_tokenizer,
            prompt=prompt,
            image_file=image,
            output_path=None,
            save_results=False
        )
    
    return result.get('text', str(result))


def run_easyocr(image: Image.Image) -> str:
    """Run EasyOCR on image (fallback method)."""
    # Convert PIL to numpy array
    img_array = np.array(image.convert('RGB'))
    
    # Run EasyOCR
    results = easyocr_reader.readtext(img_array)
    
    # Combine all detected text
    extracted_lines = [detection[1] for detection in results]
    return '\n'.join(extracted_lines)


# Request models
class DrugInteractionRequest(BaseModel):
    drugs: List[str]
    include_food: bool = False
    patient_info: Optional[dict] = None

class RiskAssessmentRequest(BaseModel):
    drugs: List[str]
    patient_age: Optional[int] = None
    conditions: Optional[List[str]] = None
    weight: Optional[float] = None
    liver_function: Optional[str] = None  # normal, impaired
    kidney_function: Optional[str] = None  # normal, impaired

class FoodDrugRequest(BaseModel):
    drug: str
    foods: List[str]

# Response models
class InteractionResponse(BaseModel):
    drug_pair: List[str]
    interaction: bool
    probability: float
    severity: str
    description: str
    confidence: str
    source: str
    recommendations: List[str]

class BatchInteractionResponse(BaseModel):
    request_id: str
    timestamp: str
    drugs: List[str]
    interactions: List[InteractionResponse]
    summary: dict
    model_info: dict

@app.get("/")
async def root():
    """Root endpoint with service info"""
    model_info = model.get_model_info()
    
    return {
        "service": "Drug Interaction ML Service",
        "version": "2.0.0",
        "status": "operational",
        "model": {
            "loaded": model.loaded,
            "type": model_info.get("model_type"),
            "drugs_encoded": model_info.get("drug_count"),
            "version": model_info.get("metadata", {}).get("version", "1.0"),
            "performance": model_info.get("performance", {})
        },
        "endpoints": [
            {"path": "/", "method": "GET", "description": "Service info"},
            {"path": "/health", "method": "GET", "description": "Health check"},
            {"path": "/predict/interactions", "method": "POST", "description": "Predict drug interactions"},
            {"path": "/predict/risk", "method": "POST", "description": "Risk assessment"},
            {"path": "/predict/food-drug", "method": "POST", "description": "Food-drug interactions"},
            {"path": "/model/info", "method": "GET", "description": "Model information"},
            {"path": "/api/deepseek-ocr", "method": "POST", "description": "DeepSeek OCR (raw extraction)"},
            {"path": "/api/easy-ocr", "method": "POST", "description": "EasyOCR fallback"},
            {"path": "/prescription/ocr", "method": "POST", "description": "Full OCR pipeline with interpretation"}
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    model_info = model.get_model_info()
    
    return {
        "status": "healthy" if model.loaded else "degraded",
        "service": "drug-interaction-ml",
        "model": {
            "loaded": model.loaded,
            "status": "operational" if model.loaded else "unavailable",
            "drugs": model_info.get("drug_count", 0),
            "version": model_info.get("metadata", {}).get("version", "1.0"),
            "training_date": model_info.get("metadata", {}).get("training_date", "unknown")
        },
        "ocr_models": {
            "deepseek": {
                "enabled": ENABLE_DEEPSEEK_OCR,
                "loaded": ocr_model is not None,
                "device": ocr_device if ocr_model else "N/A",
                "model_name": deepseek_model_name
            },
            "easyocr": {
                "loaded": easyocr_reader is not None,
                "languages": ["en"],
                "primary": ocr_model is None  # EasyOCR is primary when DeepSeek disabled
            }
        },
        "gemini": {
            "available": gemini_client is not None,
            "bypassed": FORCE_LOCAL_PARSER,  # True when using local parser due to quota
            "status": "bypassed (quota)" if FORCE_LOCAL_PARSER else ("active" if gemini_client else "unavailable")
        },
        "interpretation": {
            "method": "rule-based" if FORCE_LOCAL_PARSER else ("gemini" if gemini_client else "rule-based"),
            "force_local": FORCE_LOCAL_PARSER
        },
        "timestamp": datetime.now().isoformat(),
        "response_time": "OK"
    }


# =============================================================================
# OCR ENDPOINTS
# =============================================================================

@app.post("/api/deepseek-ocr")
async def process_with_deepseek(
    file: UploadFile = File(...),
    preprocess: bool = Form(default=True),
    enhance_handwriting: bool = Form(default=False)
):
    """
    DeepSeek-OCR endpoint for high-accuracy prescription OCR.
    
    - **file**: Image file (prescription photo)
    - **preprocess**: Apply image preprocessing (default: True)
    - **enhance_handwriting**: Apply handwriting-specific enhancements (default: False)
    """
    # Check if DeepSeek-OCR is enabled
    if ocr_model is None:
        raise HTTPException(
            status_code=503, 
            detail="DeepSeek-OCR is disabled. Use /api/easy-ocr or /prescription/ocr instead. "
                   "To enable, set ENABLE_DEEPSEEK_OCR = True in main.py"
        )
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        # Read and convert the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Apply preprocessing
        if preprocess:
            if enhance_handwriting:
                image = enhance_for_handwriting(image)
            else:
                image = preprocess_image(image)
        
        # Run DeepSeek-OCR
        extracted_text = await run_deepseek_ocr(image)
        
        return JSONResponse(content={
            "extracted_text": extracted_text,
            "model": deepseek_model_name,
            "preprocessed": preprocess,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        print(f"DeepSeek-OCR processing error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/api/easy-ocr")
async def process_with_easyocr(
    file: UploadFile = File(...),
    preprocess: bool = Form(default=True)
):
    """
    EasyOCR fallback endpoint for prescription OCR.
    
    - **file**: Image file (prescription photo)
    - **preprocess**: Apply image preprocessing (default: True)
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        # Read and convert the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Apply preprocessing
        if preprocess:
            image = preprocess_image(image)
        
        # Run EasyOCR
        extracted_text = run_easyocr(image)
        
        return JSONResponse(content={
            "extracted_text": extracted_text,
            "model": "easyocr",
            "preprocessed": preprocess,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        print(f"EasyOCR processing error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/prescription/ocr")
async def process_prescription_full_pipeline(
    file: UploadFile = File(...),
    preprocess: bool = Form(default=True),
    enhance_handwriting: bool = Form(default=False),
    interpret: bool = Form(default=True),
    use_fallback: bool = Form(default=True)
):
    """
    Full prescription OCR pipeline with preprocessing, OCR, and interpretation.
    
    **Pipeline stages:**
    1. **Image Preprocessing**: Denoise, deskew, enhance contrast
    2. **OCR Stage**: DeepSeek-OCR (primary) → EasyOCR (fallback)
    3. **Interpretation**: Google Gemini (primary) → Rule-based (fallback)
    
    **Parameters:**
    - **file**: Image file (prescription photo)
    - **preprocess**: Apply image preprocessing (default: True)
    - **enhance_handwriting**: Use handwriting-specific enhancements (default: False)
    - **interpret**: Parse extracted text into structured JSON (default: True)
    - **use_fallback**: Fall back to EasyOCR if DeepSeek fails (default: True)
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    start_time = datetime.now()
    ocr_method = None
    extracted_text = None
    preprocessing_applied = []
    
    try:
        # =====================================================================
        # STAGE 1: IMAGE PREPROCESSING
        # =====================================================================
        contents = await file.read()
        original_image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        if preprocess:
            if enhance_handwriting:
                processed_image = enhance_for_handwriting(original_image)
                preprocessing_applied = ["handwriting_enhancement", "clahe", "morphological_closing"]
            else:
                processed_image = preprocess_image(original_image)
                preprocessing_applied = ["denoise", "deskew", "contrast_enhancement", "sharpen"]
        else:
            processed_image = original_image
            preprocessing_applied = ["none"]
        
        # =====================================================================
        # STAGE 2: OCR EXTRACTION
        # =====================================================================
        ocr_error = None
        
        # Check if DeepSeek-OCR is available
        if ocr_model is not None:
            # Try DeepSeek-OCR first
            try:
                extracted_text = await run_deepseek_ocr(processed_image)
                ocr_method = "deepseek-ocr"
            except Exception as deepseek_err:
                ocr_error = str(deepseek_err)
                print(f"DeepSeek-OCR failed: {deepseek_err}")
                
                # Fallback to EasyOCR
                if use_fallback:
                    try:
                        extracted_text = run_easyocr(processed_image)
                        ocr_method = "easyocr-fallback"
                    except Exception as easyocr_err:
                        print(f"EasyOCR also failed: {easyocr_err}")
                        raise HTTPException(
                            status_code=500, 
                            detail=f"All OCR methods failed. DeepSeek: {ocr_error}, EasyOCR: {str(easyocr_err)}"
                        )
                else:
                    raise HTTPException(status_code=500, detail=f"DeepSeek-OCR failed: {ocr_error}")
        else:
            # DeepSeek disabled, use EasyOCR as primary
            try:
                extracted_text = run_easyocr(processed_image)
                ocr_method = "easyocr"
            except Exception as easyocr_err:
                print(f"EasyOCR failed: {easyocr_err}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"OCR failed: {str(easyocr_err)}"
                )
        
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(status_code=422, detail="No text could be extracted from the image.")
        
        # =====================================================================
        # STAGE 3: TEXT INTERPRETATION
        # =====================================================================
        parsed_data = None
        interpretation_method = None
        
        if interpret:
            parsed_data = await interpret_with_gemini(extracted_text)
            interpretation_method = parsed_data.get("interpretation_method", "unknown")
        
        # =====================================================================
        # BUILD RESPONSE
        # =====================================================================
        processing_time = (datetime.now() - start_time).total_seconds()
        
        response = {
            "success": True,
            "extracted_text": extracted_text,
            "ocr_method": ocr_method,
            "preprocessing": {
                "applied": preprocess,
                "methods": preprocessing_applied
            },
            "processing_time_seconds": round(processing_time, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        if interpret and parsed_data:
            response["parsed_prescription"] = parsed_data
            response["interpretation_method"] = interpretation_method
            
            # Add medications list for easy access
            if parsed_data.get("medications"):
                response["medications"] = parsed_data["medications"]
                response["medication_count"] = len(parsed_data["medications"])
        
        return JSONResponse(content=response)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Prescription OCR pipeline error: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

@app.get("/model/info")
async def model_info():
    """Get detailed model information"""
    info = model.get_model_info()
    
    return {
        "model": info,
        "capabilities": {
            "drug_drug_interactions": True,
            "severity_prediction": True,
            "probability_scores": True,
            "confidence_levels": True,
            "batch_processing": True
        },
        "data_source": "TwoSIDES Database",
        "last_updated": info.get("metadata", {}).get("training_date", "unknown")
    }

@app.post("/predict/interactions", response_model=BatchInteractionResponse)
async def predict_interactions(request: DrugInteractionRequest):
    """
    Predict drug-drug interactions using REAL ML model
    
    Example request:
    {
        "drugs": ["Aspirin", "Warfarin", "Metformin"],
        "include_food": false
    }
    """
    try:
        if not request.drugs or len(request.drugs) < 2:
            raise HTTPException(status_code=400, detail="At least 2 drugs required")
        
        # Get predictions from REAL model
        predictions = model.batch_predict(request.drugs)
        
        # Format response
        interactions = []
        for pred in predictions:
            # Generate recommendations based on prediction
            recommendations = []
            if pred['interaction']:
                if pred['severity'] == 'high':
                    recommendations = [
                        "AVOID COMBINATION - High risk of adverse effects",
                        "Consult healthcare provider immediately",
                        "Consider alternative medications",
                        "Monitor for bleeding, bruising, or other serious side effects"
                    ]
                elif pred['severity'] == 'medium':
                    recommendations = [
                        "Use with caution",
                        "Monitor for side effects",
                        "Consider dosage adjustment",
                        "Regular check-ups recommended"
                    ]
                else:
                    recommendations = [
                        "Proceed with caution",
                        "Monitor for mild side effects",
                        "Inform your doctor about this combination"
                    ]
            else:
                recommendations = [
                    "No significant interaction detected",
                    "Continue medications as prescribed",
                    "Routine monitoring is sufficient"
                ]
            
            interaction_response = InteractionResponse(
                drug_pair=[pred['drug1'], pred['drug2']],
                interaction=pred['interaction'],
                probability=pred['probability'],
                severity=pred['severity'],
                description=pred['description'],
                confidence=pred['confidence'],
                source=pred['source'],
                recommendations=recommendations
            )
            interactions.append(interaction_response)
        
        # Create summary
        total_pairs = len(interactions)
        interacting_pairs = sum(1 for i in interactions if i.interaction)
        high_risk_pairs = sum(1 for i in interactions if i.severity == 'high')
        
        return BatchInteractionResponse(
            request_id=f"req_{datetime.now().timestamp()}",
            timestamp=datetime.now().isoformat(),
            drugs=request.drugs,
            interactions=interactions,
            summary={
                "total_pairs": total_pairs,
                "interacting_pairs": interacting_pairs,
                "high_risk_pairs": high_risk_pairs,
                "interaction_rate": f"{interacting_pairs/total_pairs:.1%}" if total_pairs > 0 else "0%"
            },
            model_info=model.get_model_info()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/predict/risk")
async def predict_risk(request: RiskAssessmentRequest):
    """Risk assessment with patient factors"""
    try:
        # Base risk from drug interactions
        drug_interactions = []
        overall_risk = 0.0
        
        if request.drugs and len(request.drugs) >= 2:
            predictions = model.batch_predict(request.drugs)
            drug_interactions = predictions
            
            # Calculate overall risk score
            for pred in predictions:
                if pred['interaction']:
                    if pred['severity'] == 'high':
                        overall_risk += 0.3
                    elif pred['severity'] == 'medium':
                        overall_risk += 0.15
                    else:
                        overall_risk += 0.05
        
        # Adjust for patient factors
        factors = []
        
        if request.patient_age:
            if request.patient_age > 65:
                overall_risk += 0.2
                factors.append(f"Age >65 (+0.2)")
            elif request.patient_age > 50:
                overall_risk += 0.1
                factors.append(f"Age >50 (+0.1)")
        
        if request.conditions:
            overall_risk += len(request.conditions) * 0.1
            factors.append(f"{len(request.conditions)} conditions (+{len(request.conditions)*0.1})")
        
        if request.liver_function == 'impaired':
            overall_risk += 0.15
            factors.append("Liver impairment (+0.15)")
        
        if request.kidney_function == 'impaired':
            overall_risk += 0.15
            factors.append("Kidney impairment (+0.15)")
        
        # Cap at 1.0
        overall_risk = min(1.0, overall_risk)
        
        # Determine risk level
        if overall_risk > 0.7:
            risk_level = "HIGH"
            action = "Immediate intervention required"
        elif overall_risk > 0.4:
            risk_level = "MODERATE"
            action = "Close monitoring and consultation"
        else:
            risk_level = "LOW"
            action = "Routine monitoring"
        
        return {
            "patient_summary": {
                "age": request.patient_age,
                "conditions": request.conditions or [],
                "additional_factors": factors
            },
            "drug_interactions": drug_interactions,
            "risk_assessment": {
                "overall_risk_score": overall_risk,
                "risk_level": risk_level,
                "risk_factors": factors,
                "recommended_action": action
            },
            "recommendations": [
                "Review medication list with healthcare provider",
                "Consider alternative medications if high risk",
                "Regular monitoring of liver/kidney function if impaired",
                "Patient education on potential side effects"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk assessment error: {str(e)}")

@app.post("/predict/food-drug")
async def predict_food_drug(request: FoodDrugRequest):
    """Food-drug interactions"""
    try:
        # Known food-drug interactions
        known_interactions = {
            "grapefruit": {
                "drugs": ["simvastatin", "atorvastatin", "lovastatin", "felodipine", "nifedipine"],
                "severity": "high",
                "description": "Grapefruit inhibits CYP3A4 enzyme, increasing drug levels"
            },
            "alcohol": {
                "drugs": ["metronidazole", "disulfiram", "warfarin", "acetaminophen", "antidepressants"],
                "severity": "high",
                "description": "Alcohol can increase sedative effects or cause adverse reactions"
            },
            "dairy": {
                "drugs": ["tetracycline", "doxycycline", "ciprofloxacin", "levofloxacin"],
                "severity": "medium",
                "description": "Calcium in dairy products can bind to antibiotics"
            },
            "leafy_greens": {
                "drugs": ["warfarin"],
                "severity": "medium",
                "description": "Vitamin K in greens can reduce warfarin effectiveness"
            },
            "licorice": {
                "drugs": ["digoxin", "diuretics", "blood_pressure_medications"],
                "severity": "medium",
                "description": "Can cause potassium loss and blood pressure changes"
            }
        }
        
        interactions = []
        
        for food in request.foods:
            food_lower = food.lower()
            interaction_found = False
            
            for food_type, info in known_interactions.items():
                if food_type in food_lower or any(food_lower in item for item in info["drugs"]):
                    # Check if the drug is in the list
                    for drug_keyword in info["drugs"]:
                        if drug_keyword in request.drug.lower():
                            interactions.append({
                                "food": food,
                                "drug": request.drug,
                                "interaction": True,
                                "severity": info["severity"],
                                "description": info["description"],
                                "recommendation": f"Avoid {food} while taking {request.drug}"
                            })
                            interaction_found = True
                            break
                    
                    if interaction_found:
                        break
            
            if not interaction_found:
                interactions.append({
                    "food": food,
                    "drug": request.drug,
                    "interaction": False,
                    "severity": "none",
                    "description": "No significant interaction expected",
                    "recommendation": "Normal consumption is acceptable"
                })
        
        return {
            "food_drug_interactions": interactions,
            "summary": {
                "total_foods": len(request.foods),
                "interacting_foods": sum(1 for i in interactions if i["interaction"]),
                "high_risk_foods": sum(1 for i in interactions if i["severity"] == "high")
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Food-drug prediction error: {str(e)}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("✅ ML SERVICE READY")
    print(f"📡 Endpoint: http://localhost:8000")
    print(f"📊 Documentation: http://localhost:8000/docs")
    print("="*60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)