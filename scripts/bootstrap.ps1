$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $root
$toolsDir = Join-Path $projectRoot '.tools'

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Get-JavaMajorVersion() {
  if (-not (Test-Command 'java')) { return $null }
  $output = & java -version 2>&1
  if ($output.Count -eq 0) { return $null }
  $line = $output[0]
  if ($line -match '"(?<version>\d+)(\.(?<minor>\d+))?.*"') {
    return [int]$Matches['version']
  }
  return $null
}

function Ensure-Winget() {
  if (Test-Command 'winget') { return $true }
  Write-Warning 'winget not found. Automatic runtime installation may be limited.'
  return $false
}

function Ensure-Node() {
  if (Test-Command 'node' -and (Test-Command 'npm.cmd')) { return }
  if (Ensure-Winget) {
    Write-Host 'Installing Node.js LTS via winget...'
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  }
  if (-not (Test-Command 'node')) {
    throw 'Node.js is not installed. Install Node.js 20+ and rerun.'
  }
}

function Ensure-Java() {
  $major = Get-JavaMajorVersion
  if ($major -ge 21) { return }
  if (Ensure-Winget) {
    Write-Host 'Installing Java 21 (Temurin) via winget...'
    winget install -e --id EclipseAdoptium.Temurin.21.JDK --accept-source-agreements --accept-package-agreements
  }
  $major = Get-JavaMajorVersion
  if ($major -lt 21) {
    throw 'Java 21+ is required. Install it and rerun.'
  }
}

function Ensure-Maven() {
  if (Test-Command 'mvn.cmd') { return }

  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  $mavenZip = Join-Path $toolsDir 'apache-maven-3.9.9-bin.zip'
  $mavenDir = Join-Path $toolsDir 'apache-maven-3.9.9'
  if (-not (Test-Path $mavenDir)) {
    Write-Host 'Downloading Maven 3.9.9...'
    Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip' -OutFile $mavenZip
    Expand-Archive -Path $mavenZip -DestinationPath $toolsDir -Force
  }
  $env:PATH = "$mavenDir\bin;" + $env:PATH
  if (-not (Test-Command 'mvn.cmd')) {
    throw 'Maven could not be installed automatically. Install Maven 3.9+ and rerun.'
  }
}

function Ensure-FrontendDeps() {
  $frontendDir = Join-Path $projectRoot 'frontend'
  if (-not (Test-Path (Join-Path $frontendDir 'node_modules'))) {
    Write-Host 'Installing frontend dependencies...'
    Push-Location $frontendDir
    try {
      npm install
    } finally {
      Pop-Location
    }
  }
}

function Ensure-Playwright() {
  $frontendDir = Join-Path $projectRoot 'frontend'
  Push-Location $frontendDir
  try {
    Write-Host 'Installing Playwright browsers...'
    npx playwright install
  } finally {
    Pop-Location
  }
}

function Ensure-Docker() {
  if (Test-Command 'docker') { return $true }
  if (Ensure-Winget) {
    Write-Host 'Installing Docker Desktop via winget...'
    winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
  }
  if (-not (Test-Command 'docker')) {
    Write-Warning 'Docker is not available. MySQL container startup will fail.'
    return $false
  }
  return $true
}

Write-Host 'Bootstrapping Virtual Police Station...'
Ensure-Node
Ensure-Java
Ensure-Maven
Ensure-FrontendDeps
Ensure-Playwright
$dockerReady = Ensure-Docker

if (-not $dockerReady) {
  Write-Warning 'Docker is missing. Install Docker Desktop and rerun for MySQL runtime.'
}

Write-Host 'Bootstrap complete.'
