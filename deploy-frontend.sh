#!/bin/bash

# Trivia Buzzer App - Frontend Deployment Script (Fly.io)
# This script deploys the frontend to Fly.io

set -e

echo "🎨 Trivia Buzzer Frontend Deployment (Fly.io)"
echo "=============================================="
echo ""

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed"
    echo "Install it with: brew install flyctl"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io"
    echo "Run: flyctl auth login"
    exit 1
fi

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Check if fly.toml exists
if [ ! -f "fly.toml" ]; then
    echo "❌ fly.toml not found"
    echo "Run 'flyctl launch' first to create the app"
    exit 1
fi

# Check if NEXT_PUBLIC_WS_URL is set
echo "🔐 Checking environment variables..."
if ! flyctl secrets list 2>/dev/null | grep -q "NEXT_PUBLIC_WS_URL"; then
    echo "⚠️  NEXT_PUBLIC_WS_URL not set"
    echo ""
    echo "You need to set your backend URL:"
    echo "Example: flyctl secrets set NEXT_PUBLIC_WS_URL=https://trivia-buzzer-backend.fly.dev"
    echo ""
    read -p "Enter your backend URL (or press Enter to skip): " backend_url
    if [ ! -z "$backend_url" ]; then
        flyctl secrets set NEXT_PUBLIC_WS_URL="$backend_url"
    else
        echo "⚠️  Continuing without setting NEXT_PUBLIC_WS_URL..."
        echo "   The app will default to http://localhost:3001"
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
echo "🌐 Visit your app: https://$(flyctl info --json 2>/dev/null | grep -o '"Hostname":"[^"]*"' | cut -d'"' -f4)"
