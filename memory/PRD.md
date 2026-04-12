# XAC CRM - Product Requirements Document

## Problem Statement
Build "XAC CRM" – a full-stack gym-focused CRM for Revival Fitness. Key goals include capturing leads (Meta/Website/Manual), round-robin assignment, multi-role access (Admin, Club Manager, Sales Manager, Consultants, Assistants, Marketing Agent), WhatsApp automation (Baileys), appointments scheduling, comprehensive sales/KPI dashboards, deals tracking (Cash/Debit Order), commissions management, and an Admin settings backdoor.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Phosphor Icons, BrandingContext
- **Backend**: FastAPI, Motor (async MongoDB driver), Passlib (bcrypt)
- **WhatsApp Service**: Node.js, @whiskeysockets/baileys (port 3001)
- **AI**: OpenAI GPT-4o via Emergent LLM Key (emergentintegrations library)
- **Database**: MongoDB

## Implemented Features

### Core CRM
- [x] Role-based login, lead capture (Manual/Webhook/Meta), round-robin assignment
- [x] Kanban + Table pipeline with color-coded stages
- [x] Appointments with action buttons (Call, Send Pin, Send Reminder, Follow Up)
- [x] Call buttons on leads (Kanban + Table views)
- [x] Deals tracking, Commission Dashboard, Configurable Earnings Scale
- [x] Dashboards: Admin, Sales Manager, Consultant, Assistant

### Integrations
- [x] WhatsApp multi-session (Baileys) with disconnect/cleanup
- [x] WhatsApp .appointment and .XACPASS triggers
- [x] AI Writing + Chat Assistant (GPT-4o)
- [x] Meta/Facebook Lead Ads webhook (active)

### Admin & Marketing
- [x] Landing Page with company portal gate (RFC911)
- [x] Notification system (in-app bell + WhatsApp, 7 triggers)
- [x] Workflow Builder (/workflows) - 3 tabs, 5 step types, CRUD
- [x] Marketing Panel (/marketing-panel) - Ad Manager + Landing Hooks
- [x] Bug Report system - header button, WA delivery to 27603245830, admin dashboard
- [x] Contact Us on Login (Xac@Xyzservices.co.za)
- [x] Show current password in User Management edit modal
- [x] Admin Tools, System settings, Message templates, Audit logging

### Code Quality Fixes (April 12, 2026)
- [x] Removed hardcoded secrets from meta_webhook_proxy.py (env vars)
- [x] Moved test credentials to environment variables in all 6 test files
- [x] Fixed WhatsApp service hardcoded BACKEND_URL for deployment
- [x] Fixed React Hooks missing dependencies (Dashboard, Leads, Settings, Appointments, WorkflowBuilder, NotificationBell) using useCallback
- [x] Replaced empty catch blocks with proper error logging (NotificationBell, WorkflowBuilder, Settings, MarketingPanel)
- [x] Replaced array index keys with stable keys (Settings, MarketingForms, MarketingPanel)
- [x] Deployment health check passed (all blockers resolved)

## Pending / Backlog

### P1
- [ ] Dynamic Roles & Permissions Engine
- [ ] Email integration for password resets

### P2
- [ ] WhatsApp conversation log on lead profiles
- [ ] CSV/XLSX export for Admin dashboards
- [ ] Auto-clear Kanban Deals Won cron job
- [ ] Server.py refactoring into modular route files

### P3
- [ ] SLA tracking, Package tracking
