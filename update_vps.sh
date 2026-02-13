#!/bin/bash
# NSTU VPS Update Script - Feb 2026
# Run this on your VPS to update to latest code

echo "=========================================="
echo "  NSTU VPS UPDATE - Starting..."
echo "=========================================="

cd /root/nstu-property-tax || cd ~/nstu-property-tax || { echo "ERROR: Project folder not found!"; exit 1; }

# Step 1: Save local changes and pull latest
echo ""
echo "[1/5] Git Pull..."
git stash
git pull origin main
git stash pop 2>/dev/null

# Step 2: Fix TOWN_DB_MAPPING for VPS (nstu_property_tax instead of test_database)
echo ""
echo "[2/5] Fixing DB mapping for VPS..."
sed -i 's/TOWN_DB_MAPPING\["THS"\] = os.environ.get("DB_NAME", "test_database")/TOWN_DB_MAPPING["THS"] = os.environ.get("DB_NAME", "nstu_property_tax")/g' backend/server.py
sed -i 's/"test_database"/"nstu_property_tax"/g' backend/.env 2>/dev/null
echo "DB mapping fixed: THS -> nstu_property_tax"

# Step 3: Install any new Python packages
echo ""
echo "[3/5] Installing Python packages..."
cd backend
source venv/bin/activate 2>/dev/null || source ../venv/bin/activate 2>/dev/null
pip install -r requirements.txt --quiet
cd ..

# Step 4: Rebuild Frontend
echo ""
echo "[4/5] Building Frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# Step 5: Restart Services
echo ""
echo "[5/5] Restarting Services..."
sudo systemctl restart nstu-backend 2>/dev/null || sudo systemctl restart backend 2>/dev/null
sudo systemctl restart nginx

echo ""
echo "=========================================="
echo "  UPDATE COMPLETE!"
echo "=========================================="
echo ""
echo "New features added:"
echo "  - Bulk Assign/Unassign Colonies"
echo "  - Old Photo Upload (Upload Data page)"
echo "  - Show Full Town Map button"
echo "  - Duplicate prevention in Add to Property"
echo "  - Relation: Padosi -> ग्राहक"
echo ""
echo "Check: sudo systemctl status nstu-backend"
