# XAC CRM - Product Requirements Document

## Problem Statement
Build "XAC CRM" – a full-stack gym-focused CRM for Revival Fitness with lead capture, WhatsApp automation, appointments, deals, commissions, multi-role access, and workflow automation.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Phosphor Icons
- Backend: FastAPI, Motor (async MongoDB), Passlib (bcrypt)
- WhatsApp: Node.js, @whiskeysockets/baileys
- AI: OpenAI GPT-4o via Emergent LLM Key
- Database: MongoDB

## Implemented Features (All Working)
- Role-based auth (Admin, Club Manager, Sales Manager, Consultant, Assistant, Marketing Agent)
- Lead pipeline (Kanban + Table, color-coded stages, Call buttons, WhatsApp)
- Appointments with action buttons (Call, Send Pin, Send Reminder, Follow Up)
- Deals, Commission Dashboard, Configurable Earnings Scale
- WhatsApp multi-session (.appointment, .XACPASS triggers)
- Meta/Facebook Lead Ads webhook (active)
- Workflow Builder, Marketing Panel, Bug Report system
- Landing Page with portal gate (RFC911)
- Notification system (in-app + WhatsApp)
- Contact Us on Login (Xac@Xyzservices.co.za)

## Code Quality Improvements Applied

### Round 1 (April 4)
- Removed hardcoded secrets from meta_webhook_proxy.py and 6 test files
- Fixed React hooks in Dashboard, Leads, Settings, Appointments, WorkflowBuilder, NotificationBell
- Fixed empty catch blocks, replaced index keys

### Round 2 (April 12)
- Fixed remaining hooks: Reports.js, MarketingPanel.js (useCallback + proper deps)
- Fixed remaining empty catches: MarketingForms.js, App.js
- Fixed remaining index keys: LandingPage.js (3), MarketingDashboard.js (1)
- Backend: Refactored get_commission() - extracted _resolve_commission_target(), _get_commission_deals(), _calculate_bonuses(), _find_applicable_rate() helpers
- Created centralized auth utility (src/utils/auth.js) - token set/get/remove via single module
- Created logger utility (src/utils/logger.js) - env-based logging levels
- Updated Login, Layout, App.js to use auth utility for token management

## Pending / Backlog
### P1
- [ ] Dynamic Roles & Permissions Engine
- [ ] Email integration for password resets
### P2
- [ ] WhatsApp conversation log on lead profiles
- [ ] CSV/XLSX export for Admin dashboards
- [ ] Server.py modular refactoring (routes/)
- [ ] Component splitting (Settings 1360L, Leads 1160L)
### P3
- [ ] SLA tracking, Package tracking
- [ ] Auto-clear Kanban Deals Won cron job
