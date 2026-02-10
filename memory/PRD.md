# NSTU India Private Limited - Property Tax Management System

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Multi-town (multi-tenant) platform where each town has isolated data. Roles: Super Admin, Admin, Surveyor, Supervisor, MC Officer.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React on port 3000
- **Database**: MongoDB with hybrid multi-tenant model
  - `nstu_master`: Global DB for users, towns, auth
  - Per-town DBs: Uses `DB_NAME` from `.env` for Thanesar (THS), `nstu_town_xxx` for new towns
  - **IMPORTANT**: `TOWN_DB_MAPPING["THS"]` reads from `os.environ.get('DB_NAME')` — works on both dev and VPS
- **Multi-Tenant**: ContextVar middleware + axios interceptor for X-Town-Code header
- **File Storage**: GridFS per-town DB, URLs include town code: `/api/file/{town_code}/{file_id}`

## What's Been Implemented
- [x] Multi-tenant architecture (database-per-tenant)
- [x] Town selection page after login
- [x] Town management (CRUD) for admins
- [x] Town switcher in admin header
- [x] Complete data scoping - ALL endpoints use town-scoped DB
- [x] User migration from legacy DB to master_db
- [x] Employees scoped to town (new town = fresh employees)
- [x] Auto-assign new employees to selected town
- [x] Dashboard Today Report toggle with date picker
- [x] Download Day Report (CSV)
- [x] Export PDF/Excel: Ward→Colony Name, removed unwanted fields
- [x] Clickable Photo URLs in Excel exports
- [x] Cross-town file serving: URLs include town code `/api/file/{town_code}/{file_id}`
- [x] Fallback file search across all town DBs for legacy URLs
- [x] Advanced search on submissions page
- [x] Surveyor workflow (map colors, form locking)
- [x] PDF generation with Hindi notes

## Export Fields
### Property Details: Property ID, Owner Name, Mobile, Address, Colony Name, Amount
### Survey Information: Receiver Name, Receiver Mobile No, Relation, Submitted By, Time, GPS, Photo
### Removed: New Owner Name, Old Property ID, Family ID, Aadhar Number, Ward Number

## Prioritized Backlog
### P1: Surveyor login auto-routing to assigned town
### P2: Offline surveyor support, ZIP PDF download, refactor server.py

## VPS Deployment
- DB_NAME on VPS: `nstu_property_tax`
- Backend: systemd service with uvicorn + venv
- After git pull, must fix TOWN_DB_MAPPING: replace "test_database" with "nstu_property_tax"

## Credentials (Dev)
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123
