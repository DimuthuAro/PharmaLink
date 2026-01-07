GOT-OCR2.0 Download Helper
==========================

This small helper provides direct download links for GOT-OCR2.0 model files and a script to download them with resume support.

Files and links included (as provided):

- model-00001-of-00003.safetensors: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model-00001-of-00003.safetensors
- model-00002-of-00003.safetensors: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model-00002-of-00003.safetensors
- model-00003-of-00003.safetensors: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model-00003-of-00003.safetensors
- config.json: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/config.json
- tokenizer.json: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/tokenizer.json
- model.safetensors.index.json: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/model.safetensors.index.json
- generation_config.json: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/generation_config.json
- special_tokens_map.json: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/special_tokens_map.json
- tokenizer_config: https://huggingface.co/stepfun-ai/GOT-OCR2_0/resolve/main/tokenizer_config

Usage
-----

From the `ml_service` folder run:

```bash
python download_got_ocr.py --outdir models/GOT-OCR2_0
```

Notes
-----
- The last file in the original list was provided as `tokenizer_config` without an extension; the script uses the exact provided link.
- Downloads are large (~7GB total). Ensure you have sufficient disk space and a stable network connection.
- If Hugging Face requires authentication for your environment, use a token-aware URL or `HUGGINGFACE_TOKEN`-based approach (not implemented here).
