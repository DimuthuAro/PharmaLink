Write-Host "🧹 Starting Pharmalink Project Cleanup..."

# Python cache
Write-Host "Removing Python cache files..."
Get-ChildItem -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Get-ChildItem -Recurse -File -Filter "*.pyc" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

Get-ChildItem -Recurse -Directory -Filter ".pytest_cache" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Jupyter checkpoints
Write-Host "Removing Jupyter checkpoints..."
Get-ChildItem -Recurse -Directory -Filter ".ipynb_checkpoints" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# OS-specific files
Write-Host "Removing OS-specific files..."
Get-ChildItem -Recurse -File -Filter ".DS_Store" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

Get-ChildItem -Recurse -File -Filter "Thumbs.db" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

# Build artifacts
Write-Host "Removing build artifacts..."
Remove-Item -Recurse -Force frontend/dist, frontend/build, frontend/.cache `
    -ErrorAction SilentlyContinue

Remove-Item -Recurse -Force backend/dist, backend/build `
    -ErrorAction SilentlyContinue

# Logs
Write-Host "Removing log files..."
Get-ChildItem -Recurse -File -Filter "*.log" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

# Create archive directories
Write-Host "Creating archive directory..."
New-Item -ItemType Directory -Force -Path archive/raw_data | Out-Null
New-Item -ItemType Directory -Force -Path archive/notebooks | Out-Null

# Create model directories
Write-Host "Creating model directories..."
New-Item -ItemType Directory -Force -Path model | Out-Null
New-Item -ItemType Directory -Force -Path ml_service/models | Out-Null

Write-Host "✅ Cleanup complete!"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review data/ directory - keep only essential processed files"
Write-Host "2. Move artifacts/ to archive/ if data is complete"
Write-Host "3. Verify .gitignore is properly configured"
Write-Host "4. Run: git status to see what changed"
