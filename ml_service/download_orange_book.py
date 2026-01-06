"""
Script to download FDA Orange Book data files.
The Orange Book contains Approved Drug Products with Therapeutic Equivalence Evaluations.

Data source: https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files
"""

import os
import requests
import zipfile
import io
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FDA Orange Book Data Download URL
ORANGE_BOOK_URL = "https://www.fda.gov/media/76860/download"

# Alternative direct links to individual files (if zip doesn't work)
ALTERNATIVE_URLS = {
    "products": "https://www.accessdata.fda.gov/scripts/cder/ob/docs/obannual.zip",
}

def download_orange_book(output_dir: str = None):
    """
    Download and extract FDA Orange Book data files.
    
    Args:
        output_dir: Directory to save the extracted files
    """
    if output_dir is None:
        output_dir = Path(__file__).parent / "data" / "orange_book"
    else:
        output_dir = Path(output_dir)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Downloading FDA Orange Book data to {output_dir}")
    
    try:
        # Download the zip file
        logger.info(f"Fetching data from FDA...")
        response = requests.get(ORANGE_BOOK_URL, timeout=60)
        response.raise_for_status()
        
        # Extract the zip file
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            zip_file.extractall(output_dir)
            logger.info(f"Extracted files: {zip_file.namelist()}")
        
        logger.info("✅ Orange Book data downloaded successfully!")
        return True
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download Orange Book data: {e}")
        logger.info("You can manually download from: https://www.fda.gov/drugs/drug-approvals-and-databases/orange-book-data-files")
        return False
    except zipfile.BadZipFile as e:
        logger.error(f"Downloaded file is not a valid zip: {e}")
        return False


def verify_data_files(data_dir: str = None) -> dict:
    """
    Verify that required Orange Book data files exist.
    
    Returns:
        Dictionary with file status
    """
    if data_dir is None:
        data_dir = Path(__file__).parent / "data" / "orange_book"
    else:
        data_dir = Path(data_dir)
    
    required_files = {
        "products.txt": "Product data (Trade Names, Ingredients, etc.)",
        "patent.txt": "Patent information",
        "exclusivity.txt": "Market exclusivity data"
    }
    
    status = {}
    for filename, description in required_files.items():
        filepath = data_dir / filename
        exists = filepath.exists()
        size = filepath.stat().st_size if exists else 0
        status[filename] = {
            "exists": exists,
            "description": description,
            "size_bytes": size,
            "size_mb": round(size / (1024 * 1024), 2) if size > 0 else 0
        }
    
    return status


def create_sample_data(output_dir: str = None):
    """
    Create sample Orange Book data files for testing.
    This is useful when the actual FDA data is unavailable.
    """
    if output_dir is None:
        output_dir = Path(__file__).parent / "data" / "orange_book"
    else:
        output_dir = Path(output_dir)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Sample products.txt content (tab-delimited as per FDA format)
    # Columns: Ingredient~DF;Route~Trade_Name~Applicant~Strength~Appl_Type~Appl_No~Product_No~TE_Code~Approval_Date~RLD~RS~Type~Applicant_Full_Name
    products_content = """Ingredient~DF;Route~Trade_Name~Applicant~Strength~Appl_Type~Appl_No~Product_No~TE_Code~Approval_Date~RLD~RS~Type~Applicant_Full_Name
METFORMIN HYDROCHLORIDE~TABLET, FILM COATED; ORAL~GLUCOPHAGE~BRISTOL MYERS SQUIBB~500MG~N~020357~001~AB~Mar 3, 1995~Yes~Yes~RX~BRISTOL-MYERS SQUIBB COMPANY
METFORMIN HYDROCHLORIDE~TABLET, FILM COATED; ORAL~GLUCOPHAGE~BRISTOL MYERS SQUIBB~850MG~N~020357~002~AB~Mar 3, 1995~Yes~Yes~RX~BRISTOL-MYERS SQUIBB COMPANY
METFORMIN HYDROCHLORIDE~TABLET, FILM COATED; ORAL~GLUCOPHAGE~BRISTOL MYERS SQUIBB~1000MG~N~020357~003~AB~Aug 13, 2000~Yes~Yes~RX~BRISTOL-MYERS SQUIBB COMPANY
METFORMIN HYDROCHLORIDE~TABLET, EXTENDED RELEASE; ORAL~GLUCOPHAGE XR~BRISTOL MYERS SQUIBB~500MG~N~021202~001~AB~Oct 13, 2000~Yes~Yes~RX~BRISTOL-MYERS SQUIBB COMPANY
ATORVASTATIN CALCIUM~TABLET, FILM COATED; ORAL~LIPITOR~PFIZER~10MG~N~020702~001~AB~Dec 17, 1996~Yes~Yes~RX~PFIZER INC
ATORVASTATIN CALCIUM~TABLET, FILM COATED; ORAL~LIPITOR~PFIZER~20MG~N~020702~002~AB~Dec 17, 1996~Yes~Yes~RX~PFIZER INC
ATORVASTATIN CALCIUM~TABLET, FILM COATED; ORAL~LIPITOR~PFIZER~40MG~N~020702~003~AB~Dec 17, 1996~Yes~Yes~RX~PFIZER INC
LISINOPRIL~TABLET; ORAL~PRINIVIL~MERCK~5MG~N~019777~001~AB~Dec 29, 1987~Yes~Yes~RX~MERCK SHARP & DOHME LLC
LISINOPRIL~TABLET; ORAL~PRINIVIL~MERCK~10MG~N~019777~002~AB~Dec 29, 1987~Yes~Yes~RX~MERCK SHARP & DOHME LLC
LISINOPRIL~TABLET; ORAL~ZESTRIL~ASTRAZENECA~5MG~N~019558~001~AB~Jun 19, 1987~Yes~Yes~RX~ASTRAZENECA PHARMACEUTICALS LP
LISINOPRIL~TABLET; ORAL~ZESTRIL~ASTRAZENECA~10MG~N~019558~002~AB~Jun 19, 1987~Yes~Yes~RX~ASTRAZENECA PHARMACEUTICALS LP
OMEPRAZOLE~CAPSULE, DELAYED RELEASE; ORAL~PRILOSEC~ASTRAZENECA~10MG~N~019810~001~AB~Sep 14, 1989~Yes~Yes~RX~ASTRAZENECA PHARMACEUTICALS LP
OMEPRAZOLE~CAPSULE, DELAYED RELEASE; ORAL~PRILOSEC~ASTRAZENECA~20MG~N~019810~002~AB~Sep 14, 1989~Yes~Yes~RX~ASTRAZENECA PHARMACEUTICALS LP
AMLODIPINE BESYLATE~TABLET; ORAL~NORVASC~PFIZER~5MG~N~019787~001~AB~Jul 31, 1992~Yes~Yes~RX~PFIZER INC
AMLODIPINE BESYLATE~TABLET; ORAL~NORVASC~PFIZER~10MG~N~019787~002~AB~Jul 31, 1992~Yes~Yes~RX~PFIZER INC
LEVOTHYROXINE SODIUM~TABLET; ORAL~SYNTHROID~ABBVIE~25MCG~N~021402~001~AB~Jul 24, 2002~Yes~Yes~RX~ABBVIE INC
LEVOTHYROXINE SODIUM~TABLET; ORAL~SYNTHROID~ABBVIE~50MCG~N~021402~002~AB~Jul 24, 2002~Yes~Yes~RX~ABBVIE INC
LEVOTHYROXINE SODIUM~TABLET; ORAL~LEVOXYL~KING PHARMS~25MCG~N~021301~001~AB~May 24, 2001~Yes~Yes~RX~KING PHARMACEUTICALS INC
LOSARTAN POTASSIUM~TABLET, FILM COATED; ORAL~COZAAR~MERCK~25MG~N~020386~001~AB~Apr 14, 1995~Yes~Yes~RX~MERCK SHARP & DOHME LLC
LOSARTAN POTASSIUM~TABLET, FILM COATED; ORAL~COZAAR~MERCK~50MG~N~020386~002~AB~Apr 14, 1995~Yes~Yes~RX~MERCK SHARP & DOHME LLC
GABAPENTIN~CAPSULE; ORAL~NEURONTIN~PFIZER~100MG~N~020235~001~AB~Dec 30, 1993~Yes~Yes~RX~PFIZER INC
GABAPENTIN~CAPSULE; ORAL~NEURONTIN~PFIZER~300MG~N~020235~002~AB~Dec 30, 1993~Yes~Yes~RX~PFIZER INC
GABAPENTIN~TABLET, EXTENDED RELEASE; ORAL~GRALISE~ASSERTIO~300MG~N~022544~001~AB~Jan 28, 2011~Yes~Yes~RX~ASSERTIO THERAPEUTICS INC
"""

    # Sample patent.txt content
    patent_content = """Appl_Type~Appl_No~Product_No~Patent_No~Patent_Expire_Date_Text~Drug_Substance_Flag~Drug_Product_Flag~Patent_Use_Code~Delist_Flag~Submission_Date
N~020357~001~5212177~Jul 10, 2012~Y~N~~N~Aug 15, 1997
N~020702~001~5273995~Dec 28, 2011~Y~N~~N~Feb 27, 1997
N~020702~001~5686104~Nov 11, 2014~N~Y~U-123~N~Feb 27, 1997
N~019787~001~4879303~Nov 7, 2006~Y~N~~N~Aug 15, 1992
N~021402~001~5955105~Sep 21, 2016~N~Y~U-456~N~Aug 15, 2002
"""

    # Sample exclusivity.txt content
    exclusivity_content = """Appl_Type~Appl_No~Product_No~Exclusivity_Code~Exclusivity_Date
N~020357~001~NCE-1~Mar 3, 2000
N~020702~001~NCE-1~Dec 17, 2001
N~019787~001~NCE-1~Jul 31, 1997
"""
    
    # Write files
    products_path = output_dir / "products.txt"
    patent_path = output_dir / "patent.txt"
    exclusivity_path = output_dir / "exclusivity.txt"
    
    # Write with proper formatting
    with open(products_path, 'w', encoding='latin-1') as f:
        f.write(products_content)
    
    with open(patent_path, 'w', encoding='latin-1') as f:
        f.write(patent_content)
    
    with open(exclusivity_path, 'w', encoding='latin-1') as f:
        f.write(exclusivity_content)
    
    logger.info(f"✅ Sample Orange Book data created in {output_dir}")
    return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Download FDA Orange Book data")
    parser.add_argument("--output", "-o", help="Output directory", default=None)
    parser.add_argument("--sample", "-s", action="store_true", help="Create sample data instead of downloading")
    parser.add_argument("--verify", "-v", action="store_true", help="Verify existing data files")
    
    args = parser.parse_args()
    
    if args.verify:
        status = verify_data_files(args.output)
        print("\nOrange Book Data Files Status:")
        print("-" * 50)
        for filename, info in status.items():
            status_icon = "✅" if info["exists"] else "❌"
            size_str = f"{info['size_mb']} MB" if info["exists"] else "Not found"
            print(f"{status_icon} {filename}: {size_str}")
            print(f"   {info['description']}")
        print("-" * 50)
    elif args.sample:
        create_sample_data(args.output)
    else:
        success = download_orange_book(args.output)
        if not success:
            print("\nFalling back to sample data...")
            create_sample_data(args.output)
