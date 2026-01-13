#!/bin/bash

# Trivia Buzzer App - Backend Deployment Script
# This script builds and deploys the backend to Fly.io

set -e

echo "🎯 Trivia Buzzer Backend Deployment"
echo "===================================="
echo ""

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed"
    echo "Install it with: brew install flyctl"
    echo "Or visit: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io"
    echo "Run: flyctl auth login"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Build the backend
echo "📦 Building backend..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Check if fly.toml exists
if [ ! -f "fly.toml" ]; then
    echo "❌ fly.toml not found"
    echo "Run 'flyctl launch' first to create the app"
    exit 1
fi

# Check if GM_PASSWORD is set
echo "🔐 Checking secrets..."
if ! flyctl secrets list | grep -q "GM_PASSWORD"; then
    echo "⚠️  GM_PASSWORD not set"
    echo "Set it with: flyctl secrets set GM_PASSWORD=your-password"
    read -p "Do you want to set it now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -sp "Enter GM_PASSWORD: " gm_password
        echo
        flyctl secrets set GM_PASSWORD="$gm_password"
    else
        echo "Continuing without setting GM_PASSWORD..."
    fi
fi

echo ""
echo "🚀 Deploying to Fly.io..."
flyctl deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 App info:"
flyctl info
echo ""
echo "🔍 View logs with: flyctl logs"
echo "🌐 Test health: curl https://$(flyctl info --json | grep -o '"Hostname":"[^"]*"' | cut -d'"' -f4)/health"
