$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $root
$backendDir = Join-Path $projectRoot 'backend'
$toolsMaven = Join-Path $projectRoot '.tools\apache-maven-3.9.9\bin\mvn.cmd'

$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/vps_runtime?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
$env:SPRING_DATASOURCE_USERNAME = 'vps_user'
$env:SPRING_DATASOURCE_PASSWORD = 'vps_pass'
$env:SPRING_DATASOURCE_DRIVER_CLASS_NAME = 'com.mysql.cj.jdbc.Driver'
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = 'update'

$maxWait = 60
$elapsed = 0
while ($elapsed -lt $maxWait) {
  $ready = Test-NetConnection -ComputerName 'localhost' -Port 3306 -WarningAction SilentlyContinue
  if ($ready.TcpTestSucceeded) { break }
  Start-Sleep -Seconds 2
  $elapsed += 2
}

if ($elapsed -ge $maxWait) {
  throw 'MySQL did not become ready on port 3306. Ensure Docker is running.'
}

Set-Location $backendDir
Write-Host 'Starting backend on http://localhost:8080 ...'
if (Test-Path $toolsMaven) {
  & $toolsMaven spring-boot:run
} else {
  & mvn.cmd spring-boot:run
}
