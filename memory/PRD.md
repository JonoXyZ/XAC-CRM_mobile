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
│   ├── pages/                 # Dashboard, Leads, Settings, Commission, etc.
│   └── index.css              # Global styles
├── whatsapp-service/index.js  # Node.js Baileys multi-session service
└── memory/                    # PRD, test credentials
```

## Roles
- Admin, Club Manager, Sales Manager, Consultant, Assistant, Marketing Agent

## Implemented Features (as of April 2, 2026)

### Phase 1 (Core)
- [x] Role-based login (auto-detect, no dropdown)
- [x] Lead capture (Manual, Webhook, Meta forms)
- [x] Round-robin lead assignment
- [x] Kanban + Table pipeline view
- [x] Lead editing with stage transitions
- [x] **Delete Lead** with cascade (deals, activities, appointments)
- [x] Appointment booking from lead cards
- [x] **Standalone Appointment creation** ("Make Appointment" button)
- [x] Deals tracking (Cash / Debit Order)
- [x] **Deal value deduction** when lead exits "Closed Won" stage
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
- [x] WhatsApp phone number formatting (SA local → international)
- [x] WhatsApp `.appointment` trigger — auto-schedules appointments from chat messages
- [x] 30-minute delayed WhatsApp confirmation after auto-booking
- [x] Incoming message listener for `.appointment` detection (direct phone messages)
- [x] AI Writing Assistant for message templates
- [x] AI Chat Assistant (GPT-4o via Emergent LLM Key) on Emergent Fixes page
- [x] White-label branding (dynamic logo, company name, colors)
- [x] Marketing Agent portal (forms, webhooks, media gallery)
- [x] Marketing How-To Guide tab

### Phase 3 (Admin Tools & Reports)
- [x] **Month-End Report overhaul** (MTD Only vs Start New Month)
- [x] **Global Password Reset** (all passwords → 123xyz/)
- [x] **MASTER Account** (mastergrey666@xac.com / MASTERGREY666, auto-seeded)
- [x] **Admin Tools tab** in Settings
- [x] System settings (month start/end dates, cutoff)
- [x] Message templates management
- [x] Audit logging

### Bug Fixes (April 2, 2026)
- [x] Lead capture empty email → 422 error (fixed: Optional[str] + null coercion)
- [x] WhatsApp "FAILED TO LOAD SESSION" (fixed: stale session cleanup in Node service)
- [x] Default login credentials removed from Login page
- [x] Earnings Scale input re-rendering bug
- [x] Removed CSS spinners on number inputs
- [x] Assistant linked consultants multi-select (Add & Edit User modals)
- [x] Commission data flow verified (deals pull through to commission sheets)

### Phase 5 (Landing Page, Color Stages, Password Reset)
- [x] Main Landing Page with company description, features, how-it-works, CTA
- [x] Company Portal gate (code: RFC911 for Revival Fitness Centre)
- [x] Color-coded lead stages (Kanban columns + table dropdowns)
- [x] WhatsApp .XACPASS trigger — sends temp password to linked WhatsApp number
- [x] WA Appointment naming — auto-created appointments prefixed "WA - (Name)"
- [x] WhatsApp Disconnect button — clears corrupted auth, fresh QR on re-activate
- [x] In-app notification bell (header bar, dropdown, unread badge, mark read/all read)
- [x] WhatsApp push notifications (sent alongside in-app for all triggers)
- [x] Trigger: New Lead Assigned → notify consultant
- [x] Trigger: Appointment Reminder → 24h and 2h before (background task)
- [x] Trigger: New Appointment Booked → notify lead owner
- [x] Trigger: Lead Stage Changed → notify lead owner
- [x] Trigger: New Deal Closed → notify all managers
- [x] Trigger: Meta Lead Captured → notify consultant + managers
- [x] Trigger: WhatsApp Auto-Appointment → notify consultant
- [x] Meta/Facebook Lead Ads webhook (GET verification + POST lead ingestion)
- [x] Revival Fitness Center page subscribed to leadgen events

## Pending / Backlog

### P1 (High Priority)
- [ ] Email integration for password resets (need integration_playbook_expert_v2 for Resend/SendGrid, sender: xac@xyzservices.co.za)
- [ ] Dynamic Roles & Permissions Engine (Admin "Role Settings" tab - DB schema change from Enum to dynamic)
- [ ] Show user's current password in User Management Edit modal

### P2 (Medium Priority)
- [ ] WhatsApp message webhooks (log client replies to CRM)
- [ ] WhatsApp conversation log view on each lead's profile
- [ ] Admin auto-reassign period settings + round-robin for unclosed deals
- [ ] Auto follow-up messages for leads with no activity in 12 hours
- [ ] Export CSV/XLSX for Admin dashboards (full export endpoint)
- [ ] Auto-clear Kanban Deals Won at 10am after Cutoff Date (cron job)

### P3 (Nice to Have)
- [ ] SLA tracking (time to first contact)
- [ ] Package tracking (Entry, Mid, High Ticket)
