# XAC CRM - Product Requirements Document

## Original Problem Statement
Build "XAC CRM" – a full-stack gym-focused CRM for Revival Fitness. Key goals include capturing leads (Meta/Website/Manual), round-robin assignment, multi-role access (Admin, Club Manager, Sales Manager, Consultants, Assistants), WhatsApp automation (Baileys/Puppeteer), appointments scheduling, comprehensive sales/KPI dashboards, deals tracking (Cash/Debit Order), and an Admin settings backdoor.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **WhatsApp Service**: Node.js + Express + @whiskeysockets/baileys (port 3001)
- **Database**: MongoDB (xac_crm_db)

## What's Been Implemented

### Core Features (Complete)
- Role-based authentication (Admin, Sales Manager, Club Manager, Consultant, Assistant)
- Dashboard with KPI stats (total leads, closed won, conversion rate, cash/debit sales)
- Lead Pipeline (Kanban & Table views with drag-and-drop)
- Lead scoring system
- Deals tracking (Cash vs Debit Order)
- Appointments calendar
- Message Templates with AI Writing Assistant (OpenAI via Emergent LLM Key)
- Admin Settings (Automation rules, Branding, User Management)
- Monthly Reports with configurable cutoff dates
- Analytics page with consultant performance
- Audit logging
- Round-robin lead assignment

### WhatsApp Integration (Complete - Apr 2026)
- Multi-session Baileys service (Node.js) running on port 3001
- WhatsApp activation embedded in Admin User Management → Edit Consultant profile
- QR code scanning flow for linking consultant WhatsApp numbers
- WhatsApp status badges on User Management list (consultants/assistants)
- WhatsApp send button on Lead cards (both Kanban and Table views)
- Template selector in WhatsApp send modal with variable replacement
- Message logging to MongoDB
- Per-user session management (start, status check, disconnect)
- Integrations tab updated with multi-session architecture docs

## Prioritized Backlog

### P0 (Critical)
- All current features implemented and tested

### P1 (High Priority)
- Auto-clear Kanban "Deals Won" at 10am after Cutoff Date (background scheduler)
- Automatic follow-up messages for leads with no activity in 12 hours
- Admin auto-reassign period settings and round-robin for unclosed deals
- WhatsApp message webhooks for logging client replies to CRM

### P2 (Medium Priority)
- Export CSV/XLSX for Admin dashboards
- Duplicate lead detection and merge
- Tagging system (Hot Lead, Student, High Ticket)
- SLA tracking (time to first contact)
