Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Get-NetTCPConnection -LocalPort 5199 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 800
$env:PORT='5199'
$p = Start-Process -FilePath 'node' -ArgumentList 'server.js' -RedirectStandardOutput 'server_out.log' -RedirectStandardError 'server_err.log' -PassThru
$ok = $null
for ($i=0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  try { $ok = Invoke-RestMethod -Uri 'http://localhost:5199/api/health' -Method Get -TimeoutSec 2; break } catch {}
}
Write-Output ('HEALTH=' + $ok.ok)