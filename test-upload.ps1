# File Upload Test Script for SyncDrive
# This script tests the file upload functionality

Write-Host "=== SyncDrive File Upload Test ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:4000/api"

# Step 1: Login to get token
Write-Host "1. Logging in..." -ForegroundColor Yellow
$loginData = @{
    email = "test@syncdrive.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $response.token
    Write-Host "   ✓ Logged in successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ✗ Login failed. Run test-api.ps1 first to create test user." -ForegroundColor Red
    exit
}

# Step 2: Create a test text file
Write-Host "2. Creating test file..." -ForegroundColor Yellow
$testFileName = "test-upload-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$testFilePath = Join-Path $env:TEMP $testFileName
"This is a test file created by SyncDrive upload test script.`nCreated at: $(Get-Date)" | Out-File -FilePath $testFilePath -Encoding UTF8
Write-Host "   ✓ Test file created: $testFilePath" -ForegroundColor Green
Write-Host ""

# Step 3: Upload the file
Write-Host "3. Uploading file..." -ForegroundColor Yellow

try {
    # Create multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileContent = [System.IO.File]::ReadAllBytes($testFilePath)
    $fileName = [System.IO.Path]::GetFileName($testFilePath)
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: text/plain$LF",
        [System.Text.Encoding]::UTF8.GetString($fileContent),
        "--$boundary",
        "Content-Disposition: form-data; name=`"parentId`"$LF",
        "null",
        "--$boundary--$LF"
    ) -join $LF
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $uploadResponse = Invoke-RestMethod -Uri "$baseUrl/files/upload" -Method Post -Body $bodyLines -Headers $headers
    
    Write-Host "   ✓ File uploaded successfully!" -ForegroundColor Green
    Write-Host "   File ID: $($uploadResponse.data.id)" -ForegroundColor Gray
    Write-Host "   Name: $($uploadResponse.data.name)" -ForegroundColor Gray
    Write-Host "   Size: $($uploadResponse.data.size) bytes" -ForegroundColor Gray
    Write-Host "   Type: $($uploadResponse.data.mimeType)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ✗ Upload failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Note: Use the frontend UI for easier file upload testing" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: List files to verify upload
Write-Host "4. Verifying upload..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $files = Invoke-RestMethod -Uri "$baseUrl/files" -Method Get -Headers $headers
    
    $uploadedFile = $files.data | Where-Object { $_.name -eq $fileName }
    
    if ($uploadedFile) {
        Write-Host "   ✓ File found in database!" -ForegroundColor Green
        Write-Host "   Database ID: $($uploadedFile.id)" -ForegroundColor Gray
        Write-Host "   Server Path: $($uploadedFile.path)" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ File not found in database" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Could not verify: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Testing Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 For easier testing, use the web interface:" -ForegroundColor Yellow
Write-Host "   1. Start frontend: npm run dev" -ForegroundColor White
Write-Host "   2. Open http://localhost:5173" -ForegroundColor White
Write-Host "   3. Login and click 'Upload' button" -ForegroundColor White
Write-Host ""

# Cleanup
Remove-Item $testFilePath -ErrorAction SilentlyContinue
