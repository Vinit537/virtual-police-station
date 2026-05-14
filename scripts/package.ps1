$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $root
$zipPath = Join-Path $projectRoot 'virtual-police-station.zip'
$stageDir = Join-Path $projectRoot '.zip-stage'

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
if (Test-Path $stageDir) {
  Remove-Item $stageDir -Recurse -Force
}

$exclude = @(
  '\node_modules\',
  '\frontend\dist\',
  '\frontend\dist-ssr\',
  '\backend\target\',
  '\backend\data\',
  '\data\',
  '\tmp-m2repo\',
  '\tmp-smoke\',
  '\tests\perf\results\',
  '\frontend\playwright-report\',
  '\frontend\test-results\',
  '\.tools\'
)

$excludeDirs = @('node_modules','dist','dist-ssr','target','data','tmp-m2repo','tmp-smoke','playwright-report','test-results','.tools','.zip-stage')
$excludeFiles = @('virtual-police-station.zip')

New-Item -ItemType Directory -Force -Path $stageDir | Out-Null

$robocopyArgs = @(
  $projectRoot,
  $stageDir,
  '/E',
  '/XD'
) + $excludeDirs + @(
  '/XF'
) + $excludeFiles

robocopy @robocopyArgs | Out-Null

Compress-Archive -Path (Join-Path $stageDir '*') -DestinationPath $zipPath
Remove-Item $stageDir -Recurse -Force
Write-Host "Created $zipPath"
