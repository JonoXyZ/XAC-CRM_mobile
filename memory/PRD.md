# XAC CRM - Product Requirements Document

## Original Problem Statement
Build "XAC CRM" - a full-stack gym-focused CRM for Revival Fitness. Key goals: lead capture (Meta/Website/Manual), round-robin assignment, multi-role access, WhatsApp messaging, appointments scheduling, sales dashboards, deals tracking, commissions management, admin settings, and notifications.

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor/MongoDB (port 8001)
- **Database**: MongoDB
- **WhatsApp**: Simplified to wa.me links (Baileys microservice removed)

## Roles
1. **Admin** - Full access to all features, user management, settings, commission, bug reports
2. **Management** (sales_manager / club_manager) - Reports, Analytics, Gallery, Leads, Appointments
3. **Consultant** - Leads, Appointments, Commission, Templates
4. **Assistant** - Sees/edits linked consultant's leads, appointments, notes. NO access to sales values or commission sheets

## Core Features (Implemented)
- Login with company gate (RFC911)
- Role-based dashboards with stat cards
- Lead pipeline (Kanban + Table view) with drag-and-drop stages
- **Lead Activity Timeline** — Click a lead name to see full detail modal with chronological activity log
- **Meta Lead Ads Integration Panel** — In-app setup: webhook URL/token with copy buttons, Page Access Token, connection test, recent activity log
- **Meta Lead Import** — Fetch historical leads by date range (Last 7/14/30/90 days or custom) from Facebook Lead Ad forms via Graph API
- Meta/Facebook webhook lead capture (real-time)
- Manual lead creation with round-robin assignment
- Appointments calendar with time slots
- WhatsApp via wa.me links with consultant-managed message templates
- Commission tracking and earnings scale per consultant
- Notification bell system
- Bug Report System
- Fetch Check Leads button
- Contact Us on login page
- Branding settings (company name, etc.)
- Month period controls (set/edit period, generate report)

## Simplification (Feb 2026)
### Removed
- Workflow Builder UI
- Marketing Panel / Ad Manager
- Marketing Dashboard & Forms pages
- WhatsApp Baileys microservice (replaced with wa.me links)
- Dashboard charts/graphs (keeping clean stat cards)
- marketing_agent role from navigation

### Kept
- Bug Report System
- Fetch Check Leads
- Notifications
- Commission sheets
- Meta webhook integration
- All 4 roles (Admin, Management, Consultant, Assistant)
- Message templates per consultant

## Key Files
- `/app/backend/server.py` - Main FastAPI app (~2,900 lines)
- `/app/frontend/src/App.js` - React routes
- `/app/frontend/src/components/Layout.js` - Sidebar navigation
- `/app/frontend/src/pages/Dashboard.js` - Simplified stat cards
- `/app/frontend/src/pages/Leads.js` - Lead pipeline with wa.me WhatsApp
- `/app/frontend/src/pages/Appointments.js` - Calendar with wa.me action buttons
- `/app/frontend/src/pages/Settings.js` - User mgmt, templates, branding, integrations
- `/app/frontend/src/pages/Commission.js` - Commission dashboard
- `/app/frontend/src/pages/BugReports.js` - Bug tracking

## Pending/Future Tasks
### P1
- Backend `server.py` refactoring into modular routes (~2,900 lines -> routes/)
- Backend `fetch_check_leads()` cyclomatic complexity reduction

### P2
- Dynamic Roles & Permissions Engine
- WhatsApp conversation log per lead profile
- CSV/XLSX export for Admin dashboards
- Split oversized React components (Leads.js, Settings.js)
- Clean up remaining console.log statements
- Auto-clear Kanban "Deals Won" via Cron job

## Test Credentials
- Admin: admin@revivalfitness.com / Admin@2026
- Company Gate: RFC911
