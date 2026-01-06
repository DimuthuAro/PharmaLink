"""
Formulation Risk Adjustment Model

This model takes a base DDI risk score and formulation features to predict
an adjusted risk that accounts for how different drug formulations (extended release,
delayed release, etc.) modify the interaction risk.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import logging
import json
import pickle
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, accuracy_score

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FormulationRiskModel:
    """
    Model that adjusts DDI risk based on drug formulation characteristics.
    
    Takes base interaction risk and formulation features to predict:
    1. Risk modifier category (potentiates, mitigates, neutral)
    2. Adjusted risk change value
    """
    
    def __init__(self, model_dir: str = None):
        """
        Initialize the Formulation Risk Model.
        
        Args:
            model_dir: Directory to save/load model files
        """
        self.model_dir = Path(model_dir) if model_dir else Path(__file__).parent.parent / "model" / "formulation"
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        # Models
        self.risk_regressor: Optional[GradientBoostingRegressor] = None
        self.modifier_classifier: Optional[RandomForestClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.label_encoder: Optional[LabelEncoder] = None
        
        # Feature columns
        self.feature_columns = [
            'base_risk',
            'is_extended_release_a',
            'is_extended_release_b',
            'is_delayed_release_a',
            'is_delayed_release_b',
            'route_match',
            'strength_ratio',
            'same_manufacturer',
            'has_patent_a',
            'has_patent_b'
        ]
        
        # Model metadata
        self.metadata = {
            "version": "1.0.0",
            "trained_at": None,
            "training_samples": 0,
            "metrics": {}
        }
        
        self._is_trained = False
        
    def load_training_data(self, data_path: str = None) -> pd.DataFrame:
        """
        Load training data from CSV file.
        
        Args:
            data_path: Path to training data CSV
            
        Returns:
            DataFrame with training data
        """
        if data_path is None:
            data_path = Path(__file__).parent.parent / "data" / "formulation_training_data.csv"
        
        data_path = Path(data_path)
        
        if not data_path.exists():
            logger.warning(f"Training data not found at {data_path}. Using synthetic data.")
            return self._generate_synthetic_data()
        
        df = pd.read_csv(data_path)
        logger.info(f"Loaded {len(df)} training samples from {data_path}")
        return df
    
    def _generate_synthetic_data(self, n_samples: int = 500) -> pd.DataFrame:
        """
        Generate synthetic training data based on pharmacological principles.
        """
        np.random.seed(42)
        
        data = []
        
        for _ in range(n_samples):
            base_risk = np.random.uniform(0.3, 0.95)
            is_er_a = np.random.choice([0, 1], p=[0.7, 0.3])
            is_er_b = np.random.choice([0, 1], p=[0.7, 0.3])
            is_dr_a = np.random.choice([0, 1], p=[0.85, 0.15])
            is_dr_b = np.random.choice([0, 1], p=[0.85, 0.15])
            route_match = np.random.choice([0, 1], p=[0.2, 0.8])
            strength_ratio = np.random.uniform(0.25, 2.0)
            same_manufacturer = np.random.choice([0, 1], p=[0.9, 0.1])
            has_patent_a = np.random.choice([0, 1], p=[0.7, 0.3])
            has_patent_b = np.random.choice([0, 1], p=[0.7, 0.3])
            
            # Calculate risk change based on pharmacological principles
            risk_change = 0.0
            
            # Extended release reduces peak concentration interactions
            if is_er_a or is_er_b:
                risk_change -= 0.03 * (is_er_a + is_er_b)
            
            # Both extended release has compounding effect
            if is_er_a and is_er_b:
                risk_change -= 0.04
            
            # Delayed release can either help or hurt depending on mechanism
            if is_dr_a:
                risk_change -= 0.02
            if is_dr_b:
                risk_change -= 0.02
            
            # Different routes reduce interaction potential
            if not route_match:
                risk_change -= 0.08
            
            # Strength ratio effects (higher ratio may potentiate)
            if strength_ratio > 1.5:
                risk_change += 0.03
            elif strength_ratio < 0.5:
                risk_change -= 0.02
            
            # Add some noise
            risk_change += np.random.normal(0, 0.02)
            
            # Clamp risk change
            risk_change = np.clip(risk_change, -0.15, 0.10)
            
            # Determine modifier category
            if risk_change < -0.02:
                modifier = "mitigates"
            elif risk_change > 0.02:
                modifier = "potentiates"
            else:
                modifier = "neutral"
            
            data.append({
                'drug_a': f'drug_{np.random.randint(1, 100)}',
                'drug_b': f'drug_{np.random.randint(1, 100)}',
                'brand_a': f'BRAND_{np.random.randint(1, 50)}',
                'brand_b': f'BRAND_{np.random.randint(1, 50)}',
                'base_risk': round(base_risk, 3),
                'is_extended_release_a': is_er_a,
                'is_extended_release_b': is_er_b,
                'is_delayed_release_a': is_dr_a,
                'is_delayed_release_b': is_dr_b,
                'route_match': route_match,
                'strength_ratio': round(strength_ratio, 3),
                'same_manufacturer': same_manufacturer,
                'has_patent_a': has_patent_a,
                'has_patent_b': has_patent_b,
                'risk_modifier': modifier,
                'actual_risk_change': round(risk_change, 4),
                'explanation': 'Synthetic training sample'
            })
        
        df = pd.DataFrame(data)
        logger.info(f"Generated {len(df)} synthetic training samples")
        return df
    
    def train(self, data: pd.DataFrame = None, test_size: float = 0.2) -> Dict[str, Any]:
        """
        Train the formulation risk adjustment models.
        
        Args:
            data: Training DataFrame (loads default if None)
            test_size: Fraction of data for testing
            
        Returns:
            Dictionary with training metrics
        """
        if data is None:
            data = self.load_training_data()
        
        logger.info(f"Training formulation risk model with {len(data)} samples...")
        
        # Prepare features
        X = data[self.feature_columns].values
        y_risk = data['actual_risk_change'].values
        y_modifier = data['risk_modifier'].values
        
        # Split data
        X_train, X_test, y_risk_train, y_risk_test, y_mod_train, y_mod_test = train_test_split(
            X, y_risk, y_modifier, test_size=test_size, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Encode modifier labels
        self.label_encoder = LabelEncoder()
        y_mod_train_encoded = self.label_encoder.fit_transform(y_mod_train)
        y_mod_test_encoded = self.label_encoder.transform(y_mod_test)
        
        # Train risk change regressor
        logger.info("Training risk change regressor...")
        self.risk_regressor = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=3,
            random_state=42
        )
        self.risk_regressor.fit(X_train_scaled, y_risk_train)
        
        # Train modifier classifier
        logger.info("Training modifier classifier...")
        self.modifier_classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            min_samples_split=3,
            random_state=42
        )
        self.modifier_classifier.fit(X_train_scaled, y_mod_train_encoded)
        
        # Evaluate models
        y_risk_pred = self.risk_regressor.predict(X_test_scaled)
        y_mod_pred = self.modifier_classifier.predict(X_test_scaled)
        
        # Calculate metrics
        metrics = {
            "regressor": {
                "mse": float(mean_squared_error(y_risk_test, y_risk_pred)),
                "mae": float(mean_absolute_error(y_risk_test, y_risk_pred)),
                "r2": float(r2_score(y_risk_test, y_risk_pred))
            },
            "classifier": {
                "accuracy": float(accuracy_score(y_mod_test_encoded, y_mod_pred))
            },
            "feature_importance": dict(zip(
                self.feature_columns,
                [float(x) for x in self.risk_regressor.feature_importances_]
            ))
        }
        
        # Update metadata
        self.metadata.update({
            "trained_at": datetime.now().isoformat(),
            "training_samples": len(data),
            "metrics": metrics
        })
        
        self._is_trained = True
        
        logger.info(f"Training complete. MAE: {metrics['regressor']['mae']:.4f}, "
                   f"Classifier Accuracy: {metrics['classifier']['accuracy']:.2%}")
        
        return metrics
    
    def predict(self, base_risk: float, formulation_features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict adjusted risk based on formulation features.
        
        Args:
            base_risk: Base DDI risk score (0-1)
            formulation_features: Dictionary with formulation features
            
        Returns:
            Dictionary with adjusted risk, modifier, and explanation
        """
        if not self._is_trained:
            self._ensure_model_ready()
        
        # Build feature vector
        features = np.array([[
            base_risk,
            formulation_features.get('is_extended_release_a', 0),
            formulation_features.get('is_extended_release_b', 0),
            formulation_features.get('is_delayed_release_a', 0),
            formulation_features.get('is_delayed_release_b', 0),
            formulation_features.get('route_match', 1),
            formulation_features.get('strength_ratio', 1.0),
            formulation_features.get('same_manufacturer', 0),
            formulation_features.get('has_patent_a', 0),
            formulation_features.get('has_patent_b', 0)
        ]])
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Predict risk change
        risk_change = float(self.risk_regressor.predict(features_scaled)[0])
        
        # Predict modifier category
        modifier_encoded = self.modifier_classifier.predict(features_scaled)[0]
        modifier = self.label_encoder.inverse_transform([modifier_encoded])[0]
        
        # Calculate modifier probabilities
        modifier_probs = self.modifier_classifier.predict_proba(features_scaled)[0]
        modifier_confidence = {
            self.label_encoder.classes_[i]: float(prob)
            for i, prob in enumerate(modifier_probs)
        }
        
        # Calculate adjusted risk
        adjusted_risk = np.clip(base_risk + risk_change, 0.0, 1.0)
        
        # Generate explanation
        explanation = self._generate_explanation(
            base_risk, adjusted_risk, risk_change, modifier, formulation_features
        )
        
        return {
            "base_risk": round(base_risk, 4),
            "risk_change": round(risk_change, 4),
            "adjusted_risk": round(adjusted_risk, 4),
            "risk_modifier": modifier,
            "modifier_confidence": modifier_confidence,
            "explanation": explanation,
            "formulation_factors": self._identify_key_factors(formulation_features)
        }
    
    def _generate_explanation(self, base_risk: float, adjusted_risk: float, 
                              risk_change: float, modifier: str,
                              features: Dict[str, Any]) -> str:
        """Generate a human-readable explanation of the risk adjustment."""
        
        base_pct = int(base_risk * 100)
        adjusted_pct = int(adjusted_risk * 100)
        change_pct = abs(int(risk_change * 100))
        
        explanation_parts = []
        
        # Base statement
        explanation_parts.append(f"Base interaction risk is {base_pct}%.")
        
        # Formulation-specific explanations
        factors = []
        
        if features.get('is_extended_release_a'):
            factors.append("Drug A uses extended-release formulation")
        if features.get('is_extended_release_b'):
            factors.append("Drug B uses extended-release formulation")
        if features.get('is_delayed_release_a'):
            factors.append("Drug A has delayed-release coating")
        if features.get('is_delayed_release_b'):
            factors.append("Drug B has delayed-release coating")
        if not features.get('route_match', True):
            factors.append("Different administration routes reduce interaction potential")
        
        strength_ratio = features.get('strength_ratio', 1.0)
        if strength_ratio < 0.5:
            factors.append("Lower relative dosage strength")
        elif strength_ratio > 1.5:
            factors.append("Higher relative dosage strength may increase exposure")
        
        if factors:
            explanation_parts.append(" ".join(factors) + ".")
        
        # Risk adjustment statement
        if modifier == "mitigates":
            explanation_parts.append(
                f"These formulation factors may reduce the interaction risk by approximately {change_pct}% "
                f"to an adjusted risk of {adjusted_pct}%."
            )
        elif modifier == "potentiates":
            explanation_parts.append(
                f"These formulation factors may increase the interaction risk by approximately {change_pct}% "
                f"to an adjusted risk of {adjusted_pct}%."
            )
        else:
            explanation_parts.append(
                f"Formulation factors have minimal impact. Adjusted risk remains at {adjusted_pct}%."
            )
        
        return " ".join(explanation_parts)
    
    def _identify_key_factors(self, features: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify the key formulation factors affecting risk."""
        factors = []
        
        if features.get('is_extended_release_a'):
            factors.append({
                "factor": "extended_release_drug_a",
                "impact": "reduces peak concentration",
                "direction": "mitigating"
            })
        
        if features.get('is_extended_release_b'):
            factors.append({
                "factor": "extended_release_drug_b",
                "impact": "reduces peak concentration",
                "direction": "mitigating"
            })
        
        if features.get('is_delayed_release_a'):
            factors.append({
                "factor": "delayed_release_drug_a",
                "impact": "delayed absorption timing",
                "direction": "variable"
            })
        
        if features.get('is_delayed_release_b'):
            factors.append({
                "factor": "delayed_release_drug_b",
                "impact": "delayed absorption timing",
                "direction": "variable"
            })
        
        if not features.get('route_match', True):
            factors.append({
                "factor": "different_routes",
                "impact": "reduced systemic overlap",
                "direction": "mitigating"
            })
        
        strength_ratio = features.get('strength_ratio', 1.0)
        if strength_ratio != 1.0:
            direction = "potentiating" if strength_ratio > 1.0 else "mitigating"
            factors.append({
                "factor": "strength_ratio",
                "value": strength_ratio,
                "impact": "dosage relationship",
                "direction": direction
            })
        
        return factors
    
    def _ensure_model_ready(self):
        """Ensure models are trained or loaded."""
        model_path = self.model_dir / "formulation_model.pkl"
        
        if model_path.exists():
            self.load_model(model_path)
        else:
            logger.info("No saved model found. Training new model...")
            self.train()
            self.save_model(model_path)
    
    def save_model(self, path: str = None):
        """Save the trained models to disk."""
        if path is None:
            path = self.model_dir / "formulation_model.pkl"
        
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        model_data = {
            "risk_regressor": self.risk_regressor,
            "modifier_classifier": self.modifier_classifier,
            "scaler": self.scaler,
            "label_encoder": self.label_encoder,
            "feature_columns": self.feature_columns,
            "metadata": self.metadata
        }
        
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
        
        # Also save metadata as JSON
        metadata_path = path.parent / "formulation_model_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(self.metadata, f, indent=2)
        
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str = None):
        """Load trained models from disk."""
        if path is None:
            path = self.model_dir / "formulation_model.pkl"
        
        path = Path(path)
        
        if not path.exists():
            raise FileNotFoundError(f"Model file not found: {path}")
        
        with open(path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.risk_regressor = model_data["risk_regressor"]
        self.modifier_classifier = model_data["modifier_classifier"]
        self.scaler = model_data["scaler"]
        self.label_encoder = model_data["label_encoder"]
        self.feature_columns = model_data["feature_columns"]
        self.metadata = model_data["metadata"]
        
        self._is_trained = True
        logger.info(f"Model loaded from {path}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information and metadata."""
        return {
            "version": self.metadata.get("version", "unknown"),
            "trained_at": self.metadata.get("trained_at"),
            "training_samples": self.metadata.get("training_samples", 0),
            "metrics": self.metadata.get("metrics", {}),
            "feature_columns": self.feature_columns,
            "is_trained": self._is_trained
        }


# Singleton instance
_formulation_model: Optional[FormulationRiskModel] = None


def get_formulation_model() -> FormulationRiskModel:
    """Get or create the FormulationRiskModel singleton."""
    global _formulation_model
    
    if _formulation_model is None:
        _formulation_model = FormulationRiskModel()
    
    return _formulation_model
