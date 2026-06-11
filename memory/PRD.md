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
- [x] **Employee Management** (Mar 2026): Separated Login ID (text) from Mobile Number (10-digit), added validation
- [x] **Submissions Bulk Actions** (Mar 2026): Select All, Approve All, Reject (delete + revert to Pending), Pending Review
- [x] **Rejection Logic** (Mar 2026): Rejected submission deleted, property reverts to Pending for re-survey/auto-complete
- [x] **RBAC on Submissions** (Mar 2026): Export, Bulk Actions, Advanced Filters restricted to ADMIN only
- [x] **Auto-sync Bills** (Mar 2026): Automatically copy bills to properties when employee assigned to colony
- [x] **External Image Proxy** (Mar 2026): /api/proxy-image endpoint for legacy external photos
- [x] **PDF Size Optimization** (Mar 2026): Compressed to <1MB with 800px max width, 45% JPEG quality
- [x] **Dashboard categories** (Mar 2026): All 7 categories (Agriculture, Institutional, Special) visible
- [x] **Auto-complete All Colonies** (Mar 2026): Added "All Colonies" option in auto-complete dialog
- [x] **Surveyor Report Excel** (Mar 2026): Date-wise progress + Refusal progress 2-sheet Excel download from Dashboard (fixed 404 route placement bug)
- [x] **Report Download Filters** (Mar 2026): Added filter dialog with Month/Year, Date Range, Surveyor, Colony, Category, Status filters for report download
- [x] **Property Detail Photos** (Mar 2026): Property view dialog now fetches and displays submission photos, survey info
- [x] **Logo & Name Update** (Mar 2026): Changed logo to new NSTU badge and company name
- [x] **Dashboard Dark Theme Redesign** (Mar 2026): Complete dark navy blue theme with glassmorphism
- [x] **Login & SelectTown Dark Theme** (Mar 2026): Dark navy theme with glassmorphism
- [x] **Employee Dashboard Redesign** (Mar 2026): Dark theme with date-wise calendar view
- [x] **Full App Dark Theme** (Mar 2026): AdminLayout sidebar, EmployeeLayout header/bottom-nav
- [x] **Admin Password Reset** (Jun 2026): Reset to Raghav2026
- [x] **Map Properties Fix** (Jun 2026): Fixed ALL_AREAS colony selection bug that prevented properties from loading
- [x] **Employee Progress Report Overall Column** (Jun 2026): Added "Overall" column with all-time submission count, sorted max to min
- [x] **Receiver Photo in Survey** (Jun 2026): Added second photo option for receiver's photo alongside property photo in survey form
- [x] **Photo Quality Improvement** (Jun 2026): Increased photo resolution from 600px to 1280px max, quality from 0.5 to 0.75 JPEG compression
- [x] **Generate PDF Dialog Scroll Fix** (Jun 2026): Made dialog scrollable with max-height 90vh, footer always visible
- [x] **PDF Note Enhancements** (Jun 2026): Font size reduced 50% (22→14 with 2x quality rendering), color picker added (Red/Blue/Green/Black + custom), note target filter (All Bills / Self Certified / Not Self Certified)
- [x] **Supervisor Approve/Reject Permission** (Jun 2026): Fixed Submissions page to check user.permissions.can_approve_reject instead of only ADMIN role. AuthContext updated to fetch computed permissions after login.

## Credentials
- Admin: admin / Raghav2026
- Surveyor: surveyor1 / test123
- Supervisor: a / test123

## Prioritized Backlog
### P0
- VPS deployment on Hostinger (app.nstu.in) - step-by-step guide needed

### P1
- Offline support for surveyor mobile interface

### P2
- ZIP download for split-employee PDFs
- server.py refactoring into APIRouter modules
- Map marker shortcut to survey form
