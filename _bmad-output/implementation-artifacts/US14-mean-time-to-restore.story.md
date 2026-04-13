---
key: US14-mean-time-to-restore
created: 2026-04-10
last_updated: 2026-04-10
title: Mean Time to Restore (MTTR) — SEND Prod BUG
epic: Backend, API e Integrazione JIRA
status: ready-for-review
assignee: TBD
---

# User Story US14 – Mean Time to Restore (MTTR)

**Come** engineering manager  
**Voglio** misurare il Mean Time to Restore dei bug di produzione SEND  
**Cosi che** possa monitorare la velocita di ripristino del servizio e ridurre il downtime percepito

---

## Story

As an engineering manager,  
I want a backend endpoint that calculates MTTR for SEND production bugs,  
so that I can track how quickly incidents are resolved over a selected period.

## Specifica metrica MTTR

- **Definizione:** MTTR e il tempo medio tra creazione e risoluzione di un bug di produzione.
- **Scope SEND:** solo issue di tipo `[SEND] Bug Prod`.
- **Formula:**

  ```text
  mttrHours = media( resolutionDate - created )
  ```

- **Algoritmo di riferimento:**
  1. Recupera da Jira le issue `[SEND] Bug Prod` nel progetto e periodo selezionato.
  2. Considera solo issue con `resolutiondate` valorizzato.
  3. Calcola per ogni issue il tempo in ore tra `created` e `resolutiondate`.
  4. Restituisce media, percentile p50/p90 (opzionali ma raccomandati), conteggi e dettaglio issue.

- **Campi Jira richiesti:**
  - `key`
  - `fields.summary`
  - `fields.created`
  - `fields.resolutiondate`
  - `fields.issuetype`
  - `fields.status`

- **Filtri endpoint:**
  - `projectKey` obbligatorio
  - `team` opzionale
  - `from` opzionale, ISO 8601
  - `to` opzionale, ISO 8601

## Proposed Endpoint Contract

- **Endpoint:** `GET /api/dora/mean-time-to-restore`
- **Success response example:**

  ```json
  {
    "team": "TeamA",
    "projectKey": "PN",
    "from": "2026-03-01",
    "to": "2026-03-31",
    "mttrHours": 18.25,
    "p50Hours": 12,
    "p90Hours": 36,
    "totalIncidents": 8,
    "resolvedIncidents": 6,
    "unresolvedIncidents": 2,
    "issues": [
      {
        "key": "PN-19053",
        "summary": "Errore in produzione su recapito",
        "created": "2026-03-19T10:23:28.776+0100",
        "resolutionDate": "2026-03-20T09:10:00.000+0100",
        "restoreHours": 22.78,
        "issueType": "[SEND] Bug Prod",
        "status": "Done"
      }
    ],
    "skippedIssues": [
      {
        "key": "PN-19299",
        "summary": "Bug ancora aperto",
        "created": "2026-03-30T11:02:10.111+0100",
        "reason": "Missing resolutiondate"
      }
    ]
  }
  ```

---

## Acceptance Criteria

1. Il backend espone `GET /api/dora/mean-time-to-restore` come endpoint autenticato, coerente con gli altri endpoint DORA.
2. L'endpoint valida `projectKey` come obbligatorio e rifiuta `from` e `to` non validi con errore `400`.
3. Il backend recupera da Jira **solo** issue di tipo `[SEND] Bug Prod`.
4. L'endpoint considera per il calcolo MTTR solo issue con `resolutiondate` valorizzato.
5. Per ogni issue valida, `restoreHours` e calcolato come differenza in ore tra `created` e `resolutiondate`, arrotondato a 2 decimali.
6. `mttrHours` e la media di tutti i `restoreHours` nel periodo.
7. L'output include `totalIncidents`, `resolvedIncidents`, `unresolvedIncidents`, `issues`, `skippedIssues`.
8. Se non ci sono issue risolte nel periodo, `mttrHours` e `null` (e non `0`).
9. In caso di errore Jira, projectKey non valido o credenziali errate, l'endpoint restituisce errore strutturato coerente con gli altri endpoint DORA.
10. README e OpenAPI vengono aggiornati con formula, parametri, esempio risposta e semantica di `[SEND] Bug Prod`.
11. Esistono test automatici per validazione parametri, calcolo ore/medie, issue non risolte, output vuoto, errori Jira.

## Tasks / Subtasks

- [x] Define route contract and validation (AC: 1, 2, 7, 8, 9, 11)
  - [x] Add REST route `GET /api/dora/mean-time-to-restore` in `server/routes.ts` vicino agli endpoint DORA esistenti.
  - [x] Implement query param validation (`projectKey`, `from`, `to`) con stesso pattern di `deployment-frequency` e `change-failure-rate`.
  - [x] Return stable response envelope with aggregate fields and issue lists.

- [x] Implement Jira retrieval helper for MTTR (AC: 3, 4, 9)
  - [x] Add helper in `server/jira-client.ts` (es. `fetchSendProdBugsForMttr(...)`).
  - [x] Build dynamic JQL with `projectKey`, optional `team`, optional date filters.
  - [x] Query **only** `[SEND] Bug Prod` with fields needed for MTTR.
  - [x] Normalize structured errors (`auth`, `not_found`, `unknown`) exactly like existing helpers.

- [x] Implement MTTR computation module (AC: 4, 5, 6, 8)
  - [x] Create dedicated function/module (es. `server/mean-time-to-restore.ts`) to compute per-issue restore hours.
  - [x] Split resolved vs unresolved issues.
  - [x] Compute `mttrHours` and optional `p50Hours`/`p90Hours` when resolved set is non-empty.
  - [x] Return `mttrHours = null` when no resolved incidents.

- [x] Add comprehensive automated tests (AC: 2, 5, 6, 8, 9, 11)
  - [x] Unit tests for MTTR math (hours diff, average, percentile boundaries).
  - [x] Route tests for missing `projectKey` and invalid dates.
  - [x] Test unresolved issues are excluded from MTTR and moved to `skippedIssues`.
  - [x] Test empty resolved set returns `mttrHours: null`.
  - [x] Test Jira `auth`/`not_found`/`unknown` propagation.
  - [ ] Optional E2E test with dedicated port (not 3000).

- [x] Update documentation (AC: 10)
  - [x] Update `README.md` MTTR section with endpoint and formula.
  - [x] Update `docs/openapi.yaml` schema for `/api/dora/mean-time-to-restore`.
  - [x] Add optional script under `scripts/` for real Jira MTTR query validation.

## Dev Notes

### Technical Requirements

- Keep Jira credentials and tokens strictly server-side.
- Reuse existing DORA route pattern (validation -> helper call -> aggregation -> structured response).
- Query only `[SEND] Bug Prod` for MTTR scope.
- Use `created` and `resolutiondate` as canonical timestamps.
- Preserve timezone offsets when parsing Jira dates.

### Architecture Compliance

- Route orchestration in `server/routes.ts`.
- Jira integration in `server/jira-client.ts`.
- MTTR calculation isolated in dedicated module for deterministic unit testing.
- Error shape aligned with existing DORA endpoints.

### Library / Framework Requirements

- TypeScript strict-friendly implementation.
- Reuse existing fetch/Jira API approach already used for lead-time and CFR.
- Jest as test framework, following existing server test style.

### File Structure Requirements

- Expected files to modify/add:
  - `server/routes.ts`
  - `server/jira-client.ts`
  - `server/mean-time-to-restore.ts`
  - `server/mean-time-to-restore.test.ts`
  - `server/mean-time-to-restore-handler.test.ts` (optional but recommended)
  - `README.md`
  - `docs/openapi.yaml`
  - `scripts/test-fetchSendProdBugsForMttr.ts` (optional)

### Testing Requirements

- Cover both happy path and edge cases with deterministic tests.
- If E2E added, use isolated port and robust server startup/shutdown handling.
- Ensure all existing CFR/DF/LT tests continue to pass.

### References

- Source: `core-knowledge/features/dora-dashboard/backend-userstories.md` — section `4. Mean Time to Restore (MTTR)`
- Source: `core-knowledge/features/dora-dashboard/sprint-plan.md` — section `Mean Time To Recovery (MTTR)`
- Source: `project-context.md` — section `DORA Metrics Calculation Logic`
- Source: `server/routes.ts` — current DORA route patterns
- Source: `server/jira-client.ts` — structured Jira helper and error handling pattern

## Open Questions / Clarifications

- Confirm whether filter should apply on `created` range or `resolutiondate` range (or both).
- Confirm whether percentile fields (`p50Hours`, `p90Hours`) are mandatory for first release.
- Confirm if issues resolved after `to` date but created inside period should be included.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- 2026-04-10: Story generated from DORA backend artifacts and existing endpoint patterns.
- 2026-04-10: Implemented MTTR endpoint, Jira helper, aggregation module, tests, docs, and npm script alias.
- 2026-04-10: Updated MTTR Jira helper to derive `resolutionDate` from changelog transition to `Completata` when `fields.resolutiondate` is missing.

### Completion Notes List

- Implemented `GET /api/dora/mean-time-to-restore` with DORA-like validation and structured Jira error propagation.
- Added Jira helper `fetchSendProdBugsForMttr` with strict `[SEND] Bug Prod` JQL scope and required fields.
- Added MTTR fallback resolution logic: when `fields.resolutiondate` is null, use changelog timestamp of latest status transition to `Completata`.
- Implemented deterministic MTTR aggregation (mttrHours, p50Hours, p90Hours, issues/skippedIssues split).
- Added unit and handler tests for core AC coverage plus full suite execution.
- Added dedicated unit tests for changelog-to-resolutionDate extraction logic in Jira helper.
- Updated README and OpenAPI contracts and added `test:jira:mttr` helper script.

### File List

- `_bmad-output/implementation-artifacts/US14-mean-time-to-restore.story.md`
- `server/routes.ts`
- `server/jira-client.ts`
- `server/mean-time-to-restore.ts`
- `server/mean-time-to-restore-handler.ts`
- `server/mean-time-to-restore.test.ts`
- `server/mean-time-to-restore-handler.test.ts`
- `scripts/test-fetchSendProdBugsForMttr.ts`
- `package.json`
- `README.md`
- `docs/openapi.yaml`
- `server/jira-crypto.test.ts`
- `server/jira-client.mttr.test.ts`
- `scripts/mttr-cli-args.ts`
- `scripts/mttr-cli-args.test.ts`

## Change Log

- 2026-04-10: Created story file for Mean Time to Restore (MTTR) backend implementation.
- 2026-04-10: Implemented endpoint + helper + aggregation + tests + docs for US14.
- 2026-04-10: Added changelog fallback (`status -> Completata`) for MTTR resolutionDate plus tests and documentation updates.

## Status

ready-for-review
