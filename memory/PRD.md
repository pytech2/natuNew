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
- **File Storage**: Filesystem `/app/uploads` for survey photos, GridFS for legacy

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
- [x] Old Photo Migration API - Upload Excel to update property photo_url
- [x] Block Assign/Unassign Colonies - Multi-colony, multi-surveyor assignment
- [x] Relation dropdown text change - "Padosi" changed to customer
- [x] Duplicate Prevention - Always checks property_id before adding to properties
- [x] Show Full Town Map - Button to display all properties on map
- [x] Property Image in Survey - Shows old photo_url in surveyor form
- [x] Excel Export with Property ID - Bills export includes Property ID column
- [x] GPS Serial Number Generation
- [x] Colony Regex Fix
- [x] Bulk PDF Upload
- [x] Supervisor/MC Officer Approve/Reject
- [x] Supervisor Employee Visibility
- [x] Performance Optimization (N+1 queries, indexes, caching)
- [x] Survey Speed Fix - Filesystem uploads instead of GridFS (10x faster)
- [x] Colony Progress Excel Export
- [x] Auto-Complete Survey with employee/date selection
- [x] Self-Certification data management
- [x] Cleanup Duplicate Properties tool
- [x] **FIX: Bills to Properties duplicate check** - Only uses property_id, no longer skips same-owner different-properties (Mar 2026)
- [x] **FIX: Old photos not showing in Submissions** - Added photo_url to property projection in submissions endpoint (Mar 2026)
- [x] **FIX: Old photos not showing in Employee Properties** - Added photo_url to employee properties projection (Mar 2026)
- [x] **IMPROVE: Old photo fallback** - Shows clickable link when external image fails to load (Mar 2026)

## Credentials (Dev)
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123
- Supervisor: a / test123
- MC Officer: 1234567890 / test123

## Prioritized Backlog
### P0
- VPS Deployment: User needs to fix GitHub PAT token, then run deployment sequence

### P1
- Surveyor login auto-routing to assigned town
- Colony Progress Excel: Add "Valid Serial", "NA Serial", "Owner Name NA" columns

### P2
- Offline surveyor support
- ZIP PDF download (all split-employee PDFs)
- server.py refactoring into APIRouter modules (7000+ lines)
- Map marker shortcut to survey form

## VPS Deployment
- DB_NAME on VPS: `nstu_property_tax`
- Backend: systemd service with uvicorn + venv
- After git pull, must fix TOWN_DB_MAPPING: replace "test_database" with "nstu_property_tax"
- Current blocker: GitHub PAT token expired, user needs to regenerate

## Key API Endpoints
- `GET /api/admin/colonies` - List all colonies
- `POST /api/admin/block-assign-colonies` - Assign colonies to surveyors
- `POST /api/admin/block-unassign-colonies` - Unassign colonies
- `POST /api/admin/upload-old-photos` - Upload Excel with old photo URLs
- `POST /api/admin/bills/copy-to-properties` - Copy bills to properties (dedup by property_id)
- `POST /api/admin/auto-complete-surveys` - Auto-complete pending surveys
- `GET /api/admin/colony-progress-export` - Colony progress Excel download
- `POST /api/admin/cleanup-duplicate-properties` - Remove duplicate properties
- `GET /api/admin/submissions` - Submissions list (now includes photo_url)
- `GET /api/employee/properties` - Employee's assigned properties (now includes photo_url)
