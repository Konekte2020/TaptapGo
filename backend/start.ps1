# Demarre le serveur backend TapTapGo (Windows)
# Cherche: venv du projet, puis py/python dans PATH, puis Python dans les chemins Windows courants.

$port = 8000
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$pythonExe = $null
$how = ""

# 1. Venv du projet (backend\venv, backend\.venv, ou racine)
$p1 = Join-Path $scriptDir "venv\Scripts\python.exe"
$p2 = Join-Path $scriptDir ".venv\Scripts\python.exe"
$p3 = Join-Path $rootDir "venv\Scripts\python.exe"
$p4 = Join-Path $rootDir ".venv\Scripts\python.exe"
foreach ($p in @($p1,$p2,$p3,$p4)) {
    if (Test-Path -LiteralPath $p) {
        $pythonExe = $p
        $how = "venv"
        break
    }
}

# 2. Commandes dans le PATH (py, python, python3)
if (-not $pythonExe) {
    $pathCommands = @("py", "python", "python3")
    foreach ($cmd in $pathCommands) {
        $exe = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($exe) {
            $pythonExe = $exe.Source
            $how = $cmd
            break
        }
    }
}

# 3. Chemins Windows courants (Python installe mais pas dans le PATH de ce terminal)
if (-not $pythonExe) {
    $pythonCandidates = @()
    $roots = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Python"),
        (Join-Path $env:ProgramFiles "Python311"),
        (Join-Path $env:ProgramFiles "Python312"),
        (Join-Path $env:ProgramFiles "Python313"),
        (Join-Path $env:ProgramFiles "Python310")
    )
    foreach ($root in $roots) {
        if (-not $root) { continue }
        $exe = Join-Path $root "python.exe"
        if (Test-Path $exe) { $pythonCandidates += $exe }
    }
    # Sous-dossiers (Python311, Python312, etc.) dans LocalAppData
    $pyRoot = Join-Path $env:LOCALAPPDATA "Programs\Python"
    if (Test-Path $pyRoot) {
        Get-ChildItem $pyRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $exe = Join-Path $_.FullName "python.exe"
            if (Test-Path $exe) { $pythonCandidates += $exe }
        }
    }
    if ($pythonCandidates.Count -gt 0) {
        $pythonExe = $pythonCandidates[0]
        $how = "chemin Windows"
    }
}

if (-not $pythonExe) {
    Write-Host ""
    Write-Host "Erreur: Python introuvable." -ForegroundColor Red
    Write-Host ""
    Write-Host "Si le projet marchait hier:" -ForegroundColor Yellow
    Write-Host "  - Fermez Cursor completement et rouvrez-le (pour rafraichir le PATH)." -ForegroundColor White
    Write-Host "  - Ou ouvrez un nouveau terminal PowerShell en dehors de Cursor et lancez: .\start.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Sinon: installez Python depuis https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  et cochez [x] Add python.exe to PATH. Puis redemarrez le terminal." -ForegroundColor White
    Write-Host ""
    Write-Host "Voir: backend\README.md" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Set-Location $scriptDir
Write-Host "Python trouve ($how). Demarrage du serveur (port $port)..." -ForegroundColor Green
& $pythonExe -m uvicorn server:app --reload --host 0.0.0.0 --port $port
