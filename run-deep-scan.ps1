# Deep Scan Test Script
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Green
Write-Host "🔍 DEEP SCAN VERIFICATION TEST" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Generate unique username
$timestamp = (Get-Date).Ticks
$username = "deeptest_$([int]($timestamp % 1000000))"
$password = "TestPass123456"

Write-Host "📝 Creating test user..." -ForegroundColor Cyan
$signupBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $signupResp = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/signup" `
        -Method POST `
        -ContentType "application/json" `
        -Body $signupBody `
        -ErrorAction Stop
    
    $signupData = $signupResp.Content | ConvertFrom-Json
    $token = $signupData.token
    $userId = $signupData.user.id
    
    Write-Host "✓ User created: $username" -ForegroundColor Green
    Write-Host "✓ User ID: $userId" -ForegroundColor Green
    Write-Host "✓ Token: $($token.Substring(0,30))..." -ForegroundColor Green
    Write-Host ""
    
    # Start deep scan
    Write-Host "🚀 Starting DEEP SCAN..." -ForegroundColor Cyan
    $scanBody = @{
        targetUrl = "http://testphp.vulnweb.com"
        scanType = "deep"
    } | ConvertTo-Json
    
    $scanResp = Invoke-WebRequest -Uri "http://localhost:5000/api/scans" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token" } `
        -Body $scanBody `
        -ErrorAction Stop
    
    $scanData = $scanResp.Content | ConvertFrom-Json
    $scanId = $scanData.id
    
    Write-Host "✓ Scan ID: $scanId" -ForegroundColor Green
    Write-Host "✓ Target: http://testphp.vulnweb.com" -ForegroundColor Green
    Write-Host "✓ Type: DEEP SCAN" -ForegroundColor Green
    Write-Host "✓ Expected duration: 60-120 minutes" -ForegroundColor Yellow
    Write-Host ""
    
    # Monitor for 2 minutes
    Write-Host "⏱️  Monitoring progress (will run for 120 seconds)..." -ForegroundColor Cyan
    Write-Host "---" -ForegroundColor Gray
    
    $startTime = Get-Date
    $monitorDuration = 120  # 2 minutes
    
    for ($i = 1; $i -le 12; $i++) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        
        try {
            $checkResp = Invoke-WebRequest -Uri "http://localhost:5000/api/scans/$scanId" `
                -Headers @{ Authorization = "Bearer $token" } `
                -ErrorAction Stop
            
            $checkData = $checkResp.Content | ConvertFrom-Json
            $progress = $checkData.progress
            $status = $checkData.status
            
            Write-Host "[$i/12] Progress: $progress% | Status: $status | Elapsed: $([int]$elapsed)s" -ForegroundColor Cyan
            
            if ($status -eq "completed") {
                Write-Host "✓ Scan completed early!" -ForegroundColor Green
                break
            }
        }
        catch {
            Write-Host "! Error checking status: $_" -ForegroundColor Yellow
        }
        
        if ($i -lt 12) {
            Start-Sleep -Seconds 10
        }
    }
    
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📊 SCAN STATUS" -ForegroundColor Cyan
    Write-Host "Scan ID: $scanId" -ForegroundColor White
    Write-Host ""
    Write-Host "✓ Deep scan is running in the background" -ForegroundColor Green
    Write-Host "✓ Check progress at: http://localhost:5000/api/scans/$scanId" -ForegroundColor Green
    Write-Host "✓ You can view results once completed" -ForegroundColor Green

}
catch {

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
