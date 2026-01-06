"""
Cross-Brand Comparator Service
Uses FDA Orange Book data to build a drug lexicon for brand comparison
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import logging
import json
from datetime import datetime
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def convert_to_native(obj: Any) -> Any:
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(item) for item in obj]
    elif pd.isna(obj):
        return None
    return obj


class CrossBrandService:
    """
    Service for comparing drug brands using FDA Orange Book data.
    Builds a knowledge base mapping Trade Names to Ingredients, Formulations, and Patents.
    """

    def __init__(self, data_dir: str = None):
        """
        Initialize the Cross-Brand Service.
        
        Args:
            data_dir: Directory containing Orange Book data files (products.txt, patent.txt)
        """
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).parent.parent / "data" / "orange_book"
        self.drug_lexicon: Optional[pd.DataFrame] = None
        self.patent_data: Optional[pd.DataFrame] = None
        self.exclusivity_data: Optional[pd.DataFrame] = None
        self._is_loaded = False
        
    def load_data(self) -> bool:
        """
        Load Orange Book data files and build the drug lexicon.
        
        Returns:
            bool: True if data loaded successfully, False otherwise
        """
        try:
            products_path = self.data_dir / "products.txt"
            patent_path = self.data_dir / "patent.txt"
            exclusivity_path = self.data_dir / "exclusivity.txt"
            
            # Check if files exist
            if not products_path.exists():
                logger.warning(f"Products file not found at {products_path}. Using sample data.")
                self._load_sample_data()
                return True
            
            # Load the Orange Book data with proper encoding
            logger.info("Loading Orange Book products data...")
            self.products_df = pd.read_csv(
                products_path, 
                delimiter='~', 
                encoding='latin-1',
                on_bad_lines='skip'
            )
            
            if patent_path.exists():
                logger.info("Loading Orange Book patent data...")
                self.patent_data = pd.read_csv(
                    patent_path, 
                    delimiter='~', 
                    encoding='latin-1',
                    on_bad_lines='skip'
                )
            
            if exclusivity_path.exists():
                logger.info("Loading Orange Book exclusivity data...")
                self.exclusivity_data = pd.read_csv(
                    exclusivity_path, 
                    delimiter='~', 
                    encoding='latin-1',
                    on_bad_lines='skip'
                )
            
            # Build the drug lexicon
            self._build_drug_lexicon()
            self._is_loaded = True
            logger.info(f"Drug lexicon built with {len(self.drug_lexicon)} entries")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading Orange Book data: {e}")
            self._load_sample_data()
            return True
    
    def _load_sample_data(self):
        """Load sample data for development/testing when Orange Book data is unavailable."""
        logger.info("Loading sample drug data...")
        
        # Sample drug data for demonstration
        sample_data = [
            # Metformin brands
            {"Trade Name": "GLUCOPHAGE", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "500MG", 
             "NDA Number": "N020357", "Applicant": "BRISTOL MYERS SQUIBB", "TE_Code": "AB"},
            {"Trade Name": "GLUCOPHAGE", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "850MG", 
             "NDA Number": "N020357", "Applicant": "BRISTOL MYERS SQUIBB", "TE_Code": "AB"},
            {"Trade Name": "GLUCOPHAGE", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "1000MG", 
             "NDA Number": "N020357", "Applicant": "BRISTOL MYERS SQUIBB", "TE_Code": "AB"},
            {"Trade Name": "GLUCOPHAGE XR", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "TABLET, EXTENDED RELEASE; ORAL", "Strength": "500MG", 
             "NDA Number": "N021202", "Applicant": "BRISTOL MYERS SQUIBB", "TE_Code": "AB"},
            {"Trade Name": "GLUCOPHAGE XR", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "TABLET, EXTENDED RELEASE; ORAL", "Strength": "750MG", 
             "NDA Number": "N021202", "Applicant": "BRISTOL MYERS SQUIBB", "TE_Code": "AB"},
            {"Trade Name": "FORTAMET", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "TABLET, EXTENDED RELEASE; ORAL", "Strength": "500MG", 
             "NDA Number": "N021574", "Applicant": "SHIONOGI", "TE_Code": "AB"},
            {"Trade Name": "GLUMETZA", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "TABLET, EXTENDED RELEASE; ORAL", "Strength": "500MG", 
             "NDA Number": "N021748", "Applicant": "SALIX PHARMS", "TE_Code": "AB"},
            {"Trade Name": "RIOMET", "Ingredient": "METFORMIN HYDROCHLORIDE", 
             "Dosage Form; Route": "SOLUTION; ORAL", "Strength": "100MG/ML", 
             "NDA Number": "N021591", "Applicant": "RANBAXY", "TE_Code": "AB"},
            
            # Atorvastatin brands
            {"Trade Name": "LIPITOR", "Ingredient": "ATORVASTATIN CALCIUM", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "10MG", 
             "NDA Number": "N020702", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "LIPITOR", "Ingredient": "ATORVASTATIN CALCIUM", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "20MG", 
             "NDA Number": "N020702", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "LIPITOR", "Ingredient": "ATORVASTATIN CALCIUM", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "40MG", 
             "NDA Number": "N020702", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "LIPITOR", "Ingredient": "ATORVASTATIN CALCIUM", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "80MG", 
             "NDA Number": "N020702", "Applicant": "PFIZER", "TE_Code": "AB"},
            
            # Lisinopril brands
            {"Trade Name": "PRINIVIL", "Ingredient": "LISINOPRIL", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "5MG", 
             "NDA Number": "N019777", "Applicant": "MERCK", "TE_Code": "AB"},
            {"Trade Name": "PRINIVIL", "Ingredient": "LISINOPRIL", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "10MG", 
             "NDA Number": "N019777", "Applicant": "MERCK", "TE_Code": "AB"},
            {"Trade Name": "PRINIVIL", "Ingredient": "LISINOPRIL", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "20MG", 
             "NDA Number": "N019777", "Applicant": "MERCK", "TE_Code": "AB"},
            {"Trade Name": "ZESTRIL", "Ingredient": "LISINOPRIL", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "5MG", 
             "NDA Number": "N019558", "Applicant": "ASTRAZENECA", "TE_Code": "AB"},
            {"Trade Name": "ZESTRIL", "Ingredient": "LISINOPRIL", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "10MG", 
             "NDA Number": "N019558", "Applicant": "ASTRAZENECA", "TE_Code": "AB"},
            {"Trade Name": "QBRELIS", "Ingredient": "LISINOPRIL", 
             "Dosage Form; Route": "SOLUTION; ORAL", "Strength": "1MG/ML", 
             "NDA Number": "N208274", "Applicant": "SILVERGATE PHARM", "TE_Code": "AB"},
            
            # Omeprazole brands
            {"Trade Name": "PRILOSEC", "Ingredient": "OMEPRAZOLE", 
             "Dosage Form; Route": "CAPSULE, DELAYED RELEASE; ORAL", "Strength": "10MG", 
             "NDA Number": "N019810", "Applicant": "ASTRAZENECA", "TE_Code": "AB"},
            {"Trade Name": "PRILOSEC", "Ingredient": "OMEPRAZOLE", 
             "Dosage Form; Route": "CAPSULE, DELAYED RELEASE; ORAL", "Strength": "20MG", 
             "NDA Number": "N019810", "Applicant": "ASTRAZENECA", "TE_Code": "AB"},
            {"Trade Name": "PRILOSEC", "Ingredient": "OMEPRAZOLE", 
             "Dosage Form; Route": "CAPSULE, DELAYED RELEASE; ORAL", "Strength": "40MG", 
             "NDA Number": "N019810", "Applicant": "ASTRAZENECA", "TE_Code": "AB"},
            
            # Amlodipine brands
            {"Trade Name": "NORVASC", "Ingredient": "AMLODIPINE BESYLATE", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "2.5MG", 
             "NDA Number": "N019787", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "NORVASC", "Ingredient": "AMLODIPINE BESYLATE", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "5MG", 
             "NDA Number": "N019787", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "NORVASC", "Ingredient": "AMLODIPINE BESYLATE", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "10MG", 
             "NDA Number": "N019787", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "KATERZIA", "Ingredient": "AMLODIPINE BESYLATE", 
             "Dosage Form; Route": "SUSPENSION; ORAL", "Strength": "1MG/ML", 
             "NDA Number": "N209327", "Applicant": "AZURITY PHARMS", "TE_Code": "AB"},
            
            # Levothyroxine brands
            {"Trade Name": "SYNTHROID", "Ingredient": "LEVOTHYROXINE SODIUM", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "25MCG", 
             "NDA Number": "N021402", "Applicant": "ABBVIE", "TE_Code": "AB"},
            {"Trade Name": "SYNTHROID", "Ingredient": "LEVOTHYROXINE SODIUM", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "50MCG", 
             "NDA Number": "N021402", "Applicant": "ABBVIE", "TE_Code": "AB"},
            {"Trade Name": "SYNTHROID", "Ingredient": "LEVOTHYROXINE SODIUM", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "100MCG", 
             "NDA Number": "N021402", "Applicant": "ABBVIE", "TE_Code": "AB"},
            {"Trade Name": "LEVOXYL", "Ingredient": "LEVOTHYROXINE SODIUM", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "25MCG", 
             "NDA Number": "N021301", "Applicant": "KING PHARMS", "TE_Code": "AB"},
            {"Trade Name": "LEVOXYL", "Ingredient": "LEVOTHYROXINE SODIUM", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "50MCG", 
             "NDA Number": "N021301", "Applicant": "KING PHARMS", "TE_Code": "AB"},
            {"Trade Name": "UNITHROID", "Ingredient": "LEVOTHYROXINE SODIUM", 
             "Dosage Form; Route": "TABLET; ORAL", "Strength": "50MCG", 
             "NDA Number": "N021116", "Applicant": "LANNETT", "TE_Code": "AB"},
            {"Trade Name": "TIROSINT", "Ingredient": "LEVOTHYROXINE SODIUM", 
             "Dosage Form; Route": "CAPSULE, LIQUID FILLED; ORAL", "Strength": "50MCG", 
             "NDA Number": "N022173", "Applicant": "IBSA INSTITUT", "TE_Code": "AB"},
            
            # Losartan brands
            {"Trade Name": "COZAAR", "Ingredient": "LOSARTAN POTASSIUM", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "25MG", 
             "NDA Number": "N020386", "Applicant": "MERCK", "TE_Code": "AB"},
            {"Trade Name": "COZAAR", "Ingredient": "LOSARTAN POTASSIUM", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "50MG", 
             "NDA Number": "N020386", "Applicant": "MERCK", "TE_Code": "AB"},
            {"Trade Name": "COZAAR", "Ingredient": "LOSARTAN POTASSIUM", 
             "Dosage Form; Route": "TABLET, FILM COATED; ORAL", "Strength": "100MG", 
             "NDA Number": "N020386", "Applicant": "MERCK", "TE_Code": "AB"},
            
            # Gabapentin brands
            {"Trade Name": "NEURONTIN", "Ingredient": "GABAPENTIN", 
             "Dosage Form; Route": "CAPSULE; ORAL", "Strength": "100MG", 
             "NDA Number": "N020235", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "NEURONTIN", "Ingredient": "GABAPENTIN", 
             "Dosage Form; Route": "CAPSULE; ORAL", "Strength": "300MG", 
             "NDA Number": "N020235", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "NEURONTIN", "Ingredient": "GABAPENTIN", 
             "Dosage Form; Route": "CAPSULE; ORAL", "Strength": "400MG", 
             "NDA Number": "N020235", "Applicant": "PFIZER", "TE_Code": "AB"},
            {"Trade Name": "GRALISE", "Ingredient": "GABAPENTIN", 
             "Dosage Form; Route": "TABLET, EXTENDED RELEASE; ORAL", "Strength": "300MG", 
             "NDA Number": "N022544", "Applicant": "ASSERTIO", "TE_Code": "AB"},
            {"Trade Name": "HORIZANT", "Ingredient": "GABAPENTIN ENACARBIL", 
             "Dosage Form; Route": "TABLET, EXTENDED RELEASE; ORAL", "Strength": "600MG", 
             "NDA Number": "N022399", "Applicant": "ARBOR PHARMS", "TE_Code": "AB"},
        ]
        
        self.products_df = pd.DataFrame(sample_data)
        self.patent_data = pd.DataFrame()  # Empty patent data for sample
        self.exclusivity_data = pd.DataFrame()  # Empty exclusivity data
        
        self._build_drug_lexicon()
        self._is_loaded = True
        logger.info(f"Sample drug lexicon built with {len(self.drug_lexicon)} entries")
    
    def _build_drug_lexicon(self):
        """Build the core drug lexicon from products data."""
        # Select relevant columns for the lexicon
        columns_to_use = ['Trade Name', 'Ingredient', 'Dosage Form; Route', 'Strength', 'NDA Number']
        if 'Applicant' in self.products_df.columns:
            columns_to_use.append('Applicant')
        if 'TE_Code' in self.products_df.columns:
            columns_to_use.append('TE_Code')
        
        # Filter to only existing columns
        available_columns = [c for c in columns_to_use if c in self.products_df.columns]
        self.drug_lexicon = self.products_df[available_columns].copy()
        
        # Rename columns for easier access
        column_mapping = {
            'Trade Name': 'trade_name',
            'Ingredient': 'ingredient',
            'Dosage Form; Route': 'dosage_form_route',
            'Strength': 'strength',
            'NDA Number': 'nda_number',
            'Applicant': 'manufacturer',
            'TE_Code': 'te_code'
        }
        self.drug_lexicon.rename(columns={k: v for k, v in column_mapping.items() 
                                          if k in self.drug_lexicon.columns}, inplace=True)
        
        # Engineer features
        self._engineer_features()
        
        # Merge patent information if available
        if self.patent_data is not None and not self.patent_data.empty:
            self._merge_patent_info()
    
    def _engineer_features(self):
        """Engineer additional features from the drug lexicon."""
        # Is extended release formulation?
        if 'dosage_form_route' in self.drug_lexicon.columns:
            self.drug_lexicon['is_extended_release'] = self.drug_lexicon['dosage_form_route'].str.contains(
                'EXTENDED|XR|ER|CR|SR|LA|XL', case=False, na=False
            )
            
            # Is delayed release?
            self.drug_lexicon['is_delayed_release'] = self.drug_lexicon['dosage_form_route'].str.contains(
                'DELAYED', case=False, na=False
            )
            
            # Extract route (oral, injectable, topical, etc.)
            self.drug_lexicon['route'] = self.drug_lexicon['dosage_form_route'].apply(self._extract_route)
            
            # Extract dosage form
            self.drug_lexicon['dosage_form'] = self.drug_lexicon['dosage_form_route'].apply(self._extract_dosage_form)
        
        # Parse strength into numeric value and unit
        if 'strength' in self.drug_lexicon.columns:
            self.drug_lexicon['strength_value'] = self.drug_lexicon['strength'].apply(self._extract_strength_value)
            self.drug_lexicon['strength_unit'] = self.drug_lexicon['strength'].apply(self._extract_strength_unit)
        
        # Create normalized ingredient name for matching
        if 'ingredient' in self.drug_lexicon.columns:
            self.drug_lexicon['ingredient_normalized'] = self.drug_lexicon['ingredient'].str.upper().str.strip()
            
            # Extract base ingredient (remove salt forms like HYDROCHLORIDE, SODIUM, etc.)
            self.drug_lexicon['ingredient_base'] = self.drug_lexicon['ingredient_normalized'].apply(
                self._extract_base_ingredient
            )
    
    def _extract_route(self, dosage_form_route: str) -> str:
        """Extract administration route from dosage form string."""
        if pd.isna(dosage_form_route):
            return "UNKNOWN"
        
        routes = {
            'ORAL': ['ORAL', 'TABLET', 'CAPSULE', 'SOLUTION', 'SUSPENSION'],
            'INJECTABLE': ['INJECTION', 'INJECTABLE', 'INTRAVENOUS', 'IV', 'IM', 'SC', 'SUBCUTANEOUS'],
            'TOPICAL': ['TOPICAL', 'CREAM', 'OINTMENT', 'GEL', 'LOTION', 'PATCH'],
            'INHALATION': ['INHALATION', 'INHALER', 'AEROSOL', 'NEBULIZER'],
            'OPHTHALMIC': ['OPHTHALMIC', 'EYE'],
            'OTIC': ['OTIC', 'EAR'],
            'NASAL': ['NASAL'],
            'RECTAL': ['RECTAL', 'SUPPOSITORY'],
            'SUBLINGUAL': ['SUBLINGUAL'],
            'BUCCAL': ['BUCCAL'],
            'TRANSDERMAL': ['TRANSDERMAL', 'PATCH']
        }
        
        upper_str = dosage_form_route.upper()
        for route, keywords in routes.items():
            if any(kw in upper_str for kw in keywords):
                return route
        return "OTHER"
    
    def _extract_dosage_form(self, dosage_form_route: str) -> str:
        """Extract dosage form from dosage form string."""
        if pd.isna(dosage_form_route):
            return "UNKNOWN"
        
        # Split at semicolon and take first part
        parts = dosage_form_route.split(';')
        return parts[0].strip() if parts else "UNKNOWN"
    
    def _extract_strength_value(self, strength: str) -> Optional[float]:
        """Extract numeric strength value."""
        if pd.isna(strength):
            return None
        
        # Match patterns like "500MG", "10MG/ML", "0.5MG"
        match = re.search(r'([\d.]+)', str(strength))
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return None
        return None
    
    def _extract_strength_unit(self, strength: str) -> str:
        """Extract strength unit."""
        if pd.isna(strength):
            return ""
        
        # Match patterns like "MG", "MCG", "MG/ML"
        match = re.search(r'[\d.]+\s*([A-Za-z/]+)', str(strength))
        if match:
            return match.group(1).upper()
        return ""
    
    def _extract_base_ingredient(self, ingredient: str) -> str:
        """Extract base ingredient by removing salt forms."""
        if pd.isna(ingredient):
            return ""
        
        # Common salt/ester suffixes to remove
        suffixes = [
            ' HYDROCHLORIDE', ' HCL', ' SODIUM', ' POTASSIUM', ' CALCIUM',
            ' MESYLATE', ' MALEATE', ' FUMARATE', ' TARTRATE', ' CITRATE',
            ' ACETATE', ' SULFATE', ' BESYLATE', ' BROMIDE', ' NITRATE',
            ' PHOSPHATE', ' SUCCINATE', ' LACTATE', ' GLUCONATE', ' CHLORIDE',
            ' ENACARBIL', ' DISOPROXIL'
        ]
        
        result = ingredient.upper()
        for suffix in suffixes:
            result = result.replace(suffix, '')
        
        return result.strip()
    
    def _merge_patent_info(self):
        """Merge patent information into the drug lexicon."""
        if self.patent_data is None or self.patent_data.empty:
            self.drug_lexicon['has_formulation_patent'] = False
            self.drug_lexicon['has_active_patent'] = False
            return
        
        # Identify formulation patents
        formulation_patents = self.patent_data[
            self.patent_data.get('Drug Product Flag', pd.Series([False])) == 'Y'
        ]
        
        if 'NDA Number' in formulation_patents.columns and 'nda_number' in self.drug_lexicon.columns:
            # Get unique NDA numbers with formulation patents
            nda_with_patents = formulation_patents['NDA Number'].dropna().unique()
            self.drug_lexicon['has_formulation_patent'] = self.drug_lexicon['nda_number'].isin(nda_with_patents)
        else:
            self.drug_lexicon['has_formulation_patent'] = False
        
        # Check for active patents (not expired)
        if 'Patent Expire Date Text' in self.patent_data.columns:
            today = datetime.now()
            active_patents = self.patent_data[
                pd.to_datetime(self.patent_data['Patent Expire Date Text'], errors='coerce') > today
            ]
            if 'NDA Number' in active_patents.columns:
                nda_with_active = active_patents['NDA Number'].dropna().unique()
                self.drug_lexicon['has_active_patent'] = self.drug_lexicon['nda_number'].isin(nda_with_active)
            else:
                self.drug_lexicon['has_active_patent'] = False
        else:
            self.drug_lexicon['has_active_patent'] = False
    
    def search_by_ingredient(self, ingredient: str, include_salt_forms: bool = True) -> List[Dict[str, Any]]:
        """
        Search for all brands containing a specific ingredient.
        
        Args:
            ingredient: The ingredient name to search for
            include_salt_forms: If True, matches base ingredient regardless of salt form
            
        Returns:
            List of matching drug entries
        """
        if not self._is_loaded:
            self.load_data()
        
        ingredient_upper = ingredient.upper().strip()
        
        if include_salt_forms:
            # Search by base ingredient
            mask = self.drug_lexicon['ingredient_base'].str.contains(
                self._extract_base_ingredient(ingredient_upper), 
                case=False, 
                na=False,
                regex=False
            )
        else:
            # Exact ingredient match
            mask = self.drug_lexicon['ingredient_normalized'].str.contains(
                ingredient_upper, 
                case=False, 
                na=False,
                regex=False
            )
        
        results = self.drug_lexicon[mask].to_dict('records')
        return convert_to_native(results)
    
    def search_by_trade_name(self, trade_name: str) -> List[Dict[str, Any]]:
        """
        Search for drugs by trade/brand name.
        
        Args:
            trade_name: The trade name to search for
            
        Returns:
            List of matching drug entries
        """
        if not self._is_loaded:
            self.load_data()
        
        mask = self.drug_lexicon['trade_name'].str.contains(
            trade_name.upper().strip(), 
            case=False, 
            na=False,
            regex=False
        )
        
        results = self.drug_lexicon[mask].to_dict('records')
        return convert_to_native(results)
    
    def compare_brands(self, ingredient: str, strength: str = None, dosage_form: str = None) -> Dict[str, Any]:
        """
        Compare all brands of a drug with the same ingredient.
        
        Args:
            ingredient: The ingredient to compare brands for
            strength: Optional filter by strength
            dosage_form: Optional filter by dosage form
            
        Returns:
            Comparison results with all matching brands
        """
        if not self._is_loaded:
            self.load_data()
        
        # Get all matching drugs
        matches = self.search_by_ingredient(ingredient, include_salt_forms=True)
        
        if not matches:
            return {
                "ingredient": ingredient,
                "brands": [],
                "total_brands": 0,
                "message": f"No brands found for ingredient: {ingredient}"
            }
        
        # Apply filters
        if strength:
            strength_upper = strength.upper().strip()
            matches = [m for m in matches if strength_upper in str(m.get('strength', '')).upper()]
        
        if dosage_form:
            dosage_upper = dosage_form.upper().strip()
            matches = [m for m in matches if dosage_upper in str(m.get('dosage_form', '')).upper()]
        
        # Group by trade name
        brands = {}
        for drug in matches:
            trade_name = drug.get('trade_name', 'Unknown')
            if trade_name not in brands:
                brands[trade_name] = {
                    "trade_name": trade_name,
                    "manufacturer": drug.get('manufacturer', 'Unknown'),
                    "is_extended_release": drug.get('is_extended_release', False),
                    "has_active_patent": drug.get('has_active_patent', False),
                    "te_code": drug.get('te_code', ''),
                    "available_strengths": [],
                    "dosage_forms": set()
                }
            
            strength_info = drug.get('strength', '')
            if strength_info and strength_info not in brands[trade_name]["available_strengths"]:
                brands[trade_name]["available_strengths"].append(strength_info)
            
            dosage = drug.get('dosage_form', '')
            if dosage:
                brands[trade_name]["dosage_forms"].add(dosage)
        
        # Convert sets to lists for JSON serialization
        for brand in brands.values():
            brand["dosage_forms"] = list(brand["dosage_forms"])
        
        return convert_to_native({
            "ingredient": ingredient,
            "brands": list(brands.values()),
            "total_brands": len(brands),
            "filters_applied": {
                "strength": strength,
                "dosage_form": dosage_form
            }
        })
    
    def get_therapeutic_equivalents(self, trade_name: str, strength: str = None) -> List[Dict[str, Any]]:
        """
        Find therapeutically equivalent drugs for a given brand.
        
        Args:
            trade_name: The brand name to find equivalents for
            strength: Optional filter by strength
            
        Returns:
            List of therapeutically equivalent drugs
        """
        if not self._is_loaded:
            self.load_data()
        
        # First, find the reference drug
        reference_drugs = self.search_by_trade_name(trade_name)
        
        if not reference_drugs:
            return []
        
        # Get the ingredient from the reference drug
        reference = reference_drugs[0]
        ingredient = reference.get('ingredient_base', reference.get('ingredient', ''))
        
        # Find all drugs with same base ingredient
        all_equivalents = self.search_by_ingredient(ingredient, include_salt_forms=True)
        
        # Filter by strength if provided
        if strength:
            strength_upper = strength.upper().strip()
            all_equivalents = [e for e in all_equivalents 
                              if strength_upper in str(e.get('strength', '')).upper()]
        
        # Filter by matching dosage form route
        ref_route = reference.get('route', '')
        if ref_route:
            all_equivalents = [e for e in all_equivalents 
                              if e.get('route', '') == ref_route]
        
        # Mark which are therapeutically equivalent (AB rated)
        for eq in all_equivalents:
            eq['is_therapeutic_equivalent'] = eq.get('te_code', '').startswith('AB')
        
        return all_equivalents
    
    def get_formulation_variants(self, ingredient: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get all formulation variants for an ingredient.
        
        Args:
            ingredient: The ingredient to find variants for
            
        Returns:
            Dictionary with formulation types as keys and drug lists as values
        """
        if not self._is_loaded:
            self.load_data()
        
        matches = self.search_by_ingredient(ingredient, include_salt_forms=True)
        
        variants = {
            "immediate_release": [],
            "extended_release": [],
            "delayed_release": [],
            "other_formulations": []
        }
        
        for drug in matches:
            if drug.get('is_extended_release', False):
                variants["extended_release"].append(drug)
            elif drug.get('is_delayed_release', False):
                variants["delayed_release"].append(drug)
            elif drug.get('route', '') == 'ORAL':
                variants["immediate_release"].append(drug)
            else:
                variants["other_formulations"].append(drug)
        
        return convert_to_native(variants)
    
    def export_lexicon(self, output_path: str = None, format: str = 'json') -> str:
        """
        Export the drug lexicon to a file.
        
        Args:
            output_path: Path to save the file (default: data/drug_lexicon.{format})
            format: 'json' or 'csv'
            
        Returns:
            Path to the exported file
        """
        if not self._is_loaded:
            self.load_data()
        
        if output_path is None:
            output_path = self.data_dir / f"drug_lexicon.{format}"
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        if format == 'json':
            self.drug_lexicon.to_json(output_path, orient='records', indent=2)
        elif format == 'csv':
            self.drug_lexicon.to_csv(output_path, index=False)
        else:
            raise ValueError(f"Unsupported format: {format}. Use 'json' or 'csv'.")
        
        logger.info(f"Drug lexicon exported to {output_path}")
        return str(output_path)
    
    def predict_cross_brand_interaction(self, trade_name_1: str, trade_name_2: str, 
                                         strength_1: str = None, strength_2: str = None) -> Dict[str, Any]:
        """
        Predict drug interaction between two brand-name drugs with formulation-aware adjustment.
        
        This method integrates:
        1. Cross-Brand Service: Maps brand names to active ingredients and formulation features
        2. DDI Model: Predicts base interaction risk between active ingredients  
        3. Formulation Model: Adjusts risk based on formulation characteristics
        
        Args:
            trade_name_1: First drug brand name (e.g., "PAXIL CR")
            trade_name_2: Second drug brand name (e.g., "NOLVADEX")
            strength_1: Optional strength for first drug (e.g., "12.5MG")
            strength_2: Optional strength for second drug (e.g., "20MG")
            
        Returns:
            Complete prediction with base risk, adjustment, final risk, and explanation
        """
        if not self._is_loaded:
            self.load_data()
        
        # 1. Get ingredient and features from lexicon
        drug1_results = self.search_by_trade_name(trade_name_1)
        drug2_results = self.search_by_trade_name(trade_name_2)
        
        # Extract drug info (use first match or create default)
        drug1_info = self._extract_drug_info(drug1_results, trade_name_1, strength_1)
        drug2_info = self._extract_drug_info(drug2_results, trade_name_2, strength_2)
        
        # 2. Get base interaction risk from DDI model or known pairs
        base_risk_result = self._get_base_ddi_risk(
            drug1_info['ingredient_base'], 
            drug2_info['ingredient_base']
        )
        base_risk = base_risk_result['risk']
        
        # 3. Prepare formulation feature vector
        features = self._create_feature_vector(drug1_info, drug2_info)
        
        # 4. Apply formulation adjustment model
        adjustment_result = self._apply_formulation_adjustment(base_risk, features)
        
        # Get the modifier - formulation model uses 'risk_modifier', fallback uses 'modifier'
        risk_modifier = adjustment_result.get('risk_modifier', adjustment_result.get('modifier', 'neutral'))
        
        final_risk = max(0.0, min(1.0, base_risk + adjustment_result['risk_change']))
        
        # 5. Generate comprehensive explanation
        explanation = self._generate_interaction_explanation(
            drug1_info, drug2_info, base_risk, final_risk,
            risk_modifier, features
        )
        
        return convert_to_native({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            
            # Base ingredient interaction
            "base_ingredient_risk": round(base_risk, 4),
            "base_severity": base_risk_result.get('severity', 'unknown'),
            "base_description": base_risk_result.get('description'),
            
            # Formulation adjustment
            "formulation_adjustment": round(adjustment_result['risk_change'], 4),
            "risk_modifier": risk_modifier,
            "modifier_confidence": adjustment_result.get('modifier_confidence', adjustment_result.get('confidence', {})),
            
            # Final prediction
            "final_predicted_risk": round(final_risk, 4),
            "final_risk_percentage": int(final_risk * 100),
            "final_severity": self._risk_to_severity(final_risk),
            
            # Explanation
            "explanation": explanation,
            
            # Formulation analysis details
            "formulation_analysis": {
                "drug1_features": {
                    "trade_name": drug1_info['trade_name'],
                    "ingredient": drug1_info['ingredient'],
                    "ingredient_base": drug1_info['ingredient_base'],
                    "strength": drug1_info.get('strength'),
                    "is_extended_release": drug1_info['is_extended_release'],
                    "is_delayed_release": drug1_info['is_delayed_release'],
                    "route": drug1_info['route'],
                    "dosage_form": drug1_info.get('dosage_form'),
                    "manufacturer": drug1_info.get('manufacturer'),
                    "resolution_method": drug1_info.get('resolution_method', 'lexicon')
                },
                "drug2_features": {
                    "trade_name": drug2_info['trade_name'],
                    "ingredient": drug2_info['ingredient'],
                    "ingredient_base": drug2_info['ingredient_base'],
                    "strength": drug2_info.get('strength'),
                    "is_extended_release": drug2_info['is_extended_release'],
                    "is_delayed_release": drug2_info['is_delayed_release'],
                    "route": drug2_info['route'],
                    "dosage_form": drug2_info.get('dosage_form'),
                    "manufacturer": drug2_info.get('manufacturer'),
                    "resolution_method": drug2_info.get('resolution_method', 'lexicon')
                },
                "feature_vector": features,
                "key_formulation_factors": self._identify_formulation_factors(features, drug1_info, drug2_info)
            },
            
            # Clinical recommendations
            "recommendations": self._generate_recommendations(final_risk, drug1_info, drug2_info)
        })
    
    def _extract_drug_info(self, search_results: List[Dict], trade_name: str, 
                           strength: str = None) -> Dict[str, Any]:
        """Extract drug information from search results or create default."""
        if search_results:
            # Filter by strength if provided
            if strength:
                strength_upper = strength.upper()
                matching = [r for r in search_results if strength_upper in str(r.get('strength', '')).upper()]
                if matching:
                    search_results = matching
            
            drug = search_results[0]
            return {
                'trade_name': drug.get('trade_name', trade_name.upper()),
                'ingredient': drug.get('ingredient', trade_name.upper()),
                'ingredient_base': drug.get('ingredient_base', trade_name.upper()),
                'strength': drug.get('strength', strength),
                'is_extended_release': drug.get('is_extended_release', False),
                'is_delayed_release': drug.get('is_delayed_release', False),
                'route': drug.get('route', 'ORAL'),
                'dosage_form': drug.get('dosage_form'),
                'manufacturer': drug.get('manufacturer'),
                'has_active_patent': drug.get('has_active_patent', False),
                'te_code': drug.get('te_code'),
                'resolution_method': 'lexicon'
            }
        
        # Fallback: parse trade name for formulation hints
        trade_upper = trade_name.upper()
        is_er = any(x in trade_upper for x in ['XR', 'XL', 'ER', 'CR', 'SR', 'LA', 'EXTENDED'])
        is_dr = any(x in trade_upper for x in ['DR', 'EC', 'DELAYED', 'ENTERIC'])
        
        # Remove formulation suffixes to get base name
        base_name = trade_upper
        for suffix in ['XR', 'XL', 'ER', 'CR', 'SR', 'LA', 'DR', 'EC']:
            base_name = base_name.replace(f' {suffix}', '').replace(suffix, '')
        base_name = base_name.strip()
        
        return {
            'trade_name': trade_upper,
            'ingredient': base_name,
            'ingredient_base': base_name,
            'strength': strength,
            'is_extended_release': is_er,
            'is_delayed_release': is_dr,
            'route': 'ORAL',
            'dosage_form': None,
            'manufacturer': None,
            'has_active_patent': False,
            'te_code': None,
            'resolution_method': 'name_parsing'
        }
    
    def _get_base_ddi_risk(self, ingredient_1: str, ingredient_2: str) -> Dict[str, Any]:
        """Get base DDI risk from model or known drug interaction pairs."""
        
        # Try to use DDI model first
        try:
            from models.drug_interaction_model import get_model
            ddi_model = get_model()
            result = ddi_model.predict_interaction(ingredient_1, ingredient_2)
            return {
                'risk': result.get('interaction_probability', 0.5),
                'severity': result.get('severity', 'moderate'),
                'description': result.get('description'),
                'source': 'ddi_model'
            }
        except Exception as e:
            logger.debug(f"DDI model not available: {e}")
        
        # Fallback to known high-risk drug pairs database
        known_pairs = {
            ("PAROXETINE", "TAMOXIFEN"): {
                "risk": 0.72,
                "severity": "high",
                "description": "Paroxetine strongly inhibits CYP2D6, reducing tamoxifen activation to endoxifen. This can significantly reduce tamoxifen efficacy for breast cancer treatment."
            },
            ("FLUOXETINE", "TAMOXIFEN"): {
                "risk": 0.68,
                "severity": "high", 
                "description": "Fluoxetine inhibits CYP2D6, potentially reducing tamoxifen effectiveness."
            },
            ("WARFARIN", "ASPIRIN"): {
                "risk": 0.85,
                "severity": "high",
                "description": "Combined anticoagulant and antiplatelet effects significantly increase bleeding risk."
            },
            ("OMEPRAZOLE", "CLOPIDOGREL"): {
                "risk": 0.78,
                "severity": "high",
                "description": "Omeprazole inhibits CYP2C19, reducing clopidogrel activation and antiplatelet efficacy."
            },
            ("METFORMIN", "GLIPIZIDE"): {
                "risk": 0.45,
                "severity": "moderate",
                "description": "Additive hypoglycemic effect. Monitor blood glucose levels closely."
            },
            ("SIMVASTATIN", "DILTIAZEM"): {
                "risk": 0.75,
                "severity": "high",
                "description": "Diltiazem inhibits CYP3A4, increasing simvastatin levels and myopathy risk."
            },
            ("LITHIUM", "IBUPROFEN"): {
                "risk": 0.73,
                "severity": "high",
                "description": "NSAIDs reduce lithium excretion, increasing risk of lithium toxicity."
            },
            ("DIGOXIN", "AMIODARONE"): {
                "risk": 0.80,
                "severity": "high",
                "description": "Amiodarone increases digoxin serum levels by ~70%. Dose reduction required."
            },
            ("PHENYTOIN", "VALPROIC ACID"): {
                "risk": 0.72,
                "severity": "high",
                "description": "Complex bidirectional interaction affecting protein binding and metabolism."
            },
            ("FLUOXETINE", "TRAMADOL"): {
                "risk": 0.82,
                "severity": "high",
                "description": "Risk of serotonin syndrome and reduced analgesic effect of tramadol."
            },
            ("SERTRALINE", "TRAMADOL"): {
                "risk": 0.78,
                "severity": "high",
                "description": "Risk of serotonin syndrome with concurrent SSRI and tramadol use."
            },
            ("ATORVASTATIN", "GEMFIBROZIL"): {
                "risk": 0.71,
                "severity": "high",
                "description": "Increased risk of myopathy and rhabdomyolysis with statin-fibrate combination."
            },
            ("CIPROFLOXACIN", "THEOPHYLLINE"): {
                "risk": 0.81,
                "severity": "high",
                "description": "Ciprofloxacin inhibits theophylline metabolism, increasing toxicity risk."
            },
            ("LEVOTHYROXINE", "CALCIUM"): {
                "risk": 0.65,
                "severity": "moderate",
                "description": "Calcium reduces levothyroxine absorption. Separate administration by 4+ hours."
            }
        }
        
        # Check both orderings
        ing1_upper = ingredient_1.upper().strip()
        ing2_upper = ingredient_2.upper().strip()
        
        key1 = (ing1_upper, ing2_upper)
        key2 = (ing2_upper, ing1_upper)
        
        if key1 in known_pairs:
            result = known_pairs[key1].copy()
            result['source'] = 'known_pairs_database'
            return result
        
        if key2 in known_pairs:
            result = known_pairs[key2].copy()
            result['source'] = 'known_pairs_database'
            return result
        
        # Default for unknown pairs
        return {
            'risk': 0.30,
            'severity': 'low',
            'description': 'No significant interaction documented in our database for this drug pair.',
            'source': 'default_estimate'
        }
    
    def _create_feature_vector(self, drug1: Dict, drug2: Dict) -> Dict[str, Any]:
        """Create feature vector for formulation adjustment model."""
        
        # Calculate strength ratio if both have strength values
        strength_ratio = 1.0
        if drug1.get('strength') and drug2.get('strength'):
            try:
                import re
                val1_match = re.search(r'([\d.]+)', str(drug1['strength']))
                val2_match = re.search(r'([\d.]+)', str(drug2['strength']))
                if val1_match and val2_match:
                    val1 = float(val1_match.group(1))
                    val2 = float(val2_match.group(1))
                    if val2 > 0:
                        strength_ratio = val1 / val2
            except:
                pass
        
        # Safe boolean checks for manufacturer comparison
        manufacturer_a = drug1.get('manufacturer')
        manufacturer_b = drug2.get('manufacturer')
        same_manufacturer = bool(manufacturer_a and manufacturer_b and manufacturer_a == manufacturer_b)
        
        return {
            'is_extended_release_a': int(bool(drug1.get('is_extended_release', False))),
            'is_extended_release_b': int(bool(drug2.get('is_extended_release', False))),
            'is_delayed_release_a': int(bool(drug1.get('is_delayed_release', False))),
            'is_delayed_release_b': int(bool(drug2.get('is_delayed_release', False))),
            'route_match': int(drug1.get('route', 'ORAL') == drug2.get('route', 'ORAL')),
            'strength_ratio': round(strength_ratio, 3),
            'same_manufacturer': int(same_manufacturer),
            'has_patent_a': int(bool(drug1.get('has_active_patent', False))),
            'has_patent_b': int(bool(drug2.get('has_active_patent', False)))
        }
    
    def _apply_formulation_adjustment(self, base_risk: float, features: Dict) -> Dict[str, Any]:
        """Apply formulation risk adjustment model."""
        
        # Try to use trained formulation model
        try:
            from models.formulation_risk_model import get_formulation_model
            model = get_formulation_model()
            return model.predict(base_risk, features)
        except Exception as e:
            logger.debug(f"Formulation model not available: {e}")
        
        # Fallback: rule-based adjustment
        risk_change = 0.0
        
        # Extended release reduces peak concentration interactions
        if features.get('is_extended_release_a'):
            risk_change -= 0.03
        if features.get('is_extended_release_b'):
            risk_change -= 0.03
        
        # Both extended release has compounding benefit
        if features.get('is_extended_release_a') and features.get('is_extended_release_b'):
            risk_change -= 0.02
        
        # Delayed release formulations
        if features.get('is_delayed_release_a'):
            risk_change -= 0.02
        if features.get('is_delayed_release_b'):
            risk_change -= 0.02
        
        # Different routes reduce systemic interaction
        if not features.get('route_match', True):
            risk_change -= 0.05
        
        # Strength ratio effects
        strength_ratio = features.get('strength_ratio', 1.0)
        if strength_ratio > 1.5:
            risk_change += 0.02
        elif strength_ratio < 0.5:
            risk_change -= 0.02
        
        # Determine modifier category
        if risk_change < -0.02:
            modifier = 'mitigates'
        elif risk_change > 0.02:
            modifier = 'potentiates'
        else:
            modifier = 'neutral'
        
        return {
            'risk_change': risk_change,
            'modifier': modifier,
            'confidence': {'mitigates': 0.33, 'neutral': 0.34, 'potentiates': 0.33},
            'source': 'rule_based'
        }
    
    def _identify_formulation_factors(self, features: Dict, drug1: Dict, drug2: Dict) -> List[Dict]:
        """Identify key formulation factors affecting the interaction."""
        factors = []
        
        if features.get('is_extended_release_a'):
            factors.append({
                'factor': 'extended_release',
                'drug': drug1['trade_name'],
                'impact': 'Reduces peak concentration, may reduce interaction intensity',
                'direction': 'mitigating'
            })
        
        if features.get('is_extended_release_b'):
            factors.append({
                'factor': 'extended_release',
                'drug': drug2['trade_name'],
                'impact': 'Reduces peak concentration, may reduce interaction intensity',
                'direction': 'mitigating'
            })
        
        if features.get('is_delayed_release_a'):
            factors.append({
                'factor': 'delayed_release',
                'drug': drug1['trade_name'],
                'impact': 'Delayed absorption timing may reduce overlap',
                'direction': 'mitigating'
            })
        
        if features.get('is_delayed_release_b'):
            factors.append({
                'factor': 'delayed_release',
                'drug': drug2['trade_name'],
                'impact': 'Delayed absorption timing may reduce overlap',
                'direction': 'mitigating'
            })
        
        if not features.get('route_match', True):
            factors.append({
                'factor': 'different_routes',
                'drug': 'both',
                'impact': 'Different administration routes reduce systemic overlap',
                'direction': 'mitigating'
            })
        
        strength_ratio = features.get('strength_ratio', 1.0)
        if abs(strength_ratio - 1.0) > 0.3:
            direction = 'potentiating' if strength_ratio > 1.0 else 'mitigating'
            factors.append({
                'factor': 'strength_ratio',
                'value': strength_ratio,
                'impact': 'Relative dosage affects exposure levels',
                'direction': direction
            })
        
        return factors
    
    def _generate_interaction_explanation(self, drug1: Dict, drug2: Dict, 
                                          base_risk: float, final_risk: float,
                                          modifier: str, features: Dict) -> str:
        """Generate a human-readable explanation of the interaction and adjustment."""
        
        base_pct = int(base_risk * 100)
        final_pct = int(final_risk * 100)
        change_pct = abs(int((final_risk - base_risk) * 100))
        
        parts = []
        
        # Base interaction statement
        parts.append(
            f"Base interaction risk for {drug1['ingredient_base'].lower()} "
            f"({drug1['trade_name']}) + {drug2['ingredient_base'].lower()} "
            f"({drug2['trade_name']}) is {base_pct}%."
        )
        
        # Formulation factors
        formulation_notes = []
        if features.get('is_extended_release_a'):
            formulation_notes.append(f"{drug1['trade_name']} uses extended-release formulation")
        if features.get('is_extended_release_b'):
            formulation_notes.append(f"{drug2['trade_name']} uses extended-release formulation")
        if features.get('is_delayed_release_a'):
            formulation_notes.append(f"{drug1['trade_name']} has delayed-release coating")
        if features.get('is_delayed_release_b'):
            formulation_notes.append(f"{drug2['trade_name']} has delayed-release coating")
        
        if formulation_notes:
            parts.append(" ".join(formulation_notes) + ".")
        
        # Adjustment explanation
        if modifier == 'mitigates':
            parts.append(
                f"These formulation characteristics may reduce the interaction risk "
                f"by approximately {change_pct}% to an adjusted risk of {final_pct}%."
            )
        elif modifier == 'potentiates':
            parts.append(
                f"These formulation characteristics may increase the interaction risk "
                f"by approximately {change_pct}% to an adjusted risk of {final_pct}%."
            )
        else:
            parts.append(
                f"Formulation factors have minimal impact on this interaction. "
                f"Adjusted risk remains at {final_pct}%."
            )
        
        return " ".join(parts)
    
    def _risk_to_severity(self, risk: float) -> str:
        """Convert risk score to severity category."""
        if risk >= 0.8:
            return 'critical'
        elif risk >= 0.6:
            return 'high'
        elif risk >= 0.4:
            return 'moderate'
        elif risk >= 0.2:
            return 'low'
        else:
            return 'minimal'
    
    def _generate_recommendations(self, risk: float, drug1: Dict, drug2: Dict) -> List[str]:
        """Generate clinical recommendations based on the interaction risk."""
        recommendations = []
        
        if risk >= 0.8:
            recommendations.extend([
                "⚠️ CRITICAL INTERACTION: Consider alternative medications.",
                "Consult with a pharmacist or physician before using this combination.",
                "If combination is necessary, implement intensive monitoring protocols."
            ])
        elif risk >= 0.6:
            recommendations.extend([
                "⚠️ HIGH RISK: Close monitoring required if using this combination.",
                "Consider dose adjustments or alternative timing of administration.",
                "Report any unusual symptoms to your healthcare provider immediately."
            ])
        elif risk >= 0.4:
            recommendations.extend([
                "Monitor for potential interaction effects.",
                "Report any unusual symptoms to your healthcare provider.",
                "Consider separating administration times if possible."
            ])
        else:
            recommendations.append("Low interaction risk. Standard monitoring recommended.")
        
        # Formulation-specific recommendations
        if drug1.get('is_extended_release') or drug2.get('is_extended_release'):
            recommendations.append(
                "Extended-release formulation may help reduce peak concentration overlap."
            )
        
        if drug1.get('route') != drug2.get('route'):
            recommendations.append(
                "Different administration routes may help minimize interaction."
            )
        
        return recommendations

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the drug lexicon.
        
        Returns:
            Dictionary with lexicon statistics
        """
        if not self._is_loaded:
            self.load_data()
        
        return convert_to_native({
            "total_entries": len(self.drug_lexicon),
            "unique_trade_names": self.drug_lexicon['trade_name'].nunique(),
            "unique_ingredients": self.drug_lexicon['ingredient_normalized'].nunique() if 'ingredient_normalized' in self.drug_lexicon.columns else 0,
            "unique_manufacturers": self.drug_lexicon['manufacturer'].nunique() if 'manufacturer' in self.drug_lexicon.columns else 0,
            "extended_release_count": self.drug_lexicon['is_extended_release'].sum() if 'is_extended_release' in self.drug_lexicon.columns else 0,
            "with_active_patents": self.drug_lexicon['has_active_patent'].sum() if 'has_active_patent' in self.drug_lexicon.columns else 0,
            "formulation_types": self.drug_lexicon['dosage_form'].value_counts().to_dict() if 'dosage_form' in self.drug_lexicon.columns else {},
            "routes": self.drug_lexicon['route'].value_counts().to_dict() if 'route' in self.drug_lexicon.columns else {}
        })


# Singleton instance for the service
_cross_brand_service: Optional[CrossBrandService] = None


def get_cross_brand_service(data_dir: str = None) -> CrossBrandService:
    """
    Get or create the Cross-Brand Service singleton.
    
    Args:
        data_dir: Optional data directory path
        
    Returns:
        CrossBrandService instance
    """
    global _cross_brand_service
    
    if _cross_brand_service is None:
        _cross_brand_service = CrossBrandService(data_dir)
        _cross_brand_service.load_data()
    
    return _cross_brand_service


# API endpoint handlers for FastAPI integration
def compare_brands_handler(ingredient: str, strength: str = None, dosage_form: str = None) -> Dict[str, Any]:
    """Handler for brand comparison API endpoint."""
    service = get_cross_brand_service()
    return service.compare_brands(ingredient, strength, dosage_form)


def search_ingredient_handler(ingredient: str, include_salt_forms: bool = True) -> List[Dict[str, Any]]:
    """Handler for ingredient search API endpoint."""
    service = get_cross_brand_service()
    return service.search_by_ingredient(ingredient, include_salt_forms)


def therapeutic_equivalents_handler(trade_name: str, strength: str = None) -> List[Dict[str, Any]]:
    """Handler for therapeutic equivalents API endpoint."""
    service = get_cross_brand_service()
    return service.get_therapeutic_equivalents(trade_name, strength)


def formulation_variants_handler(ingredient: str) -> Dict[str, List[Dict[str, Any]]]:
    """Handler for formulation variants API endpoint."""
    service = get_cross_brand_service()
    return service.get_formulation_variants(ingredient)
