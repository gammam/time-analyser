---
title: Story 1.2 - Aggregate and Display Hours per Epic and Member
created: 2026-04-20
last_updated: 2026-04-21
status: complete
sourceEpic: Cost Analyze Reporting
sourceStory: 1.2
inputDocuments:
  - epics.md
  - prd.md
  - cost-analyze-architecture.md
  - project-context.md
---

# Story 1.2: Aggregate and Display Hours per Epic and Member

## Context

This story is the second in the Cost Analyze Reporting epic. It builds on Story 1.1 (`fetchSendAnalysisWorklogs` in `server/jira-client.ts`), which already extracts worklog data per Epic and team member from Jira SEND Analysis Tickets.

This story delivers:
1. A backend REST endpoint `/api/cost-analyze` that orchestrates the query and returns the aggregated report.
2. A frontend page (`client/src/pages/CostAnalyze.tsx`) with a time range selector and a results table showing Epic Name, Epic ID, Team Member, Hours Spent, and total hours per Epic — including Epics with no costs.

## User Story

As an Engineering Manager,
I want to see a report that aggregates hours spent per Epic and per team member,
So that I can understand resource allocation and project costs.

## Acceptance Criteria

1. Given a selected project key and time range, when the report is generated, then it shows a table with Epic Name, Epic ID, Team Member, Hours Spent, and total hours per Epic.
2. Totals per Epic are accurate and reflect all worklog data from SEND Analysis Tickets.
3. Epics with no costs (zero hours) are still shown in the report.
4. Only the selected time range is used to filter data.
5. No sensitive data (Jira credentials, tokens) is present in the API response.
6. The frontend table is responsive and usable on desktop and tablet.

## Previous Story Intelligence

- Story 1.1 implemented `fetchSendAnalysisWorklogs({ userId, projectKey, timeRange })` in `server/jira-client.ts`. This function fetches Epics and their SEND Analysis Ticket worklogs aggregated per user. **Use it directly in the backend handler — do not reimplement.**
- Existing DORA handlers (`server/lead-time-epic-handler.ts`, `server/change-failure-rate-handler.ts`) show the established pattern for handler + dependency injection used in this project. Follow that pattern exactly.
- Frontend DORA dashboard (`client/src/pages/DoraDashboard.tsx`) shows how TanStack Query, filter bars, and metric cards are built. Reuse the same patterns.
- App routing is in `client/src/App.tsx`. Navigation is in `client/src/components/DashboardHeader.tsx`.

## Implementation Tasks

### Backend

- [x] **1. Create handler `server/cost-analyze-handler.ts`**
  - Accepts `req.query`: `{ projectKey: string, from?: string, to?: string }`
  - Validates `projectKey` is present (400 if missing).
  - Validates `from`/`to` are valid ISO dates (400 if malformed).
  - Calls `fetchSendAnalysisWorklogs({ userId: req.user.id, projectKey, timeRange: { from, to } })`.
  - Maps result to response shape: `{ epics: Array<{ epicId, epicName, totalHours, worklogs: Array<{ user, hours }> }> }`.
  - Propagates Jira auth errors as 401, other errors as 500.
  - Follow the same dependency-injection pattern as `createLeadTimeEpicHandler`.

- [x] **2. Register route in `server/index.ts`**
  - `GET /api/cost-analyze` — authenticated, uses the new handler.

- [x] **3. Write handler unit tests `server/cost-analyze-handler.test.ts`**
  - 400 when `projectKey` is missing.
  - 400 for invalid `from`/`to` date formats.
  - 200 with correct aggregated shape for valid input.
  - 401 propagated from Jira auth errors.
  - Epics with zero worklogs are included in the response.

### Frontend

- [x] **4. Create API helper `client/src/lib/cost-analyze.ts`**
  - Typed request context: `{ projectKey: string, from: string, to: string }`.
  - Typed response: `CostAnalyzeReport = { epics: EpicCost[] }` and `EpicCost = { epicId, epicName, totalHours, worklogs: WorklogEntry[] }`.
  - `fetchCostAnalyzeReport(request): Promise<CostAnalyzeReport>` — calls `GET /api/cost-analyze`.

- [x] **5. Create page `client/src/pages/CostAnalyze.tsx`**
  - Shared filter bar: `projectKey` input (default `PN`), `from` date, `to` date, `Generate Report` button.
  - Date range validation: `from > to` → show inline error, block fetch.
  - On submit: call `fetchCostAnalyzeReport` via TanStack Query (use `queryClient` from `client/src/lib/queryClient.ts`).
  - Results: table with columns **Epic ID | Epic Name | Team Member | Hours | Epic Total Hours**.
    - Group rows by Epic, show one row per team member, final row per Epic shows total.
    - Show Epics with zero hours with a `—` in the member and hours columns.
  - States: loading skeleton, empty state (no epics found), error state (readable message).
  - Responsive layout following existing shadcn/ui + Tailwind patterns.

- [x] **6. Register route and navigation**
  - Add `/cost-analyze` route in `client/src/App.tsx` (authenticated guard, same as `/dora`).
  - Add "Time" nav item pointing to `/cost-analyze` in `client/src/components/DashboardHeader.tsx`.

- [x] **7. Write frontend tests `client/src/lib/cost-analyze.test.ts`**
  - Query builder produces correct URL params.
  - Successful response maps to typed shape.
  - Partial failure (non-ok response) throws a readable error.

## API Contract

```
GET /api/cost-analyze?projectKey=PN&from=2026-04-01&to=2026-04-20

200 OK
{
  "epics": [
    {
      "epicId": "EPC-1",
      "epicName": "My Epic",
      "totalHours": 13,
      "worklogs": [
        { "user": "Alice", "hours": 8 },
        { "user": "Bob",   "hours": 5 }
      ]
    },
    {
      "epicId": "EPC-2",
      "epicName": "Epic With No Costs",
      "totalHours": 0,
      "worklogs": []
    }
  ]
}

400 Bad Request  → { "error": "projectKey is required" }
401 Unauthorized → { "error": "Jira authentication failed" }
500 Server Error → { "error": "..." }
```

## File Touch Points

| File | Action |
|------|--------|
| `server/cost-analyze-handler.ts` | Create (new handler) |
| `server/index.ts` | Edit (register route) |
| `server/cost-analyze-handler.test.ts` | Create (unit tests) |
| `client/src/lib/cost-analyze.ts` | Create (API helper + types) |
| `client/src/pages/CostAnalyze.tsx` | Create (page component) |
| `client/src/App.tsx` | Edit (add route) |
| `client/src/components/DashboardHeader.tsx` | Edit (add nav item) |
| `client/src/lib/cost-analyze.test.ts` | Create (frontend tests) |

## Notes & Constraints

- **Do not duplicate** worklog aggregation logic already implemented in `fetchSendAnalysisWorklogs`. The handler must delegate entirely to that function.
- Follow TypeScript strict mode. No `any` in public API types.
- No Jira credentials or tokens in any API response field.
- Use Zod for server-side input validation (same as existing handlers).
- Keep components modular so future export (CSV) or chart views are easy to add.

## Open Questions

- Is the exact Jira issue type name `[SEND] Analysis` confirmed, or should it be configurable?
- Should `projectKey` be a dropdown populated from Jira projects, or a free-text input?
- Should the table support CSV export in this story or a later one?
