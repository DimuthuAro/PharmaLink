<#
.SYNOPSIS
    PharmaLink Demo Pack Script
    Collects all large/gitignored files into demo_resources/ for easy sharing.

.DESCRIPTION
    Run this script to package all large files (models, datasets, artifacts)
    into the demo_resources/ folder. Share this single folder for demo setup.

.USAGE
    .\pack_demo.ps1
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DemoDir = Join-Path $ProjectRoot "demo_resources"

function Green  { param([string]$msg) Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Info   { param([string]$msg) Write-Host "  [..] $msg" -ForegroundColor Cyan }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PharmaLink Demo Pack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Helper: pack files matching patterns ─────────────────
function Pack-Files {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$Patterns,
        [string]$Label
    )

    if (-not (Test-Path $Source)) {
        Write-Host "  [SKIP] $Label source not found" -ForegroundColor Yellow
        return
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    }

    $packed = 0
    foreach ($pattern in $Patterns) {
        Get-ChildItem -Path $Source -Filter $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item -Force $_.FullName (Join-Path $Destination $_.Name)
            $packed++
        }
    }

    if ($packed -gt 0) {
        Green "${Label}: $packed files"
    }
}

# ── 1. Pack artifacts (large JSON/CSV/XLSX) ──────────────
Write-Host "1. Packing artifacts..." -ForegroundColor White
$artifactNames = @(
    "brand_similarity_index.json",
    "brand_comparison_database.json",
    "generic_to_brands.json",
    "drug_interaction_db.json",
    "drug_search_index.json",
    "drug_names_database.json",
    "db_drug_interactions.csv",
    "MID.xlsx"
)
$destArtifacts = Join-Path $DemoDir "artifacts"
if (-not (Test-Path $destArtifacts)) { New-Item -ItemType Directory -Force -Path $destArtifacts | Out-Null }
$packed = 0
foreach ($name in $artifactNames) {
    $src = Join-Path $ProjectRoot "artifacts\$name"
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $destArtifacts $name)
        $packed++
    }
}
Green "artifacts - $packed files"

# ── 2. Pack data (large CSVs) ───────────────────────────
Write-Host "2. Packing data..." -ForegroundColor White
$dataNames = @(
    "drug_clean.csv",
    "food_drug_pairs_silver.csv",
    "symptom_dataset.csv",
    "drug_interactions_final.csv",
    "brand_features.csv",
    "food_drug_pairs_train.csv"
)
$destData = Join-Path $DemoDir "data"
if (-not (Test-Path $destData)) { New-Item -ItemType Directory -Force -Path $destData | Out-Null }
$packed = 0
foreach ($name in $dataNames) {
    $src = Join-Path $ProjectRoot "data\$name"
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $destData $name)
        $packed++
    }
}
Green "data - $packed files"

# ── 3. Pack model/ (Apsara models) ──────────────────────
Write-Host "3. Packing model/ (pkl/pth/json)..." -ForegroundColor White
Pack-Files `
    -Source (Join-Path $ProjectRoot "model") `
    -Destination (Join-Path $DemoDir "model") `
    -Patterns @("*.pkl", "*.pth", "*.json") `
    -Label "model"

# ── 4. Pack ml_service/models/ ──────────────────────────
Write-Host "4. Packing ml_service/models/..." -ForegroundColor White
Pack-Files `
    -Source (Join-Path $ProjectRoot "ml_service\models") `
    -Destination (Join-Path $DemoDir "ml_service\models") `
    -Patterns @("*.pkl", "*.pth", "*.json") `
    -Label "ml_service/models"

# ── 5. Pack dataset (drug images) ───────────────────────
Write-Host "5. Packing dataset (images)..." -ForegroundColor White
$datasetSrc = Join-Path $ProjectRoot "dataset"
$datasetDst = Join-Path $DemoDir "dataset"
if (Test-Path $datasetSrc) {
    if (-not (Test-Path $datasetDst)) { New-Item -ItemType Directory -Force -Path $datasetDst | Out-Null }
    Copy-Item -Recurse -Force "$datasetSrc\*" $datasetDst
    $imgCount = (Get-ChildItem -Recurse -File $datasetDst | Measure-Object).Count
    Green "dataset - $imgCount images"
} else {
    Write-Host "  [SKIP] dataset/ not found" -ForegroundColor Yellow
}

# ── Summary ──────────────────────────────────────────────
Write-Host ""
$totalSize = (Get-ChildItem -Recurse -File $DemoDir | Measure-Object -Property Length -Sum).Sum
$totalMB = [math]::Round($totalSize / 1MB, 2)
$totalGB = [math]::Round($totalSize / 1GB, 2)

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Pack Complete!" -ForegroundColor Green
Write-Host "  Total size: ${totalGB} GB (${totalMB} MB)" -ForegroundColor Green
Write-Host "  Location: $DemoDir" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Share this folder for demo setup." -ForegroundColor White
Write-Host "  Recipient runs: .\setup_demo.ps1" -ForegroundColor Cyan
Write-Host ""
