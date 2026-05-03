# PowerShell script to install ML service dependencies
# Works around SSL issues by using alternative methods

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PharmaLink ML Service Dependency Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if running as admin (not required but helpful)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "Note: Running without admin privileges. Some packages may fail to install." -ForegroundColor Yellow
}

# Method 1: Try standard pip first
Write-Host "`nMethod 1: Attempting standard pip install..." -ForegroundColor Yellow

$packages = @(
    "uvicorn[standard]>=0.24.0",
    "easyocr>=1.7.0",
    "sentencepiece>=0.1.99",
    "accelerate>=0.25.0",
    "huggingface-hub>=0.19.0"
)

foreach ($pkg in $packages) {
    Write-Host "Installing $pkg..." -ForegroundColor Cyan
    try {
        pip install $pkg --trusted-host pypi.org --trusted-host files.pythonhosted.org --timeout 300
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $pkg installed successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ $pkg failed to install" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error installing ${pkg}: $_" -ForegroundColor Red
    }
}

# Method 2: Check what's installed
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Checking installed packages..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$required = @("torch", "transformers", "openai", "ultralytics", "uvicorn", "easyocr", "sentencepiece")
foreach ($mod in $required) {
    try {
        $version = python -c "import $mod; print($mod.__version__)" 2>$null
        if ($version) {
            Write-Host "✓ $mod $version" -ForegroundColor Green
        } else {
            Write-Host "✗ $mod not found" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $mod not installed" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNote: If some packages failed due to SSL issues:" -ForegroundColor Yellow
Write-Host "1. Download .whl files manually from https://pypi.org/" -ForegroundColor White
Write-Host "2. Install with: pip install <filename>.whl" -ForegroundColor White
Write-Host "`nAlternative: Use the new 4-stage pipeline which only requires:" -ForegroundColor Green
Write-Host "- torch, transformers, openai, ultralytics (already installed)" -ForegroundColor Green
