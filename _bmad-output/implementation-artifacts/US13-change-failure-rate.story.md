---
key: US13-change-failure-rate
created: 2026-04-10
last_updated: 2026-04-10
title: Change Failure Rate (DORA) — Dual Metric (DORA + SEND)
epic: Backend, API e Integrazione JIRA
status: ready-for-dev
assignee: TBD
---

# User Story US13 – Change Failure Rate (DORA)

**Come** engineering manager o team lead  
**Voglio** conoscere la percentuale di rilasci che generano bug o incident in produzione  
**Così che** possa misurare la qualità dei deploy e individuare regressioni ricorrenti

---

## Story

As an engineering manager or team lead,  
I want a backend endpoint that calculates Change Failure Rate from Jira production issues and releases,  
so that the UI can show how often deployments cause failures.

## Specifica metrica Change Failure Rate

- **Definizione:** La metrica viene separata in due sub-metriche : 
 La change-Failure-Rate ufficiale DORA, ovvero percentuale di release  che hanno almeno un failure associato nel periodo selezionato. 
 Una change-failure-rate contestualizzata, ovvero una percentuale di release General Availability (GA) che hanno almeno un failure associato nel periodo selezionato o un rilascio di tipo Hotfix 

- **Formula:**

  ```text
  changeFailureRateDora = (numero di release con almeno 1 "[SEND] Bug Prod" associato) / (numero totale di release) * 100
 
 changeFailureRateSend = (numero di release il cui nome inizia per GA con almeno 1 "[SEND] Bug Prod" associato) / (numero totale di release il cui nome iniziare per GA o HOTFIX) *100 
  ```

- **Algoritmo di riferimento per questa implementazione:**
  1. Recupera le release del progetto da Jira tramite le project versions.
  2. Considera solo le versioni con `released: true` e `releaseDate` valorizzato nell'intervallo richiesto.
  3. Recupera i ticket failure dal progetto con issue type `[SEND] Bug Prod` collegati alla versione
  5. Conta quante release hanno almeno un ticket failure associato.
  6. Restituisce percentuale, conteggi aggregati e dettaglio per release.

- **Campi Jira richiesti:**
  - Release/versioni: `id`, `name`, `released`, `releaseDate`, `archived`
  - Failure issues: `key`, `fields.summary`, `fields.created`, `fields.resolutiondate`, `fields.issuetype`, `fields.status`, `fields.versions` o `fields.affectedVersions`
- **Filtri endpoint:**
  - `projectKey` obbligatorio
  - `team` opzionale
  - `from` opzionale, ISO 8601
  - `to` opzionale, ISO 8601

## Proposed Endpoint Contract

- **Endpoint:** `GET /api/dora/change-failure-rate`
- **Success response example:**

  ```json
  {
    "team": "TeamA",
    "projectKey": "PROJ",
    "from": "2026-03-01",
    "to": "2026-03-31",
    "dora": {
      "totalDeployments": 5,
      "failedDeployments": 2,
      "changeFailureRate": 40
    },
    "send": {
      "totalDeployments": 3,
      "failedDeployments": 1,
      "changeFailureRate": 33
    },
    "releases": [
      {
        "id": "10010",
        "name": "GA.1.4.0",
        "releaseDate": "2026-03-05",
        "isGaOrHotfix": true,
        "failureCount": 1,
        "failureIssues": [
          { "key": "PROJ-101", "issueType": "[SEND] Bug Prod", "created": "2026-03-06" }
        ]
      },
      {
        "id": "10011",
        "name": "1.4.1",
        "releaseDate": "2026-03-20",
        "isGaOrHotfix": false,
        "failureCount": 1,
        "failureIssues": [
          { "key": "PROJ-119", "issueType": "[SEND] Bug Prod", "created": "2026-03-21" }
        ]
      },
      {
        "id": "10012",
        "name": "GA.1.4.1",
        "releaseDate": "2026-03-25",
        "isGaOrHotfix": true,
        "failureCount": 0,
        "failureIssues": []
      }
    ],
    "unmappedFailures": [
      {
        "key": "PROJ-130",
        "summary": "Production issue without version mapping",
        "created": "2026-03-28",
        "reason": "No Affects Version/s value found"
      }
    ]
  }
  ```

---

## Acceptance Criteria

1. Il backend espone `GET /api/dora/change-failure-rate` come endpoint autenticato coerente con gli altri endpoint DORA.
2. L'endpoint valida `projectKey` come obbligatorio e rifiuta `from` e `to` non validi con errore `400`.
3. Il backend recupera da Jira le release del progetto usando la stessa integrazione per-utente già adottata per le altre metriche DORA.
4. Solo le release con `released: true` e `releaseDate` valorizzato, comprese nell'intervallo richiesto, entrano nei denominatori.
5. Il backend recupera da Jira **solo** i ticket failure di tipo `[SEND] Bug Prod` che abbiamo associata una delle release nel periodo richiesto tramite `Affects Version/s` (campi: `fields.versions` o `fields.affectedVersions`).
6. Per la metrica **DORA**: `dora.failedDeployments` = numero di release (tutte) con almeno 1 `[SEND] Bug Prod` associato.
7. Per la metrica **SEND**: `send.failedDeployments` = numero di release il cui nome inizia con `GA` o contiene `HOTFIX` e che hanno almeno 1 `[SEND] Bug Prod` associato; `send.totalDeployments` = numero totale di release il cui nome inizia con `GA` o contiene `HOTFIX`.
8. `changeFailureRate` (sia DORA che SEND) è restituito come percentuale numerica arrotondata 2 decimali, calcolato solo se `totalDeployments > 0`; altrimenti il valore è `null`.
9. L'output include: `dora.{totalDeployments, failedDeployments, changeFailureRate}`, `send.{totalDeployments, failedDeployments, changeFailureRate}`, dettaglio per release con flag `isGaOrHotfix`, e sezione `unmappedFailures` per i failure senza mapping.
10. In caso di errore Jira, projectKey non valido o credenziali errate, l'endpoint restituisce errore strutturato coerente con `/api/dora/deployment-frequency` e `/api/dora/lead-time-epic`.
11. README e OpenAPI vengono aggiornati con formula per entrambe le metriche, parametri, esempio di risposta e spiegazione del tipo issue `[SEND] Bug Prod`.
12. Esistono test automatici almeno per: validazione parametri, DORA vs SEND aggregazione corretta, nessun failure, molteplici failure su stessa release, release GA/HOTFIX vs non-GA, errori Jira, e comportamento con `totalDeployments = 0`.

## Tasks / Subtasks

- [ ] Define the dual-metric contract and route shape (AC: 1, 2, 9, 10, 12)
  - [ ] Add the new REST route in `server/routes.ts` near the existing DORA endpoints.
  - [ ] Align request validation and error handling with the existing deployment-frequency and lead-time-epic routes.
  - [ ] Structure response to include both `dora` and `send` sub-objects with their respective metrics.
  - [ ] Document the zero-deploy behavior: `changeFailureRate = null` when `totalDeployments = 0`.
- [ ] Implement Jira data retrieval for `[SEND] Bug Prod` failures and release mapping (AC: 3, 4, 5, 6, 11)
  - [ ] Reuse or extend the version-fetching logic in `server/jira-client.ts` for release retrieval (identical to deployment-frequency).
  - [ ] Add a Jira client function `fetchProductionBugsForReleases(...)` to query **only** `[SEND] Bug Prod` issues with dynamic JQL filtering by `Affects Version/s`.
  - [ ] Request fields: `key`, `summary`, `created`, `issuetype` (must equal `[SEND] Bug Prod`), `versions` / `affectedVersions`.
  - [ ] Normalize structured errors exactly as done for other Jira client helpers.
- [ ] Implement dual-metric aggregation logic (AC: 7, 8, 10)
  - [ ] Filter releases by `released: true` and `releaseDate` in interval.
  - [ ] Compute `dora.totalDeployments` = all released versions in interval.
  - [ ] Compute `send.totalDeployments` = released versions whose name starts with `GA` or contains `HOTFIX`.
  - [ ] Map each `[SEND] Bug Prod` issue to releases via `Affects Version/s`; count release once even if multiple failures point to it.
  - [ ] Compute `dora.failedDeployments` and `dora.changeFailureRate` for all releases.
  - [ ] Compute `send.failedDeployments` and `send.changeFailureRate` for GA/HOTFIX releases only.
  - [ ] Add `isGaOrHotfix` flag to each release in response for transparency.
  - [ ] Collect unmapped `[SEND] Bug Prod` issues in separate `unmappedFailures` section.
- [ ] Add comprehensive test coverage (AC: 2, 13)
  - [ ] Add unit/integration Jest tests for missing `projectKey` and invalid date formats.
  - [ ] Test DORA vs SEND aggregation: separate GA/HOTFIX from other releases.
  - [ ] Test no releases, no failures, multiple failures on same release counted once.
  - [ ] Test unmapped failures collection and reporting.
  - [ ] Test behavior when `totalDeployments = 0` (both DORA and SEND).
  - [ ] Test Jira auth/404/500 errors propagated through route.
  - [ ] If adding E2E test, isolate to dedicated port (not 3000) like lead-time-epic test.
- [ ] Update technical documentation (AC: 12)
  - [ ] Update `README.md` with both DORA and SEND formulas, endpoint behavior, and `[SEND] Bug Prod` issue type explanation.
  - [ ] Update `docs/openapi.yaml` with parameters, dual-metric response schema, and error schema.
  - [ ] Add optional script under `scripts/` to validate `[SEND] Bug Prod` query against real Jira.

## Dev Notes

### Technical Requirements

- Keep all Jira access server-side only. Tokens must never be returned in API responses.
- Follow the current DORA pattern already present in `server/routes.ts`: validate query params first, then import the Jira client helper, then normalize route responses.
- Prefer extending `server/jira-client.ts` instead of embedding Jira fetch logic directly inside the route.
- Use dynamic JQL filtered by `projectKey`, optional `team`, and optional `from`/`to`.
- **Critical:** Query **only** issue type `[SEND] Bug Prod` for failures. This is the authoritative production-bug type in the target JIRA instance.
- Support both `fields.versions` and `fields.affectedVersions` Jira fields for release mapping; normalize to a single approach in client helper.
- Implement release name filtering for SEND metric: detect names starting with `GA` or containing `HOTFIX` case-insensitively.

### Architecture Compliance

- Backend stack remains Express + TypeScript with Jira REST API v3 and user-scoped credentials.
- Preserve the separation already established in the codebase:
  - route orchestration in `server/routes.ts`
  - integration details in `server/jira-client.ts`
  - shared schema changes only if the API contract becomes shared with the frontend
- Reuse the same structured error shape already used by `fetchEpicsWithChangelog` and the deployment-frequency path.

### Library / Framework Requirements

- Use the existing Jira integration approach already in the repository:
  - `jira.js` where it already fits
  - direct `fetch` for endpoints where the Jira SDK is not sufficient or where enhanced search requires raw REST calls
- Keep TypeScript strict-friendly typing where practical, but match the current repository style if helper responses remain partially typed.
- Keep Jest-based tests aligned with the current route tests.

### File Structure Requirements

- Primary backend changes are expected in:
  - `server/routes.ts`
  - `server/jira-client.ts`
  - `server/change-failure-rate.test.ts` or equivalent test file
  - `docs/openapi.yaml`
  - `README.md`
- Optional validation helpers may be added under `scripts/` if a real Jira smoke test is useful.

### Testing Requirements

- Mirror the baseline validation tests already used in `server/deployment-frequency.test.ts` and `server/lead-time-epic.test.ts`.
- Add route-level coverage for parameter validation before attempting broader integration coverage.
- If adding an E2E test, do not reuse port `3000`; use a dedicated test port to avoid stale local servers.
- Include at least one fixture scenario where two failure issues map to the same release so the numerator counts the release once, not twice.

### Previous Story Intelligence

- `US12-lead-time-epic` established that the safest Jira search path for richer queries is raw REST against Jira Cloud v3 rather than assuming legacy search endpoints still work.
- The current codebase already exports `createServer()` and supports route tests against the app instance; reuse that pattern.
- The lead-time E2E work showed that tests must avoid collisions with locally running dev servers. Any live test for this story must isolate its own port.
- The recent README update for lead-time added explicit documentation of Jira fields used in metric computation. CFR documentation should reach the same level of specificity.

### Git Intelligence Summary

- Recent work is concentrated around the DORA backend, especially the lead-time evaluation API.
- The repository is currently evolving incrementally rather than through broad refactors, so the implementation should stay focused and avoid unrelated cleanup.

### Project Structure Notes

- The project currently has working DORA endpoints for deployment frequency and lead time; Change Failure Rate should be added beside them, not behind a separate controller abstraction.
- There is no active `sprint-status.yaml` in `_bmad-output/implementation-artifacts`, so this story is created directly as an implementation artifact and is not auto-registered in sprint tracking.

### References

- Source: `core-knowledge/features/dora-dashboard/backend-userstories.md` — section `Change Failure Rate (Tasso di fallimento dei cambiamenti)`
- Source: `core-knowledge/features/dora-dashboard/sprint-plan.md` — section `Change Failure Rate (CFR)`
- Source: `core-knowledge/features/dora-dashboard/prd.md` — functional and non-functional requirements for DORA metrics
- Source: `project-context.md` — DORA metric rules and backend conventions
- Source: `server/routes.ts` — existing DORA endpoint implementation patterns
- Source: `server/jira-client.ts` — Jira client and structured error handling conventions
- Source: `server/deployment-frequency.test.ts` — baseline route validation test pattern
- Source: `server/lead-time-epic.test.ts` — recent DORA route test pattern

## Open Questions / Clarifications

- **CLOSED:** Which issue type for production bugs? → `[SEND] Bug Prod` (specified in story)
- **CLOSED:** Which Jira field for version mapping? → `Affects Version/s` (via `fields.versions` or `fields.affectedVersions` in REST API)
- **CLOSED:** Response when `totalDeployments = 0`? → `changeFailureRate: null` (confirmed in AC #9)
- Confirm GA/HOTFIX naming pattern detection logic:
  - Should `GA.1.4.0`, `GA-1.4.0` be detected as GA releases?
  - Should detection be case-sensitive or case-insensitive?
- Should unmapped failures (those without `Affects Version/s`) be counted in DORA/SEND numerators or excluded? (Currently: excluded, reported separately)

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- 2026-04-10: Created story context for new Change Failure Rate backend implementation.
- 2026-04-10: Reused repository knowledge from existing DORA endpoints, tests, and documentation updates.

### Completion Notes List

- Story file created directly because no `sprint-status.yaml` is present in implementation artifacts.
- Story intentionally includes open questions about Jira version-mapping fields because the source documents describe the metric but do not fully fix the field mapping.

### File List

- `_bmad-output/implementation-artifacts/US13-change-failure-rate.story.md`

## Change Log

- 2026-04-10: Created story file for Change Failure Rate backend implementation.
- 2026-04-10: Refined story to reflect SEND-specific metrics and `[SEND] Bug Prod` issue type:
  - Dual-metric response: DORA (all releases) + SEND (GA/HOTFIX releases only)
  - Endpoint contract updated with nested DORA/SEND sub-objects
  - Acceptance criteria clarified for issue type specificity and GA/HOTFIX filtering
  - Tasks restructured to emphasize `[SEND] Bug Prod` query and dual aggregation
  - Open questions consolidated; GA/HOTFIX naming detection strategy moved to clarifications

## Status

ready-for-dev