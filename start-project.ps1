$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendScript = Join-Path $root 'start-backend.ps1'
$frontendScript = Join-Path $root 'start-frontend.ps1'

Start-Process -FilePath 'powershell.exe' -ArgumentList '-ExecutionPolicy', 'Bypass', '-File', $backendScript -WorkingDirectory $root
Start-Sleep -Seconds 4
Start-Process -FilePath 'powershell.exe' -ArgumentList '-ExecutionPolicy', 'Bypass', '-File', $frontendScript -WorkingDirectory $root

Write-Host 'Backend started in a new PowerShell window.'
Write-Host 'Frontend started in a new PowerShell window.'
Write-Host 'Open http://localhost:5173 after both servers finish starting.'
