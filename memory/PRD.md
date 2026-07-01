# NSTU Property Tax Management - Product Requirements Document

## Original Problem Statement
Full-stack web application for NSTU India Private Limited to manage property tax notice distribution and surveys. Multi-tenant database architecture (one DB per town). Features: complex dashboards, surveyor assignments, mobile survey submissions, PDF/Excel exports, strict role-based access.

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI (dark navy glassmorphism theme)
- **Backend**: FastAPI (monolithic server.py ~8600 lines)
- **Database**: MongoDB (multi-tenant: master_db + dynamic town DBs)
- **Maps**: MapLibre GL + React-Map-GL
- **PDF**: PyMuPDF (fitz) + Pillow (PIL)
- **Additional**: date-fns, react-day-picker

## Key Architecture
- FastAPI ContextVar-based Multi-tenancy (`X-Town-Code` header)
- Bulk MongoDB Operations (`update_many`, `$in`) for performance
- Town-scoped access control (users only see assigned towns)
- Compressed survey photos (800px max, 0.55 JPEG quality)

## Completed Features (All DONE)
- Multi-tenant town database switching
- Role-based access: ADMIN, SUPERVISOR, MC_OFFICER, EMPLOYEE/SURVEYOR
- Property survey mobile interface with GPS, photo watermarking, 50m radius check
- Receiver Photo capture in survey form
- PDF Custom Notes (50% smaller font, color picker, target filtering)
- Survey Photo buttons UI refinement
- Supervisor configurable Approve/Reject permissions
- Global Dialog/AlertDialog overflow fixes
- Shadcn Calendar date picker for Submissions
- Submissions page performance optimization (0.17s load, compound indexes, debounce)
- Auto "Sync Self-Certified" during bulk uploads
- Colony Progress Excel Export fix for large towns
- Optimized Survey Photo Upload Size
- "Old Photos" Excel upload pipeline (86k rows in 7 seconds)
- Town Access restriction for MC Officers/Supervisors
- "Today Report" Dashboard fix
- Submission Details UI enrichment with bills fallback
- **[July 2026] Mobile Camera Auto-Back Bug FIX** - Auth persistence + Survey form state recovery

## Recent Fix: Mobile Camera Bug (P0 - July 2026)
**Problem**: Surveyor's mobile browser killed the React app when opening native camera. On return, AuthContext lost user state, ProtectedRoute redirected to login.

**Root Cause**: 
1. AuthContext cleared token on ANY `/auth/me` error (including network timeouts)
2. No cached user data in localStorage - had to wait for API
3. Survey form state was ephemeral (only useState, no persistence)

**Fix Applied**:
1. **AuthContext**: User cached in localStorage (`cachedUser`), restored instantly on mount. Token only cleared on 401/403, not network errors.
2. **Survey.js**: Form state + photo previews persisted to sessionStorage. Restored on remount.

## Pending Issues
- (None critical - mobile camera fix verified)

## Upcoming Tasks (Priority Order)
- P1: Offline support for surveyor mobile interface
- P2: ZIP download for split-employee PDFs
- P2: Refactor server.py into modular APIRouters
- P2: Map marker click opens survey form shortcut

## Key Credentials
- Admin: admin / Raghav2026
- Surveyor: surveyor1 / test123
- Supervisor: a / test123

## VPS Deployment Note
User runs on Hostinger VPS. Frontend changes require `npm run build` on VPS after git pull. This is a recurring issue - always remind in Hinglish.
