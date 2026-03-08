<#
.SYNOPSIS
    PharmaLink Demo Setup Script
    Distributes large files from demo_resources/ to their expected project locations.

.DESCRIPTION
    After cloning the repo, place the demo_resources/ folder at the project root
    and run this script. It copies all models, datasets, and artifacts to their
    correct locations so the system is ready for demonstration.

.USAGE
    .\setup_demo.ps1
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DemoDir = Join-Path $ProjectRoot "demo_resources"

# ── Colours ──────────────────────────────────────────────
function Green  { param([string]$msg) Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Yellow { param([string]$msg) Write-Host "  [SKIP] $msg" -ForegroundColor Yellow }
function Red    { param([string]$msg) Write-Host "  [ERR] $msg" -ForegroundColor Red }
function Info   { param([string]$msg) Write-Host "  [..] $msg" -ForegroundColor Cyan }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PharmaLink Demo Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $DemoDir)) {
    Red "demo_resources/ folder not found at: $DemoDir"
    Write-Host ""
    Write-Host "  To set up for demo:" -ForegroundColor White
    Write-Host "    1. Get the demo_resources/ folder (USB / Google Drive / shared location)"
    Write-Host "    2. Place it at the project root: $ProjectRoot"
    Write-Host "    3. Run this script again"
    Write-Host ""
    exit 1
}

# ── Helper: copy folder contents ─────────────────────────
function Copy-DemoFiles {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (-not (Test-Path $Source)) {
        Yellow "$Label source not found: $Source"
        return
    }

    # Create destination if needed
    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    }

    $files = Get-ChildItem -Path $Source -File -ErrorAction SilentlyContinue
    $copied = 0
    $failed = 0

    foreach ($file in $files) {
        $dest = Join-Path $Destination $file.Name
        try {
            Copy-Item -Force $file.FullName $dest -ErrorAction Stop
            $copied++
        } catch {
            # File may be locked by another process - try robocopy fallback
            try {
                $null = robocopy (Split-Path $file.FullName) $Destination $file.Name /R:1 /W:1 /NJH /NJS /NDL /NFL 2>&1
                $copied++
            } catch {
                Red "Failed to copy $($file.Name) - file may be in use"
                $failed++
            }
        }
    }

    if ($copied -gt 0) {
        Green "${Label}: $copied files"
    } else {
        Yellow "${Label}: no files to copy"
    }
    if ($failed -gt 0) {
        Yellow "${Label}: $failed files skipped (locked)"
    }
}

# ── 1. Artifacts ─────────────────────────────────────────
Write-Host "1. Artifacts (JSON databases, CSV references)" -ForegroundColor White
Copy-DemoFiles `
    -Source (Join-Path $DemoDir "artifacts") `
    -Destination (Join-Path $ProjectRoot "artifacts") `
    -Label "artifacts"

# ── 2. Data (large CSVs) ────────────────────────────────
Write-Host "2. Data (training CSVs, drug/food datasets)" -ForegroundColor White
Copy-DemoFiles `
    -Source (Join-Path $DemoDir "data") `
    -Destination (Join-Path $ProjectRoot "data") `
    -Label "data"

# ── 3. Model (Apsara ML models) ─────────────────────────
Write-Host "3. Model (Apsara trained models - pkl/pth)" -ForegroundColor White
Copy-DemoFiles `
    -Source (Join-Path $DemoDir "model") `
    -Destination (Join-Path $ProjectRoot "model") `
    -Label "model"

# ── 4. ML Service Models ────────────────────────────────
Write-Host "4. ML Service Models (microservice pkl files)" -ForegroundColor White
Copy-DemoFiles `
    -Source (Join-Path $DemoDir "ml_service\models") `
    -Destination (Join-Path $ProjectRoot "ml_service\models") `
    -Label "ml_service/models"

# ── 5. Dataset (drug images) ────────────────────────────
Write-Host "5. Dataset (drug classification images)" -ForegroundColor White
$datasetSrc = Join-Path $DemoDir "dataset"
$datasetDst = Join-Path $ProjectRoot "dataset"
if (Test-Path $datasetSrc) {
    if (-not (Test-Path $datasetDst)) {
        New-Item -ItemType Directory -Force -Path $datasetDst | Out-Null
    }
    Copy-Item -Recurse -Force "$datasetSrc\*" $datasetDst
    $imgCount = (Get-ChildItem -Recurse -File $datasetDst | Measure-Object).Count
    Green "dataset - $imgCount images (train/test/val)"
} else {
    Yellow "dataset source not found"
}

# ── Summary ──────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  You can now start the system:" -ForegroundColor White
Write-Host "    .\Start.ps1" -ForegroundColor Cyan
Write-Host ""
