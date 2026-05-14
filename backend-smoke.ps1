$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080/api'

function Ensure-SmokeUser {
  param(
    [string]$Email,
    [string]$FullName,
    [string]$Aadhaar,
    [string]$Role
  )

  $loginBody = @{ email = $Email; password = 'Password@123' } | ConvertTo-Json
  try {
    return Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $loginBody
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ne 401 -and $statusCode -ne 403) {
      throw
    }

    $registerBody = @{
      fullName = $FullName
      email = $Email
      password = 'Password@123'
      aadhaarNumber = $Aadhaar
      role = $Role
    } | ConvertTo-Json

    $otpGen = Invoke-RestMethod -Method Post -Uri "$base/auth/otp/generate" -ContentType 'application/json' -Body (@{aadhaarNumber=$Aadhaar} | ConvertTo-Json)
    Invoke-RestMethod -Method Post -Uri "$base/auth/otp/verify" -ContentType 'application/json' -Body (@{aadhaarNumber=$Aadhaar;otp=$otpGen.debugOtp} | ConvertTo-Json) | Out-Null

    Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType 'application/json' -Body $registerBody | Out-Null
    return Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $loginBody
  }
}

$citLogin = Ensure-SmokeUser -Email 'smoke.citizen@test.com' -FullName 'Smoke Citizen' -Aadhaar '101010101010' -Role 'CITIZEN'
$polLogin = Ensure-SmokeUser -Email 'smoke.police@test.com' -FullName 'Smoke Police' -Aadhaar '202020202020' -Role 'POLICE'
$admLogin = Ensure-SmokeUser -Email 'smoke.admin@test.com' -FullName 'Smoke Admin' -Aadhaar '303030303030' -Role 'ADMIN'

$otpGen = Invoke-RestMethod -Method Post -Uri "$base/auth/otp/generate" -ContentType 'application/json' -Body (@{aadhaarNumber='101010101010'} | ConvertTo-Json)
$otpVerify = Invoke-RestMethod -Method Post -Uri "$base/auth/otp/verify" -ContentType 'application/json' -Body (@{aadhaarNumber='101010101010';otp=$otpGen.debugOtp} | ConvertTo-Json)

$citHeaders = @{ Authorization = "Bearer $($citLogin.token)" }
$fir = Invoke-RestMethod -Method Post -Uri "$base/citizen/fir" -Headers $citHeaders -ContentType 'application/json' -Body (@{title='Fraud Wallet Incident';description='I faced fraud through a fake payment app cyber theft';location='New Town Sector 5';aadhaarNumber='101010101010';ocrExtractedText='Complaint text mentions cyber fraud and phishing activity.';ocrKeywords='cyber, fraud, phishing'} | ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri "$base/citizen/fir/$($fir.id)/evidence" -Headers $citHeaders -ContentType 'application/json' -Body (@{fileName='proof.png';fileType='image/png';storagePath='uploads/proof.png';fileSizeKb=240} | ConvertTo-Json) | Out-Null
$citFirs = Invoke-RestMethod -Method Get -Uri "$base/citizen/fir" -Headers $citHeaders
$timeline = Invoke-RestMethod -Method Get -Uri "$base/citizen/fir/$($fir.id)/timeline" -Headers $citHeaders

$polHeaders = @{ Authorization = "Bearer $($polLogin.token)" }
$allFirs = Invoke-RestMethod -Method Get -Uri "$base/police/fir" -Headers $polHeaders
$updated = Invoke-RestMethod -Method Patch -Uri "$base/police/fir/$($fir.id)" -Headers $polHeaders -ContentType 'application/json' -Body (@{status='UNDER_REVIEW';priority='HIGH';category='FRAUD'} | ConvertTo-Json)

$admHeaders = @{ Authorization = "Bearer $($admLogin.token)" }
$stats = Invoke-RestMethod -Method Get -Uri "$base/admin/stats" -Headers $admHeaders
$users = Invoke-RestMethod -Method Get -Uri "$base/admin/users" -Headers $admHeaders

[PSCustomObject]@{
  CitizenRole = $citLogin.role
  PoliceRole = $polLogin.role
  AdminRole = $admLogin.role
  OtpVerified = $otpVerify.verified
  FirId = $fir.id
  FirCategory = $fir.category
  DigitalSignaturePresent = [bool]$fir.digitalSignatureHash
  CitizenFirCount = $citFirs.Count
  TimelineEvents = $timeline.Count
  PoliceVisibleFirs = $allFirs.Count
  UpdatedStatus = $updated.status
  AdminUsersCount = $users.Count
  AdminFirsCount = $stats.firs
} | ConvertTo-Json -Depth 5
