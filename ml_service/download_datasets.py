"""
PharmaLink – Dataset Download Manager
======================================
Interactive CLI tool to download and manage datasets required
for drug-food interaction model training.

Datasets:
  1. Medical Information Dataset (MID.xlsx)          – Kaggle
  2. Drug-Food Interactions (JSON)                   – Kaggle
  3. Sri Lanka Food Composition Table (CSV)          – Manual / Kaggle

Usage:
  python download_datasets.py            # interactive mode
  python download_datasets.py --all      # download everything, no prompts
  python download_datasets.py --verify   # check dataset status only
"""

import os
import sys
import json
import time
import zipfile
import argparse
import threading
from pathlib import Path

# ── paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

# ── dataset registry ────────────────────────────────────────────────────────
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
]

# ── ANSI helpers ─────────────────────────────────────────────────────────────
class C:
    """Minimal colour codes – degrades gracefully on dumb terminals."""
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    WHITE  = "\033[97m"
    BLUE   = "\033[94m"
    MAGENTA = "\033[95m"
    BG_GREEN = "\033[42m"
    BG_RED   = "\033[41m"
    BG_BLUE  = "\033[44m"

def ok(msg):     print(f"  {C.GREEN}✔{C.RESET}  {msg}")
def warn(msg):   print(f"  {C.YELLOW}⚠{C.RESET}  {msg}")
def fail(msg):   print(f"  {C.RED}✖{C.RESET}  {msg}")
def info(msg):   print(f"  {C.CYAN}ℹ{C.RESET}  {msg}")
def step(n, msg): print(f"\n  {C.BOLD}{C.BLUE}[{n}]{C.RESET} {C.WHITE}{msg}{C.RESET}")

def banner():
    print(f"""
{C.CYAN}╔══════════════════════════════════════════════════════════════╗
║{C.RESET}{C.BOLD}{C.WHITE}        PHARMALINK  –  Dataset Download Manager             {C.RESET}{C.CYAN}║
╚══════════════════════════════════════════════════════════════╝{C.RESET}
{C.DIM}  Artifacts dir : {ARTIFACTS_DIR}{C.RESET}
""")

def divider(label=""):
    if label:
        pad = 58 - len(label)
        print(f"\n  {C.DIM}{'─'*3} {C.RESET}{C.BOLD}{label} {C.DIM}{'─'*max(pad,2)}{C.RESET}")
    else:
        print(f"  {C.DIM}{'─'*62}{C.RESET}")

def fmt_size(path: Path) -> str:
    """Human-readable file size."""
    b = path.stat().st_size
    for unit in ("B", "KB", "MB", "GB"):
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} TB"

# ── spinner for long operations ──────────────────────────────────────────────
class Spinner:
    """Tiny animated spinner for blocking downloads."""
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
        print("\r" + " " * (len(self._msg) + 10) + "\r", end="")  # clear line


# ── credentials ──────────────────────────────────────────────────────────────
def setup_kaggle_credentials(interactive: bool = True) -> bool:
    """Load Kaggle credentials from kaggle.json or environment.

    Supports:
        • JSON: {"username": "…", "key": "…"}
        • Plain KGAT_ token text
        • Environment variables (KAGGLE_USERNAME/KAGGLE_KEY or KAGGLE_API_TOKEN)
    """
    divider("Kaggle Authentication")

    # 1) Already in env?
    if os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"):
        ok(f"Credentials found in environment ({C.BOLD}{os.environ['KAGGLE_USERNAME']}{C.RESET})")
        return True
    if os.environ.get("KAGGLE_API_TOKEN"):
        ok("KAGGLE_API_TOKEN found in environment")
        return True

    # 2) Read from file
    cred_file = ARTIFACTS_DIR / "kaggle.json"

    if not cred_file.exists():
        fail(f"Credentials file not found: {cred_file}")
        if interactive:
            print()
            info("You can create one interactively now.\n")
            choice = input(f"  {C.YELLOW}?{C.RESET}  Do you have a Kaggle API token or username/key pair?\n"
                           f"     {C.DIM}[1]{C.RESET} Username + Key (JSON)\n"
                           f"     {C.DIM}[2]{C.RESET} API Token (KGAT_…)\n"
                           f"     {C.DIM}[s]{C.RESET} Skip\n"
                           f"     > ").strip()
            if choice == "1":
                uname = input(f"  {C.CYAN}>{C.RESET}  Kaggle username: ").strip()
                key   = input(f"  {C.CYAN}>{C.RESET}  Kaggle API key : ").strip()
                if uname and key:
                    cred_file.write_text(json.dumps({"username": uname, "key": key}, indent=2))
                    ok(f"Saved credentials to {cred_file}")
                else:
                    fail("Username or key was empty – skipping.")
                    return False
            elif choice == "2":
                token = input(f"  {C.CYAN}>{C.RESET}  Paste KGAT_ token: ").strip()
                if token.startswith("KGAT_"):
                    cred_file.write_text(token)
                    ok(f"Saved token to {cred_file}")
                else:
                    fail("Token does not start with KGAT_ – skipping.")
                    return False
            else:
                warn("Skipped credential setup – downloads will fail.\n")
                return False
        else:
            fail("Run in interactive mode or place kaggle.json manually.")
            return False

    # Parse the file
    content = cred_file.read_text().strip()
    try:
        creds = json.loads(content)
        if "username" in creds and "key" in creds:
            os.environ["KAGGLE_USERNAME"] = creds["username"]
            os.environ["KAGGLE_KEY"] = creds["key"]
            ok(f"Authenticated as {C.BOLD}{creds['username']}{C.RESET}")
            return True
        else:
            fail("JSON missing 'username' / 'key' fields.")
            return False
    except json.JSONDecodeError:
        if content.startswith("KGAT_"):
            os.environ["KAGGLE_API_TOKEN"] = content
            ok("API token loaded from file.")
            return True
        fail("File is neither valid JSON nor a KGAT_ token.")
        return False


# ── dataset operations ───────────────────────────────────────────────────────
def dataset_status(ds: dict) -> dict:
    """Check whether a dataset's expected file exists and return info."""
    path = ARTIFACTS_DIR / ds["expected_file"]
    exists = path.exists()
    return {
        **ds,
        "exists": exists,
        "size": fmt_size(path) if exists else None,
        "path": path,
    }


def download_kaggle_dataset(slug: str, expected_file: str, name: str) -> bool:
    """Download and extract a Kaggle dataset.

    Strategy:
      1. Try the Kaggle CLI with --unzip (most reliable for large files).
      2. Fall back to the Python API if CLI is unavailable.
    """
    import subprocess, shutil

    zip_name = slug.split("/")[-1] + ".zip"
    zip_path = ARTIFACTS_DIR / zip_name

    # Remove stale zip from a previous failed attempt
    if zip_path.exists():
        zip_path.unlink()

    # ── Method 1: Kaggle CLI (handles large files reliably) ──────
    kaggle_bin = shutil.which("kaggle")
    if kaggle_bin:
        info(f"Using Kaggle CLI for {C.BOLD}{name}{C.RESET}")
        try:
            with Spinner(f"Downloading & extracting {C.BOLD}{name}{C.RESET} …"):
                result = subprocess.run(
                    [
                        kaggle_bin, "datasets", "download",
                        "-d", slug,
                        "--unzip",
                        "-p", str(ARTIFACTS_DIR),
                        "--force",
                    ],
                    capture_output=True, text=True, timeout=600,
                )
            if result.returncode == 0:
                ok(f"Downloaded & extracted via CLI")
            else:
                stderr = result.stderr.strip()
                warn(f"CLI returned code {result.returncode}: {stderr}")
        except subprocess.TimeoutExpired:
            warn("CLI download timed out (10 min)")
        except Exception as e:
            warn(f"CLI error: {e}")

        # Check if target already landed
        target = ARTIFACTS_DIR / expected_file
        if target.exists():
            ok(f"Verified: {expected_file} ({fmt_size(target)})")
            # Cleanup zip if CLI left one behind
            if zip_path.exists():
                zip_path.unlink()
            return True

    # ── Method 2: Python API fallback ────────────────────────────
    info(f"Downloading via Python API …")
    from kaggle.api.kaggle_api_extended import KaggleApi

    MAX_RETRIES = 3
    api = KaggleApi()
    api.authenticate()

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if attempt > 1:
                warn(f"Retry {attempt}/{MAX_RETRIES} …")
                if zip_path.exists():
                    zip_path.unlink()

            with Spinner(f"Downloading & extracting {C.BOLD}{name}{C.RESET} ({attempt}/{MAX_RETRIES}) …"):
                api.dataset_download_files(slug, path=str(ARTIFACTS_DIR), force=True, unzip=True)

            ok(f"Downloaded & extracted")
            break

        except Exception as e:
            err_msg = str(e)
            if attempt == MAX_RETRIES:
                fail(f"Download failed after {MAX_RETRIES} attempts: {e}")
                return False
            warn(f"Attempt {attempt} failed: {e}")

    # Verify
    target = ARTIFACTS_DIR / expected_file
    if target.exists():
        ok(f"Verified: {expected_file} ({fmt_size(target)})")
        return True
    else:
        warn(f"{expected_file} not found after extraction")
        return False


def handle_manual_dataset(ds: dict, interactive: bool) -> bool:
    """Handle datasets that can't be auto-downloaded."""
    target = ARTIFACTS_DIR / ds["expected_file"]

    if target.exists():
        ok(f"Already present: {ds['expected_file']} ({fmt_size(target)})")
        return True

    warn(f"{ds['name']} requires manual download.")

    if interactive:
        print(f"\n     {C.DIM}This dataset contains: {ds['description']}{C.RESET}")
        print(f"     {C.DIM}Expected file: {ds['expected_file']}{C.RESET}")
        print(f"     {C.DIM}Place it in  : {ARTIFACTS_DIR}{C.RESET}\n")
        input(f"  {C.YELLOW}⏸{C.RESET}  Press Enter after you've placed the file (or Enter to skip) … ")

        if target.exists():
            ok(f"Found: {ds['expected_file']} ({fmt_size(target)})")
            return True
        else:
            warn(f"File still not found – skipping for now.")
    else:
        info(f"Place '{ds['expected_file']}' in {ARTIFACTS_DIR}")

    return False


# ── status table ─────────────────────────────────────────────────────────────
def print_status_table():
    """Pretty-print the status of all datasets."""
    divider("Dataset Status")
    print()
    print(f"  {C.BOLD}{'#':<4}{'Dataset':<38}{'Status':<12}{'Size':>10}{C.RESET}")
    print(f"  {C.DIM}{'─'*4}{'─'*38}{'─'*12}{'─'*10}{C.RESET}")

    results = []
    for ds in DATASETS:
        s = dataset_status(ds)
        results.append(s)
        status = f"{C.GREEN}ready{C.RESET}" if s["exists"] else f"{C.RED}missing{C.RESET}"
        size   = s["size"] or "–"
        tag    = "auto" if ds["auto"] else f"{C.YELLOW}manual{C.RESET}"
        print(f"  {ds['id']:<4}{ds['name']:<38}{status:<22}{size:>10}  {C.DIM}[{tag}]{C.RESET}")

    print()
    ready = sum(1 for r in results if r["exists"])
    total = len(results)
    if ready == total:
        print(f"  {C.BG_GREEN}{C.WHITE}{C.BOLD}  ALL {total} DATASETS READY  {C.RESET}")
    else:
        print(f"  {C.YELLOW}{ready}/{total} datasets ready{C.RESET}")
    print()

    return results


# ── interactive menu ─────────────────────────────────────────────────────────
def interactive_menu():
    """Let the user pick which datasets to download."""
    while True:
        results = print_status_table()
        missing = [r for r in results if not r["exists"]]

        if not missing:
            ok("Nothing left to download!\n")
            break

        print(f"  {C.BOLD}Options:{C.RESET}")
        print(f"     {C.DIM}[a]{C.RESET} Download {C.BOLD}all{C.RESET} missing datasets")
        for ds in missing:
            mode = "auto-download" if ds["auto"] else "manual placement"
            print(f"     {C.DIM}[{ds['id']}]{C.RESET} {ds['name']}  {C.DIM}({mode}){C.RESET}")
        print(f"     {C.DIM}[r]{C.RESET} Refresh status")
        print(f"     {C.DIM}[q]{C.RESET} Quit\n")

        choice = input(f"  {C.YELLOW}?{C.RESET}  Choose > ").strip().lower()

        if choice == "q":
            info("Bye!\n")
            break
        elif choice == "r":
            continue
        elif choice == "a":
            download_selected(missing, interactive=True)
        else:
            try:
                idx = int(choice)
                match = [d for d in DATASETS if d["id"] == idx]
                if match:
                    download_selected([dataset_status(match[0])], interactive=True)
                else:
                    fail("Invalid choice.")
            except ValueError:
                fail("Invalid choice.")


def download_selected(datasets: list, interactive: bool = True):
    """Download a list of datasets."""
    for i, ds in enumerate(datasets, 1):
        step(f"{i}/{len(datasets)}", ds["name"])
        print(f"     {C.DIM}{ds['description']}{C.RESET}")

        if ds.get("exists"):
            ok(f"Already present ({ds['size']})")
            continue

        if ds["auto"] and ds.get("slug"):
            download_kaggle_dataset(ds["slug"], ds["expected_file"], ds["name"])
        else:
            handle_manual_dataset(ds, interactive)


# ── CLI ──────────────────────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(
        description="PharmaLink Dataset Download Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--all",    action="store_true", help="Download everything (non-interactive)")
    p.add_argument("--verify", action="store_true", help="Only check dataset status")
    return p.parse_args()


def main():
    args = parse_args()
    banner()

    if args.verify:
        print_status_table()
        return

    interactive = not args.all

    if not setup_kaggle_credentials(interactive=interactive):
        if not args.verify:
            warn("Continuing without Kaggle auth – auto-downloads may fail.\n")

    if interactive:
        interactive_menu()
    else:
        all_ds = [dataset_status(d) for d in DATASETS]
        missing = [d for d in all_ds if not d["exists"]]
        if missing:
            download_selected(missing, interactive=False)
        else:
            ok("All datasets already present.")

    # Final summary
    divider("Final Summary")
    results = print_status_table()
    ready = sum(1 for r in results if r["exists"])
    if ready == len(results):
        print(f"  {C.GREEN}{C.BOLD}→ Next step:{C.RESET}  python drug_interactions_model_train.py\n")
    else:
        print(f"  {C.YELLOW}→ Some datasets still missing. Re-run when ready.{C.RESET}\n")


if __name__ == "__main__":
    main()
