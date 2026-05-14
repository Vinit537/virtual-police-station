$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root 'frontend'
$nodeModulesDir = Join-Path $frontendDir 'node_modules'
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue

if (!(Test-Path $nodeModulesDir)) {
    throw "frontend\\node_modules is missing. Run npm install inside the frontend folder first."
}
if ($null -eq $npmCmd) {
    throw "npm was not found in PATH. Install Node.js 20+ and try again."
}

Set-Location $frontendDir
Write-Host "Starting frontend on http://localhost:5173 ..."
& $npmCmd.Source run dev -- --host localhost --port 5173
