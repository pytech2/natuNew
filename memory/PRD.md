# NSTU India - Property Tax Survey App

## Latest Update: Jan 20, 2026

### Performance Optimizations ✅
- **Backend Caching**: 60s TTL for map data, 5min for colonies
- **GZip Compression**: Enabled for all responses
- **MongoDB Indexes**: 20+ indexes on all collections
- **Connection Pool**: 50 max connections
- **20 concurrent users**: 0.6s response time

### Surveyor Map Features ✅ (UPDATED - MapLibre)
- **MapLibre GL** - Free, fast map library with NATIVE 360° rotation
- **Native Two-Finger Rotation** - Built-in gesture support, no hacks needed
- **Fullscreen Satellite Map** - Google satellite tiles via MapLibre
- **NO PROPERTY LIMIT** - Shows ALL assigned properties (100, 2000, 5000+)
- **Compass Auto-Rotate** - Map follows device compass heading
- **GPS Tracking** - Real-time location with blue pulsing dot
- **Position Persistence** - Map center, zoom, bearing saved to localStorage
- **Fast Loading** - Cached API responses + lightweight markers

### Admin Map UX ✅ (Jan 21, 2026)
- **Direct Map Access** - Map opens immediately without blocking screens
- **Inline Colony Selector** - Compact banner with dropdown, no modal required
- **Conditional UI** - Stats and filters appear only after colony selection
- **Dynamic Header** - Shows selected colony name or prompts to select

### How 360° Rotation Works (MapLibre Native)
- Two-finger twist on mobile → Map rotates smoothly
- `touchZoomRotate={true}` and `dragRotate={true}` enabled
- Bearing (rotation angle) shown in compass indicator
- Reset to North (N↑) button when rotated

### API Endpoints (Optimized)
| Endpoint | Purpose | Cache |
|----------|---------|-------|
| `/api/map/colonies` | Colony list | 5 min |
| `/api/map/properties` | Admin map markers | 60s |
| `/api/map/employee-properties` | Surveyor map markers | 60s |
| `/api/file/{id}` | Serve files from GridFS | 24h |

### Database Stats
- Total Properties: 1408
- Colonies: 2

## VPS Deployment Commands

```bash
# 1. Navigate to app folder
cd /var/www/nstu-app

# 2. Pull latest code
git fetch origin
git reset --hard origin/main

# 3. Backend setup
cd backend
source venv/bin/activate
pip install -r requirements.txt
pkill -f uvicorn
nohup python -m uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4 > backend.log 2>&1 &
cd ..

# 4. Frontend build
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# 5. Nginx config (add if not present)
sudo tee -a /etc/nginx/nginx.conf << 'EOF'
# Inside http { } block:
client_max_body_size 50M;
gzip on;
gzip_types text/plain application/json application/javascript text/css;
EOF

# 6. Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# 7. Verify
curl http://localhost:8001/api/map/colonies
```

## Test Credentials
- **Admin**: `admin` / `nastu123`
- **Surveyor**: `surveyor1` / `test123`

## Files Changed
- `/app/backend/server.py` - Caching, GZip, optimized queries
- `/app/frontend/src/pages/employee/Properties.js` - Fullscreen satellite map
- `/app/frontend/src/pages/admin/Map.js` - Colony selection first
- `/app/frontend/src/pages/admin/Bills.js` - Skip duplicates option
