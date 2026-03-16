# NSTU India Private Limited - Property Tax Management System

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Multi-town (multi-tenant) platform where each town has isolated data. Roles: Super Admin, Admin, Surveyor, Supervisor, MC Officer.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React on port 3000
- **Database**: MongoDB with hybrid multi-tenant model
  - `nstu_master`: Global DB for users, towns, auth
  - Per-town DBs: Uses `DB_NAME` from `.env` for Thanesar (THS), `nstu_town_xxx` for new towns
- **Multi-Tenant**: ContextVar middleware + axios interceptor for X-Town-Code header
- **File Storage**: Filesystem `/app/uploads` for survey photos, GridFS for legacy

## What's Been Implemented
- [x] All previous features (multi-tenant, town management, surveyor workflow, PDF generation, etc.)
- [x] **FIX: Bills to Properties duplicate check** - Only uses property_id (Mar 2026)
- [x] **FIX: Old photos not showing** - Added photo_url to property projections in submissions & employee properties endpoints (Mar 2026)
- [x] **FIX: Cleanup Duplicates improved** - Now reassigns submissions before deleting duplicates instead of just protecting them. Also removes orphan properties (Mar 2026)
- [x] **IMPROVE: Old photo fallback** - Shows clickable link when external image fails to load (Mar 2026)

## Credentials (Dev)
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123
- Supervisor: a / test123
- MC Officer: 1234567890 / test123

## Prioritized Backlog
### P0
- VPS: User must click "Cleanup Duplicates" button on Bills page after deploying to fix 19072→18547 mismatch

### P1
- Surveyor login auto-routing to assigned town
- Colony Progress Excel: Add "Valid Serial", "NA Serial", "Owner Name NA" columns

### P2
- Offline surveyor support
- ZIP PDF download
- server.py refactoring into APIRouter modules
- Map marker shortcut to survey form

## Key API Endpoints
- `POST /api/admin/properties/cleanup-duplicates` - **IMPROVED**: Reassigns submissions, removes duplicates + orphans
- `POST /api/admin/bills/copy-to-properties` - Duplicate check by property_id only
- `GET /api/admin/submissions` - Now includes photo_url in property projection
- `GET /api/employee/properties` - Now includes photo_url in projection
