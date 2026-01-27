# NSTU India Property Tax Management System - PRD

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Features multiple user roles (Admin, Surveyor, Supervisor, MC Officer), bulk data upload via Excel/PDF, property assignment, surveyor mobile interface with GPS-watermarked photos, and admin dashboard for progress tracking and data export.

## Core Features
- **User Management**: Role-based access (Super Admin, Surveyor, Supervisor, MC Officer)
- **Data Upload**: Excel and PDF bulk upload with duplicate detection
- **Property Management**: Assignment, status tracking, GPS-based serial numbers
- **Survey System**: Mobile interface with mandatory photo upload and attendance
- **PDF Generation**: Custom bill generation with serial numbers and Hindi messages
- **Dashboard**: Real-time statistics and progress tracking
- **Export**: Excel export with filtering options

## Tech Stack
- **Frontend**: React, MapLibre GL, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **PDF Processing**: PyMuPDF (fitz), ReportLab
- **Excel Processing**: Pandas, OpenPyXL

## What's Been Implemented

### January 27, 2025
- **P0 BUG FIX: PDF Text Orientation** - Fixed critical bug where serial numbers and Hindi messages were printing vertically on 90-degree rotated PDF pages
  - Root cause: PyMuPDF's `insert_text()` uses internal coordinate system, not visual coordinates for rotated pages
  - Solution: Use `page.derotation_matrix` to transform visual coordinates to internal coordinates, combined with `rotate=90` parameter
  - Fixed in all three PDF generation functions: `generate_arranged_pdf`, `split_bills_by_employee`, `split_bills_by_employees`
  - Serial number now appears RED at TOP-RIGHT, HORIZONTAL
  - Hindi message "अपनी प्रॉपर्टी को Self Certified कराएँ।" appears BLUE at TOP, HORIZONTAL

### Previous Sessions
- Dashboard date filter removal
- Skipped records tracking & display
- Excel export feature with self-certification filter
- Search by serial number on Map and Submissions pages
- GPS-based N-prefix serial number calculation

## Key API Endpoints
- `POST /api/admin/bills/generate-pdf` - Generate arranged PDF bills
- `POST /api/admin/bills/split-by-employee` - Split bills by employee count
- `POST /api/admin/bills/split-by-employees` - Split bills by specific employees
- `GET /api/admin/bills/colony-stats/{colony}` - Get colony statistics
- `GET /api/admin/bills/export-excel` - Export bills to Excel

## Database Collections
- `users` - User accounts with roles
- `properties` - Property records with GPS, status, assignments
- `bills` - Bill records from PDF uploads
- `batches` - Upload batches with skip stats
- `attendance` - Daily attendance records
- `submissions` - Survey submissions

## Pending Issues
- **P0**: Git push blocker (large files in history) - User needs to `git push --force`
- **P1**: Dashboard attendance count accuracy on VPS
- **P1**: Dashboard property count mismatch on VPS
- **P1**: Surveyor/Category dropdowns on Admin Map not working on VPS
- **P1**: Nearest GPS serial algorithm discrepancy

## Upcoming Tasks
- "Hide Completed Properties" toggle on map pages
- Backend refactoring (decompose server.py into routers)

## Future/Backlog
- Offline support for surveyor mobile interface
- Download all split-employee PDFs as ZIP
- Survey form shortcut from map marker
- "Completed Colony" access restrictions

## Test Credentials
- Admin: `admin` / `nastu123`
- Surveyor: `surveyor1` / `test123`
- Supervisor: `a` / `test123`
- MC Officer: `1234567890` / `test123`
