#!/bin/bash
# AWS Amplify Quick Deployment Script for Component Store Frontend
# This script automates the Amplify deployment process

set -e

echo "================================"
echo "Component Store Frontend Deployment"
echo "================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed."
    echo "Please install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "❌ Amplify CLI is not installed."
    echo "Installing Amplify CLI..."
    npm install -g @aws-amplify/cli
fi

echo "✅ AWS CLI found"
echo "✅ Amplify CLI found"
echo ""

# Check AWS credentials
echo "Checking AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    echo "✅ AWS credentials configured"
else
    echo "❌ AWS credentials not configured"
    echo "Run: aws configure"
    exit 1
fi

echo ""
echo "Choose deployment method:"
echo "1. AWS Amplify Console (Easiest - Connect GitHub)"
echo "2. AWS Amplify CLI (Manual)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "Follow these steps:"
    echo "1. Go to: https://console.aws.amazon.com/amplify/apps/"
    echo "2. Click 'New app' > 'Host web app'"
    echo "3. Choose 'GitHub'"
    echo "4. Authorize AWS to connect to GitHub"
    echo "5. Select your ComponentStoreFrontend repository"
    echo "6. Select 'main' branch"
    echo "7. Review settings and click 'Deploy'"
    echo ""
    echo "Opening AWS Amplify Console..."
    open https://console.aws.amazon.com/amplify/apps/ || xdg-open https://console.aws.amazon.com/amplify/apps/

elif [ "$choice" = "2" ]; then
    echo ""
    echo "Initializing Amplify project..."
    amplify init
    
    echo ""
    echo "Adding hosting..."
    amplify add hosting
    
    echo ""
    echo "Building and deploying..."
    amplify publish
    
    echo ""
    echo "✅ Deployment complete!"
    echo "Your app is now live at the URL shown above."
else
    echo "❌ Invalid choice"
    exit 1
fi
