# =====================================================
# NSTU India - Hostinger VPS Deployment Guide
# Domain: app.nstu.in | IP: 187.127.176.233
# =====================================================

## STEP 1: SSH Login karo VPS mein

```bash
ssh root@187.127.176.233
```
Password enter karo jo Hostinger ne diya hai.

---

## STEP 2: System Update + Dependencies Install karo

```bash
# System update
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS install karo
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3 + pip + venv
sudo apt install -y python3 python3-pip python3-venv

# MongoDB install karo (Ubuntu 22.04/24.04)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# MongoDB start + enable on boot
sudo systemctl start mongod
sudo systemctl enable mongod

# Nginx install
sudo apt install -y nginx

# PM2 (Process Manager) install
sudo npm install -g pm2

# PDF ke liye dependencies (Hindi notes + fonts)
sudo apt install -y wkhtmltopdf xvfb xauth fonts-lohit-deva fonts-noto-core fonts-gargi fonts-samyak-devanagari

# Git install (agar nahi hai)
sudo apt install -y git
```

### Verify karo sab installed hai:
```bash
node -v          # v20.x.x
npm -v           # 10.x.x
python3 --version # 3.10+ 
mongosh --eval "db.version()"
nginx -v
pm2 -v
```

---

## STEP 3: App Directory banao + Code Clone karo

```bash
# Directory create karo
sudo mkdir -p /var/www/nstu-app
cd /var/www/nstu-app

# Git clone karo (Save to Github se pehle push karna hoga)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

**Note:** Pehle Emergent platform se "Save to Github" karke code push karo, phir clone karo.

---

## STEP 4: Backend Setup

```bash
cd /var/www/nstu-app/backend

# Python packages install karo
pip3 install -r requirements.txt
```

### Backend .env file banao:
```bash
cat > /var/www/nstu-app/backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=nstu_property_tax
MASTER_DB_NAME=nstu_master
JWT_SECRET=nstu-property-tax-manager-secret-key-2025
BASE_URL=https://app.nstu.in
CORS_ORIGINS=https://app.nstu.in,http://app.nstu.in
EOF
```

### Uploads folder ensure karo:
```bash
mkdir -p /var/www/nstu-app/backend/uploads
chmod 755 /var/www/nstu-app/backend/uploads
```

---

## STEP 5: Frontend Setup

```bash
cd /var/www/nstu-app/frontend

# Dependencies install karo
npm install --legacy-peer-deps
```

### Frontend .env file banao:
```bash
cat > /var/www/nstu-app/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=https://app.nstu.in
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCrvoi_HTTEysGCZlRsXRKfz_Zpbs66_rg
EOF
```

### Production Build banao:
```bash
npm run build
```

Build complete hone mein 2-5 minute lag sakta hai. `build/` folder ban jayega.

---

## STEP 6: PM2 se Backend + Frontend Start karo

### PM2 Ecosystem file banao:
```bash
cat > /var/www/nstu-app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/var/www/nstu-app/backend',
      script: 'uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'python3',
      env: {
        MONGO_URL: 'mongodb://localhost:27017',
        DB_NAME: 'nstu_property_tax',
        MASTER_DB_NAME: 'nstu_master',
        JWT_SECRET: 'nstu-property-tax-manager-secret-key-2025',
        BASE_URL: 'https://app.nstu.in',
        CORS_ORIGINS: 'https://app.nstu.in,http://app.nstu.in'
      }
    }
  ]
};
EOF
```

### Start karo:
```bash
cd /var/www/nstu-app
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Auto-restart on reboot
```

### Check karo:
```bash
pm2 status
# backend should show "online"

# Test backend directly:
curl http://localhost:8001/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"Raghav2026"}'
```

---

## STEP 7: Nginx Configure karo (SSL + Reverse Proxy)

### Pehle SSL certificate lo (Let's Encrypt):
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Nginx config banao:
```bash
sudo cat > /etc/nginx/sites-available/nstu-app << 'NGINX'
server {
    listen 80;
    server_name app.nstu.in;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name app.nstu.in;

    # SSL certificates (certbot will fill these)
    ssl_certificate /etc/letsencrypt/live/app.nstu.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.nstu.in/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # Upload size limit (PDF files 100MB tak)
    client_max_body_size 100M;

    # Backend API - /api prefix wale requests backend ko jaayenge
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Frontend - React build serve karo
    location / {
        root /var/www/nstu-app/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
NGINX
```

### Enable karo + Test karo:
```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/nstu-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Pehle bina SSL start karo (certificate ke liye)
# Temporarily comment out ssl lines and 443 block, use only port 80 without redirect:
sudo cat > /etc/nginx/sites-available/nstu-app << 'NGINX_TEMP'
server {
    listen 80;
    server_name app.nstu.in;

    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location / {
        root /var/www/nstu-app/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
NGINX_TEMP

sudo nginx -t && sudo systemctl restart nginx
```

---

## STEP 8: Domain DNS Setup (Hostinger Panel mein)

Hostinger DNS panel mein ye records add karo:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A    | app  | 187.127.176.233 | 3600 |

**Note:** DNS propagate hone mein 5-30 minutes lagta hai.

### Check DNS:
```bash
# Local machine se:
nslookup app.nstu.in
# ya
dig app.nstu.in
```

Jab DNS propagate ho jaye:
```bash
# Browser mein check karo:
http://app.nstu.in
```

---

## STEP 9: SSL Certificate Install karo (DNS propagate hone ke baad)

```bash
# Certbot se free SSL certificate lo
sudo certbot --nginx -d app.nstu.in --non-interactive --agree-tos -m your-email@gmail.com

# Ab full SSL config restore karo:
sudo cat > /etc/nginx/sites-available/nstu-app << 'NGINX'
server {
    listen 80;
    server_name app.nstu.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name app.nstu.in;

    ssl_certificate /etc/letsencrypt/live/app.nstu.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.nstu.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        root /var/www/nstu-app/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo nginx -t && sudo systemctl restart nginx
```

### Auto-renewal setup:
```bash
sudo certbot renew --dry-run
```

---

## STEP 10: MongoDB Data Migrate karo (Purane VPS se)

### Option A: Purane VPS se export + naye VPS pe import
```bash
# PURANE VPS pe (old server):
mongodump --db nstu_master --out /tmp/mongo_backup/
mongodump --db nstu_property_tax --out /tmp/mongo_backup/

# Backup download karo local pe:
scp -r root@OLD_VPS_IP:/tmp/mongo_backup/ ./mongo_backup/

# NAYE VPS pe upload karo:
scp -r ./mongo_backup/ root@187.127.176.233:/tmp/mongo_backup/

# NAYE VPS pe restore karo:
mongorestore --db nstu_master /tmp/mongo_backup/nstu_master/
mongorestore --db nstu_property_tax /tmp/mongo_backup/nstu_property_tax/
```

### Option B: Direct transfer (old VPS se naye pe seedha)
```bash
# PURANE VPS pe ye command run karo:
mongodump --db nstu_master --archive | ssh root@187.127.176.233 "mongorestore --archive --db nstu_master"
mongodump --db nstu_property_tax --archive | ssh root@187.127.176.233 "mongorestore --archive --db nstu_property_tax"
```

### Uploads folder bhi copy karo:
```bash
# Purane VPS se naye VPS pe:
scp -r root@OLD_VPS_IP:/var/www/nstu-app/backend/uploads/ root@187.127.176.233:/var/www/nstu-app/backend/uploads/
```

---

## STEP 11: Final Test karo

```bash
# Backend test:
curl https://app.nstu.in/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Raghav2026"}'

# Should return: {"token": "eyJ..."}

# PM2 status:
pm2 status

# Nginx status:
sudo systemctl status nginx

# MongoDB status:
sudo systemctl status mongod
```

Browser mein open karo: **https://app.nstu.in**

---

## Quick Update Commands (Baad mein code update karne ke liye)

### Full Update:
```bash
cd /var/www/nstu-app && git pull origin main && cd backend && pip3 install -r requirements.txt && cd ../frontend && npm install --legacy-peer-deps && npm run build && cd .. && pm2 restart all
```

### Backend Only:
```bash
cd /var/www/nstu-app && git pull origin main && pip3 install -r backend/requirements.txt && pm2 restart backend
```

### Frontend Only:
```bash
cd /var/www/nstu-app && git pull origin main && cd frontend && npm run build && cd .. && pm2 restart all
```

---

## Troubleshooting

### Logs check karo:
```bash
pm2 logs backend --lines 50    # Backend errors
pm2 logs --lines 50            # All logs
sudo tail -f /var/log/nginx/error.log   # Nginx errors
```

### Services restart karo:
```bash
pm2 restart all          # App restart
sudo systemctl restart nginx   # Nginx restart
sudo systemctl restart mongod  # MongoDB restart
```

### Common Issues:

| Problem | Solution |
|---------|----------|
| `npm install` fail | `npm install --legacy-peer-deps` |
| Port 8001 busy | `pm2 delete all && pm2 start ecosystem.config.js` |
| Permission denied | `sudo chown -R $USER:$USER /var/www/nstu-app` |
| PDF generation fail | `sudo apt install wkhtmltopdf xvfb fonts-gargi` |
| 502 Bad Gateway | `pm2 restart backend` + check `pm2 logs backend` |
| Uploads not working | `chmod 755 /var/www/nstu-app/backend/uploads` |
| MongoDB not starting | `sudo systemctl start mongod` |
| SSL expired | `sudo certbot renew` |
| Git pull conflict | `git stash && git pull origin main && git stash pop` |

---

## Firewall Setup (Optional but Recommended)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

**Note:** Port 8001 ko publicly expose MAT karo. Nginx proxy se handle hoga.
