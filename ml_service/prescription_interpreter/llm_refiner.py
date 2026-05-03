"""
LLM Refiner - Medical text correction using GPT-4o API or tiny local model
VRAM Impact: 0GB (API) or ~1GB (local Phi-3-mini)
"""

import os
import json
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import logging
import asyncio
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class RefinementResult:
    """Result of LLM refinement"""
    original_text: str
    refined_text: str
    corrections: List[Dict]
    confidence: float
    model_used: str
    latency_ms: float
    cost_usd: Optional[float] = None


class MedicalLLMRefiner:
    """
    Medical text refinement using LLM.
    
    Two modes:
    1. API Mode (RECOMMENDED for 2GB VRAM): Uses GPT-4o via OpenAI API
       - VRAM: 0GB (cloud processing)
       - Cost: ~$0.01-0.03 per prescription
       - Quality: Excellent medical context understanding
    
    2. Local Mode (FALLBACK): Uses quantized Phi-3-mini (2.3B)
       - VRAM: ~0.8-1GB
       - Cost: $0 (after initial download)
       - Quality: Good, but less medical knowledge
    """
    
    SYSTEM_PROMPT = """You are a medical prescription correction assistant specialized in Sri Lankan healthcare.
Your task is to correct OCR output from handwritten doctor prescriptions.

Input: Raw OCR text from doctor's handwriting
Output: Corrected medical prescription in structured format

Rules:
1. Fix spelling errors in drug names using medical context
2. Expand common abbreviations (tds→three times daily, bd→twice daily, etc.)
3. Standardize dosage formats (e.g., "500 mg" → "500mg")
4. Preserve all clinically relevant information
5. Mark uncertain corrections with [?]
6. For Sri Lankan prescriptions, recognize common local drug brands

Common Sri Lankan abbreviations:
- tds = three times daily (Latin: ter die sumendum)
- bd/bid = twice daily (Latin: bis in die)
- od/qd = once daily (Latin: omni die / quaque die)
- sos = if needed (Latin: si opus sit)
- pc = after food (Latin: post cibum)
- ac = before food (Latin: ante cibum)
- nocte = at night
- mane = in the morning
- stat = immediately

Output format:
{
  "corrected_text": "The corrected prescription text",
  "medications": [
    {"name": "Drug Name", "dosage": "500mg", "frequency": "twice daily", "duration": "7 days"}
  ],
  "corrections_made": [
    {"original": "para", "corrected": "paracetamol", "reason": "abbreviation_expansion"}
  ],
  "confidence": 0.85,
  "uncertain_segments": ["segment with [?]"]
}
"""
    
    def __init__(self,
                 mode: str = 'api',
                 openai_api_key: Optional[str] = None,
                 local_model_path: Optional[str] = None,
                 max_tokens: int = 500):
        """
        Initialize LLM refiner.
        
        Args:
            mode: 'api' (GPT-4o) or 'local' (Phi-3-mini)
            openai_api_key: OpenAI API key (or from env OPENAI_API_KEY)
            local_model_path: Path to local model (for 'local' mode)
            max_tokens: Maximum tokens for generation
        """
        self.mode = mode
        self.max_tokens = max_tokens
        self.api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        self.local_model = None
        self.local_tokenizer = None
        
        if mode == 'api':
            if not self.api_key:
                logger.warning("No OpenAI API key provided. API mode will fail.")
            self._init_api_mode()
        elif mode == 'local':
            self._init_local_mode(local_model_path)
        else:
            raise ValueError(f"Unknown mode: {mode}. Use 'api' or 'local'")
    
    def _init_api_mode(self):
        """Initialize OpenAI API client"""
        try:
            import openai
            self.client = openai.OpenAI(api_key=self.api_key)
            logger.info("API mode initialized (GPT-4o)")
        except ImportError:
            logger.error("openai package not installed. Run: pip install openai")
            raise
    
    def _init_local_mode(self, model_path: Optional[str]):
        """Initialize local model (Phi-3-mini)"""
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            
            model_name = model_path or "microsoft/Phi-3-mini-4k-instruct"
            
            logger.info(f"Loading local model: {model_name}")
            
            # Load in 4-bit quantization to fit in ~1GB VRAM
            self.local_tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                trust_remote_code=True
            )
            
            # Use quantization config for low VRAM
            from transformers import BitsAndBytesConfig
            
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )
            
            self.local_model = AutoModelForCausalLM.from_pretrained(
                model_name,
                quantization_config=quantization_config,
                device_map="auto",
                trust_remote_code=True
            )
            
            logger.info("Local model loaded (4-bit quantized)")
            
        except ImportError as e:
            logger.error(f"Missing dependencies for local mode: {e}")
            logger.error("Install: pip install transformers torch bitsandbytes accelerate")
            raise
    
    def refine(self, 
               raw_text: str,
               context: Optional[Dict] = None) -> RefinementResult:
        """
        Refine OCR text using LLM.
        
        Args:
            raw_text: Raw OCR output from TrOCR
            context: Optional context (patient age, known conditions, etc.)
            
        Returns:
            RefinementResult with corrections
        """
        import time
        start_time = time.time()
        
        if self.mode == 'api':
            result = self._refine_api(raw_text, context)
        else:
            result = self._refine_local(raw_text, context)
        
        latency = (time.time() - start_time) * 1000
        result.latency_ms = latency
        
        return result
    
    def _refine_api(self, 
                    raw_text: str,
                    context: Optional[Dict]) -> RefinementResult:
        """Refine using GPT-4o API"""
        
        # Build user prompt
        user_prompt = f"""Please correct this OCR output from a handwritten Sri Lankan medical prescription:

RAW OCR TEXT:
{raw_text}

"""
        if context:
            user_prompt += f"""ADDITIONAL CONTEXT:
- Patient Age: {context.get('patient_age', 'unknown')}
- Known Conditions: {context.get('conditions', 'none')}
- Prescription Date: {context.get('date', 'unknown')}

"""
        
        user_prompt += "Provide the correction in the specified JSON format."
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Cheaper than gpt-4o, still excellent for OCR
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=0.1,  # Low temperature for consistent corrections
                response_format={"type": "json_object"}
            )
            
            # Parse response
            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)
            
            # Calculate cost (gpt-4o-mini pricing as of 2024)
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            cost = (input_tokens * 0.00015 + output_tokens * 0.0006) / 1000  # $0.15/M input, $0.60/M output
            
            corrections = result_json.get('corrections_made', [])
            confidence = result_json.get('confidence', 0.7)
            
            return RefinementResult(
                original_text=raw_text,
                refined_text=result_json.get('corrected_text', raw_text),
                corrections=corrections,
                confidence=confidence,
                model_used='gpt-4o-mini',
                latency_ms=0,  # Will be set by caller
                cost_usd=cost
            )
            
        except Exception as e:
            logger.error(f"API refinement failed: {e}")
            # Fallback: return original with warning
            return RefinementResult(
                original_text=raw_text,
                refined_text=raw_text,
                corrections=[],
                confidence=0.3,
                model_used='gpt-4o-mini (failed)',
                latency_ms=0,
                cost_usd=0,
                error=str(e)
            )
    
    def _refine_local(self,
                      raw_text: str,
                      context: Optional[Dict]) -> RefinementResult:
        """Refine using local Phi-3-mini model"""
        
        # Build prompt
        prompt = f"""<|system|>
{self.SYSTEM_PROMPT}
<|end|>
<|user|>
Correct this OCR from a handwritten prescription:
{raw_text}
<|end|>
<|assistant|>
"""
        
        try:
            import torch
            
            # Tokenize
            inputs = self.local_tokenizer(prompt, return_tensors="pt")
            inputs = {k: v.to(self.local_model.device) for k, v in inputs.items()}
            
            # Generate
            with torch.no_grad():
                outputs = self.local_model.generate(
                    **inputs,
                    max_new_tokens=self.max_tokens,
                    temperature=0.1,
                    do_sample=True,
                    pad_token_id=self.local_tokenizer.eos_token_id
                )
            
            # Decode
            response = self.local_tokenizer.decode(
                outputs[0][inputs['input_ids'].shape[1]:],
                skip_special_tokens=True
            )
            
            # Try to parse as JSON, fallback to text
            try:
                result_json = json.loads(response)
                return RefinementResult(
                    original_text=raw_text,
                    refined_text=result_json.get('corrected_text', response),
                    corrections=result_json.get('corrections_made', []),
                    confidence=result_json.get('confidence', 0.6),
                    model_used='phi-3-mini-4bit',
                    latency_ms=0,
                    cost_usd=0
                )
            except json.JSONDecodeError:
                # Return raw response if not valid JSON
                return RefinementResult(
                    original_text=raw_text,
                    refined_text=response.strip(),
                    corrections=[],
                    confidence=0.5,
                    model_used='phi-3-mini-4bit',
                    latency_ms=0,
                    cost_usd=0
                )
                
        except Exception as e:
            logger.error(f"Local refinement failed: {e}")
            return RefinementResult(
                original_text=raw_text,
                refined_text=raw_text,
                corrections=[],
                confidence=0.3,
                model_used='phi-3-mini (failed)',
                latency_ms=0,
                cost_usd=0
            )
    
    async def refine_async(self,
                         raw_text: str,
                         context: Optional[Dict] = None) -> RefinementResult:
        """Async version for batch processing"""
        # For API mode, can use asyncio.to_thread
        # For local mode, already async-capable
        if self.mode == 'api':
            import asyncio
            return await asyncio.to_thread(self.refine, raw_text, context)
        else:
            return self.refine(raw_text, context)


# Simple rule-based fallback (no LLM, no VRAM)
class RuleBasedRefiner:
    """
    Lightweight rule-based refiner that requires no GPU/VRAM.
    Use this as final fallback when LLM is unavailable.
    """
    
    def __init__(self, drug_database: Optional[List[str]] = None):
        self.drug_db = drug_database or []
        self.common_corrections = self._load_correction_rules()
    
    def _load_correction_rules(self) -> Dict[str, str]:
        """Load common OCR error corrections"""
        return {
            # Common OCR errors in medical text
            'para': 'paracetamol',
            'panadol': 'paracetamol',
            'pcm': 'paracetamol',
            'metro': 'metronidazole',
            'metform': 'metformin',
            'amox': 'amoxicillin',
            'cipro': 'ciprofloxacin',
            'azithro': 'azithromycin',
            'omep': 'omeprazole',
            'pan40': 'pantoprazole',
            'domperi': 'domperidone',
            'cetri': 'cetirizine',
            'lorat': 'loratadine',
            'salbu': 'salbutamol',
            'ventolin': 'salbutamol',
            'hydrochlo': 'hydrochlorothiazide',
            'atorva': 'atorvastatin',
            'rosuva': 'rosuvastatin',
            'amlodip': 'amlodipine',
            'losar': 'losartan',
        }
    
    def refine(self, raw_text: str) -> RefinementResult:
        """Apply rule-based corrections"""
        import time
        start = time.time()
        
        corrections = []
        words = raw_text.split()
        corrected_words = []
        
        for word in words:
            word_lower = word.lower().rstrip('.,;:')
            
            if word_lower in self.common_corrections:
                corrected = self.common_corrections[word_lower]
                corrections.append({
                    'original': word,
                    'corrected': corrected,
                    'reason': 'common_abbreviation'
                })
                corrected_words.append(corrected)
            else:
                corrected_words.append(word)
        
        refined_text = ' '.join(corrected_words)
        latency = (time.time() - start) * 1000
        
        return RefinementResult(
            original_text=raw_text,
            refined_text=refined_text,
            corrections=corrections,
            confidence=0.5 if corrections else 0.3,
            model_used='rule_based',
            latency_ms=latency,
            cost_usd=0
        )


# Unified refiner with cascading fallback
class CascadingRefiner:
    """
    Cascading refinement pipeline:
    1. Try GPT-4o API (best quality, 0 VRAM)
    2. Fall back to local model (good quality, ~1GB VRAM)
    3. Fall back to rule-based (basic, 0 VRAM)
    """
    
    def __init__(self,
                 prefer_api: bool = True,
                 api_key: Optional[str] = None,
                 enable_local: bool = False):
        """
        Initialize cascading refiner.
        
        Args:
            prefer_api: Try API first (recommended for 2GB VRAM)
            api_key: OpenAI API key
            enable_local: Enable local model fallback (uses ~1GB VRAM)
        """
        self.refiners = []
        
        # Primary: API mode (0 VRAM)
        if prefer_api and (api_key or os.getenv('OPENAI_API_KEY')):
            try:
                api_refiner = MedicalLLMRefiner(mode='api', openai_api_key=api_key)
                self.refiners.append(('api', api_refiner))
            except Exception as e:
                logger.warning(f"Could not initialize API refiner: {e}")
        
        # Secondary: Local model (~1GB VRAM)
        if enable_local:
            try:
                local_refiner = MedicalLLMRefiner(mode='local')
                self.refiners.append(('local', local_refiner))
            except Exception as e:
                logger.warning(f"Could not initialize local refiner: {e}")
        
        # Final fallback: Rule-based (0 VRAM)
        self.refiners.append(('rule', RuleBasedRefiner()))
        
        logger.info(f"Cascading refiner initialized with {len(self.refiners)} stages")
    
    def refine(self, 
               raw_text: str,
               context: Optional[Dict] = None,
               min_confidence: float = 0.6) -> RefinementResult:
        """
        Refine with cascading fallback until confidence threshold met.
        
        Args:
            raw_text: OCR output to refine
            context: Optional patient context
            min_confidence: Minimum acceptable confidence
            
        Returns:
            Best refinement result
        """
        last_result = None
        
        for name, refiner in self.refiners:
            try:
                result = refiner.refine(raw_text, context)
                last_result = result
                
                logger.info(f"{name} refiner: confidence={result.confidence:.2f}, "
                          f"latency={result.latency_ms:.0f}ms")
                
                if result.confidence >= min_confidence:
                    logger.info(f"Using {name} refiner (confidence >= {min_confidence})")
                    return result
                    
            except Exception as e:
                logger.error(f"{name} refiner failed: {e}")
                continue
        
        # Return best result even if below threshold
        if last_result:
            logger.warning(f"All refiners below confidence threshold, using best: {last_result.confidence:.2f}")
            return last_result
        
        # Ultimate fallback: return original
        return RefinementResult(
            original_text=raw_text,
            refined_text=raw_text,
            corrections=[],
            confidence=0.1,
            model_used='none_failed',
            latency_ms=0,
            cost_usd=0
        )


if __name__ == "__main__":
    # Quick test
    refiner = RuleBasedRefiner()
    result = refiner.refine("Take para 500mg tds for 5 days")
    print(f"Refined: {result.refined_text}")
    print(f"Corrections: {result.corrections}")
