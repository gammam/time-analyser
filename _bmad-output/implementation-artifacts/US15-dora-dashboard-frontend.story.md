---
key: US15-dora-dashboard-frontend
created: 2026-04-13
last_updated: 2026-04-13
title: DORA Dashboard Frontend - Unified Metrics Request (PN + from/to)
epic: Frontend Dashboard and Metrics Visualization
status: ready-for-review
assignee: TBD
---

# User Story US15 - DORA Dashboard Frontend (Unified Request)

**As** an engineering manager  
**I want** to request DORA metrics for one Jira project and one timeframe from a single dashboard interaction  
**So that** I can view Deployment Frequency, Lead Time, Change Failure Rate, and MTTR in one synchronized view

---

## Story

As an authenticated dashboard user,  
I want a DORA dashboard page with project selector (default `PN`) and timeframe (`from`, `to`) inputs,  
so that all four DORA metrics are refreshed together in one request cycle and shown with consistent context.

## UX Scope (from UX spec)

Source specification: `_bmad-output/planning-artifacts/ux-design-specification.md`

Primary interaction model:
- One context, one refresh, one truth.
- User sets `projectKey` and date range (`from`, `to`) in a shared filter bar.
- User clicks one action (`Update metrics`) and all metric widgets update together.
- Dashboard must clearly expose loading, empty, partial-failure, and freshness states.

## API Contracts to Consume

- `GET /api/dora/deployment-frequency`
- `GET /api/dora/lead-time-epic`
- `GET /api/dora/change-failure-rate`
- `GET /api/dora/mean-time-to-restore`

Shared query params:
- `projectKey` (required)
- `from` (optional, ISO date)
- `to` (optional, ISO date)
- `team` (optional; do not expose in UI in this story unless already required by current UX)

## Acceptance Criteria

1. A DORA dashboard route/page is available for authenticated users and integrated in existing app navigation.
2. The page has a shared filter bar with:
   - `projectKey` input (default value `PN` on first load)
   - `from` date input
   - `to` date input
   - one `Update metrics` action
3. Date validation prevents invalid ranges (`from > to`) and invalid date formats before API calls.
4. On `Update metrics`, frontend sends all four DORA API calls in parallel using the same frozen request context (`projectKey`, `from`, `to`).
5. Metric data commit is synchronized:
   - old data remains stable while fetching
   - new data is rendered as one coherent update cycle
6. Dashboard shows four metric areas/cards at minimum:
   - Deployment Frequency
   - Lead Time for Changes
   - Change Failure Rate (DORA and SEND section)
   - MTTR
7. A global loading indicator is shown for the unified refresh cycle (not per-card spinner noise).
8. Partial failures are handled explicitly:
   - successful metrics still render
   - failed metrics show readable error state
   - global message explains that some metrics failed
9. Empty data is handled explicitly with meaningful copy (not blank cards).
10. Every metric card/panel displays context metadata:
    - active `projectKey`
    - active date range
    - `last updated` timestamp of current dashboard commit
11. UI is responsive and usable on mobile/tablet/desktop according to existing design system patterns.
12. Accessibility baseline is met:
    - keyboard reachable controls
    - visible focus states
    - semantic labels for form controls and status areas
13. Frontend tests cover at least:
    - filter default + validation
    - synchronized fetch orchestration
    - partial failure behavior
    - rendering of each metric section with mocked API responses

## Tasks / Subtasks

- [x] Create/extend dashboard page structure (AC: 1, 2, 6, 11)
  - [x] Identify whether to extend `client/src/pages/Dashboard.tsx` or create dedicated DORA page component and route.
  - [x] Implement top filter bar with `projectKey`, `from`, `to`, and `Update metrics` button.
  - [x] Keep existing dashboard sections stable if present; avoid regression in unrelated widgets.

- [x] Implement shared request context and validation (AC: 2, 3, 10)
  - [x] Define a single typed request context state object.
  - [x] Apply default `projectKey = PN` on initial mount.
  - [x] Validate date range and show inline validation errors.

- [x] Implement parallel DORA fetching orchestration (AC: 4, 5, 7, 8, 9, 10)
  - [x] Create a query orchestration layer (React Query preferred) for the four endpoints.
  - [x] Ensure all calls use the same frozen context per refresh cycle.
  - [x] Render global loading state and global partial-failure summary.
  - [x] Preserve prior dashboard data until the new synchronized cycle resolves.
  - [x] Capture and display commit `lastUpdated` timestamp on successful cycle completion.

- [x] Implement metric presentation components (AC: 6, 8, 9, 10, 11, 12)
  - [x] Deployment Frequency card/panel.
  - [x] Lead Time card/panel.
  - [x] Change Failure Rate card/panel showing both `dora` and `send` values.
  - [x] MTTR card/panel with resolved/unresolved context where available.
  - [x] Shared states: loading skeleton, empty, error, partial-success.

- [x] Add frontend tests and reliability checks (AC: 13)
  - [x] Unit/component tests for filter validation and default behavior.
  - [x] Integration-style tests for synchronized refresh orchestration.
  - [x] Tests for partial failures and empty responses.
  - [x] Validate no regressions for authenticated route rendering.

## Dev Notes

### Technical Requirements

- Reuse existing frontend stack and patterns:
  - React + TypeScript + Vite
  - TanStack Query
  - Tailwind + shadcn/ui components
- Keep the request model deterministic: one button triggers one refresh cycle.
- Do not expose Jira credentials or sensitive details in frontend responses.

### Architecture Compliance

- Backend endpoints already exist and are authenticated in `server/routes.ts`.
- Frontend should consume only published API contract from `docs/openapi.yaml`.
- Keep components modular so future additions (extra metrics/trends) are straightforward.

### Library / Framework Requirements

- Prefer existing `client/src/lib/queryClient.ts` utilities for HTTP calls.
- Keep strict TypeScript-safe response typings per endpoint.
- Follow existing route-level auth flow in `client/src/App.tsx`.

### File Structure Requirements

Expected primary frontend touch points:
- `client/src/pages/Dashboard.tsx`
- `client/src/components/*` (new DORA cards/filter/status components)
- `client/src/lib/*` (typed API helpers as needed)
- `client/src/App.tsx` (only if routing/navigation adjustment is required)

### Testing Requirements

- Align with existing project test conventions.
- Mock all four DORA endpoints and verify synchronized state transitions.
- Ensure test assertions include validation, loading, success, partial failure, and empty states.

### Previous Story Intelligence

- US12/US13/US14 established stable backend endpoint patterns and error shapes; frontend should honor those structures without redefining contracts.
- DORA metrics are already computed server-side; frontend should avoid duplicating business logic.

### References

- Source: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Source: `_bmad-output/planning-artifacts/dora-dashboard-architecture.md`
- Source: `docs/openapi.yaml`
- Source: `server/routes.ts`
- Source: `project-context.md`
- Source: `client/src/App.tsx`
- Source: `client/src/pages/Dashboard.tsx`

## Open Questions / Clarifications

- Should route remain the current root dashboard path (`/`) or move to a dedicated DORA route while keeping legacy dashboard blocks?
- Should timeframe default to last 30 days if user does not set explicit dates in this first version?
- Do we want to expose `team` as a hidden advanced filter in a later story?

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- 2026-04-13: Story generated from finalized UX specification and existing backend DORA contracts.
- 2026-04-13: Implemented DORA route, page, orchestration module, validation, and metric cards.
- 2026-04-13: Added Jest tests for request validation, synchronized fetch orchestration, partial failures, and metric view mapping.
- 2026-04-13: Validation executed: `npx jest --runInBand` -> 13 passed / 13 total, 66 passed / 66 total.
- 2026-04-13: Validation executed: `npx jest client/src/lib/dora.test.ts --runInBand` -> 1 passed / 1 total, 6 passed / 6 total.

### Completion Notes List

- Story created directly because no sprint status tracking file is currently available in implementation artifacts.
- Story is implementation-ready and aligned to the UX synchronized-refresh rule.
- Added `/dora` authenticated route and DORA nav item while preserving existing meetings/tasks pages.
- Implemented unified request context (`projectKey`, `from`, `to`) with default `PN` and date-range validation.
- Implemented synchronized four-endpoint refresh with partial-failure preservation and global loading feedback.
- Added four DORA metric cards with context metadata (`project`, `range`, `last updated`) and explicit empty/error states.
- `npm run check` still reports pre-existing TypeScript errors in `server/jira-client-smoketest.ts` unrelated to US15 scope.

### File List

- `_bmad-output/implementation-artifacts/US15-dora-dashboard-frontend.story.md`
- `client/src/App.tsx`
- `client/src/components/DashboardHeader.tsx`
- `client/src/pages/DoraDashboard.tsx`
- `client/src/lib/dora.ts`
- `client/src/lib/dora.test.ts`

## Change Log

- 2026-04-13: Created US15 story for frontend DORA dashboard implementation from UX specification.
- 2026-04-13: Completed US15 implementation and tests; story moved to `ready-for-review`.

## Status

ready-for-review
