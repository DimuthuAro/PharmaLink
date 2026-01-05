# ml_service/train_production_model.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (accuracy_score, precision_score, recall_score, 
                           f1_score, roc_auc_score, confusion_matrix, 
                           classification_report, roc_curve)
import joblib
import json
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
import os
from datetime import datetime
warnings.filterwarnings('ignore')

class DrugInteractionModelTrainer:
    def __init__(self, data_path="data/processed/drug_interactions_train.csv"):
        self.data_path = data_path
        self.model_dir = "../model"
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Initialize components
        self.model = None
        self.scaler = StandardScaler()
        self.drug_encoder = LabelEncoder()
        self.severity_encoder = LabelEncoder()
        
    def load_and_prepare_data(self):
        """Load and prepare training data"""
        print("📥 Loading training data...")
        
        try:
            df = pd.read_csv(self.data_path)
            print(f"✅ Loaded {len(df):,} training samples")
        except FileNotFoundError:
            print("❌ Training data not found. Creating synthetic data...")
            df = self.create_synthetic_data()
        
        # Check data quality
        print(f"\n📊 Data Overview:")
        print(f"   • Columns: {list(df.columns)}")
        print(f"   • Positive samples: {df['has_interaction'].sum():,}")
        print(f"   • Negative samples: {(df['has_interaction'] == 0).sum():,}")
        print(f"   • Missing values: {df.isnull().sum().sum()}")
        
        return df
    
    def create_features(self, df):
        """Create feature matrix and labels"""
        print("\n🔧 Creating features...")
        
        # Encode drug IDs
        all_drugs = pd.concat([df['drug1'], df['drug2']]).unique()
        self.drug_encoder.fit(all_drugs)
        
        df['drug1_encoded'] = self.drug_encoder.transform(df['drug1'])
        df['drug2_encoded'] = self.drug_encoder.transform(df['drug2'])
        
        # Encode severity if present
        if 'severity_score' in df.columns:
            df['severity_encoded'] = self.severity_encoder.fit_transform(df['severity_score'])
        
        # Define feature columns
        numeric_features = [
            'drug1_encoded', 'drug2_encoded',
            'total_effects', 'unique_effects',
            'prr_mean', 'prr_max', 'prr_min', 'prr_std',
            'ror_mean', 'ror_max', 'ror_min', 'ror_std',
            'chi_square_mean', 'log10_fisher_mean'
        ]
        
        # Keep only available features
        available_features = [f for f in numeric_features if f in df.columns]
        
        if 'severity_encoded' in df.columns:
            available_features.append('severity_encoded')
        
        print(f"   • Using {len(available_features)} features")
        print(f"   • Features: {available_features}")
        
        X = df[available_features].fillna(0)
        y = df['has_interaction'].values
        
        return X, y, available_features
    
    def train_model(self, X_train, y_train):
        """Train optimized model"""
        print("\n🤖 Training model...")
        
        # Define model with optimized hyperparameters
        self.model = RandomForestClassifier(
            n_estimators=200,           # More trees for better performance
            max_depth=15,               # Limit depth to prevent overfitting
            min_samples_split=10,       # Require more samples to split
            min_samples_leaf=5,         # Require more samples in leaves
            max_features='sqrt',        # Consider sqrt(features) for splits
            bootstrap=True,
            random_state=42,
            n_jobs=-1,                  # Use all cores
            class_weight='balanced'     # Handle class imbalance
        )
        
        print("   • Model: RandomForestClassifier")
        print(f"   • Estimators: {self.model.n_estimators}")
        print(f"   • Max depth: {self.model.max_depth}")
        
        # Train model
        self.model.fit(X_train, y_train)
        
        print("✅ Model training complete")
        
        return self.model
    
    def evaluate_model(self, X_test, y_test):
        """Evaluate model performance"""
        print("\n📈 Evaluating model performance...")
        
        # Predictions
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        
        print(f"   • Accuracy:  {accuracy:.4f}")
        print(f"   • Precision: {precision:.4f}")
        print(f"   • Recall:    {recall:.4f}")
        print(f"   • F1-Score:  {f1:.4f}")
        print(f"   • ROC-AUC:   {roc_auc:.4f}")
        
        # Classification report
        print("\n📋 Classification Report:")
        print(classification_report(y_test, y_pred, 
                                   target_names=['No Interaction', 'Interaction']))
        
        # Feature importance
        self.plot_feature_importance()
        
        # Confusion matrix
        self.plot_confusion_matrix(y_test, y_pred)
        
        # ROC Curve
        self.plot_roc_curve(y_test, y_pred_proba, roc_auc)
        
        return {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'roc_auc': float(roc_auc)
        }
    
    def plot_feature_importance(self):
        """Plot feature importance"""
        feature_importance = pd.DataFrame({
            'feature': [f"Feature_{i}" for i in range(len(self.model.feature_importances_))],
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=True)
        
        plt.figure(figsize=(10, 6))
        plt.barh(feature_importance['feature'][-20:],  # Show top 20
                feature_importance['importance'][-20:])
        plt.xlabel('Importance')
        plt.title('Top 20 Feature Importance')
        plt.tight_layout()
        plt.savefig(os.path.join(self.model_dir, 'feature_importance.png'), dpi=150)
        plt.close()
        
        print(f"💾 Saved feature importance plot")
    
    def plot_confusion_matrix(self, y_true, y_pred):
        """Plot confusion matrix"""
        cm = confusion_matrix(y_true, y_pred)
        
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=['No Interaction', 'Interaction'],
                   yticklabels=['No Interaction', 'Interaction'])
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.title('Confusion Matrix')
        plt.tight_layout()
        plt.savefig(os.path.join(self.model_dir, 'confusion_matrix.png'), dpi=150)
        plt.close()
        
        print(f"💾 Saved confusion matrix")
    
    def plot_roc_curve(self, y_true, y_pred_proba, roc_auc):
        """Plot ROC curve"""
        fpr, tpr, _ = roc_curve(y_true, y_pred_proba)
        
        plt.figure(figsize=(8, 6))
        plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {roc_auc:.3f})', linewidth=2)
        plt.plot([0, 1], [0, 1], 'k--', label='Random Classifier')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(os.path.join(self.model_dir, 'roc_curve.png'), dpi=150)
        plt.close()
        
        print(f"💾 Saved ROC curve")
    
    def save_model(self, metrics):
        """Save model and artifacts"""
        print("\n💾 Saving model artifacts...")
        
        # Save model
        model_path = os.path.join(self.model_dir, 'drug_interaction_model.pkl')
        joblib.dump(self.model, model_path)
        print(f"   • Model saved: {model_path}")
        
        # Save scaler
        scaler_path = os.path.join(self.model_dir, 'scaler.pkl')
        joblib.dump(self.scaler, scaler_path)
        print(f"   • Scaler saved: {scaler_path}")
        
        # Save encoders
        encoder_path = os.path.join(self.model_dir, 'drug_encoder.pkl')
        joblib.dump(self.drug_encoder, encoder_path)
        print(f"   • Drug encoder saved: {encoder_path}")
        
        severity_encoder_path = os.path.join(self.model_dir, 'severity_encoder.pkl')
        joblib.dump(self.severity_encoder, severity_encoder_path)
        print(f"   • Severity encoder saved: {severity_encoder_path}")
        
        # Save metadata
        metadata = {
            'model_name': 'Drug Interaction Random Forest',
            'version': '1.0.0',
            'training_date': datetime.now().isoformat(),
            'dataset': self.data_path,
            'model_type': 'RandomForestClassifier',
            'hyperparameters': {
                'n_estimators': 200,
                'max_depth': 15,
                'min_samples_split': 10,
                'min_samples_leaf': 5,
                'random_state': 42
            },
            'metrics': metrics,
            'feature_count': self.model.n_features_in_,
            'drug_count': len(self.drug_encoder.classes_),
            'severity_classes': list(self.severity_encoder.classes_)
        }
        
        metadata_path = os.path.join(self.model_dir, 'model_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"   • Metadata saved: {metadata_path}")
        
        return {
            'model': model_path,
            'scaler': scaler_path,
            'drug_encoder': encoder_path,
            'severity_encoder': severity_encoder_path,
            'metadata': metadata_path
        }
    
    def create_synthetic_data(self):
        """Create synthetic data for testing"""
        print("Creating synthetic training data...")
        
        np.random.seed(42)
        n_samples = 10000
        
        data = []
        for i in range(n_samples):
            drug1 = f"Drug_{np.random.randint(1, 1000)}"
            drug2 = f"Drug_{np.random.randint(1, 1000)}"
            
            if drug1 == drug2:
                continue
            
            # 70% positive interactions
            has_interaction = 1 if np.random.random() < 0.7 else 0
            
            if has_interaction:
                row = {
                    'drug1': drug1,
                    'drug2': drug2,
                    'total_effects': np.random.randint(1, 50),
                    'unique_effects': np.random.randint(1, 20),
                    'prr_mean': np.random.uniform(0.5, 5.0),
                    'prr_max': np.random.uniform(1.0, 10.0),
                    'prr_min': np.random.uniform(0.1, 2.0),
                    'prr_std': np.random.uniform(0.1, 2.0),
                    'ror_mean': np.random.uniform(0.5, 8.0),
                    'ror_max': np.random.uniform(1.0, 15.0),
                    'ror_min': np.random.uniform(0.1, 3.0),
                    'ror_std': np.random.uniform(0.1, 3.0),
                    'chi_square_mean': np.random.uniform(1.0, 100.0),
                    'log10_fisher_mean': np.random.uniform(0.1, 10.0),
                    'severity_score': np.random.choice(['low', 'medium', 'high']),
                    'has_interaction': 1
                }
            else:
                row = {
                    'drug1': drug1,
                    'drug2': drug2,
                    'total_effects': 0,
                    'unique_effects': 0,
                    'prr_mean': 0,
                    'prr_max': 0,
                    'prr_min': 0,
                    'prr_std': 0,
                    'ror_mean': 0,
                    'ror_max': 0,
                    'ror_min': 0,
                    'ror_std': 0,
                    'chi_square_mean': 0,
                    'log10_fisher_mean': 0,
                    'severity_score': 'none',
                    'has_interaction': 0
                }
            
            data.append(row)
        
        df = pd.DataFrame(data)
        
        # Save for future use
        os.makedirs('data/processed', exist_ok=True)
        df.to_csv('data/processed/drug_interactions_train.csv', index=False)
        
        return df
    
    def run(self):
        """Run complete training pipeline"""
        print("="*60)
        print("DRUG INTERACTION MODEL TRAINING")
        print("="*60)
        
        # Step 1: Load data
        df = self.load_and_prepare_data()
        
        # Step 2: Create features
        X, y, features = self.create_features(df)
        
        # Step 3: Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"\n📊 Data Split:")
        print(f"   • Training samples: {len(X_train):,}")
        print(f"   • Testing samples:  {len(X_test):,}")
        print(f"   • Feature count:    {len(features)}")
        
        # Step 4: Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Step 5: Train model
        model = self.train_model(X_train_scaled, y_train)
        
        # Step 6: Evaluate
        metrics = self.evaluate_model(X_test_scaled, y_test)
        
        # Step 7: Save model
        artifacts = self.save_model(metrics)
        
        print("\n" + "="*60)
        print("✅ TRAINING COMPLETE")
        print("="*60)
        
        print(f"\n🎯 Model Performance Summary:")
        for metric, value in metrics.items():
            print(f"   • {metric.title()}: {value:.4f}")
        
        print(f"\n📁 Saved Artifacts:")
        for key, path in artifacts.items():
            if key != 'metadata':
                print(f"   • {key}: {os.path.basename(path)}")
        
        return model, metrics

def main():
    """Main training function"""
    trainer = DrugInteractionModelTrainer()
    model, metrics = trainer.run()
    
    # Print success message
    print("\n✨ NEXT STEPS:")
    print("1. Restart ML Service to load new model:")
    print("   cd ml_service && python main.py")
    print("\n2. Test the model:")
    print("   python test_model.py")
    print("\n3. Update your backend to use real predictions")
    
    return model, metrics

if __name__ == "__main__":
    main()