# SyncDrive API Testing Script for PowerShell
# Run this script to test the backend API endpoints

Write-Host "=== SyncDrive API Testing ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:4000/api"

# Test 1: Create a new user
Write-Host "1. Creating test user..." -ForegroundColor Yellow
$signupData = @{
    name = "Test User"
    email = "test@syncdrive.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/signup" -Method Post -Body $signupData -ContentType "application/json"
    $token = $response.token
    Write-Host "   ✓ User created successfully" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorObj.error)" -ForegroundColor Red
    }
    exit
}

# Test 2: List root directory (should be empty)
Write-Host "2. Listing root directory..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $files = Invoke-RestMethod -Uri "$baseUrl/files" -Method Get -Headers $headers
    Write-Host "   ✓ Files fetched: $($files.count) items" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 3: Create folders
Write-Host "3. Creating folders..." -ForegroundColor Yellow
$folders = @("Documents", "Images", "Projects")

foreach ($folderName in $folders) {
    try {
        $folderData = @{
            name = $folderName
            parentId = $null
        } | ConvertTo-Json
        
        $newFolder = Invoke-RestMethod -Uri "$baseUrl/files/folder" -Method Post -Body $folderData -ContentType "application/json" -Headers $headers
        Write-Host "   ✓ Created: $folderName (ID: $($newFolder.data.id))" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ Failed to create $folderName" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: List root directory again
Write-Host "4. Listing root directory again..." -ForegroundColor Yellow
try {
    $files = Invoke-RestMethod -Uri "$baseUrl/files" -Method Get -Headers $headers
    Write-Host "   ✓ Files fetched: $($files.count) items" -ForegroundColor Green
    
    foreach ($item in $files.data) {
        $icon = if ($item.type -eq "folder") { "📁" } else { "📄" }
        Write-Host "      $icon $($item.name) (ID: $($item.id))" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Create subfolder in Documents
Write-Host "5. Creating subfolder in Documents..." -ForegroundColor Yellow
try {
    $documentsFolder = $files.data | Where-Object { $_.name -eq "Documents" }
    if ($documentsFolder) {
        $subfolderData = @{
            name = "Work"
            parentId = $documentsFolder.id
        } | ConvertTo-Json
        
        $subfolder = Invoke-RestMethod -Uri "$baseUrl/files/folder" -Method Post -Body $subfolderData -ContentType "application/json" -Headers $headers
        Write-Host "   ✓ Created: Work inside Documents (ID: $($subfolder.data.id))" -ForegroundColor Green
        Write-Host ""
        
        # List Documents folder contents
        Write-Host "6. Listing Documents folder contents..." -ForegroundColor Yellow
        $docContents = Invoke-RestMethod -Uri "$baseUrl/files?parentId=$($documentsFolder.id)" -Method Get -Headers $headers
        Write-Host "   ✓ Items in Documents: $($docContents.count)" -ForegroundColor Green
        
        foreach ($item in $docContents.data) {
            Write-Host "      📁 $($item.name)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Testing Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your auth token (save this):" -ForegroundColor Yellow
Write-Host $token -ForegroundColor White
Write-Host ""
Write-Host "Use this token in your frontend localStorage: localStorage.setItem('auth_token', '$token')" -ForegroundColor Gray
