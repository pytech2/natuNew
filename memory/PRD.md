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
- [x] Comprehensive 37-column Excel export
- [x] Same Mobile / Same Owner duplicate filters in submissions
- [x] Edit submissions after approve/reject
- [x] Original + Survey location display with distance
- [x] Property Map filters, stats, edit, old photo display
- [x] Auto-complete system remarks cleaned (Mar 2026)
- [x] Photo URL external handling - handles http URLs correctly (Mar 2026)
- [x] Original Lat/Lon for auto-submitted (Mar 2026)
- [x] Employee un-assign from colony - handles both single/multi-employee (Mar 2026)
- [x] **Dashboard Redesign** (Mar 2026): Total/Pending top row, category blocks, bill distribution, progress reports
- [x] **Auto-submit category mapping** (Mar 2026): property_use now maps from bill's category (not hardcoded "residential")
- [x] **Export photo URL fix** (Mar 2026): base_url changed to https://app.nstuindia.com
- [x] **PDF export enhanced** (Mar 2026): Added Category, Total Area, Serial No, Bill Sr No, House Status, Property Use, Special Condition, Self Satisfied, Lat/Lon, Aadhar, Family ID, Review Remarks, formatted dates

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
