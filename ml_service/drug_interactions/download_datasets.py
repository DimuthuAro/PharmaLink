"""
Drug Interactions – Step 1: Dataset Download
=============================================
Downloads all datasets required for drug interaction model training.

Datasets:
  1. Medical Information Dataset (MID.xlsx) – Drug names, active ingredients, classes
  2. Drug-Food Interactions Dataset (JSON) – Drug-to-food interaction rules
  3. Sri Lankan Food Composition Table – Nutritional data for local foods
  4. DrugBank Drug-Drug Interactions (CSV) – 191k+ DDI pairs

Usage:
  python -m drug_interactions.download_datasets            # interactive mode
  python -m drug_interactions.download_datasets --all      # download all, no prompts
  python -m drug_interactions.download_datasets --verify   # check status only
"""

import os
import sys
import json
import time
import zipfile
import argparse
import threading
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

# ── Dataset Registry ────────────────────────────────────────────
DATASETS = [
    {
        "id": 1,
        "name": "Medical Information Dataset",
        "slug": "imtkaggleteam/medical-information-dataset",
        "expected_file": "MID.xlsx",
        "description": "Drug names, active ingredients, therapeutic & action classes",
        "auto": True,
    },
    {
        "id": 2,
        "name": "Drug-Food Interactions",
        "slug": "shayanhusain/drug-food-interactions-dataset",
        "expected_file": "Drug to Food interactions Dataset.json",
        "description": "Drug-to-food interaction rules and categories",
        "auto": True,
    },
    {
        "id": 3,
        "name": "Sri Lanka Food Composition Table",
        "slug": "nipunaudara/nutritional-facts-for-most-common-sri-lankan-foods",
        "expected_file": "SrilankanCommonFoods.xlsx",
        "description": "Nutritional data for Sri Lankan foods (calories, protein, iron …)",
        "auto": True,
    },
    {
        "id": 4,
        "name": "DrugBank Drug-Drug Interactions",
        "slug": "mghobashy/drug-drug-interactions",
        "expected_file": "db_drug_interactions.csv",
        "description": "~191k drug-drug interaction pairs from DrugBank with descriptions",
        "auto": True,
    },
]


# ── Console Helpers ──────────────────────────────────────────────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    WHITE  = "\033[97m"
    BLUE   = "\033[94m"

def ok(msg):     print(f"  {C.GREEN}✔{C.RESET}  {msg}")
def warn(msg):   print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def fail(msg):   print(f"  {C.RED}✖{C.RESET}  {msg}")
def info(msg):   print(f"  {C.CYAN}ℹ{C.RESET}  {msg}")
def step(n, msg): print(f"\n  {C.BOLD}{C.BLUE}[{n}]{C.RESET} {C.WHITE}{msg}{C.RESET}")


def banner():
    print(f"""
{C.CYAN}╔══════════════════════════════════════════════════════════════╗
║{C.RESET}{C.BOLD}{C.WHITE}   DRUG INTERACTIONS – Dataset Download                      {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Component : Drug Interactions
  Artifacts : {ARTIFACTS_DIR}{C.RESET}
""")


def fmt_size(path: Path) -> str:
    b = path.stat().st_size
    for unit in ("B", "KB", "MB", "GB"):
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} TB"


class Spinner:
    FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

    def __init__(self, msg: str):
        self._msg = msg
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._spin, daemon=True)

    def _spin(self):
        i = 0
        while not self._stop.is_set():
            frame = self.FRAMES[i % len(self.FRAMES)]
            print(f"\r  {C.CYAN}{frame}{C.RESET}  {self._msg}", end="", flush=True)
            i += 1
            time.sleep(0.08)

    def __enter__(self):
        self._thread.start()
        return self

    def __exit__(self, *_):
        self._stop.set()
        self._thread.join()
        print("\r" + " " * (len(self._msg) + 10) + "\r", end="")


# ── Kaggle Credentials ──────────────────────────────────────────
def setup_kaggle_credentials() -> bool:
    """Load Kaggle API credentials from kaggle.json or environment."""
    if os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"):
        ok(f"Credentials found in environment ({C.BOLD}{os.environ['KAGGLE_USERNAME']}{C.RESET})")
        return True

    cred_file = ARTIFACTS_DIR / "kaggle.json"
    if not cred_file.exists():
        fail(f"Kaggle credentials not found: {cred_file}")
        info("Create artifacts/kaggle.json with {{\"username\": \"...\", \"key\": \"...\"}}")
        return False

    content = cred_file.read_text().strip()
    try:
        creds = json.loads(content)
        if "username" in creds and "key" in creds:
            os.environ["KAGGLE_USERNAME"] = creds["username"]
            os.environ["KAGGLE_KEY"] = creds["key"]
            ok(f"Authenticated as {C.BOLD}{creds['username']}{C.RESET}")
            return True
    except json.JSONDecodeError:
        pass

    fail("Invalid kaggle.json format")
    return False


# ── Download Functions ───────────────────────────────────────────
def dataset_status(ds: dict) -> dict:
    path = ARTIFACTS_DIR / ds["expected_file"]
    exists = path.exists()
    return {**ds, "exists": exists, "size": fmt_size(path) if exists else None, "path": path}


def download_kaggle_dataset(slug: str, expected_file: str, name: str) -> bool:
    """Download and extract a Kaggle dataset using the Kaggle API."""
    import subprocess
    import shutil

    kaggle_bin = shutil.which("kaggle")
    if kaggle_bin:
        info(f"Using Kaggle CLI for {C.BOLD}{name}{C.RESET}")
        try:
            with Spinner(f"Downloading {C.BOLD}{name}{C.RESET} …"):
                result = subprocess.run(
                    [kaggle_bin, "datasets", "download", "-d", slug,
                     "--unzip", "-p", str(ARTIFACTS_DIR), "--force"],
                    capture_output=True, text=True, timeout=600,
                )
            if result.returncode == 0:
                ok("Downloaded via CLI")
        except Exception as e:
            warn(f"CLI error: {e}")

        target = ARTIFACTS_DIR / expected_file
        if target.exists():
            ok(f"Verified: {expected_file} ({fmt_size(target)})")
            return True

    # Fallback: Python API
    info("Downloading via Python API …")
    from kaggle.api.kaggle_api_extended import KaggleApi
    api = KaggleApi()
    api.authenticate()

    try:
        with Spinner(f"Downloading {C.BOLD}{name}{C.RESET} …"):
            api.dataset_download_files(slug, path=str(ARTIFACTS_DIR), force=True, unzip=True)
        ok("Downloaded & extracted")
    except Exception as e:
        fail(f"Download failed: {e}")
        return False

    target = ARTIFACTS_DIR / expected_file
    if target.exists():
        ok(f"Verified: {expected_file} ({fmt_size(target)})")
        return True

    warn(f"{expected_file} not found after extraction")
    return False


def print_status():
    """Print download status table."""
    print(f"\n  {C.BOLD}{'#':<4}{'Dataset':<40}{'Status':<12}{'Size':>10}{C.RESET}")
    print(f"  {C.DIM}{'─'*66}{C.RESET}")

    all_ready = True
    for ds in DATASETS:
        s = dataset_status(ds)
        status = f"{C.GREEN}ready{C.RESET}" if s["exists"] else f"{C.RED}missing{C.RESET}"
        size = s["size"] or "–"
        print(f"  {ds['id']:<4}{ds['name']:<40}{status:<22}{size:>10}")
        if not s["exists"]:
            all_ready = False

    print()
    return all_ready


# ── Main ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Drug Interactions – Dataset Downloader")
    parser.add_argument("--all", action="store_true", help="Download all datasets without prompts")
    parser.add_argument("--verify", action="store_true", help="Check dataset status only")
    args = parser.parse_args()

    banner()

    if args.verify:
        print_status()
        return

    if not setup_kaggle_credentials():
        return

    step(1, "Checking dataset status")
    all_ready = print_status()

    if all_ready:
        ok("All datasets already downloaded!")
        return

    if args.all:
        step(2, "Downloading all missing datasets")
        for ds in DATASETS:
            s = dataset_status(ds)
            if not s["exists"]:
                info(f"Downloading: {ds['name']}")
                download_kaggle_dataset(ds["slug"], ds["expected_file"], ds["name"])
    else:
        step(2, "Interactive download")
        for ds in DATASETS:
            s = dataset_status(ds)
            if not s["exists"]:
                choice = input(f"\n  Download {C.BOLD}{ds['name']}{C.RESET}? [Y/n] ").strip().lower()
                if choice != "n":
                    download_kaggle_dataset(ds["slug"], ds["expected_file"], ds["name"])

    step(3, "Final status")
    print_status()

    print(f"\n{C.GREEN}✔ Dataset download complete!{C.RESET}")
    print(f"{C.DIM}  Next step: python -m drug_interactions.extract_data{C.RESET}\n")


if __name__ == "__main__":
    main()
