# NSTU India Private Limited - Property Tax Management System

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Multi-town (multi-tenant) platform where each town has isolated data. Roles: Super Admin, Admin, Surveyor, Supervisor, MC Officer.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React on port 3000
- **Database**: MongoDB with hybrid multi-tenant model
  - `nstu_master`: Global DB for users, towns, auth
  - Per-town DBs: Uses `DB_NAME` from `.env` for Thanesar (THS), `nstu_town_xxx` for new towns
  - **IMPORTANT**: `TOWN_DB_MAPPING["THS"]` reads from `os.environ.get('DB_NAME')`
- **Multi-Tenant**: ContextVar middleware + axios interceptor for X-Town-Code header
- **File Storage**: GridFS per-town DB, URLs include town code: `/api/file/{town_code}/{file_id}`

## What's Been Implemented
- [x] Multi-tenant architecture (database-per-tenant)
- [x] Town selection page after login
- [x] Town management (CRUD) for admins
- [x] Town switcher in admin header
- [x] Complete data scoping - ALL endpoints use town-scoped DB
- [x] User migration from legacy DB to master_db
- [x] Employees scoped to town
- [x] Dashboard Today Report toggle with date picker
- [x] Export PDF/Excel: Ward to Colony Name, removed unwanted fields
- [x] Clickable Photo URLs in Excel exports
- [x] Cross-town file serving with fallback
- [x] Advanced search on submissions page
- [x] Surveyor workflow (map colors, form locking)
- [x] PDF generation with Hindi notes
- [x] **Old Photo Migration API** - Upload Excel to update property photo_url (Feb 2026)
- [x] **Block Assign/Unassign Colonies** - Multi-colony, multi-surveyor assignment (Feb 2026)
- [x] **Relation dropdown text change** - "Padosi" changed to "ग्राहक" (Feb 2026)
- [x] **Duplicate Prevention** - Always checks property_id before adding to properties (Feb 2026)
- [x] **Show Full Town Map** - Button to display all properties on map (Feb 2026)
- [x] **Property Image in Survey** - Shows old photo_url in surveyor form (Feb 2026)
- [x] **Excel Export with Property ID** - Bills export includes Property ID column (Feb 2026)
- [x] **GPS Serial Number Generation** - Generate serial numbers based on GPS coords for colonies (Feb 2026)
- [x] **Colony Regex Fix** - Fixed special characters () in colony names across all endpoints (Feb 2026)
- [x] **Bulk PDF Upload** - Upload multiple PDF files at once with progress tracking (Feb 2026)
- [x] **Supervisor/MC Officer Approve/Reject** - These roles can now approve/reject pending submissions (Feb 2026)
- [x] **Supervisor Employee Visibility** - Supervisor can now see employee list in dashboard (Feb 2026)
- [x] **Performance Fix** - Removed "Show Full Town Map" feature that was loading 50k+ properties (Feb 2026)
- [x] **Excel Export Full Photo URLs** - Photo URLs are now absolute clickable URLs, dynamically constructed from request host (Feb 2026)
- [x] **Excel Export Lat/Long/Time** - Added Latitude, Longitude, and separate Date/Time columns (Feb 2026)
- [x] **Excel Export Property ID Fix** - Shows human-readable Property ID instead of internal UUID (Feb 2026)
- [x] **Excel Download Format Fix** - Fixed Blob MIME type in Bills.js and Submissions.js so Excel downloads as proper .xlsx (Feb 2026)
- [x] **Submissions Edit Form Sync** - Synced edit form with Survey.js: relation options, special condition, property status, property use fields (Feb 2026)

## Credentials (Dev)
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123
- Supervisor: a / test123
- MC Officer: 1234567890 / test123

## Prioritized Backlog
### P1
- Surveyor login auto-routing to assigned town

### P2
- Offline surveyor support
- ZIP PDF download (all split-employee PDFs)
- server.py refactoring into APIRouter modules (6400+ lines)
- Map marker shortcut to survey form

## VPS Deployment
- DB_NAME on VPS: `nstu_property_tax`
- Backend: systemd service with uvicorn + venv
- After git pull, must fix TOWN_DB_MAPPING: replace "test_database" with "nstu_property_tax"

## Key API Endpoints (New)
- `GET /api/admin/colonies` - List all colonies in current town
- `POST /api/admin/block-assign-colonies` - Assign multiple colonies to surveyors
- `POST /api/admin/block-unassign-colonies` - Unassign all surveyors from colonies
- `POST /api/admin/upload-old-photos` - Upload Excel with old photo URLs
- `POST /api/admin/bills/generate-serial-by-gps` - Generate serial numbers by GPS coordinates
