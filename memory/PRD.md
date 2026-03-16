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
- [x] **FIX: Old photos not showing** - Added photo_url to property projections (Mar 2026)
- [x] **FIX: Cleanup Duplicates improved** - Reassigns submissions before deleting (Mar 2026)
- [x] **Colony Progress Excel** - Added Category breakdown (Residential, Commercial, Mix Use, Vacant Plot, Industrial, Institutional, Special) + Self Certified Yes/No columns (Mar 2026)

## Credentials (Dev)
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123

## Prioritized Backlog
### P0
- VPS: Click "Cleanup Duplicates" after deploy to fix 19072→18547 mismatch

### P1
- Surveyor login auto-routing to assigned town

### P2
- Offline surveyor support
- ZIP PDF download
- server.py refactoring into APIRouter modules
- Map marker shortcut to survey form
