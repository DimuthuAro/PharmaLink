# ml_service/process_twosides.py
import pandas as pd
import numpy as np
import gzip
import json
from tqdm import tqdm
import os
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

class TwoSIDESProcessor:
    def __init__(self, data_path="data/raw/TWOSIDES.csv.gz"):
        self.data_path = data_path
        self.processed_path = "data/processed"
        os.makedirs(self.processed_path, exist_ok=True)
        
    def extract_sample_data(self, n_rows=1000000):
        """Extract sample data from large TwoSIDES dataset"""
        print("📊 Extracting TwoSIDES data...")
        
        try:
            # Read in chunks
            chunks = pd.read_csv(self.data_path, compression='gzip', 
                                chunksize=100000, low_memory=False)
            
            # Collect first N rows
            data_chunks = []
            total_rows = 0
            
            for chunk in tqdm(chunks, desc="Reading TwoSIDES"):
                data_chunks.append(chunk)
                total_rows += len(chunk)
                if total_rows >= n_rows:
                    break
            
            df = pd.concat(data_chunks, ignore_index=True)
            print(f"✅ Loaded {len(df):,} rows from TwoSIDES")
            return df
            
        except Exception as e:
            print(f"❌ Error reading TwoSIDES: {e}")
            print("Creating synthetic data as fallback...")
            return self.create_synthetic_data()
    
    def create_training_dataset(self, df, min_occurrences=10):
        """Create ML-ready dataset from TwoSIDES"""
        print("\n🔧 Creating training dataset...")
        
        # Group by drug pairs and aggregate
        print("Grouping drug pairs...")
        grouped = df.groupby(['drug_rxcui_x', 'drug_rxcui_y']).agg({
            'condition_umls_cui': ['count', 'nunique'],  # Total and unique side effects
            'prr': ['mean', 'max', 'min', 'std'],        # PRR statistics
            'ror': ['mean', 'max', 'min', 'std'],        # ROR statistics
            'chi_square': 'mean',                        # Chi-square
            'log10_fisher_p': 'mean'                     # Fisher p-value
        }).reset_index()
        
        # Flatten column names
        grouped.columns = ['drug1', 'drug2', 'total_effects', 'unique_effects',
                          'prr_mean', 'prr_max', 'prr_min', 'prr_std',
                          'ror_mean', 'ror_max', 'ror_min', 'ror_std',
                          'chi_square_mean', 'log10_fisher_mean']
        
        # Filter pairs with sufficient evidence
        filtered = grouped[grouped['total_effects'] >= min_occurrences].copy()
        print(f"Filtered to {len(filtered):,} drug pairs with ≥{min_occurrences} occurrences")
        
        # Create severity labels based on statistics
        filtered['severity_score'] = self.calculate_severity(filtered)
        
        # Create binary labels (interaction vs no interaction)
        # All pairs in TwoSIDES are interactions, so label = 1
        filtered['has_interaction'] = 1
        
        # Create negative samples (non-interacting pairs)
        print("\nCreating negative samples...")
        negative_samples = self.create_negative_samples(filtered, n_samples=len(filtered))
        
        # Combine positive and negative
        all_data = pd.concat([filtered, negative_samples], ignore_index=True)
        
        # Shuffle
        all_data = all_data.sample(frac=1, random_state=42).reset_index(drop=True)
        
        print(f"\n📈 Final dataset: {len(all_data):,} samples")
        print(f"   • Positive interactions: {len(filtered):,}")
        print(f"   • Negative samples: {len(negative_samples):,}")
        
        return all_data
    
    def calculate_severity(self, df):
        """Calculate interaction severity based on multiple factors"""
        # Normalize features
        features = ['prr_mean', 'ror_mean', 'total_effects', 'chi_square_mean']
        
        # Create severity score (0-1)
        severity = np.zeros(len(df))
        
        for feature in features:
            if feature in df.columns:
                values = df[feature].fillna(0).values
                # Normalize to 0-1
                if values.max() > values.min():
                    normalized = (values - values.min()) / (values.max() - values.min())
                    severity += normalized
        
        # Average and scale to 0-1
        severity = severity / len(features)
        
        # Convert to categories
        categories = []
        for s in severity:
            if s > 0.7:
                categories.append('high')
            elif s > 0.4:
                categories.append('medium')
            else:
                categories.append('low')
        
        return categories
    
    def create_negative_samples(self, positive_df, n_samples=10000):
        """Create non-interacting drug pairs"""
        # Get all unique drugs
        all_drugs = set(positive_df['drug1'].unique()) | set(positive_df['drug2'].unique())
        all_drugs = list(all_drugs)
        
        print(f"   • Unique drugs: {len(all_drugs):,}")
        
        # Create existing pairs set for quick lookup
        existing_pairs = set()
        for _, row in tqdm(positive_df.iterrows(), total=len(positive_df), desc="Building pair index"):
            pair = tuple(sorted([str(row['drug1']), str(row['drug2'])]))
            existing_pairs.add(pair)
        
        # Generate negative samples
        negative_samples = []
        attempts = 0
        max_attempts = n_samples * 10
        
        with tqdm(total=n_samples, desc="Generating negative samples") as pbar:
            while len(negative_samples) < n_samples and attempts < max_attempts:
                drug_a, drug_b = np.random.choice(all_drugs, 2, replace=False)
                pair = tuple(sorted([str(drug_a), str(drug_b)]))
                
                if pair not in existing_pairs:
                    negative_samples.append({
                        'drug1': drug_a,
                        'drug2': drug_b,
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
                    })
                    existing_pairs.add(pair)  # Prevent duplicates
                    pbar.update(1)
                
                attempts += 1
        
        return pd.DataFrame(negative_samples)
    
    def save_datasets(self, df, split_ratio=0.2):
        """Save processed datasets"""
        # Split into train/test
        from sklearn.model_selection import train_test_split
        
        train_df, test_df = train_test_split(
            df, test_size=split_ratio, random_state=42, 
            stratify=df['has_interaction']
        )
        
        # Save full dataset
        full_path = os.path.join(self.processed_path, "drug_interactions_full.csv")
        df.to_csv(full_path, index=False)
        
        # Save train/test splits
        train_path = os.path.join(self.processed_path, "drug_interactions_train.csv")
        test_path = os.path.join(self.processed_path, "drug_interactions_test.csv")
        
        train_df.to_csv(train_path, index=False)
        test_df.to_csv(test_path, index=False)
        
        print(f"\n💾 Saved datasets:")
        print(f"   • Full dataset: {full_path} ({len(df):,} rows)")
        print(f"   • Train set: {train_path} ({len(train_df):,} rows)")
        print(f"   • Test set: {test_path} ({len(test_df):,} rows)")
        
        # Create drug mapping
        self.create_drug_mapping(df)
        
        return train_path, test_path
    
    def create_drug_mapping(self, df):
        """Create drug ID to name mapping"""
        # Get unique drugs
        all_drugs = set(df['drug1'].unique()) | set(df['drug2'].unique())
        
        # Create mapping (in real scenario, get from RxNorm)
        drug_mapping = pd.DataFrame({
            'drug_id': list(all_drugs),
            'drug_name': [f"Drug_{d}" for d in all_drugs]  # Placeholder
        })
        
        mapping_path = os.path.join(self.processed_path, "drug_mapping.csv")
        drug_mapping.to_csv(mapping_path, index=False)
        
        print(f"   • Drug mapping: {mapping_path} ({len(drug_mapping):,} drugs)")
        
        return mapping_path
    
    def create_synthetic_data(self):
        """Create synthetic data if TwoSIDES fails"""
        print("Creating synthetic training data...")
        
        # Common drug interactions
        common_interactions = [
            ("Warfarin", "Aspirin", 0.85, "high"),
            ("Warfarin", "Ibuprofen", 0.75, "high"),
            ("Metformin", "Insulin", 0.60, "medium"),
            ("Simvastatin", "Grapefruit", 0.90, "high"),
            ("Digoxin", "Furosemide", 0.70, "medium"),
            ("Lithium", "Ibuprofen", 0.80, "high"),
            ("ACE Inhibitors", "Potassium", 0.65, "medium"),
            ("SSRIs", "MAOIs", 0.95, "high"),
            ("Theophylline", "Ciprofloxacin", 0.75, "high"),
            ("Oral Contraceptives", "Antibiotics", 0.50, "low"),
        ]
        
        data = []
        for drug1, drug2, prob, severity in common_interactions:
            data.append({
                'drug_rxcui_x': drug1,
                'drug_rxcui_y': drug2,
                'condition_umls_cui': 'C0000001',
                'prr': prob * 2,
                'ror': prob * 3,
                'chi_square': prob * 100,
                'log10_fisher_p': -np.log10(1 - prob)
            })
        
        # Add random interactions
        drugs = [f"Drug_{i}" for i in range(1, 101)]
        for _ in range(5000):
            drug1, drug2 = np.random.choice(drugs, 2, replace=False)
            prob = np.random.uniform(0.1, 0.9)
            data.append({
                'drug_rxcui_x': drug1,
                'drug_rxcui_y': drug2,
                'condition_umls_cui': f"C{np.random.randint(1000000, 9999999)}",
                'prr': prob * 2,
                'ror': prob * 3,
                'chi_square': prob * 100,
                'log10_fisher_p': -np.log10(1 - prob)
            })
        
        df = pd.DataFrame(data)
        print(f"Created {len(df)} synthetic interactions")
        return df

def main():
    """Main processing pipeline"""
    print("="*60)
    print("TWO-SIDES DATA PROCESSING PIPELINE")
    print("="*60)
    
    processor = TwoSIDESProcessor()
    
    # Step 1: Extract data
    df = processor.extract_sample_data(n_rows=500000)  # Start with 500K rows
    
    # Step 2: Create training dataset
    training_df = processor.create_training_dataset(df, min_occurrences=5)
    
    # Step 3: Save datasets
    train_path, test_path = processor.save_datasets(training_df)
    
    print("\n" + "="*60)
    print("✅ PROCESSING COMPLETE")
    print("="*60)
    
    # Show statistics
    print("\n📊 Dataset Statistics:")
    print(f"   • Total samples: {len(training_df):,}")
    print(f"   • Positive class: {training_df['has_interaction'].sum():,}")
    print(f"   • Negative class: {(training_df['has_interaction'] == 0).sum():,}")
    print(f"   • Class balance: {training_df['has_interaction'].mean():.1%}")
    
    # Feature correlation
    if 'prr_mean' in training_df.columns:
        corr = training_df[['prr_mean', 'ror_mean', 'total_effects', 'has_interaction']].corr()
        print(f"\n🔗 Feature correlation with target:")
        print(f"   • PRR mean: {corr.loc['prr_mean', 'has_interaction']:.3f}")
        print(f"   • ROR mean: {corr.loc['ror_mean', 'has_interaction']:.3f}")
        print(f"   • Total effects: {corr.loc['total_effects', 'has_interaction']:.3f}")
    
    return training_df

if __name__ == "__main__":
    main()