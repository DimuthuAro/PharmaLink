"""Download GOT-OCR2.0 model files (direct links).

Usage:
  python download_got_ocr.py --outdir models/GOT-OCR2_0

This script supports resuming partial downloads and shows progress.
"""
from __future__ import annotations
import os
import sys
import argparse
import httpx
from time import sleep

FILES = [
    ("model-00001-of-00003.safetensors","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model-00001-of-00003.safetensors"),
    ("model-00002-of-00003.safetensors","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model-00002-of-00003.safetensors"),
    ("model-00003-of-00003.safetensors","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model-00003-of-00003.safetensors"),
    ("config.json","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/config.json"),
    ("tokenizer.json","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/tokenizer.json"),
    ("model.safetensors.index.json","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model.safetensors.index.json"),
    ("generation_config.json","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/generation_config.json"),
    ("special_tokens_map.json","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/special_tokens_map.json"),
    ("tokenizer_config","https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/tokenizer_config"),
]

CHUNK_SIZE = 8192

def format_size(n: int) -> str:
    for unit in ["B","KB","MB","GB"]:
        if n < 1024.0:
            return f"{n:.2f}{unit}"
        n /= 1024.0
    return f"{n:.2f}TB"

def download(url: str, dest: str) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    temp = dest + ".part"
    resume_pos = 0
    if os.path.exists(dest):
        print(f"Already exists: {dest}")
        return
    if os.path.exists(temp):
        resume_pos = os.path.getsize(temp)

    headers = {"User-Agent": "ml_service-downloader/1.0"}
    if resume_pos:
        headers["Range"] = f"bytes={resume_pos}-"

    with httpx.stream("GET", url, headers=headers, timeout=None, follow_redirects=True) as r:
        try:
            r.raise_for_status()
        except Exception as e:
            print(f"Failed to start download for {url}: {e}")
            return

        total = None
        if "content-range" in r.headers:
            cr = r.headers.get("content-range")
            try:
                total = int(cr.split("/")[-1])
            except Exception:
                total = None
        else:
            try:
                total = int(r.headers.get("content-length", "0"))
                if total == 0:
                    total = None
            except Exception:
                total = None

        mode = "ab" if resume_pos else "wb"
        downloaded = resume_pos
        with open(temp, mode) as fh:
            for chunk in r.iter_bytes(CHUNK_SIZE):
                if not chunk:
                    continue
                fh.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    print(f"\r{os.path.basename(dest)} {format_size(downloaded)}/{format_size(total)} ({pct:.2f}%)", end="", flush=True)
                else:
                    print(f"\r{os.path.basename(dest)} {format_size(downloaded)} downloaded", end="", flush=True)
        print()
    os.replace(temp, dest)

def main(argv=None):
    p = argparse.ArgumentParser(description="Download GOT-OCR2.0 model files")
    p.add_argument("--outdir", "-o", default="models/GOT-OCR2_0", help="Output directory")
    args = p.parse_args(argv)

    for fname, url in FILES:
        out_path = os.path.join(args.outdir, fname)
        print(f"Downloading {fname} -> {out_path}")
        try:
            download(url, out_path)
        except KeyboardInterrupt:
            print("\nInterrupted by user.")
            sys.exit(1)
        except Exception as e:
            print(f"Error downloading {fname}: {e}")
            # small backoff then continue next file
            sleep(1)

    print("All done.")

if __name__ == "__main__":
    main()
