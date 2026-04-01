# XAC CRM - Product Requirements Document

## Original Problem Statement
Build "XAC CRM" – a full-stack gym-focused CRM for Revival Fitness. Key goals include capturing leads (Meta/Website/Manual), round-robin assignment, multi-role access (Admin, Club Manager, Sales Manager, Consultants, Assistants), WhatsApp automation (Baileys/Puppeteer), appointments scheduling, comprehensive sales/KPI dashboards, deals tracking (Cash/Debit Order), and an Admin settings backdoor.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **WhatsApp Service**: Node.js + Express + @whiskeysockets/baileys (port 3001)
- **Database**: MongoDB (xac_crm_db)
- **Collections**: users, leads, activities, deals, settings, appointments, audit_logs, message_logs, month_reports, message_templates, commission_goals

## What's Been Implemented

### Core Features (Complete)
- Role-based authentication (Admin, Sales Manager, Club Manager, Consultant, Assistant)
- Dashboard with KPI stats (role-specific views)
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
- QR code scanning flow, status badges, send button on leads, template selector, message logging

### Commission System (Complete - Apr 2026)
- New Commission page in sidebar (admin sees all consultants via dropdown, consultants see own)
- Income goal input per consultant per month
- 3 Summary boxes: Earnings MTD, My Goal, Difference (with green/orange/red color coding)
- Commission earned boxes: Debit Orders (units × rate/unit) + Cash Sales (% of total value)
- 2 Deal tables: Debit Order Deals & Cash Deals with totals rows
- PDF export: Landscape A4, header (Month/Company/Consultant), footer with calculation breakdown
- Earnings Scale in User Management (Admin-only): Basic Salary, Debit Order tiers, Cash Sales tiers, Bonuses/Incentives
- Tier commission calculation: highest applicable tier rate applied

### Assistant Dashboard (Fixed - Apr 2026)
- Shows deal counts (not values): "5 Cash Deals" instead of "R50,000"
- Conversion = Lead to Appointment ratio
- Performance Summary removed
- Sales Trend changed to Appointment Trend graph
- Appointments Today moved under graph

## Prioritized Backlog

### P1 (High Priority)
- Auto-clear Kanban "Deals Won" at 10am after Cutoff Date (background scheduler)
- WhatsApp conversation log on lead profiles
- Automatic follow-up messages for leads with no activity in 12 hours
- Admin auto-reassign period settings and round-robin for unclosed deals
- WhatsApp message webhooks for logging client replies to CRM

### P2 (Medium Priority)
- Export CSV/XLSX for Admin dashboards
- Duplicate lead detection and merge
- Tagging system (Hot Lead, Student, High Ticket)
- SLA tracking (time to first contact)
