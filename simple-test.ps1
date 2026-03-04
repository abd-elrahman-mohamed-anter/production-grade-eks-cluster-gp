$timestamp = (Get-Date).Ticks
$username = "deeptest_$([int]($timestamp % 1000000))"
$password = "TestPass123456"

Write-Host "Creating user..." -ForegroundColor Cyan
$signupBody = @{ username = $username; password = $password } | ConvertTo-Json

$signupResp = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body $signupBody

$signupData = $signupResp.Content | ConvertFrom-Json
$token = $signupData.token

Write-Host "User created! Token: $($token.Substring(0,30))..." -ForegroundColor Green

Write-Host "Starting deep scan..." -ForegroundColor Cyan
$scanBody = @{
    targetUrl = "http://testphp.vulnweb.com"
    scanType = "deep"
} | ConvertTo-Json

$scanResp = Invoke-WebRequest -Uri "http://localhost:5000/api/scans" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" } `
    -Body $scanBody

$scanData = $scanResp.Content | ConvertFrom-Json
$scanId = $scanData.id

Write-Host "Deep scan started! Scan ID: $scanId" -ForegroundColor Green
Write-Host "Target: http://testphp.vulnweb.com" -ForegroundColor White
Write-Host "Expected duration: 60-120 minutes" -ForegroundColor Yellow
