---
title: Project Context
last_updated: 2026-04-03
status: draft
---

# Project Context: Technical Rules & Conventions

## 1. Organizational & Process Context
- Agile teams, microservices architecture (PagoPA S.p.A.).
- Shift-Left model: Product Trio (discovery), DevEx/QA (enablers), Dev Teams (execution), SL QA & Operations (quality gate).
- Jira ticket hierarchy: Initiative (business feature), Epic (microservice implementation).
- DORA metrics calculated for each team/repository.

## 2. Tech Stack & Architecture
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter, React Hook Form + Zod.
- **Backend:** Express.js + TypeScript, PostgreSQL (Neon) via Drizzle ORM, REST API, Replit Auth (OIDC).
- **Integrations:** Google Calendar & Docs APIs, JIRA REST API v3.
- **Project Structure:**
  - client/src/components, pages, lib, hooks
  - server/routes.ts, scoring.ts, storage.ts, capacity-calculator.ts, jira-client.ts
  - shared/schema.ts

## 3. Database & Storage
- Drizzle ORM for schema and migrations.
- Tables: sessions, users, meetings, meeting_scores, weekly_challenges, achievements, jira_tasks, daily_capacity, task_completion_predictions, user_settings.
- Sensitive tokens (JIRA, Google) are stored securely and never exposed in API responses.
- Migrations managed via drizzle-kit.

## 4. API & Routing
- RESTful API endpoints for auth, meetings, stats, challenges, JIRA sync, task prediction, settings, and Google OAuth.
- All protected routes require authentication middleware.
- Use Zod for input validation and security transforms.

## 5. JIRA Integration
- JIRA client configured with host, email, API token.
- JQL queries are configurable per user.
- Sync tasks and capacity calculations are handled in dedicated modules.
- Task prediction algorithm considers daily work hours and context-switching overhead.

## 6. Security & Auth
- Replit Auth (OIDC) for authentication.
- Session-based auth with PostgreSQL-backed session storage.
- HTTP-only, secure, SameSite "lax" cookies for session management.

## 7. Coding & Documentation Conventions
- TypeScript strict mode and consistent aliasing (see vite.config.ts).
- All API responses must avoid leaking sensitive tokens.
- Onboarding flow for new users is required.
- Code and documentation should be clear, modular, and follow the structure outlined in core-knowledge chapters.

## 8. DORA Metrics Calculation Logic
- Deployment Frequency: JQL on Fix Versions with status Released.
- Lead Time for Changes: Epic changelog, DEV & TEST to DONE (DEPLOYED).
- Change Failure Rate: JQL for Bug/Incident in PROD, Affects Version/s.
- MTTR: JQL for Incident/Bug, created to resolutiondate.

---

> This file is the single source of truth for AI agents and developers. Update as architecture, conventions, or critical rules evolve.
