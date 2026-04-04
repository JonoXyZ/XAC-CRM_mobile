# XAC CRM - Product Requirements Document

## Problem Statement
Build "XAC CRM" – a full-stack gym-focused CRM for Revival Fitness. Key goals include capturing leads (Meta/Website/Manual), round-robin assignment, multi-role access (Admin, Club Manager, Sales Manager, Consultants, Assistants, Marketing Agent), WhatsApp automation (Baileys/Puppeteer), appointments scheduling, comprehensive sales/KPI dashboards, deals tracking (Cash/Debit Order), commissions management, and an Admin settings backdoor.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Phosphor Icons, BrandingContext
- **Backend**: FastAPI, Motor (async MongoDB driver), Passlib (bcrypt)
- **WhatsApp Service**: Node.js, @whiskeysockets/baileys (port 3001)
- **AI**: OpenAI GPT-4o via Emergent LLM Key (emergentintegrations library)
- **Database**: MongoDB

## Core Architecture
```
/app/
├── backend/server.py          # FastAPI main app (all endpoints)
├── frontend/src/
│   ├── App.js                 # React routes + BrandingContext
│   ├── components/            # Layout, WhatsAppManagement, EarningsScaleEditor
│   ├── pages/                 # Dashboard, Leads, Settings, Commission, WorkflowBuilder, MarketingPanel, etc.
│   └── index.css              # Global styles
├── whatsapp-service/index.js  # Node.js Baileys multi-session service
└── memory/                    # PRD, test credentials
```

## Roles
- Admin, Club Manager, Sales Manager, Consultant, Assistant, Marketing Agent

## Implemented Features

### Phase 1 (Core)
- [x] Role-based login (auto-detect, no dropdown)
- [x] Lead capture (Manual, Webhook, Meta forms)
- [x] Round-robin lead assignment
- [x] Kanban + Table pipeline view
- [x] Lead editing with stage transitions
- [x] Delete Lead with cascade (deals, activities, appointments)
- [x] Appointment booking from lead cards
- [x] Standalone Appointment creation ("Make Appointment" button)
- [x] Deals tracking (Cash / Debit Order)
- [x] Deal value deduction when lead exits "Closed Won" stage
- [x] Commission Dashboard with goal tracking & PDF export
- [x] Configurable Earnings Scale
- [x] Admin Dashboard with KPI metrics
- [x] Sales Manager Dashboard
- [x] Consultant Dashboard
- [x] Assistant Dashboard (monetary values hidden)

### Phase 2 (Integrations & Tools)
- [x] WhatsApp multi-session integration (Baileys)
- [x] WhatsApp pair mapping in User Management
- [x] WhatsApp stale session cleanup (fixes "FAILED TO LOAD" error)
- [x] WhatsApp phone number formatting (SA local -> international)
- [x] WhatsApp `.appointment` trigger -- auto-schedules appointments from chat messages
- [x] 30-minute delayed WhatsApp confirmation after auto-booking
- [x] Incoming message listener for `.appointment` detection (direct phone messages)
- [x] AI Writing Assistant for message templates
- [x] AI Chat Assistant (GPT-4o via Emergent LLM Key) on Emergent Fixes page
- [x] White-label branding (dynamic logo, company name, colors)
- [x] Marketing Agent portal (forms, webhooks, media gallery)
- [x] Marketing How-To Guide tab

### Phase 3 (Admin Tools & Reports)
- [x] Month-End Report overhaul (MTD Only vs Start New Month)
- [x] Global Password Reset (all passwords -> 123xyz/)
- [x] MASTER Account (mastergrey666@xac.com / MASTERGREY666, auto-seeded)
- [x] Admin Tools tab in Settings
- [x] System settings (month start/end dates, cutoff)
- [x] Message templates management
- [x] Audit logging

### Phase 5 (Landing Page, Color Stages, Password Reset)
- [x] Main Landing Page with company description, features, how-it-works, CTA
- [x] Company Portal gate (code: RFC911 for Revival Fitness Centre)
- [x] Color-coded lead stages (Kanban columns + table dropdowns)
- [x] WhatsApp .XACPASS trigger -- sends temp password to linked WhatsApp number
- [x] WA Appointment naming -- auto-created appointments prefixed "WA - (Name)"
- [x] WhatsApp Disconnect button -- clears corrupted auth, fresh QR on re-activate
- [x] In-app notification bell (header bar, dropdown, unread badge, mark read/all read)
- [x] WhatsApp push notifications (sent alongside in-app for all triggers)
- [x] 7 notification triggers (New Lead, Appointment, Stage Change, Deal, Meta Lead, WA Appointment, Reminders)
- [x] Meta/Facebook Lead Ads webhook (GET verification + POST lead ingestion)

### Phase 6 (April 4, 2026 - Appointment Actions, Workflow Builder, Marketing Panel)
- [x] **Appointment Action Buttons**: Call, Send Pin Location, Send Reminder, Send Follow Up on each booked slot
- [x] **Call Button on Leads**: Blue PhoneCall icon on Kanban cards and Table view rows (tel: protocol)
- [x] **New XAC Logo**: Replaced throughout app (login, sidebar, landing page)
- [x] **Workflow Builder Page** (/workflows): 3 tabs (New Lead, Appointment, Triggers), step-based workflow creation with 5 step types (Send WhatsApp, Wait/Delay, Change Stage, Assign To, Send Reminder), CRUD operations, active/inactive toggle
- [x] **Marketing Panel** (/marketing-panel): Ad Manager tab (Meta webhook info, lead counts, recent ad leads) + Landing Hooks tab (generates 6 SEO landing page concepts)
- [x] **Show Current Password**: Admin can see `plain_password` in User Management Edit modal (stored on create/update)
- [x] **Sidebar Navigation**: Added Workflows + Ad Manager nav items for admin/sales_manager roles

### Bug Fixes
- [x] Lead capture empty email -> 422 error (fixed: Optional[str] + null coercion)
- [x] WhatsApp "FAILED TO LOAD SESSION" (fixed: stale session cleanup in Node service)
- [x] Default login credentials removed from Login page
- [x] Earnings Scale input re-rendering bug
- [x] Removed CSS spinners on number inputs
- [x] Assistant linked consultants multi-select (Add & Edit User modals)
- [x] Commission data flow verified (deals pull through to commission sheets)

## Pending / Backlog

### P1 (High Priority)
- [ ] Email integration for password resets (need integration_playbook_expert_v2 for Resend/SendGrid, sender: xac@xyzservices.co.za)
- [ ] Dynamic Roles & Permissions Engine (Admin "Role Settings" tab - DB schema change from Enum to dynamic)

### P2 (Medium Priority)
- [ ] WhatsApp conversation log view on each lead's profile
- [ ] Export CSV/XLSX for Admin dashboards (full export endpoint)
- [ ] Auto-clear Kanban Deals Won at 10am after Cutoff Date (cron job)

### P3 (Nice to Have)
- [ ] SLA tracking (time to first contact)
- [ ] Package tracking (Entry, Mid, High Ticket)

### Refactoring
- [ ] Break server.py (~2700 lines) into modular route files (routes/leads.py, routes/auth.py, routes/whatsapp.py, etc.)
