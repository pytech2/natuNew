#!/bin/bash

# ============================================
# VPS Deployment Script for NSTU Property Tax Manager
# Run this script on your Hostinger VPS
# ============================================

set -e  # Exit on any error

echo "=========================================="
echo "  NSTU India - Deployment Script"
echo "=========================================="

# Configuration - Update these paths according to your VPS setup
APP_DIR="/var/www/nstu-app"  # Change this to your app directory
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Navigating to app directory...${NC}"
cd "$APP_DIR" || { echo -e "${RED}App directory not found!${NC}"; exit 1; }

echo -e "${YELLOW}Step 2: Pulling latest code from GitHub...${NC}"
git fetch origin
git reset --hard origin/main
git pull origin main || git pull origin main --force

echo -e "${YELLOW}Step 3: Installing Backend Dependencies...${NC}"
cd "$BACKEND_DIR"
pip3 install -r requirements.txt --quiet

echo -e "${YELLOW}Step 4: Clearing Node modules cache and reinstalling Frontend...${NC}"
cd "$FRONTEND_DIR"

# Clear all caches
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf build 2>/dev/null || true
npm cache clean --force

# Install dependencies
npm install --legacy-peer-deps

echo -e "${YELLOW}Step 5: Building Frontend...${NC}"
npm run build

echo -e "${YELLOW}Step 6: Clearing application caches...${NC}"
# Clear Python cache
find "$BACKEND_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true

# Clear Hindi note cache (force regeneration)
rm -f /tmp/hindi_note_cached.png 2>/dev/null || true

echo -e "${YELLOW}Step 7: Restarting Services...${NC}"
# Method 1: Using PM2 (if you use PM2)
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo -e "${GREEN}PM2 services restarted${NC}"
fi

# Method 2: Using systemctl (if you have systemd services)
if systemctl list-units --type=service | grep -q "nstu"; then
    sudo systemctl restart nstu-backend || true
    sudo systemctl restart nstu-frontend || true
    echo -e "${GREEN}Systemd services restarted${NC}"
fi

# Method 3: Using supervisor
if command -v supervisorctl &> /dev/null; then
    sudo supervisorctl restart backend frontend || true
    echo -e "${GREEN}Supervisor services restarted${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "If your services didn't restart automatically, run:"
echo "  pm2 restart all"
echo "  OR"
echo "  sudo systemctl restart your-service-name"
echo ""

# Optional: Show service status
if command -v pm2 &> /dev/null; then
    echo "PM2 Status:"
    pm2 status
fi
