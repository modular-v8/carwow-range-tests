$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$url = 'http://127.0.0.1:8775/?live=1'
try {
    $existing = Invoke-RestMethod 'http://127.0.0.1:8775/api/data' -TimeoutSec 2
    if ($existing.app -eq 'range-observatory-swiss') { Start-Process $url; exit 0 }
} catch { }
$candidates = @((Join-Path $projectRoot '.venv\Scripts\python.exe'), (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'))
$systemPython = Get-Command python -ErrorAction SilentlyContinue
if ($systemPython) { $candidates += $systemPython.Source }
foreach ($candidate in $candidates) {
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    & $candidate -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('openpyxl') else 1)"
    if ($LASTEXITCODE -ne 0) { continue }
    & $candidate (Join-Path $PSScriptRoot 'serve_comparison.py') --open
    exit $LASTEXITCODE
}
Write-Host 'Install Python and the dependencies listed in the root README, then run Start Dashboard.cmd again.'
exit 1
