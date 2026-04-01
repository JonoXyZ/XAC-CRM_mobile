# XAC CRM - Product Requirements Document

## Original Problem Statement
Build "XAC CRM" – a full-stack gym-focused CRM for Revival Fitness. Key goals include capturing leads (Meta/Website/Manual), round-robin assignment, multi-role access (Admin, Club Manager, Sales Manager, Consultants, Assistants, Marketing Agent), WhatsApp automation (Baileys), appointments scheduling, comprehensive sales/KPI dashboards, deals tracking (Cash/Debit Order), commission management, form-based lead capture, and Admin settings.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **WhatsApp Service**: Node.js + Express + @whiskeysockets/baileys (port 3001)
- **Database**: MongoDB (xac_crm_db)
- **Collections**: users, leads, activities, deals, settings, appointments, audit_logs, message_logs, month_reports, message_templates, commission_goals, forms, media

## Roles
- **Admin**: Full access to all features + settings
- **Sales Manager**: Dashboard, Leads, Appointments, Reports, Analytics
- **Club Manager**: Dashboard, Leads, Appointments, Gallery
- **Consultant**: Dashboard, Leads, Appointments, Commission
- **Assistant**: Dashboard (appointment-focused), Leads, Appointments
- **Marketing Agent**: Marketing Dashboard, Forms, Gallery, Settings

## What's Been Implemented

### Core Features (Complete)
- Role-based authentication with auto-detect (no role dropdown on login)
- Role-specific dashboards with KPI stats
- Lead Pipeline (Kanban & Table views with drag-and-drop)
- Lead scoring system
- Deals tracking (Cash vs Debit Order)
- Appointments calendar
- Message Templates with AI Writing Assistant
- Admin Settings (Automation rules, Branding, User Management)
- Monthly Reports with configurable cutoff dates
- Analytics page with consultant performance
- Audit logging, Round-robin lead assignment

### WhatsApp Integration (Complete)
- Multi-session Baileys service on port 3001
- WhatsApp activation in Admin User Management (edit consultant profile)
- QR code scanning, status badges, send button on leads, template selector

### Commission System (Complete)
- Commission page (admin sees all consultants, consultants see own)
- Income goal input, 3 summary boxes (MTD/Goal/Difference with color coding)
- Commission earned boxes: Debit Orders (units × rate) + Cash Sales (% of value)
- Deal tables with totals, PDF export (Landscape A4)
- Earnings Scale in User Management: Basic Salary, Debit/Cash tiers, Bonuses

### Assistant Dashboard (Complete)
- Shows deal counts (not values), lead-to-appointment conversion ratio
- Appointment Trend graph, Appointments Today under graph

### Marketing Agent System (Complete)
- New Marketing Agent role with restricted sidebar (Marketing, Forms, Gallery, Settings)
- Marketing Dashboard: stats overview (total forms, leads, media, platform breakdown, form performance)
- Forms CRUD: Create/edit forms with platform selection (Facebook, Instagram, TikTok, Website)
- Question builder: text, textarea, dropdown, checkbox, radio, email, phone, number types
- Webhook endpoints for each form (auto-generated, public for external platform integrations)
- Gallery: Media upload/management (images + videos), filters, preview modal
- AI Writing Assistant available in form headline + description
- Media gallery picker in form creation for attaching images/videos

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
