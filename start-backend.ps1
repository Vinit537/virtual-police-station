$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$jarPath = Join-Path $root 'backend\target\vps-backend-1.0.0.jar'
$javaCmd = Get-Command java -ErrorAction SilentlyContinue

if (!(Test-Path $jarPath)) {
    throw "Backend jar not found at $jarPath. Build the backend first."
}
if ($null -eq $javaCmd) {
    throw "Java was not found in PATH. Install Java 21+ and try again."
}

Set-Location $backendDir
Write-Host "Starting backend on http://localhost:8080 ..."
& $javaCmd.Source -jar $jarPath
