# PharmaLink FastAPI ML Server

Use this script to start the FastAPI ML backend on the local network.

## Run locally

```powershell
cd app
python run_server.py
```

## Override host or port

```powershell
cd app
$env:FASTAPI_HOST = "0.0.0.0"
$env:FASTAPI_PORT = "8000"
python run_server.py
```

## Why this matters

The Expo mobile app needs the ML backend to be reachable from your phone. Running on `0.0.0.0` exposes the server on your machine's LAN IP, for example `http://192.168.8.163:8000`.
