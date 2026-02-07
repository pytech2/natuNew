# NSTU India Private Limited - Property Tax Management System

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Multi-town (multi-tenant) platform where each town has isolated data. Roles: Super Admin, Admin, Surveyor, Supervisor, MC Officer.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React on port 3000
- **Database**: MongoDB with hybrid multi-tenant model
  - `nstu_master`: Global DB for users, towns, auth
  - Per-town DBs: Uses `DB_NAME` from `.env` for Thanesar (THS), `nstu_town_xxx` for new towns
  - **IMPORTANT**: `TOWN_DB_MAPPING["THS"]` reads from `os.environ.get('DB_NAME')` — works on both dev (`test_database`) and VPS (`nstu_property_tax`)
- **Multi-Tenant**: ContextVar middleware + axios interceptor for X-Town-Code header

## What's Been Implemented
- [x] Multi-tenant architecture (database-per-tenant)
- [x] Town selection page after login
- [x] Town management (CRUD) for admins
- [x] Town switcher in admin header
- [x] Complete data scoping - ALL endpoints use town-scoped DB via ContextVar middleware
- [x] User migration from legacy DB to master_db
- [x] Advanced search on submissions page
- [x] Surveyor workflow (map colors, form locking)
- [x] PDF generation with Hindi notes
- [x] Excel upload/export
- [x] Attendance tracking
- [x] Property assignment (single/bulk)
- [x] GridFS file storage (town-scoped)
- [x] Export PDF/Excel updated: Ward→Colony Name, removed unwanted fields, clickable photo URLs

## Export Fields (PDF & Excel)
### Property Details:
Property ID, Owner Name, Mobile, Address, Colony Name, Amount

### Survey Information:
Receiver Name, Receiver Mobile No, Relation, Submitted By, Time, GPS Lat/Lng, Status, Photo

### Removed from exports:
New Owner Name, Old Property ID, Family ID, Aadhar Number, Ward Number

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- User-town assignment UI (admin can assign employees to specific towns)
- Surveyor login auto-routing to assigned town

### P2 (Medium)
- Offline support for surveyor mobile interface
- Download all split-employee PDFs as ZIP
- Map marker to survey form shortcut
- Refactor server.py into modular route files (APIRouter)

## VPS Deployment
- DB_NAME on VPS: `nstu_property_tax` (NOT `test_database`)
- Backend: systemd service (`nstu-backend.service`) with uvicorn + venv
- Frontend: npm build served by Nginx at `app.nstuindia.com`
- Migration script needed after each deploy to sync users to `nstu_master`

## Credentials (Dev)
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123
