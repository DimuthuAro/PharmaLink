"""
Model Downloader and Manager for PharmaLink ML Service
Auto-downloads pre-trained models or uses locally trained models
"""
import os
import logging
from pathlib import Path
from typing import Dict, Optional
import joblib
import json
import urllib.request
import shutil

logger = logging.getLogger(__name__)

class ModelDownloader:
    """
    Manages model downloading and loading
    Supports: Local models (from notebooks) or remote pre-trained models
    """
    
    # Model configurations
    MODELS_CONFIG = {
        "drug_interaction": {
            "filename": "interaction_binary_model.pkl",
            "url": None,  # Set to remote URL if hosting models
            "local_path": "../model/interaction_binary_model.pkl",
            "description": "Drug-drug interaction prediction model"
        },
        "food_drug_risk": {
            "filename": "food_drug_risk_model.pkl",
            "url": None,
            "local_path": "../model/food_drug_risk_model.pkl",
            "description": "Food-drug interaction risk model"
        },
        "tfidf_vectorizer": {
            "filename": "tfidf_vectorizer.pkl",
            "url": None,
            "local_path": "../model/tfidf_vectorizer.pkl",
            "description": "TF-IDF text vectorizer"
        },
        "category_encoders": {
            "filename": "category_encoders.pkl",
            "url": None,
            "local_path": "../model/category_encoders.pkl",
            "description": "Category label encoders"
        }
    }
    
    def __init__(self, models_dir: str = "models"):
        """Initialize model downloader with target directory"""
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.loaded_models: Dict[str, any] = {}
        
        logger.info(f"ModelDownloader initialized. Models directory: {self.models_dir.absolute()}")
    
    def get_model_path(self, model_name: str) -> Path:
        """Get the path where model should be stored"""
        if model_name not in self.MODELS_CONFIG:
            raise ValueError(f"Unknown model: {model_name}")
        
        config = self.MODELS_CONFIG[model_name]
        return self.models_dir / config["filename"]
    
    def check_model_exists(self, model_name: str) -> bool:
        """Check if model file exists locally"""
        model_path = self.get_model_path(model_name)
        return model_path.exists()
    
    def download_model(self, model_name: str, force: bool = False) -> bool:
        """
        Download model from remote URL or copy from local training output
        Returns True if successful, False otherwise
        """
        if model_name not in self.MODELS_CONFIG:
            logger.error(f"Unknown model: {model_name}")
            return False
        
        config = self.MODELS_CONFIG[model_name]
        target_path = self.get_model_path(model_name)
        
        # Skip if already exists and not forcing
        if target_path.exists() and not force:
            logger.info(f"✓ Model '{model_name}' already exists at {target_path}")
            return True
        
        # Try to copy from local training output (from notebooks)
        local_path = Path(config["local_path"])
        if local_path.exists():
            try:
                shutil.copy2(local_path, target_path)
                logger.info(f"✓ Copied model '{model_name}' from local training: {local_path}")
                return True
            except Exception as e:
                logger.warning(f"Failed to copy local model: {e}")
        
        # Try to download from remote URL
        if config.get("url"):
            try:
                logger.info(f"Downloading model '{model_name}' from {config['url']}...")
                urllib.request.urlretrieve(config["url"], target_path)
                logger.info(f"✓ Downloaded model '{model_name}' successfully")
                return True
            except Exception as e:
                logger.error(f"✗ Failed to download model '{model_name}': {e}")
                return False
        
        # No source available
        logger.warning(f"⚠ Model '{model_name}' not found. Run notebooks to train or set remote URL.")
        return False
    
    def download_all_models(self, force: bool = False) -> Dict[str, bool]:
        """
        Download all configured models
        Returns dict of model_name -> success status
        """
        results = {}
        for model_name in self.MODELS_CONFIG.keys():
            results[model_name] = self.download_model(model_name, force)
        
        success_count = sum(1 for v in results.values() if v)
        total_count = len(results)
        
        logger.info(f"Model download summary: {success_count}/{total_count} successful")
        return results
    
    def load_model(self, model_name: str, auto_download: bool = True) -> Optional[any]:
        """
        Load a model from disk
        If auto_download=True, attempts to download if not found
        """
        # Return cached model if already loaded
        if model_name in self.loaded_models:
            logger.debug(f"Using cached model: {model_name}")
            return self.loaded_models[model_name]
        
        model_path = self.get_model_path(model_name)
        
        # Auto-download if enabled and model doesn't exist
        if auto_download and not model_path.exists():
            logger.info(f"Model '{model_name}' not found. Attempting auto-download...")
            self.download_model(model_name)
        
        # Load model
        if model_path.exists():
            try:
                model = joblib.load(model_path)
                self.loaded_models[model_name] = model
                logger.info(f"✓ Loaded model '{model_name}' from {model_path}")
                return model
            except Exception as e:
                logger.error(f"✗ Failed to load model '{model_name}': {e}")
                return None
        else:
            logger.warning(f"⚠ Model '{model_name}' not available. Using fallback.")
            return None
    
    def load_all_models(self, auto_download: bool = True) -> Dict[str, any]:
        """Load all configured models"""
        for model_name in self.MODELS_CONFIG.keys():
            self.load_model(model_name, auto_download)
        
        return self.loaded_models
    
    def get_model(self, model_name: str) -> Optional[any]:
        """Get a loaded model (without auto-loading)"""
        return self.loaded_models.get(model_name)
    
    def get_status(self) -> Dict[str, any]:
        """Get status of all models"""
        status = {
            "models_dir": str(self.models_dir.absolute()),
            "models": {}
        }
        
        for model_name, config in self.MODELS_CONFIG.items():
            model_path = self.get_model_path(model_name)
            status["models"][model_name] = {
                "description": config["description"],
                "exists": model_path.exists(),
                "loaded": model_name in self.loaded_models,
                "path": str(model_path),
                "size_mb": round(model_path.stat().st_size / (1024 * 1024), 2) if model_path.exists() else 0
            }
        
        return status
    
    def setup_models(self, force_download: bool = False) -> bool:
        """
        Initial setup: Download and load all models
        Returns True if at least one model loaded successfully
        """
        logger.info("=== Model Setup Started ===")
        
        # Download all models
        download_results = self.download_all_models(force=force_download)
        
        # Load all models
        self.load_all_models(auto_download=False)
        
        success = len(self.loaded_models) > 0
        
        if success:
            logger.info(f"✓ Model setup complete. {len(self.loaded_models)} models loaded.")
        else:
            logger.warning("⚠ No models loaded. System will use fallback predictions.")
        
        return success
    
    def create_dummy_models(self):
        """
        Create dummy/placeholder models for development
        Use this if you don't have trained models yet
        """
        logger.warning("Creating dummy models for development. Train real models for production!")
        
        # This is just a placeholder - in production, train real models
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.feature_extraction.text import TfidfVectorizer
        
        dummy_models = {
            "drug_interaction": RandomForestClassifier(n_estimators=10, random_state=42),
            "food_drug_risk": RandomForestClassifier(n_estimators=10, random_state=42),
            "tfidf_vectorizer": TfidfVectorizer(max_features=100),
            "category_encoders": {}
        }
        
        for model_name, model in dummy_models.items():
            model_path = self.get_model_path(model_name)
            try:
                joblib.dump(model, model_path)
                logger.info(f"✓ Created dummy model: {model_name}")
            except Exception as e:
                logger.error(f"✗ Failed to create dummy model '{model_name}': {e}")


# Singleton instance
_model_downloader = None

def get_model_downloader() -> ModelDownloader:
    """Get or create singleton ModelDownloader instance"""
    global _model_downloader
    if _model_downloader is None:
        _model_downloader = ModelDownloader()
    return _model_downloader
