# Quick Deployment Setup Script
# This script helps you set up automated deployments

Write-Host "🚀 PharmaTrack Deployment Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if Vercel CLI is installed
Write-Host "Checking for Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!`n" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI already installed!`n" -ForegroundColor Green
}

# Link to Vercel project
Write-Host "Linking to Vercel project..." -ForegroundColor Yellow
Write-Host "Please follow the prompts to link your project.`n" -ForegroundColor Gray
vercel link

# Check if .vercel directory was created
if (Test-Path ".vercel/project.json") {
    Write-Host "`n✅ Project linked successfully!`n" -ForegroundColor Green
    
    # Read the project.json file
    $projectInfo = Get-Content ".vercel/project.json" | ConvertFrom-Json
    
    Write-Host "📋 Your Vercel Project Information:" -ForegroundColor Cyan
    Write-Host "===================================`n" -ForegroundColor Cyan
    Write-Host "Organization ID: $($projectInfo.orgId)" -ForegroundColor White
    Write-Host "Project ID: $($projectInfo.projectId)`n" -ForegroundColor White
    
    Write-Host "⚠️  IMPORTANT: Add these as GitHub Secrets" -ForegroundColor Yellow
    Write-Host "==========================================`n" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/Amphy2000/pharmatrackai/settings/secrets/actions" -ForegroundColor White
    Write-Host "2. Add these three secrets:`n" -ForegroundColor White
    Write-Host "   Secret Name: VERCEL_ORG_ID" -ForegroundColor Cyan
    Write-Host "   Value: $($projectInfo.orgId)`n" -ForegroundColor Gray
    Write-Host "   Secret Name: VERCEL_PROJECT_ID" -ForegroundColor Cyan
    Write-Host "   Value: $($projectInfo.projectId)`n" -ForegroundColor Gray
    Write-Host "   Secret Name: VERCEL_TOKEN" -ForegroundColor Cyan
    Write-Host "   Value: Get from https://vercel.com/account/tokens`n" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to link project. Please try again.`n" -ForegroundColor Red
}

Write-Host "`n📚 Next Steps:" -ForegroundColor Cyan
Write-Host "=============`n" -ForegroundColor Cyan
Write-Host "1. Add the three secrets to GitHub (see above)" -ForegroundColor White
Write-Host "2. Commit your changes: git add . && git commit -m 'Setup automated deployment'" -ForegroundColor White
Write-Host "3. Push to GitHub: git push origin main" -ForegroundColor White
Write-Host "4. Watch your deployment at: https://github.com/Amphy2000/pharmatrackai/actions`n" -ForegroundColor White

Write-Host "✨ Done! Your automated deployment is ready!" -ForegroundColor Green
