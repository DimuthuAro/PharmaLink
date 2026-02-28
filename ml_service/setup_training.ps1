# PharmaLink ML Model Training - Setup Script
# Creates necessary directories and provides setup instructions

$ErrorActionPreference = "Continue"

Write-Host "`n" -NoNewline
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 58) -ForegroundColor Cyan
Write-Host "  PHARMALINK ML - MODEL TRAINING SETUP" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""

# Get base directory
$baseDir = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $baseDir "artifacts"
$dataDir = Join-Path $baseDir "data"
$modelsDir = Join-Path $PSScriptRoot "models"

Write-Host "Base Directory: " -NoNewline -ForegroundColor Yellow
Write-Host $baseDir -ForegroundColor White

# Create directories
Write-Host "`nCreating directories..." -ForegroundColor Yellow

$dirs = @($artifactsDir, $dataDir, $modelsDir)
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: " -NoNewline -ForegroundColor Green
        Write-Host $dir
    } else {
        Write-Host "  Exists:  " -NoNewline -ForegroundColor Gray
        Write-Host $dir
    }
}

# Check for kaggle.json
Write-Host "`nChecking Kaggle credentials..." -ForegroundColor Yellow
$kaggleJson = Join-Path $artifactsDir "kaggle.json"

if (Test-Path $kaggleJson) {
    Write-Host "  " -NoNewline
    Write-Host "✅ Found: " -NoNewline -ForegroundColor Green
    Write-Host "kaggle.json"
} else {
    Write-Host "  " -NoNewline
    Write-Host "❌ Missing: " -NoNewline -ForegroundColor Red
    Write-Host "kaggle.json"
    Write-Host ""
    Write-Host "  To download datasets, you need Kaggle credentials:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://www.kaggle.com/account" -ForegroundColor White
    Write-Host "  2. Scroll to 'API' section" -ForegroundColor White
    Write-Host "  3. Click 'Create New Token'" -ForegroundColor White
    Write-Host "  4. Save downloaded kaggle.json to:" -ForegroundColor White
    Write-Host "     $kaggleJson" -ForegroundColor Cyan
}

# Check Python
Write-Host "`nChecking Python environment..." -ForegroundColor Yellow

try {
    $pythonVersion = python --version 2>&1
    Write-Host "  " -NoNewline
    Write-Host "✅ " -NoNewline -ForegroundColor Green
    Write-Host $pythonVersion
} catch {
    Write-Host "  " -NoNewline
    Write-Host "❌ Python not found" -ForegroundColor Red
    Write-Host "  Please install Python 3.8 or higher" -ForegroundColor Yellow
}

# Check dependencies
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow

$requiredPackages = @("pandas", "scikit-learn", "joblib", "kaggle", "openpyxl")
$missingPackages = @()

foreach ($package in $requiredPackages) {
    $check = python -c "import $package" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  " -NoNewline
        Write-Host "✅ " -NoNewline -ForegroundColor Green
        Write-Host $package
    } else {
        Write-Host "  " -NoNewline
        Write-Host "❌ " -NoNewline -ForegroundColor Red
        Write-Host $package -NoNewline
        Write-Host " (missing)" -ForegroundColor Gray
        $missingPackages += $package
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host "`n  To install missing packages:" -ForegroundColor Yellow
    Write-Host "  cd ml_service" -ForegroundColor White
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Cyan
}

# Directory status
Write-Host "`n" -NoNewline
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host "DIRECTORY STATUS" -ForegroundColor Yellow
Write-Host ("=" * 60) -ForegroundColor Gray

Write-Host "📁 Artifacts: " -NoNewline -ForegroundColor White
Write-Host $artifactsDir -ForegroundColor Cyan
if (Test-Path $artifactsDir) {
    $artifactFiles = Get-ChildItem $artifactsDir -File | Select-Object -ExpandProperty Name
    if ($artifactFiles.Count -gt 0) {
        foreach ($file in $artifactFiles) {
            Write-Host "   - $file" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (empty)" -ForegroundColor Gray
    }
}

Write-Host "📁 Models: " -NoNewline -ForegroundColor White
Write-Host $modelsDir -ForegroundColor Cyan
if (Test-Path $modelsDir) {
    $modelFiles = Get-ChildItem $modelsDir -File | Select-Object -ExpandProperty Name
    if ($modelFiles.Count -gt 0) {
        foreach ($file in $modelFiles) {
            $size = (Get-Item (Join-Path $modelsDir $file)).Length / 1MB
            Write-Host "   - $file " -NoNewline -ForegroundColor Gray
            Write-Host "($([math]::Round($size, 2)) MB)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "   (no models yet)" -ForegroundColor Gray
    }
}

Write-Host "📁 Data: " -NoNewline -ForegroundColor White
Write-Host $dataDir -ForegroundColor Cyan
if (Test-Path $dataDir) {
    $dataFiles = Get-ChildItem $dataDir -File | Select-Object -ExpandProperty Name
    if ($dataFiles.Count -gt 0) {
        foreach ($file in $dataFiles) {
            Write-Host "   - $file" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (empty)" -ForegroundColor Gray
    }
}

# Next steps
Write-Host "`n" -NoNewline
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host "NEXT STEPS" -ForegroundColor Yellow
Write-Host ("=" * 60) -ForegroundColor Gray

Write-Host ""
Write-Host "1. Install dependencies (if not done):" -ForegroundColor Green
Write-Host "   cd ml_service" -ForegroundColor White
Write-Host "   pip install -r requirements.txt" -ForegroundColor Cyan

Write-Host ""
Write-Host "2. Download datasets:" -ForegroundColor Green
Write-Host "   python download_datasets.py" -ForegroundColor Cyan

Write-Host ""
Write-Host "3. Train model:" -ForegroundColor Green
Write-Host "   python drug_interactions_model_train.py" -ForegroundColor Cyan

Write-Host ""
Write-Host "📖 For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "   ml_service/TRAINING_GUIDE.md" -ForegroundColor Cyan

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host ""
