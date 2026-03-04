# Simple Deep Scan Test
Write-Host "Starting Deep Scan Test..." -ForegroundColor Green

$timestamp = (Get-Date).Ticks
$username = "test$([int]($timestamp % 999999))"
$password = "Pass123@456"

$signup = @{ username = $username; password = $password } | ConvertTo-Json

$resp = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body $signup

$data = $resp.Content | ConvertFrom-Json
$token = $data.token

Write-Host "User: $username" -ForegroundColor Green
Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Green

$scan = @{ targetUrl = "http://testphp.vulnweb.com"; scanType = "deep" } | ConvertTo-Json

$scanResp = Invoke-WebRequest -Uri "http://localhost:5000/api/scans" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $scan

$scanData = $scanResp.Content | ConvertFrom-Json

Write-Host ""
Write-Host "=== DEEP SCAN STARTED ===" -ForegroundColor Cyan
Write-Host "Scan ID: $($scanData.id)" -ForegroundColor Green
Write-Host "Target: http://testphp.vulnweb.com" -ForegroundColor Green
Write-Host "Type: DEEP (60-120 minutes expected)"  -ForegroundColor Yellow
Write-Host ""

for ($i = 1; $i -le 4; $i++) {
    Start-Sleep -Seconds 15
    
    $check = Invoke-WebRequest -Uri "http://localhost:5000/api/scans/$($scanData.id)" `
        -Headers @{ Authorization = "Bearer $token" }
    
    $checkData = $check.Content | ConvertFrom-Json
    $prog = $checkData.progress
    $stat = $checkData.status
    
    Write-Host "Check $i`: $prog% | $stat" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Scan running in background. Check API for updates."
