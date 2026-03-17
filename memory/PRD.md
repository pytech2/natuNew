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
- [x] All core features (multi-tenant, town management, surveyor workflow, PDF generation, etc.)
- [x] Bills to Properties duplicate check
- [x] Old photos display and upload
- [x] Cleanup Duplicates with submission reassignment
- [x] Colony Progress Excel with Category, Self Certified, Survey Done By columns
- [x] Comprehensive 37-column export
- [x] Same Mobile / Same Owner duplicate filters in submissions
- [x] Edit submissions after approve/reject
- [x] Original + Survey location display with distance
- [x] Property Map filters, stats, edit, old photo display
- [x] **FIX: Auto-complete system remarks cleaned** (Mar 2026)
- [x] **FIX: Photo URL external handling** - handles http URLs correctly (Mar 2026)
- [x] **FIX: Original Lat/Lon for auto-submitted** (Mar 2026)
- [x] **FIX: Employee un-assign from colony** - handles both single/multi-employee (Mar 2026)
- [x] **Dashboard Redesign** (Mar 2026):
  - Top row: Total Property + Pending Property (big cards)
  - Small blocks: Colony, Vacant Plot, Residential, Commercial, Agriculture, Owner NA, Mobile NA
  - Bill Distribution Status (Total/Pending/Approved/Rejected)
  - Employee + Today Attendance single-row card
  - 3 Progress Reports: Town Bill, Survey, Employee Work

## Credentials (Dev)
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123

## Prioritized Backlog
### P0
- VPS deployment workflow (user-side GitHub auth fix needed)

### P1
- Offline support for surveyor mobile interface

### P2
- ZIP download for split-employee PDFs
- server.py refactoring into APIRouter modules
- Map marker shortcut to survey form
