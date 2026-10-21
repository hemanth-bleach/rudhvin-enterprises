#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Rudhvin Enterprises — Server Production Deploy Script"
echo "=========================================================="

# 1. Update OS packages and install Chromium & fonts for PDF generation
echo "📦 Installing Chromium and font dependencies for PDF generation..."
if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y chromium-browser fonts-liberation fontconfig || sudo apt-get install -y chromium fonts-liberation fontconfig
fi

# 2. Install dependencies
echo "📦 Installing backend and frontend dependencies..."
npm run install:all

# 3. Build frontend SPA
echo "🔨 Building frontend distribution (Vite)..."
npm run build

# 4. Prepare data and uploads directories
echo "📁 Setting up persistent storage folders..."
mkdir -p backend/data backend/uploads

# 5. Start / Restart application using PM2
if command -v pm2 >/dev/null 2>&1; then
    echo "⚡ Reloading PM2 process..."
    pm2 startOrReload ecosystem.config.cjs --env production
    pm2 save
    echo "✅ PM2 process successfully started / reloaded."
else
    echo "💡 PM2 is not installed globally. You can install it with: npm install -g pm2"
    echo "   Or start the server with: npm start"
fi

echo "=========================================================="
echo "🎉 Deployment completed successfully!"
echo "   Server running at http://localhost:5000"
echo "=========================================================="
