# AWS Amplify Quick Deployment Script for Component Store Frontend (Windows)
# This script automates the Amplify deployment process

Write-Host "================================"
Write-Host "Component Store Frontend Deployment"
Write-Host "================================"
Write-Host ""

# Check if AWS CLI is installed
$awsCheck = cmd /c "aws --version 2>&1" -ErrorAction SilentlyContinue
if ($null -eq $awsCheck) {
    Write-Host "❌ AWS CLI is not installed."
    Write-Host "Please install it from: https://aws.amazon.com/cli/"
    exit 1
}

# Check if Amplify CLI is installed
$amplifyCheck = cmd /c "amplify --version 2>&1" -ErrorAction SilentlyContinue
if ($null -eq $amplifyCheck) {
    Write-Host "❌ Amplify CLI is not installed."
    Write-Host "Installing Amplify CLI..."
    npm install -g @aws-amplify/cli
}

Write-Host "✅ AWS CLI found"
Write-Host "✅ Amplify CLI found"
Write-Host ""

# Check AWS credentials
Write-Host "Checking AWS credentials..."
$credCheck = cmd /c "aws sts get-caller-identity 2>&1" -ErrorAction SilentlyContinue
if ($credCheck) {
    Write-Host "✅ AWS credentials configured"
}
else {
    Write-Host "❌ AWS credentials not configured"
    Write-Host "Run: aws configure"
    exit 1
}

Write-Host ""
Write-Host "Choose deployment method:"
Write-Host "1. AWS Amplify Console (Easiest - Connect GitHub)"
Write-Host "2. AWS Amplify CLI (Manual)"
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Follow these steps:"
    Write-Host "1. Go to: https://console.aws.amazon.com/amplify/apps/"
    Write-Host "2. Click 'New app' > 'Host web app'"
    Write-Host "3. Choose 'GitHub'"
    Write-Host "4. Authorize AWS to connect to GitHub"
    Write-Host "5. Select your ComponentStoreFrontend repository"
    Write-Host "6. Select 'main' branch"
    Write-Host "7. Review settings and click 'Deploy'"
    Write-Host ""
    Write-Host "Opening AWS Amplify Console..."
    Start-Process "https://console.aws.amazon.com/amplify/apps/"

}
elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "Initializing Amplify project..."
    & amplify init
    
    Write-Host ""
    Write-Host "Adding hosting..."
    & amplify add hosting
    
    Write-Host ""
    Write-Host "Building and deploying..."
    & amplify publish
    
    Write-Host ""
    Write-Host "✅ Deployment complete!"
    Write-Host "Your app is now live at the URL shown above."
}
else {
    Write-Host "❌ Invalid choice"
    exit 1
}
