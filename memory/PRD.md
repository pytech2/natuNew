# NSTU India Private Limited - Property Tax Management System

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Multi-town (multi-tenant) platform where each town has isolated data. Roles: Super Admin, Admin, Surveyor, Supervisor, MC Officer.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React on port 3000
- **Database**: MongoDB with hybrid multi-tenant model
  - `nstu_master`: Global DB for users, towns, auth
  - Per-town DBs: `test_database` (Thanesar/THS), `nstu_town_xxx` (new towns)
- **Multi-Tenant**: ContextVar middleware + axios interceptor for X-Town-Code header

## What's Been Implemented
- [x] Multi-tenant architecture (database-per-tenant)
- [x] Town selection page after login
- [x] Town management (CRUD) for admins
- [x] Town switcher in admin header
- [x] **Complete data scoping** - ALL endpoints use town-scoped DB via ContextVar middleware
- [x] User migration from legacy DB to master_db
- [x] Advanced search on submissions page
- [x] Surveyor workflow (map colors, form locking)
- [x] PDF generation with Hindi notes
- [x] Excel upload/export
- [x] Attendance tracking
- [x] Property assignment (single/bulk)
- [x] GridFS file storage (town-scoped)

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- User-town assignment UI (admin can assign employees to specific towns)
- Upload data scoped to selected town (batch upload uses town context)
- Surveyor login auto-routing to assigned town

### P2 (Medium)  
- Offline support for surveyor mobile interface
- Download all split-employee PDFs as ZIP
- Map marker → survey form shortcut
- Refactor server.py into modular route files (APIRouter)

### P3 (Low)
- VPS deployment optimization guide
- Performance monitoring dashboard

## Credentials
- Admin: admin / nastu123
- Surveyor: surveyor1 / test123
- Supervisor: a / test123
- MC Officer: 1234567890 / test123

## Key Files
- `/app/backend/server.py` - Main backend (6200+ lines)
- `/app/backend/db_architecture.py` - DB architecture docs
- `/app/frontend/src/App.js` - React app with axios interceptor
- `/app/frontend/src/context/TownContext.js` - Town state management
- `/app/frontend/src/components/TownSelector.js` - Town switcher
- `/app/frontend/src/pages/SelectTown.js` - Town selection page
