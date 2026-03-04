$ErrorActionPreference = "Stop"

function Create-UserAndStartScan($target, $scanType){
    $timestamp = (Get-Date).Ticks
    $username = "scan_${scanType}_$([int]($timestamp % 1000000))"
    $password = "TestPass123456"

    Write-Host "Creating user $username..." -ForegroundColor Cyan
    $signupBody = @{ username = $username; password = $password } | ConvertTo-Json
    $signupResp = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/signup" -Method POST -ContentType "application/json" -Body $signupBody
    $signupData = $signupResp.Content | ConvertFrom-Json
    $token = $signupData.token

    Write-Host "Starting $scanType scan for $target..." -ForegroundColor Cyan
    $scanBody = @{ targetUrl = $target; scanType = $scanType } | ConvertTo-Json
    $scanResp = Invoke-WebRequest -Uri "http://localhost:5000/api/scans" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } -Body $scanBody
    $scanData = $scanResp.Content | ConvertFrom-Json
    return @{ scanId = $scanData.id; token = $token; username = $username }
}

# Start quick on example.com (expected: no vulns)
$quick = Create-UserAndStartScan "https://example.com" "quick"
Write-Host "Quick scan started: $($quick.scanId) (user: $($quick.username))" -ForegroundColor Green

# Start medium on testphp.vulnweb.com (expected: vulnerabilities)
$medium = Create-UserAndStartScan "http://testphp.vulnweb.com" "medium"
Write-Host "Medium scan started: $($medium.scanId) (user: $($medium.username))" -ForegroundColor Green

# Output IDs for inspection
Write-Host "\nScan IDs:"
Write-Host "Quick: $($quick.scanId)"
Write-Host "Medium: $($medium.scanId)"

# Print short guidance
Write-Host "\nNow monitoring progress via /api/scans/{id} or check app logs for tools used." -ForegroundColor Yellow
