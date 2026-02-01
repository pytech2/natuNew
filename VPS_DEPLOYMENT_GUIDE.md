# ============================================
# NSTU India - VPS Deployment Guide
# ============================================

## 🔧 FIRST TIME SETUP: Install Required Dependencies

Run this command ONCE on your VPS to install required packages for PDF Hindi note:
```bash
sudo apt-get update && sudo apt-get install -y wkhtmltopdf xvfb xauth fonts-lohit-deva fonts-noto-core
```

This installs:
- `wkhtmltopdf` - For generating Hindi note image
- `xvfb` + `xauth` - Virtual display for wkhtmltoimage
- `fonts-lohit-deva` + `fonts-noto-core` - Hindi fonts

---

## ⚠️ IMPORTANT: Fix Git Push Error First

If you're getting git push errors, run this ONE TIME:
```bash
git push origin main --force
```
This will sync your local repo with the cleaned remote history.

---

## 🚀 QUICK DEPLOYMENT (One-Liner Commands)

### Option 1: Full Deployment (Recommended)
```bash
cd /var/www/nstu-app && git pull origin main && cd backend && pip3 install -r requirements.txt && cd ../frontend && rm -rf node_modules/.cache build && npm cache clean --force && npm install --legacy-peer-deps && npm run build && pm2 restart all
```

### Option 2: Just Pull & Restart (Quick Update)
```bash
cd /var/www/nstu-app && git pull origin main && pm2 restart all
```

### Option 3: Frontend Only Update
```bash
cd /var/www/nstu-app/frontend && git pull origin main && rm -rf node_modules/.cache build && npm run build && pm2 restart frontend
```

### Option 4: Backend Only Update
```bash
cd /var/www/nstu-app && git pull origin main && pip3 install -r backend/requirements.txt && pm2 restart backend
```

---

## 🔄 Clear All Caches Command
```bash
rm -rf /var/www/nstu-app/frontend/node_modules/.cache
rm -rf /var/www/nstu-app/frontend/build
rm -f /tmp/hindi_note_cached.png
npm cache clean --force
pm2 restart all
```

---

## 📸 FIX: Old Photos Not Showing

The photos are stored in `/backend/uploads/` folder. When you deploy:

1. IMPORTANT: The `uploads` folder must be preserved on your VPS
2. Don't delete or overwrite the `uploads` folder during deployment
3. If photos are missing, copy them from your backup:
   ```bash
   # On your local machine or backup server
   scp -r uploads/ user@your-vps:/var/www/nstu-app/backend/
   ```

---

## 🔍 Useful Debug Commands

### Check PM2 Logs
```bash
pm2 logs
pm2 logs backend --lines 100
pm2 logs frontend --lines 100
```

### Check Running Services
```bash
pm2 status
```

### Restart All Services
```bash
pm2 restart all
```

### Kill and Start Fresh
```bash
pm2 delete all
cd /var/www/nstu-app
pm2 start ecosystem.config.js
```

---

## ⚙️ PM2 Ecosystem File (if not present)

Create `/var/www/nstu-app/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'python3',
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
    }
  ]
};
```

---

## 📞 Common Issues

1. **npm install fails**: Add `--legacy-peer-deps` flag
2. **Permission denied**: Run with `sudo`
3. **Port already in use**: `pm2 delete all` then restart
4. **Photos not showing**: Check if `uploads/` folder exists on VPS
5. **Git pull fails**: Run `git reset --hard origin/main` first
6. **Hindi note not showing on PDF**: Run the FIRST TIME SETUP command at top of this file
