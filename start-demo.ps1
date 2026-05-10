# ============================================================
#  Doyuran Guvec - Tek Tikla Demo Baslatici
#  Backend (FastAPI) + Frontend (React) + Printer Service
# ============================================================

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

# -- Renkli banner --
Write-Host ""
Write-Host "  +===============================================+" -ForegroundColor DarkYellow
Write-Host "  |       DOYURAN GUVEC - Demo Baslatici         |" -ForegroundColor DarkYellow
Write-Host "  +===============================================+" -ForegroundColor DarkYellow
Write-Host ""

$backendDir   = Join-Path $ROOT "backend"
$frontendDir  = Join-Path $ROOT "frontend"
$printerDir   = Join-Path $ROOT "printer_service"
$venvPython   = Join-Path $backendDir "venv\Scripts\python.exe"

# -- Kontroller --
if (-not (Test-Path $venvPython)) {
    Write-Host "  [HATA] Backend venv bulunamadi: $venvPython" -ForegroundColor Red
    Write-Host "  Once:  cd backend; python -m venv venv; venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    Read-Host "  Devam etmek icin ENTER"
    exit 1
}

$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "  [HATA] Frontend node_modules bulunamadi." -ForegroundColor Red
    Write-Host "  Once:  cd frontend; npm install" -ForegroundColor Yellow
    Read-Host "  Devam etmek icin ENTER"
    exit 1
}

# -- PID takibi --
$pids = @()

try {
    # ----------------------------------------
    # 1) BACKEND  (uvicorn :8000)
    # ----------------------------------------
    Write-Host "  [1/3] Backend baslatiliyor..." -ForegroundColor Cyan
    $backendProc = Start-Process -FilePath $venvPython `
        -ArgumentList "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload" `
        -WorkingDirectory $backendDir `
        -WindowStyle Normal `
        -PassThru
    $pids += $backendProc.Id
    Write-Host "  [OK]  Backend PID: $($backendProc.Id)" -ForegroundColor Green

    # Backend hazir olana kadar bekle
    Write-Host "  Bekleniyor: Backend hazir olana kadar..." -ForegroundColor Gray
    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:8000/api/menu/today" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            $ready = $true
            break
        } catch { }
    }
    if ($ready) {
        Write-Host "  [OK]  Backend hazir! (http://localhost:8000)" -ForegroundColor Green
    } else {
        Write-Host "  [UYARI] Backend henuz yanit vermiyor, yine de devam ediliyor..." -ForegroundColor Yellow
    }

    # ----------------------------------------
    # 2) FRONTEND  (React :3000)
    # ----------------------------------------
    Write-Host "  [2/3] Frontend baslatiliyor..." -ForegroundColor Cyan

    $frontendProc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "set BROWSER=none && npm start" `
        -WorkingDirectory $frontendDir `
        -WindowStyle Normal `
        -PassThru
    $pids += $frontendProc.Id
    Write-Host "  [OK]  Frontend PID: $($frontendProc.Id)  (http://localhost:3000)" -ForegroundColor Green

    # ----------------------------------------
    # 3) PRINTER SERVICE
    # ----------------------------------------
    Write-Host "  [3/3] Yazici servisi baslatiliyor..." -ForegroundColor Cyan
    $printerProc = Start-Process -FilePath $venvPython `
        -ArgumentList "main.py" `
        -WorkingDirectory $printerDir `
        -WindowStyle Normal `
        -PassThru
    $pids += $printerProc.Id
    Write-Host "  [OK]  Printer Service PID: $($printerProc.Id)" -ForegroundColor Green

    # -- Ozet --
    Write-Host ""
    Write-Host "  +------------------------------------------+" -ForegroundColor Green
    Write-Host "  |  Tum servisler baslatildi!               |" -ForegroundColor Green
    Write-Host "  |                                          |" -ForegroundColor Green
    Write-Host "  |  Backend :  http://localhost:8000         |" -ForegroundColor Green
    Write-Host "  |  Frontend:  http://localhost:3000         |" -ForegroundColor Green
    Write-Host "  |  Yazici  :  Arka planda calisiyor        |" -ForegroundColor Green
    Write-Host "  |                                          |" -ForegroundColor Green
    Write-Host "  |  Kapatmak icin bu pencerede ENTER bas    |" -ForegroundColor Green
    Write-Host "  +------------------------------------------+" -ForegroundColor Green
    Write-Host ""

    # Tarayiciyi ac
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"

    # Kullanici ENTER basana kadar bekle
    Read-Host "  Kapatmak icin ENTER"

} finally {
    # -- Temizlik: tum alt surecleri kapat --
    Write-Host ""
    Write-Host "  Servisler kapatiliyor..." -ForegroundColor Yellow
    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc -and -not $proc.HasExited) {
                # cmd.exe altinda calisan node surecini de yakala
                Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $pid } | ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "  [X] PID $pid kapatildi." -ForegroundColor DarkGray
            }
        } catch { }
    }
    Write-Host "  Tum servisler durduruldu. Gule gule!" -ForegroundColor Green
    Write-Host ""
}
