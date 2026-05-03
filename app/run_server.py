import os

import uvicorn

if __name__ == "__main__":
    host = os.environ.get("FASTAPI_HOST", "0.0.0.0")
    port = int(os.environ.get("FASTAPI_PORT", "8000"))
    reload = os.environ.get("FASTAPI_RELOAD", "true").lower() in ("1", "true", "yes")

    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )
