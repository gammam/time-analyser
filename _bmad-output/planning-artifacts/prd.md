---
title: Cost Analyze PRD
created: 2026-04-17
last_updated: 2026-04-17
stepsCompleted:
  - step-01-init
status: draft
---

# Product Requirements Document (PRD)

<!-- Content will be appended in subsequent steps -->

## 1. Feature Summary

The "Cost Analyze" feature enables Engineering Managers to quickly generate reports summarizing the time spent by each team member on every Epic within a selected time range. This supports transparent project tracking and resource allocation.

## 2. Target Users

- Engineering Managers using the time-analyser app

## 3. Main Workflow

1. The Engineering Manager navigates to the "Time" tab in the application.
2. The user selects a time range (from - to).
3. The app displays a report table with columns: Epic Name, Epic ID, Team Member, Hours Spent, and a total hours summary per Epic.

## 4. Functional Requirements

- For each Jira Epic, time spent is recorded in a child issue of type SEND Analysis Ticket.
- The system must aggregate and display the total hours spent per Epic and per team member.
- The report must be filterable by time range.
- Only authenticated users with Engineering Manager role can access this feature.
- Data must be fetched securely from Jira using user-specific credentials.

## 5. Non-Functional Requirements

- Performance: Reports should generate in under 3 seconds for up to 100 Epics.
- Security: No sensitive Jira credentials or tokens are exposed in the frontend or logs.
- Usability: The report UI must be responsive and accessible on desktop and tablet.
- Extensibility: The solution should allow for future addition of new report types or export formats (e.g., CSV).

## 6. Acceptance Criteria

1. The Engineering Manager can select a time range and generate a report.
2. The report lists all Epics with SEND Analysis Tickets in the selected range, showing Epic Name, ID, each team member, and hours spent.
3. The report includes a total hours summary per Epic.
4. Only authorized users can access the report.
5. The report is generated within the performance target.
6. No sensitive data is exposed in the UI or logs.
7. The UI is responsive and accessible.
