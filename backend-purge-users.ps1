$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080/api'
$adminEmail = 'smoke.admin@test.com'
$adminPass = 'Password@123'

$registerBody = @{fullName='Smoke Admin';email=$adminEmail;password=$adminPass;aadhaarNumber='303030303030';role='ADMIN'} | ConvertTo-Json
try { Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType 'application/json' -Body $registerBody | Out-Null } catch {}

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email=$adminEmail;password=$adminPass} | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.token)" }

$before = Invoke-RestMethod -Method Get -Uri "$base/admin/users" -Headers $headers
$purge = Invoke-RestMethod -Method Post -Uri "$base/admin/purge-non-admin-users" -Headers $headers
$after = Invoke-RestMethod -Method Get -Uri "$base/admin/users" -Headers $headers

[PSCustomObject]@{
  BeforeUsers = $before.Count
  DeletedUsers = $purge.deletedUsers
  AfterUsers = $after.Count
  RemainingRoles = ($after | ForEach-Object { $_.role } | Sort-Object -Unique) -join ','
} | ConvertTo-Json -Depth 5
