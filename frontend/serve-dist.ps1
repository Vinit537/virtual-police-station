$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:5173/')
$listener.Start()

$root = Join-Path $PSScriptRoot 'dist'

function Get-ContentType($path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.js' { 'application/javascript; charset=utf-8' }
    '.css' { 'text/css; charset=utf-8' }
    '.svg' { 'image/svg+xml' }
    '.png' { 'image/png' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.json' { 'application/json; charset=utf-8' }
    '.ico' { 'image/x-icon' }
    default { 'application/octet-stream' }
  }
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $requestPath = $context.Request.Url.AbsolutePath.TrimStart('/')
  if ([string]::IsNullOrWhiteSpace($requestPath)) {
    $requestPath = 'index.html'
  }

  $localPath = Join-Path $root $requestPath
  if (-not (Test-Path $localPath -PathType Leaf)) {
    $localPath = Join-Path $root 'index.html'
  }

  try {
    $bytes = [System.IO.File]::ReadAllBytes($localPath)
    $context.Response.StatusCode = 200
    $context.Response.ContentType = Get-ContentType $localPath
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $context.Response.StatusCode = 500
  } finally {
    $context.Response.OutputStream.Close()
  }
}
