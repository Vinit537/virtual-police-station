$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $root
$frontendDir = Join-Path $projectRoot 'frontend'

Set-Location $frontendDir
Write-Host 'Starting frontend on http://localhost:5173 ...'
npm run dev -- --host localhost --port 5173
