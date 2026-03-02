"""
Cross-Brand Comparison – Step 1: Dataset Download
===================================================
Downloads datasets required for cross-brand drug comparison analysis.

Datasets:
  1. Medical Information Dataset (MID.xlsx) – Drug brand names, generics, classes
  2. Brand comparison pricing data (JSON)   – Historical brand pricing data

Usage:
  python -m cross_brand_comparison.download_datasets            # interactive
  python -m cross_brand_comparison.download_datasets --all      # download all
  python -m cross_brand_comparison.download_datasets --verify   # check status
"""

import os
import sys
import json
import time
import argparse
import threading
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
FRONTEND_ASSETS = BASE_DIR / "frontend" / "src" / "assets"
ARTIFACTS_DIR.mkdir(exist_ok=True)

# ── Dataset Registry ────────────────────────────────────────────
DATASETS = [
    {
        "id": 1,
        "name": "Medical Information Dataset",
        "slug": "imtkaggleteam/medical-information-dataset",
        "expected_file": "MID.xlsx",
        "description": "Drug brand names, active ingredients, therapeutic & action classes, pricing tiers",
        "auto": True,
    },
]

# ── Local Data Sources ──────────────────────────────────────────
LOCAL_DATA = [
    {
        "id": 2,
        "name": "Brand Comparison Pricing Data",
        "expected_file": "brand-comparison-2025-12-20.json",
        "location": "frontend/src/assets/",
        "description": "Historical brand pricing, manufacturer data, availability records",
    },
]

# ── Console Helpers ──────────────────────────────────────────────
class C:
    RESET = "\033[0m"; BOLD = "\033[1m"; DIM = "\033[2m"
    GREEN = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"
    CYAN = "\033[96m"; WHITE = "\033[97m"; BLUE = "\033[94m"

def ok(msg):   print(f"  {C.GREEN}✔{C.RESET}  {msg}")
def warn(msg): print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def fail(msg): print(f"  {C.RED}✖{C.RESET}  {msg}")
def info(msg): print(f"  {C.CYAN}ℹ{C.RESET}  {msg}")
def step(n, msg): print(f"\n  {C.BOLD}{C.BLUE}[{n}]{C.RESET} {C.WHITE}{msg}{C.RESET}")


def banner():
    print(f"""
{C.CYAN}╔══════════════════════════════════════════════════════════════╗
║{C.RESET}{C.BOLD}{C.WHITE}   CROSS-BRAND COMPARISON – Dataset Download                 {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Component : Cross-Brand Comparison
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
    def __init__(self, msg):
        self._msg = msg; self._stop = threading.Event()
        self._thread = threading.Thread(target=self._spin, daemon=True)
    def _spin(self):
        i = 0
        while not self._stop.is_set():
            print(f"\r  {C.CYAN}{self.FRAMES[i % len(self.FRAMES)]}{C.RESET}  {self._msg}", end="", flush=True)
            i += 1; time.sleep(0.08)
    def __enter__(self): self._thread.start(); return self
    def __exit__(self, *_):
        self._stop.set(); self._thread.join()
        print("\r" + " " * (len(self._msg) + 10) + "\r", end="")


# ── Kaggle Credentials ──────────────────────────────────────────
def setup_kaggle_credentials() -> bool:
    if os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"):
        ok(f"Credentials in environment ({C.BOLD}{os.environ['KAGGLE_USERNAME']}{C.RESET})")
        return True
    cred_file = ARTIFACTS_DIR / "kaggle.json"
    if not cred_file.exists():
        fail(f"Kaggle credentials not found: {cred_file}")
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
def download_kaggle_dataset(slug, expected_file, name) -> bool:
    import subprocess, shutil
    kaggle_bin = shutil.which("kaggle")
    if kaggle_bin:
        info(f"Using Kaggle CLI for {C.BOLD}{name}{C.RESET}")
        try:
            with Spinner(f"Downloading {C.BOLD}{name}{C.RESET} …"):
                subprocess.run(
                    [kaggle_bin, "datasets", "download", "-d", slug,
                     "--unzip", "-p", str(ARTIFACTS_DIR), "--force"],
                    capture_output=True, text=True, timeout=600,
                )
        except Exception as e:
            warn(f"CLI error: {e}")
        target = ARTIFACTS_DIR / expected_file
        if target.exists():
            ok(f"Verified: {expected_file} ({fmt_size(target)})")
            return True

    info("Downloading via Python API …")
    from kaggle.api.kaggle_api_extended import KaggleApi
    api = KaggleApi(); api.authenticate()
    try:
        with Spinner(f"Downloading {C.BOLD}{name}{C.RESET} …"):
            api.dataset_download_files(slug, path=str(ARTIFACTS_DIR), force=True, unzip=True)
        ok("Downloaded")
    except Exception as e:
        fail(f"Download failed: {e}"); return False

    target = ARTIFACTS_DIR / expected_file
    if target.exists():
        ok(f"Verified: {expected_file} ({fmt_size(target)})")
        return True
    warn(f"{expected_file} not found"); return False


def check_local_data():
    """Check availability of local data sources."""
    for ds in LOCAL_DATA:
        path = FRONTEND_ASSETS / ds["expected_file"]
        if path.exists():
            ok(f"Local data found: {ds['name']} ({fmt_size(path)})")
        else:
            warn(f"Local data missing: {ds['expected_file']} in {ds['location']}")


def print_status():
    print(f"\n  {C.BOLD}{'#':<4}{'Dataset':<40}{'Status':<12}{'Size':>10}{C.RESET}")
    print(f"  {C.DIM}{'─'*66}{C.RESET}")

    all_ready = True
    for ds in DATASETS:
        path = ARTIFACTS_DIR / ds["expected_file"]
        exists = path.exists()
        status = f"{C.GREEN}ready{C.RESET}" if exists else f"{C.RED}missing{C.RESET}"
        size = fmt_size(path) if exists else "–"
        print(f"  {ds['id']:<4}{ds['name']:<40}{status:<22}{size:>10}")
        if not exists: all_ready = False

    for ds in LOCAL_DATA:
        path = FRONTEND_ASSETS / ds["expected_file"]
        exists = path.exists()
        status = f"{C.GREEN}ready{C.RESET}" if exists else f"{C.YELLOW}optional{C.RESET}"
        size = fmt_size(path) if exists else "–"
        print(f"  {ds['id']:<4}{ds['name']:<40}{status:<22}{size:>10}")

    print()
    return all_ready


# ── Main ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Cross-Brand Comparison – Dataset Downloader")
    parser.add_argument("--all", action="store_true", help="Download all datasets")
    parser.add_argument("--verify", action="store_true", help="Check status only")
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

    step(2, "Downloading missing datasets")
    for ds in DATASETS:
        path = ARTIFACTS_DIR / ds["expected_file"]
        if not path.exists():
            download_kaggle_dataset(ds["slug"], ds["expected_file"], ds["name"])

    step(3, "Checking local data sources")
    check_local_data()

    step(4, "Final status")
    print_status()

    print(f"\n{C.GREEN}✔ Dataset download complete!{C.RESET}")
    print(f"{C.DIM}  Next step: python -m cross_brand_comparison.extract_data{C.RESET}\n")


if __name__ == "__main__":
    main()
