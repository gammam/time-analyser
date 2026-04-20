---
title: Cost Analyze Architecture
created: 2026-04-20
last_updated: 2026-04-20
stepsCompleted:
  - step-01-init
status: draft
inputDocuments:
  - prd.md
  - dora-dashboard-architecture.md
  - project-context.md
  - ux-design-specification.md
---

# Architecture Decisions: Cost Analyze

## 1. System Overview

The Cost Analyze feature is an extension of the time-analyser platform, designed to provide Engineering Managers with actionable reports on time spent by team members per Epic, leveraging Jira as the source of truth. The system integrates with Jira REST APIs, processes SEND Analysis Tickets, and presents results via a secure, responsive frontend.

## 2. Key Components

- **Frontend (React + TypeScript)**
  - UI for selecting time range and viewing reports (Epic, Team Member, Hours)
  - Secure authentication (Google OAuth)
  - Consumes backend API for time data

- **Backend (Node.js/Express + TypeScript)**
  - REST API endpoint: `/api/cost-analyze?from=...&to=...`
  - Handles authentication and user role validation
  - Integrates with Jira REST API using user-specific credentials
  - Aggregates SEND Analysis Ticket data for each Epic in the selected range
  - Calculates total and per-member hours
  - Applies caching for performance (optional, e.g., Redis or DB table)

- **Jira Integration**
  - Uses JQL to find Epics and associated SEND Analysis Tickets
  - Extracts worklog/time data per team member
  - Maps Jira workflow states to internal reporting logic

## 3. Data Flow

1. User (Engineering Manager) selects a time range in the frontend.
2. Frontend sends a request to `/api/cost-analyze` with the selected range.
3. Backend authenticates the user and validates permissions.
4. Backend queries Jira for all Epics and SEND Analysis Tickets in the range.
5. Backend aggregates time spent per Epic and per team member.
6. Backend returns structured report data to the frontend.
7. Frontend displays the report in a table with Epic, Team Member, and Hours columns, plus totals.

## 4. Integration Points

- **Jira REST API**: Secure integration using user tokens; all queries scoped to the authenticated user’s permissions.
- **Frontend/Backend API**: Typed contracts, strict validation, and error handling.
- **Authentication**: Google OAuth for frontend; backend session/cookie validation.

## 5. Security & Extensibility

- No Jira credentials or tokens are exposed to the frontend or stored insecurely.
- All API responses are sanitized to avoid leaking sensitive data.
- The architecture supports future export features (CSV) and additional report types.

## 6. Key Technical Decisions

- Use existing project stack (React, Node.js, TypeScript, Express, PostgreSQL, Drizzle ORM).
- Follow project’s strict TypeScript and modular code conventions.
- Use Zod for input validation and security transforms.
- Caching layer is optional but recommended for large datasets.
