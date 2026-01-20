# 🚀 VPS Deployment Guide - NSTU Property Tax Manager

## Complete Setup for Hostinger VPS

### Step 1: SSH into your VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Install Required Software
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Python 3.11
apt install -y python3.11 python3.11-venv python3-pip

# Install MongoDB
apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Install Nginx
apt install -y nginx

# Install PM2 for process management
npm install -g pm2 yarn
```

### Step 3: Clone/Upload Your Code
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git nstu-app
cd nstu-app
```

### Step 4: Setup Backend
```bash
cd /var/www/nstu-app/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create uploads folder with permissions
mkdir -p uploads
chmod 755 uploads

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=nstu_property_tax
JWT_SECRET=your-super-secret-key-change-this-in-production
EOF

# Test backend
python -c "import server; print('Backend OK')"
```

### Step 5: Setup Frontend
```bash
cd /var/www/nstu-app/frontend

# Install dependencies (use yarn, not npm)
yarn install

# Create .env file - IMPORTANT: Use your domain
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://app.nstuindia.com
EOF

# Build frontend
yarn build
```

### Step 6: Configure PM2 for Backend
```bash
cd /var/www/nstu-app

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'nstu-backend',
    cwd: '/var/www/nstu-app/backend',
    script: 'venv/bin/uvicorn',
    args: 'server:app --host 0.0.0.0 --port 8001',
    interpreter: 'none',
    env: {
      MONGO_URL: 'mongodb://localhost:27017',
      DB_NAME: 'nstu_property_tax',
      JWT_SECRET: 'your-super-secret-key-change-this'
    },
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
}
EOF

# Start backend with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 7: Configure Nginx
```bash
cat > /etc/nginx/sites-available/nstu << 'EOF'
server {
    listen 80;
    server_name app.nstuindia.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.nstuindia.com;
    
    # SSL Certificates (use certbot for Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/app.nstuindia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.nstuindia.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Increase upload size limit for PDF uploads
    client_max_body_size 100M;
    
    # Frontend - React build
    location / {
        root /var/www/nstu-app/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Important for file uploads
        client_max_body_size 100M;
        proxy_request_buffering off;
    }
    
    # Direct access to uploaded files (IMPORTANT FOR PDF DOWNLOADS)
    location /api/uploads/ {
        alias /var/www/nstu-app/backend/uploads/;
        expires 1d;
        add_header Cache-Control "public";
        
        # Enable direct file serving
        try_files $uri =404;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/nstu /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t && systemctl reload nginx
```

### Step 8: Setup SSL with Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d app.nstuindia.com
```

### Step 9: Initialize Admin User
```bash
curl -X POST http://localhost:8001/api/init-admin
```

---

## 🔄 UPDATE Script (Run when you have new code)

Create this script at `/var/www/nstu-app/update.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting NSTU App Update..."

cd /var/www/nstu-app

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Update backend
echo "🐍 Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

# Update frontend
echo "⚛️ Updating frontend..."
cd ../frontend
yarn install --silent
yarn build

# Restart services
echo "🔄 Restarting services..."
pm2 restart nstu-backend
sudo systemctl reload nginx

# Fix permissions
echo "🔐 Fixing permissions..."
chmod -R 755 /var/www/nstu-app/backend/uploads

echo "✅ Update complete!"
echo "🌐 Visit: https://app.nstuindia.com"
```

Make it executable:
```bash
chmod +x /var/www/nstu-app/update.sh
```

---

## 🐛 Troubleshooting PDF Download 404 Error

### Issue: PDF generates but download shows 404

**Root Cause:** Nginx not serving files from uploads folder

**Fix 1:** Check uploads folder exists and has correct permissions
```bash
ls -la /var/www/nstu-app/backend/uploads/
chmod -R 755 /var/www/nstu-app/backend/uploads/
```

**Fix 2:** Verify Nginx config has the uploads location block
```bash
grep -A5 "location /api/uploads" /etc/nginx/sites-available/nstu
```

**Fix 3:** Test file serving directly
```bash
# Generate a test PDF
curl -X POST "https://app.nstuindia.com/api/admin/properties/download-pdf?ward=YourColony" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check if file exists
ls -la /var/www/nstu-app/backend/uploads/*.pdf

# Test download URL directly
curl -I "https://app.nstuindia.com/api/uploads/YOUR_PDF_FILENAME.pdf"
```

**Fix 4:** Reload Nginx after config changes
```bash
nginx -t && systemctl reload nginx
```

---

## 📊 Monitoring Commands

```bash
# Check backend status
pm2 status
pm2 logs nstu-backend --lines 50

# Check MongoDB
systemctl status mongod
mongosh --eval "db.stats()"

# Check Nginx
systemctl status nginx
tail -f /var/log/nginx/error.log

# Check disk space
df -h

# Check uploads folder size
du -sh /var/www/nstu-app/backend/uploads/
```

---

## 🔑 Default Credentials

- **Admin:** `admin` / `nastu123`
- **Test Surveyor:** `surveyor1` / `test123`

---

## ⚠️ Important Notes

1. **Always use `yarn` instead of `npm`** for frontend to avoid dependency conflicts
2. **Uploads folder** must have write permissions for the backend process
3. **Nginx proxy_pass** should NOT have trailing slash issues
4. **PM2** must be configured to auto-restart on server reboot (`pm2 startup`)
5. **SSL certificates** auto-renew with certbot cron job
