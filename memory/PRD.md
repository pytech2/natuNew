# NSTU India Property Tax Management System - PRD

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Features multiple user roles (Admin, Surveyor, Supervisor, MC Officer), bulk data upload via Excel and PDF, property assignment, surveyor mobile interface for data collection (including photos with GPS watermarks), and admin dashboard for progress tracking, review/approval, and data export.

## Core Requirements

### User Roles & Permissions
- **Super Admin**: Full system access, user management, data upload/export
- **Surveyor**: View assigned properties, mark attendance, submit surveys with photos
- **Supervisor**: Review surveyor work, manage assignments
- **MC Officer**: Portal access, verification tasks

### Key Workflows
1. **Admin Workflow**: Login, upload property data (Excel/PDF), manage users, assign properties, track progress, review submissions, export data
2. **Surveyor Workflow**: Login, mark attendance, view assigned properties on map, submit surveys with mandatory photos
3. **Dashboard**: Real-time stats, employee progress tracking, submission management

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), Pydantic, reportlab, pandas, openpyxl
- **Frontend**: React, React Hooks, MapLibre GL, React-Map-GL, Tailwind CSS, Shadcn UI, axios
- **Deployment**: User's Hostinger VPS with Nginx reverse proxy

## Architecture
```
/app/
├── backend/
│   ├── server.py         # Monolithic FastAPI server
│   ├── requirements.txt
│   └── .env
├── frontend/
│   └── src/
│       ├── pages/admin/   # Dashboard, Map, Submissions, etc.
│       └── pages/employee/ # Properties, Survey
└── deploy.sh             # VPS deployment script
```

## What's Been Implemented

### January 25, 2026
- ✅ Removed date filter (Today/Yesterday/All Time/Custom Date) from Dashboard - user requested removal as it wasn't working properly
- ✅ Fixed attendance count logic to use `attendance.length` directly

### Previous Session Completed Work
- Dashboard with date filters (now removed), submission stats, employee progress
- Survey form with self-certification radio buttons, remarks for special conditions
- Surveyor map with optimized performance, Google-style pins, 40m radius
- Data consistency across views (Surveyor Map, Admin Map, Submissions)
- VPS deployment script (deploy.sh)

## Known Issues

### P0 - Critical
1. **Git Push Blocker**: Repository has large files in history preventing push. User needs to run `git push origin main --force`

### P1 - High Priority  
2. **Dashboard Property Count Mismatch**: User reported potential discrepancies between "Completed" vs "Approved" totals
3. **Surveyor/Category Dropdowns**: Not working on user's Hostinger VPS

### P3 - Lower Priority
4. **VPS Deployment Fragility**: Recurring issues with user's Hostinger environment

## Upcoming Tasks
- [ ] Implement "Hide Completed Properties" toggle on map pages
- [ ] Backend refactoring - split server.py into modular routers

## Future/Backlog
- [ ] Offline support for surveyor mobile interface
- [ ] Download all split-employee PDFs as ZIP
- [ ] Survey form shortcut from map marker click
- [ ] "Completed Colony" access restrictions

## Test Credentials
- Admin: `admin` / `nastu123`
- Surveyor: `surveyor1` / `test123`
- Supervisor: `a` / `test123`
- MC Officer: `1234567890` / `test123`

## Key API Endpoints
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/submission-stats` - Submission counts
- `GET /api/admin/employee-progress` - Employee progress data
- `GET /api/admin/attendance` - Attendance records
- `POST /api/employee/submit/{property_id}` - Survey submission
