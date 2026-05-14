$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $root

$bootstrap = Join-Path $root 'bootstrap.ps1'
$backend = Join-Path $root 'run-backend.ps1'
$frontend = Join-Path $root 'run-frontend.ps1'
$composeFile = Join-Path $projectRoot 'docker-compose.runtime.yml'

& $bootstrap

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is required for MySQL runtime. Install Docker Desktop and rerun.'
}

Write-Host 'Starting MySQL container...'
& docker compose -f $composeFile up -d

Start-Process -FilePath 'powershell.exe' -ArgumentList '-ExecutionPolicy', 'Bypass', '-File', $backend -WorkingDirectory $projectRoot
Start-Sleep -Seconds 4
Start-Process -FilePath 'powershell.exe' -ArgumentList '-ExecutionPolicy', 'Bypass', '-File', $frontend -WorkingDirectory $projectRoot

Write-Host 'Backend started in a new PowerShell window.'
Write-Host 'Frontend started in a new PowerShell window.'
Write-Host 'Open http://localhost:5173 after both servers finish starting.'
