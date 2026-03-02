"""
Treatment Identifier – Step 2: Data Extraction & Preprocessing
================================================================
Extracts and transforms raw datasets into a structured knowledge base
that maps medications to treatments/conditions/indications.

Pipeline:
  1. Extract drug therapeutic classes from MID.xlsx
  2. Build medication → condition/treatment mapping (curated knowledge base)
  3. Build drug suffix patterns → condition mapping
  4. Extract treatment context from DrugBank interaction descriptions
  5. Generate treatment_knowledge_base.json

Input:
  artifacts/MID.xlsx
  artifacts/Drug to Food interactions Dataset.json
  artifacts/db_drug_interactions.csv
  artifacts/drug_search_index.json

Output:
  artifacts/treatment_knowledge_base.json    – Drug → condition/treatment mappings
  artifacts/drug_suffix_patterns.json        – Suffix-based condition inference
  data/treatment_training_data.csv           – Training data for classifier

Usage:
  python -m treatment_identifier.extract_data
"""

import re
import csv
import json
import pandas as pd
import numpy as np
from pathlib import Path
from collections import defaultdict

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# ── Console Helpers ──────────────────────────────────────────────
class C:
    RESET = "\033[0m"; BOLD = "\033[1m"; DIM = "\033[2m"
    GREEN = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"
    CYAN = "\033[96m"; WHITE = "\033[97m"; BLUE = "\033[94m"

def ok(msg):   print(f"  {C.GREEN}✔{C.RESET}  {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def fail(msg): print(f"  {C.RED}✖{C.RESET}  {msg}")
def step(n, total, msg): print(f"\n  {C.BOLD}{C.BLUE}[{n}/{total}]{C.RESET} {C.WHITE}{msg}{C.RESET}")


def banner():
    print(f"""
{C.CYAN}╔══════════════════════════════════════════════════════════════╗
║{C.RESET}{C.BOLD}{C.WHITE}   TREATMENT IDENTIFIER – Data Extraction & Preprocessing    {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
""")


# ═══════════════════════════════════════════════════════════════════
# Curated Knowledge Base: Therapeutic Class → Conditions/Treatments
# ═══════════════════════════════════════════════════════════════════

# Maps normalized therapeutic class to a list of conditions being treated
THERAPEUTIC_CLASS_CONDITIONS = {
    "ANTI DIABETIC": {
        "conditions": ["Diabetes Mellitus", "Type 2 Diabetes", "Hyperglycemia"],
        "treatment_area": "Endocrine / Metabolic",
    },
    "CARDIAC": {
        "conditions": ["Hypertension", "Heart Disease", "Angina", "Arrhythmia", "Heart Failure", "Hyperlipidemia"],
        "treatment_area": "Cardiovascular",
    },
    "ANTI INFECTIVES": {
        "conditions": ["Bacterial Infection", "Infection", "Sepsis"],
        "treatment_area": "Infectious Disease",
    },
    "ANTI INFECTIVE": {
        "conditions": ["Bacterial Infection", "Infection"],
        "treatment_area": "Infectious Disease",
    },
    "PAIN ANALGESIC": {
        "conditions": ["Pain", "Inflammation", "Arthritis", "Musculoskeletal Pain"],
        "treatment_area": "Pain Management",
    },
    "PAIN ANALGESICS": {
        "conditions": ["Pain", "Inflammation", "Arthritis", "Musculoskeletal Pain"],
        "treatment_area": "Pain Management",
    },
    "NEURO CNS": {
        "conditions": ["Epilepsy", "Anxiety", "Depression", "Insomnia", "Seizure Disorder", "Neuropathic Pain"],
        "treatment_area": "Neurology / Psychiatry",
    },
    "NEURO CN": {
        "conditions": ["Anxiety", "Depression", "Insomnia", "Vertigo", "Neuropathy"],
        "treatment_area": "Neurology / Psychiatry",
    },
    "GASTRO INTESTINAL": {
        "conditions": ["Acid Reflux", "GERD", "Peptic Ulcer", "Gastritis", "Nausea", "Diarrhea"],
        "treatment_area": "Gastroenterology",
    },
    "GASTRO INTESTINA": {
        "conditions": ["Acid Reflux", "GERD", "Peptic Ulcer", "Nausea"],
        "treatment_area": "Gastroenterology",
    },
    "RESPIRATORY": {
        "conditions": ["Asthma", "Allergic Rhinitis", "COPD", "Cough", "Common Cold", "Bronchitis"],
        "treatment_area": "Respiratory",
    },
    "RESPIRATOR": {
        "conditions": ["Allergic Rhinitis", "Cough", "Common Cold", "Nasal Congestion", "Bronchitis"],
        "treatment_area": "Respiratory",
    },
    "BLOOD RELATED": {
        "conditions": ["Anemia", "Thrombosis", "Blood Clotting Disorder", "Deep Vein Thrombosis"],
        "treatment_area": "Hematology",
    },
    "BLOOD RELATE": {
        "conditions": ["Anemia", "Iron Deficiency"],
        "treatment_area": "Hematology",
    },
    "DERMA": {
        "conditions": ["Skin Infection", "Dermatitis", "Fungal Infection", "Acne", "Eczema"],
        "treatment_area": "Dermatology",
    },
    "DERM": {
        "conditions": ["Skin Infection", "Dermatitis", "Fungal Infection", "Eczema", "Psoriasis"],
        "treatment_area": "Dermatology",
    },
    "HORMONES": {
        "conditions": ["Hormonal Imbalance", "Hypothyroidism", "Adrenal Insufficiency", "Growth Disorder"],
        "treatment_area": "Endocrinology",
    },
    "HORMONE": {
        "conditions": ["Hormonal Imbalance", "Inflammation", "Osteoporosis"],
        "treatment_area": "Endocrinology",
    },
    "GYNAECOLOGICAL": {
        "conditions": ["Gynecological Infection", "Hormonal Irregularity", "PCOS", "Menstrual Disorder"],
        "treatment_area": "Gynecology",
    },
    "GYNAECOLOGICA": {
        "conditions": ["Vaginal Infection", "Hormonal Irregularity"],
        "treatment_area": "Gynecology",
    },
    "OPHTHAL": {
        "conditions": ["Eye Infection", "Glaucoma", "Conjunctivitis", "Dry Eye"],
        "treatment_area": "Ophthalmology",
    },
    "OPHTHA": {
        "conditions": ["Eye Infection", "Conjunctivitis", "Dry Eye"],
        "treatment_area": "Ophthalmology",
    },
    "OPHTHAL OTOLOGICALS": {
        "conditions": ["Eye Infection", "Ear Infection", "Conjunctivitis", "Otitis"],
        "treatment_area": "Ophthalmology / ENT",
    },
    "OPHTHAL OTOLOGICAL": {
        "conditions": ["Eye Infection", "Ear Infection"],
        "treatment_area": "Ophthalmology / ENT",
    },
    "ANTI NEOPLASTIC": {
        "conditions": ["Cancer", "Prostate Cancer", "Breast Cancer", "Malignant Tumor"],
        "treatment_area": "Oncology",
    },
    "ANTI NEOPLASTICS": {
        "conditions": ["Cancer", "Malignant Tumor", "Leukemia"],
        "treatment_area": "Oncology",
    },
    "ANTI MALARIALS": {
        "conditions": ["Malaria"],
        "treatment_area": "Infectious Disease",
    },
    "STOMATOLOGICALS": {
        "conditions": ["Oral Ulcer", "Mouth Infection", "Dental Pain"],
        "treatment_area": "Dentistry",
    },
    "STOMATOLOGICAL": {
        "conditions": ["Oral Ulcer", "Mouth Infection"],
        "treatment_area": "Dentistry",
    },
    "UROLOGY": {
        "conditions": ["Benign Prostatic Hyperplasia", "Urinary Tract Disorder"],
        "treatment_area": "Urology",
    },
    "VITAMINS MINERALS NUTRIENT": {
        "conditions": ["Nutritional Deficiency", "Vitamin Deficiency", "Mineral Deficiency"],
        "treatment_area": "Nutrition",
    },
    "VITAMINS MINERALS NUTRIENTS": {
        "conditions": ["Nutritional Deficiency", "Vitamin Deficiency"],
        "treatment_area": "Nutrition",
    },
    "SEX STIMULANTS REJUVENATORS": {
        "conditions": ["Erectile Dysfunction", "Pulmonary Arterial Hypertension"],
        "treatment_area": "Urology / Cardiology",
    },
    "SEX STIMULANTS REJUVENATOR": {
        "conditions": ["Erectile Dysfunction"],
        "treatment_area": "Urology",
    },
    "VACCINE": {
        "conditions": ["Vaccination / Immunization"],
        "treatment_area": "Preventive Medicine",
    },
    "VACCINES": {
        "conditions": ["Vaccination / Immunization"],
        "treatment_area": "Preventive Medicine",
    },
    "OTOLOGICAL": {
        "conditions": ["Ear Infection", "Ear Pain", "Otitis"],
        "treatment_area": "ENT",
    },
    "OTHERS": {
        "conditions": ["Weight Management", "Obesity"],
        "treatment_area": "General Medicine",
    },
}

# Curated generic drug → specific indications (high-confidence mappings)
GENERIC_DRUG_INDICATIONS = {
    # Diabetes
    "metformin": ["Type 2 Diabetes", "Insulin Resistance", "PCOS"],
    "glimepiride": ["Type 2 Diabetes"],
    "insulin": ["Diabetes Mellitus", "Type 1 Diabetes", "Type 2 Diabetes"],
    "sitagliptin": ["Type 2 Diabetes"],
    "vildagliptin": ["Type 2 Diabetes"],
    "dapagliflozin": ["Type 2 Diabetes", "Heart Failure"],
    "teneligliptin": ["Type 2 Diabetes"],
    "gliclazide": ["Type 2 Diabetes"],
    "pioglitazone": ["Type 2 Diabetes"],
    "remogliflozin etabonate": ["Type 2 Diabetes"],
    "imeglimin": ["Type 2 Diabetes"],
    # Cardiovascular
    "atorvastatin": ["Hyperlipidemia", "High Cholesterol", "Cardiovascular Prevention"],
    "rosuvastatin": ["Hyperlipidemia", "High Cholesterol"],
    "simvastatin": ["Hyperlipidemia", "High Cholesterol"],
    "amlodipine": ["Hypertension", "Angina"],
    "telmisartan": ["Hypertension"],
    "losartan": ["Hypertension", "Diabetic Nephropathy"],
    "lisinopril": ["Hypertension", "Heart Failure"],
    "ramipril": ["Hypertension", "Heart Failure", "Post-MI"],
    "metoprolol": ["Hypertension", "Angina", "Heart Failure", "Arrhythmia"],
    "atenolol": ["Hypertension", "Angina"],
    "propranolol": ["Hypertension", "Migraine Prevention", "Anxiety"],
    "digoxin": ["Heart Failure", "Atrial Fibrillation"],
    "amiodarone": ["Arrhythmia", "Atrial Fibrillation"],
    "verapamil": ["Hypertension", "Angina", "Arrhythmia"],
    "diltiazem": ["Hypertension", "Angina"],
    "nicorandil": ["Angina"],
    "sacubitril": ["Heart Failure"],
    "azilsartan medoxomil": ["Hypertension"],
    "bisoprolol": ["Hypertension", "Heart Failure"],
    "cilostazol": ["Peripheral Vascular Disease", "Intermittent Claudication"],
    "ezetimibe": ["Hyperlipidemia"],
    "torasemide": ["Edema", "Heart Failure"],
    "azelnidipine": ["Hypertension"],
    "selexipag": ["Pulmonary Arterial Hypertension"],
    # Pain / Anti-inflammatory
    "paracetamol": ["Pain", "Fever"],
    "acetaminophen": ["Pain", "Fever"],
    "ibuprofen": ["Pain", "Inflammation", "Fever"],
    "diclofenac": ["Pain", "Inflammation", "Arthritis"],
    "aceclofenac": ["Pain", "Osteoarthritis", "Rheumatoid Arthritis"],
    "naproxen": ["Pain", "Inflammation", "Migraine"],
    "nimesulide": ["Pain", "Inflammation"],
    "celecoxib": ["Osteoarthritis", "Rheumatoid Arthritis"],
    "etoricoxib": ["Osteoarthritis", "Rheumatoid Arthritis", "Gout"],
    "tramadol": ["Moderate-to-Severe Pain"],
    "morphine": ["Severe Pain"],
    "buprenorphine": ["Chronic Pain", "Opioid Dependence"],
    "colchicine": ["Gout"],
    "allopurinol": ["Gout", "Hyperuricemia"],
    "febuxostat": ["Gout", "Hyperuricemia"],
    "mefenamic acid": ["Pain", "Dysmenorrhea"],
    "iguratimod": ["Rheumatoid Arthritis"],
    "thiocolchicoside": ["Muscle Spasm", "Back Pain"],
    "chlorzoxazone": ["Muscle Spasm"],
    # Anti-infective
    "amoxycillin": ["Bacterial Infection", "Upper Respiratory Infection", "UTI"],
    "azithromycin": ["Bacterial Infection", "Respiratory Infection", "STI"],
    "ciprofloxacin": ["UTI", "Bacterial Infection", "Respiratory Infection"],
    "ofloxacin": ["UTI", "Bacterial Infection", "Eye Infection"],
    "cefixime": ["Bacterial Infection", "UTI", "Respiratory Infection"],
    "cefuroxime": ["Bacterial Infection", "Sinusitis", "UTI"],
    "cefpodoxime proxetil": ["Bacterial Infection", "Respiratory Infection"],
    "ceftriaxone": ["Severe Bacterial Infection", "Meningitis"],
    "cefoperazone": ["Severe Bacterial Infection"],
    "ceftazidime": ["Severe Bacterial Infection", "Hospital-Acquired Infection"],
    "levofloxacin": ["Bacterial Infection", "Pneumonia", "UTI"],
    "clarithromycin": ["H. Pylori Infection", "Respiratory Infection"],
    "metronidazole": ["Anaerobic Infection", "Amoebiasis", "H. Pylori"],
    "linezolid": ["MRSA Infection", "Severe Bacterial Infection"],
    "meropenem": ["Severe Bacterial Infection", "Sepsis"],
    "piperacillin": ["Severe Bacterial Infection", "Hospital-Acquired Infection"],
    "rifaximin": ["Hepatic Encephalopathy", "Traveler's Diarrhea", "IBS"],
    "albendazole": ["Helminth Infection", "Worm Infestation"],
    "fluconazole": ["Fungal Infection", "Candidiasis"],
    "itraconazole": ["Fungal Infection", "Onychomycosis"],
    "terbinafine": ["Fungal Infection", "Onychomycosis"],
    "acyclovir": ["Herpes Simplex", "Varicella Zoster", "Viral Infection"],
    "valacyclovir": ["Herpes Simplex", "Herpes Zoster"],
    "clotrimazole": ["Fungal Skin Infection", "Candidiasis"],
    "griseofulvin": ["Dermatophyte Infection"],
    "artesunate": ["Malaria"],
    "gentamicin": ["Bacterial Infection", "Eye Infection", "Ear Infection"],
    "diethylcarbamazine": ["Filariasis", "Lymphatic Filariasis"],
    "tigecycline": ["Complicated Skin Infection", "Intra-Abdominal Infection"],
    "praziquantel": ["Schistosomiasis", "Tapeworm Infection"],
    "garenoxacin": ["Bacterial Infection", "Respiratory Infection"],
    "faropenem": ["Bacterial Infection"],
    # Neuro / CNS
    "carbamazepine": ["Epilepsy", "Trigeminal Neuralgia", "Bipolar Disorder"],
    "oxcarbazepine": ["Epilepsy", "Seizure Disorder"],
    "zonisamide": ["Epilepsy"],
    "sertraline": ["Depression", "Anxiety", "OCD", "PTSD"],
    "escitalopram oxalate": ["Depression", "Generalized Anxiety Disorder"],
    "paroxetine": ["Depression", "Anxiety", "Panic Disorder", "OCD"],
    "fluoxetine": ["Depression", "OCD", "Bulimia Nervosa"],
    "desvenlafaxine": ["Major Depressive Disorder"],
    "bupropion": ["Depression", "Smoking Cessation"],
    "clonazepam": ["Epilepsy", "Panic Disorder", "Anxiety"],
    "alprazolam": ["Anxiety", "Panic Disorder"],
    "lorazepam": ["Anxiety", "Insomnia", "Seizure"],
    "diazepam": ["Anxiety", "Muscle Spasm", "Seizure"],
    "zolpidem": ["Insomnia"],
    "zopiclone": ["Insomnia"],
    "melatonin": ["Insomnia", "Sleep Disorder"],
    "risperidone": ["Schizophrenia", "Bipolar Disorder"],
    "clozapine": ["Schizophrenia"],
    "ziprasidone": ["Schizophrenia", "Bipolar Disorder"],
    "flunarizine": ["Migraine Prevention", "Vertigo"],
    "betahistine": ["Vertigo", "Ménière's Disease"],
    "zolmitriptan": ["Migraine"],
    "cinnarizine": ["Vertigo", "Motion Sickness"],
    "safinamide": ["Parkinson's Disease"],
    # GI
    "pantoprazole": ["GERD", "Peptic Ulcer", "Acid Reflux"],
    "omeprazole": ["GERD", "Peptic Ulcer"],
    "rabeprazole": ["GERD", "Peptic Ulcer"],
    "esomeprazole": ["GERD", "Peptic Ulcer"],
    "ranitidine": ["GERD", "Peptic Ulcer", "Gastritis"],
    "domperidone": ["Nausea", "Gastroparesis"],
    "ondansetron": ["Nausea", "Vomiting", "Chemotherapy-Induced Nausea"],
    "racecadotril": ["Acute Diarrhea"],
    "sodium picosulfate": ["Constipation"],
    "misoprostol": ["NSAID-Induced Ulcer", "Labor Induction"],
    "levosulpiride": ["Dyspepsia", "Gastroparesis"],
    "dicyclomine": ["IBS", "Abdominal Cramp"],
    # Respiratory
    "cetirizine": ["Allergic Rhinitis", "Urticaria", "Allergy"],
    "levocetirizine": ["Allergic Rhinitis", "Urticaria"],
    "fexofenadine": ["Allergic Rhinitis", "Urticaria"],
    "chlorpheniramine maleate": ["Allergy", "Common Cold"],
    "montelukast": ["Asthma", "Allergic Rhinitis"],
    "acebrophylline": ["Asthma", "COPD"],
    "ambroxol": ["Productive Cough", "Bronchitis"],
    "bromhexine": ["Productive Cough", "Bronchitis"],
    "levocloperastine": ["Dry Cough"],
    "phenylephrine": ["Nasal Congestion", "Common Cold"],
    "xylometazoline": ["Nasal Congestion"],
    "oxymetazoline": ["Nasal Congestion"],
    "diphenhydramine": ["Allergy", "Insomnia", "Cough"],
    # Blood
    "warfarin": ["Deep Vein Thrombosis", "Pulmonary Embolism", "Atrial Fibrillation"],
    "aspirin": ["Cardiovascular Prevention", "Pain", "Fever", "Anti-Platelet Therapy"],
    "clopidogrel": ["Cardiovascular Prevention", "Anti-Platelet Therapy"],
    "heparin": ["Deep Vein Thrombosis", "Pulmonary Embolism"],
    "recombinant human erythropoietin alfa": ["Anemia", "Chronic Kidney Disease-Related Anemia"],
    "darbepoetin alfa": ["Anemia"],
    # Hormones
    "methylprednisolone": ["Inflammation", "Autoimmune Disease", "Allergic Reaction"],
    "deflazacort": ["Inflammation", "Autoimmune Disease"],
    "levothyroxine": ["Hypothyroidism"],
    "progesterone": ["Hormonal Support", "Menstrual Disorder", "Pregnancy Support"],
    "dydrogesterone": ["Progesterone Deficiency", "Menstrual Disorder"],
    "somatropin": ["Growth Hormone Deficiency"],
    "teriparatide": ["Osteoporosis"],
    "goserelin acetate": ["Prostate Cancer", "Breast Cancer", "Endometriosis"],
    # Dermatology
    "isotretinoin": ["Severe Acne"],
    "permethrin": ["Scabies", "Lice"],
    "clobetasol": ["Eczema", "Psoriasis", "Dermatitis"],
    "beclometasone": ["Eczema", "Dermatitis"],
    "salicylic acid": ["Acne", "Warts"],
    "luliconazole": ["Fungal Skin Infection"],
    "amorolfine": ["Nail Fungal Infection"],
    "ozenoxacin": ["Impetigo"],
    "fluticasone propionate": ["Eczema", "Dermatitis"],
    "miconazole": ["Fungal Skin Infection"],
    "oxiconazole": ["Fungal Skin Infection"],
    "clindamycin": ["Acne", "Bacterial Skin Infection"],
    # Ophthalmology
    "gatifloxacin": ["Bacterial Eye Infection", "Conjunctivitis"],
    "moxifloxacin": ["Bacterial Eye Infection", "Bacterial Infection"],
    "olopatadine": ["Allergic Conjunctivitis"],
    "carboxymethylcellulose": ["Dry Eye"],
    "sodium hyaluronate": ["Dry Eye"],
    "naphazoline": ["Eye Redness", "Allergic Conjunctivitis"],
    "nepafenac": ["Post-Operative Eye Inflammation"],
    "fluorometholone": ["Eye Inflammation"],
    "loteprednol etabonate": ["Eye Inflammation"],
    # Others
    "sildenafil": ["Erectile Dysfunction", "Pulmonary Arterial Hypertension"],
    "tadalafil": ["Erectile Dysfunction", "BPH"],
    "dutasteride": ["Benign Prostatic Hyperplasia"],
    "orlistat": ["Obesity", "Weight Management"],
    "azathioprine": ["Autoimmune Disease", "Organ Transplant Rejection Prevention"],
    "abiraterone acetate": ["Prostate Cancer"],
    "erlotinib": ["Non-Small Cell Lung Cancer", "Pancreatic Cancer"],
    "danazol": ["Endometriosis", "Fibrocystic Breast Disease"],
    "spironolactone": ["Edema", "Heart Failure", "Hyperaldosteronism"],
    "metolazone": ["Edema", "Heart Failure"],
    "lithium": ["Bipolar Disorder"],
    "theophylline": ["Asthma", "COPD"],
    "methotrexate": ["Rheumatoid Arthritis", "Cancer", "Psoriasis"],
}

# Drug suffix patterns → likely condition
DRUG_SUFFIX_PATTERNS = {
    r"cillin$": {"conditions": ["Bacterial Infection"], "class": "Penicillin Antibiotic"},
    r"mycin$": {"conditions": ["Bacterial Infection"], "class": "Macrolide / Aminoglycoside"},
    r"floxacin$": {"conditions": ["Bacterial Infection", "UTI"], "class": "Fluoroquinolone"},
    r"cycline$": {"conditions": ["Bacterial Infection", "Acne"], "class": "Tetracycline"},
    r"azole$": {"conditions": ["Fungal Infection"], "class": "Azole Antifungal"},
    r"statin$": {"conditions": ["Hyperlipidemia", "High Cholesterol"], "class": "Statin"},
    r"sartan$": {"conditions": ["Hypertension"], "class": "ARB"},
    r"pril$": {"conditions": ["Hypertension", "Heart Failure"], "class": "ACE Inhibitor"},
    r"olol$": {"conditions": ["Hypertension", "Angina"], "class": "Beta-Blocker"},
    r"dipine$": {"conditions": ["Hypertension", "Angina"], "class": "Calcium Channel Blocker"},
    r"prazole$": {"conditions": ["GERD", "Peptic Ulcer"], "class": "PPI"},
    r"tidine$": {"conditions": ["GERD", "Peptic Ulcer"], "class": "H2 Blocker"},
    r"gliptin$": {"conditions": ["Type 2 Diabetes"], "class": "DPP-4 Inhibitor"},
    r"gliflozin$": {"conditions": ["Type 2 Diabetes"], "class": "SGLT2 Inhibitor"},
    r"glimepiride$": {"conditions": ["Type 2 Diabetes"], "class": "Sulfonylurea"},
    r"formin$": {"conditions": ["Type 2 Diabetes"], "class": "Biguanide"},
    r"setron$": {"conditions": ["Nausea", "Vomiting"], "class": "5-HT3 Antagonist"},
    r"triptan$": {"conditions": ["Migraine"], "class": "Triptan"},
    r"pam$": {"conditions": ["Anxiety", "Insomnia", "Seizure"], "class": "Benzodiazepine"},
    r"zepine$": {"conditions": ["Epilepsy", "Bipolar Disorder"], "class": "Anticonvulsant"},
    r"barb$|barbital$": {"conditions": ["Epilepsy", "Insomnia"], "class": "Barbiturate"},
    r"caine$": {"conditions": ["Local Anesthesia", "Pain"], "class": "Local Anesthetic"},
    r"vir$|ciclovir$": {"conditions": ["Viral Infection", "Herpes"], "class": "Antiviral"},
    r"mab$": {"conditions": ["Autoimmune Disease", "Cancer"], "class": "Monoclonal Antibody"},
    r"nib$": {"conditions": ["Cancer"], "class": "Kinase Inhibitor"},
    r"sone$|solone$|olone$": {"conditions": ["Inflammation", "Autoimmune Disease"], "class": "Corticosteroid"},
    r"coxib$": {"conditions": ["Arthritis", "Pain"], "class": "COX-2 Inhibitor"},
    r"profen$": {"conditions": ["Pain", "Inflammation", "Fever"], "class": "NSAID"},
    r"phylline$": {"conditions": ["Asthma", "COPD"], "class": "Methylxanthine"},
    r"lukast$": {"conditions": ["Asthma", "Allergic Rhinitis"], "class": "Leukotriene Antagonist"},
    r"zine$": {"conditions": ["Allergy", "Allergic Rhinitis"], "class": "Antihistamine"},
    r"semide$": {"conditions": ["Edema", "Heart Failure"], "class": "Loop Diuretic"},
    r"thiazide$": {"conditions": ["Hypertension", "Edema"], "class": "Thiazide Diuretic"},
}


# ═══════════════════════════════════════════════════════════════════
# STEP 1: Extract Drug Therapeutic Classes from MID.xlsx
# ═══════════════════════════════════════════════════════════════════
def extract_drug_classes():
    step(1, 5, "Extracting drug therapeutic classes from MID.xlsx")

    drug_file = ARTIFACTS_DIR / "MID.xlsx"
    if not drug_file.exists():
        fail(f"MID.xlsx not found at {drug_file}")
        return None

    df = pd.read_excel(drug_file)
    df = df.dropna(subset=["Name", "Contains"])
    df = df.drop_duplicates(subset=["Name"])

    def extract_generic(contains):
        m = re.match(r"^(.+?)\s*\(", str(contains))
        return m.group(1).strip() if m else str(contains).strip()

    df["GenericName"] = df["Contains"].apply(extract_generic)

    # Build generic → therapeutic class + action class mapping
    drug_class_map = {}
    for _, row in df.iterrows():
        generic = str(row["GenericName"]).strip().lower()
        tc = str(row.get("Therapeutic_Class", "")).strip() if pd.notna(row.get("Therapeutic_Class")) else ""
        ac = str(row.get("Action_Class", "")).strip() if pd.notna(row.get("Action_Class")) else ""
        if generic and (tc or ac):
            drug_class_map[generic] = {
                "therapeutic_class": tc,
                "action_class": ac,
            }

    ok(f"Extracted {len(drug_class_map)} drug → class mappings")
    ok(f"Unique therapeutic classes: {len(set(v['therapeutic_class'] for v in drug_class_map.values() if v['therapeutic_class']))}")

    return drug_class_map


# ═══════════════════════════════════════════════════════════════════
# STEP 2: Build Medication → Condition Knowledge Base
# ═══════════════════════════════════════════════════════════════════
def build_knowledge_base(drug_class_map):
    step(2, 5, "Building medication → condition knowledge base")

    knowledge_base = {}  # generic_name → {conditions, treatment_area, source, confidence}

    # Source 1: Curated generic drug indications (highest confidence)
    for generic, conditions in GENERIC_DRUG_INDICATIONS.items():
        knowledge_base[generic.lower()] = {
            "conditions": conditions,
            "treatment_area": _infer_treatment_area(conditions),
            "source": "curated",
            "confidence": 0.95,
        }
    ok(f"Added {len(GENERIC_DRUG_INDICATIONS)} curated drug indications")

    # Source 2: Therapeutic class mappings from MID.xlsx
    class_mapped = 0
    if drug_class_map:
        for generic, classes in drug_class_map.items():
            if generic in knowledge_base:
                continue  # curated entry has higher confidence
            tc = classes["therapeutic_class"].upper().strip()
            if tc in THERAPEUTIC_CLASS_CONDITIONS:
                tc_info = THERAPEUTIC_CLASS_CONDITIONS[tc]
                knowledge_base[generic] = {
                    "conditions": tc_info["conditions"],
                    "treatment_area": tc_info["treatment_area"],
                    "source": "therapeutic_class",
                    "confidence": 0.80,
                }
                class_mapped += 1
    ok(f"Added {class_mapped} entries from therapeutic class mapping")

    # Source 3: Drug suffix pattern matching
    suffix_mapped = 0
    if drug_class_map:
        for generic in drug_class_map:
            if generic in knowledge_base:
                continue
            for pattern, info in DRUG_SUFFIX_PATTERNS.items():
                if re.search(pattern, generic, re.IGNORECASE):
                    knowledge_base[generic] = {
                        "conditions": info["conditions"],
                        "treatment_area": info.get("class", "General"),
                        "source": "suffix_pattern",
                        "confidence": 0.65,
                    }
                    suffix_mapped += 1
                    break
    ok(f"Added {suffix_mapped} entries from suffix pattern matching")

    ok(f"Total knowledge base: {len(knowledge_base)} medication → condition mappings")

    return knowledge_base


def _infer_treatment_area(conditions):
    """Infer treatment area from the list of conditions."""
    area_map = {
        "diabetes": "Endocrinology", "hypertension": "Cardiovascular",
        "infection": "Infectious Disease", "pain": "Pain Management",
        "epilepsy": "Neurology", "anxiety": "Psychiatry",
        "asthma": "Respiratory", "gerd": "Gastroenterology",
        "cancer": "Oncology", "anemia": "Hematology",
        "arthritis": "Rheumatology", "depression": "Psychiatry",
        "heart": "Cardiovascular", "fungal": "Infectious Disease",
    }
    for cond in conditions:
        for keyword, area in area_map.items():
            if keyword in cond.lower():
                return area
    return "General Medicine"


# ═══════════════════════════════════════════════════════════════════
# STEP 3: Save Drug Suffix Patterns
# ═══════════════════════════════════════════════════════════════════
def save_suffix_patterns():
    step(3, 5, "Saving drug suffix patterns")

    patterns = []
    for pattern, info in DRUG_SUFFIX_PATTERNS.items():
        patterns.append({
            "pattern": pattern,
            "conditions": info["conditions"],
            "drug_class": info.get("class", "Unknown"),
        })

    out = ARTIFACTS_DIR / "drug_suffix_patterns.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(patterns, f, indent=2, ensure_ascii=False)

    ok(f"Saved {len(patterns)} suffix patterns → drug_suffix_patterns.json")


# ═══════════════════════════════════════════════════════════════════
# STEP 4: Extract Treatment Context from DrugBank Descriptions
# ═══════════════════════════════════════════════════════════════════
def enrich_from_drugbank(knowledge_base):
    step(4, 5, "Enriching knowledge base from DrugBank interaction descriptions")

    input_csv = ARTIFACTS_DIR / "db_drug_interactions.csv"
    if not input_csv.exists():
        warn("db_drug_interactions.csv not found – skipping DrugBank enrichment")
        return knowledge_base

    # Extract unique drug names mentioned in interactions
    drug_names = set()
    with open(input_csv, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            d1 = row.get('Drug 1', '').strip()
            d2 = row.get('Drug 2', '').strip()
            if d1:
                drug_names.add(d1)
            if d2:
                drug_names.add(d2)

    # For DrugBank drugs not in our knowledge base, try suffix matching
    new_entries = 0
    for drug in drug_names:
        drug_lower = drug.lower().strip()
        if drug_lower in knowledge_base:
            continue
        for pattern, info in DRUG_SUFFIX_PATTERNS.items():
            if re.search(pattern, drug_lower, re.IGNORECASE):
                knowledge_base[drug_lower] = {
                    "conditions": info["conditions"],
                    "treatment_area": info.get("class", "General"),
                    "source": "drugbank_suffix",
                    "confidence": 0.55,
                }
                new_entries += 1
                break

    ok(f"Added {new_entries} entries from DrugBank drug names (suffix matching)")
    ok(f"Updated knowledge base: {len(knowledge_base)} total entries")

    return knowledge_base


# ═══════════════════════════════════════════════════════════════════
# STEP 5: Generate Training Data
# ═══════════════════════════════════════════════════════════════════
def generate_training_data(knowledge_base, drug_class_map):
    step(5, 5, "Generating training data for classifier")

    rows = []
    for generic, info in knowledge_base.items():
        tc = ""
        ac = ""
        if drug_class_map and generic in drug_class_map:
            tc = drug_class_map[generic].get("therapeutic_class", "")
            ac = drug_class_map[generic].get("action_class", "")

        for condition in info["conditions"]:
            rows.append({
                "generic_name": generic,
                "therapeutic_class": tc,
                "action_class": ac,
                "treatment_area": info.get("treatment_area", ""),
                "condition": condition,
                "source": info.get("source", ""),
                "confidence": info.get("confidence", 0.5),
            })

    df = pd.DataFrame(rows)
    out = DATA_DIR / "treatment_training_data.csv"
    df.to_csv(out, index=False)

    ok(f"Generated {len(df)} training samples → treatment_training_data.csv")
    ok(f"Unique drugs: {df['generic_name'].nunique()}")
    ok(f"Unique conditions: {df['condition'].nunique()}")

    # Print condition distribution
    top_conditions = df['condition'].value_counts().head(15)
    print(f"\n  {C.BOLD}Top 15 conditions:{C.RESET}")
    for cond, count in top_conditions.items():
        print(f"    {cond:<40} {count:>5}")

    return df


# ═══════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════
def main():
    banner()

    drug_class_map = extract_drug_classes()
    knowledge_base = build_knowledge_base(drug_class_map)
    save_suffix_patterns()
    knowledge_base = enrich_from_drugbank(knowledge_base)

    # Save the full knowledge base
    out = ARTIFACTS_DIR / "treatment_knowledge_base.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f, indent=2, ensure_ascii=False)
    ok(f"Saved treatment knowledge base → {out.name}")

    generate_training_data(knowledge_base, drug_class_map)

    print(f"\n{C.GREEN}{'='*60}{C.RESET}")
    print(f"{C.GREEN}✔ Data extraction complete!{C.RESET}")
    print(f"{C.DIM}  Next step: python -m treatment_identifier.train_model{C.RESET}")
    print(f"{C.GREEN}{'='*60}{C.RESET}\n")


if __name__ == "__main__":
    main()
