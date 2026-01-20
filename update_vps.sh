#!/bin/bash
# VPS Quick Update Script for NSTU Property Tax Manager
# Run this on your VPS to update the application

set -e

echo "========================================"
echo "🚀 NSTU App Quick Update Script"
echo "========================================"

# Navigate to app directory
cd /var/www/nstu-app || { echo "❌ App directory not found!"; exit 1; }

echo ""
echo "📥 Step 1: Pulling latest code from GitHub..."
git stash 2>/dev/null || true
git pull origin main

echo ""
echo "🐍 Step 2: Updating backend dependencies..."
cd backend
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

echo ""
echo "⚛️ Step 3: Updating frontend..."
cd ../frontend
yarn install --silent 2>/dev/null || npm install --legacy-peer-deps
yarn build 2>/dev/null || npm run build

echo ""
echo "📁 Step 4: Ensuring uploads directory exists..."
mkdir -p /var/www/nstu-app/backend/uploads
chmod -R 755 /var/www/nstu-app/backend/uploads

echo ""
echo "🔄 Step 5: Restarting backend service..."
pm2 restart nstu-backend 2>/dev/null || {
    echo "PM2 service not found, starting fresh..."
    cd /var/www/nstu-app
    pm2 start ecosystem.config.js
}

echo ""
echo "🌐 Step 6: Reloading Nginx..."
nginx -t && systemctl reload nginx

echo ""
echo "========================================"
echo "✅ Update Complete!"
echo "========================================"
echo ""
echo "🔍 Check status with:"
echo "   pm2 status"
echo "   pm2 logs nstu-backend --lines 20"
echo ""
echo "🌐 Visit: https://app.nstuindia.com"
echo ""
