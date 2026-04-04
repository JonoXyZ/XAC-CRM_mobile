# XAC CRM - Product Requirements Document

## Problem Statement
Build "XAC CRM" – a full-stack gym-focused CRM for Revival Fitness. Key goals include capturing leads (Meta/Website/Manual), round-robin assignment, multi-role access (Admin, Club Manager, Sales Manager, Consultants, Assistants, Marketing Agent), WhatsApp automation (Baileys), appointments scheduling, comprehensive sales/KPI dashboards, deals tracking (Cash/Debit Order), commissions management, and an Admin settings backdoor.

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
│   ├── components/            # Layout, WhatsAppManagement, NotificationBell, BugReportButton
│   ├── pages/                 # Dashboard, Leads, Settings, Commission, WorkflowBuilder, MarketingPanel, BugReports, etc.
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
- [x] Kanban + Table pipeline view with color-coded stages
- [x] Lead editing with stage transitions
- [x] Delete Lead with cascade
- [x] Appointment booking from lead cards + standalone appointments
- [x] Deals tracking (Cash / Debit Order)
- [x] Commission Dashboard with goal tracking & PDF export
- [x] Configurable Earnings Scale
- [x] Dashboards: Admin, Sales Manager, Consultant, Assistant

### Phase 2 (Integrations & Tools)
- [x] WhatsApp multi-session (Baileys) with pair mapping, disconnect, cleanup
- [x] WhatsApp `.appointment` trigger with 30-min delayed confirmation
- [x] WhatsApp `.XACPASS` trigger for password recovery
- [x] AI Writing Assistant + AI Chat Assistant (GPT-4o)
- [x] White-label branding
- [x] Marketing Agent portal (forms, webhooks, media gallery)

### Phase 3 (Admin Tools & Reports)
- [x] Month-End Report, Global Password Reset, MASTER Account
- [x] Admin Tools tab, System settings, Message templates, Audit logging

### Phase 5 (Landing Page & Notifications)
- [x] Main Landing Page with company portal gate (RFC911)
- [x] In-app notification bell + WhatsApp push notifications (7 triggers)
- [x] Meta/Facebook Lead Ads webhook (active)

### Phase 6 (April 4, 2026 - Actions, Workflow Builder, Marketing Panel)
- [x] **Appointment Action Buttons**: Call, Send Pin Location, Send Reminder, Follow Up
- [x] **Call Button on Leads**: Kanban cards + Table view (tel: protocol)
- [x] **New XAC Logo**: Replaced throughout app
- [x] **Workflow Builder** (/workflows): 3 tabs, 5 step types, full CRUD
- [x] **Marketing Panel** (/marketing-panel): Ad Manager + Landing Hooks
- [x] **Show Current Password**: plain_password in Edit User modal
- [x] **Bug Report System**: Header button on every page, saves to DB, sends via WhatsApp to 27603245830
- [x] **Bug Reports Dashboard** (/bug-reports): Stats, filters, status management (admin only)
- [x] **Contact Us on Login**: Xac@Xyzservices.co.za

## Pending / Backlog

### P1 (High Priority)
- [ ] Email integration for password resets (Resend/SendGrid)
- [ ] Dynamic Roles & Permissions Engine

### P2 (Medium Priority)
- [ ] WhatsApp conversation log view on lead profiles
- [ ] CSV/XLSX export for Admin dashboards
- [ ] Auto-clear Kanban Deals Won cron job

### P3 (Nice to Have)
- [ ] SLA tracking, Package tracking

### Refactoring
- [ ] Break server.py (~2800 lines) into modular route files
