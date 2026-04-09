---
key: US12-lead-time-epic
created: 2026-04-09
last_updated: 2026-04-09
title: Lead Time for Changes (Epic)
epic: Backend, API e Integrazione JIRA
status: ready-for-dev
assignee: TBD
---

# User Story US12 – Lead Time for Changes (Epic)

**Come** product owner o team lead
**Voglio** conoscere il tempo medio di attraversamento delle epiche di sviluppo
**Così che** possa misurare la velocità di delivery e identificare colli di bottiglia

---

## Specifica metrica Lead Time for Changes (Epic)
- **Definizione:** Tempo medio (in giorni) che intercorre tra la creazione di una Epic e il suo rilascio in produzione (stato "Released").
- **Obiettivo:** Misurare la rapidità con cui il team porta a termine iniziative di sviluppo di alto livello.
- **Algoritmo:**
  1. Recupera tutte le epiche di sviluppo dal JIRA (issueType = Epic) per il team/progetto selezionato.
  2. Per ogni Epic, calcola la differenza tra la data di creazione (`created`) e la data di rilascio in produzione (`releaseDate` o stato "Released").
  3. Calcola la media dei lead time di tutte le epiche rilasciate nel periodo selezionato.
- **Attributi JIRA richiesti:** key, summary, created, releaseDate, status, project, team (custom field se presente)
- **Parametri endpoint:**
  - `projectKey` (obbligatorio)
  - `team` (opzionale)
  - `from` (opzionale, ISO 8601)
  - `to` (opzionale, ISO 8601)
- **Output:**
  ```json
  {
    "team": "TeamA",
    "projectKey": "PROJ",
    "from": "2026-01-01",
    "to": "2026-03-31",
    "meanLeadTimeDays": 12.5,
    "epics": [
      { "key": "EPIC-123", "summary": "Feature X", "created": "2026-01-10", "releaseDate": "2026-01-25", "leadTimeDays": 15 },
      { "key": "EPIC-124", "summary": "Feature Y", "created": "2026-02-01", "releaseDate": "2026-02-10", "leadTimeDays": 9 }
    ]
  }
  ```

---

## Calcolo alternativo: Lead Time fino a READY_FOR_UAT
- **Definizione:** Tempo medio (in giorni) tra la creazione di una Epic e il raggiungimento dello stato "READY_FOR_UAT" (fine sviluppo team).
- **Algoritmo:**
  1. Per ogni Epic, calcola la differenza tra `created` e la data di transizione a "READY_FOR_UAT" (se disponibile nei changelog/status).
  2. Calcola la media dei lead time per tutte le epiche che hanno raggiunto questo stato nel periodo selezionato.
- **Output aggiuntivo:**
  ```json
  {
    "meanLeadTimeReadyForUAT": 8.2
  }
  ```

---

## Acceptance Criteria
- L’endpoint backend effettua la query JIRA per recuperare tutte le epiche di sviluppo del team/progetto.
- Per ogni Epic, viene calcolato il lead time dalla creazione al rilascio in produzione (e, se richiesto, fino a READY_FOR_UAT).
- L’output include la media dei lead time e il dettaglio per ogni Epic.
- L’endpoint accetta parametri di filtro per team, periodo e stato finale ("Released" o "READY_FOR_UAT").
- In caso di epiche senza data di rilascio o transizione, queste vengono escluse dal calcolo e segnalate nell’output.
- Sono presenti esempi di chiamata e risposta dell’endpoint.
- Esistono test automatici che coprono:
  - Query JIRA con parametri validi/invalidi
  - Calcolo corretto dei lead time
  - Gestione di epiche senza data di rilascio/transizione
  - Output conforme alle specifiche

---


 [x] Implementa funzione di query JIRA per recuperare epiche e dati di stato (incluso changelog per READY_FOR_UAT)
 [ ] Calcola il lead time medio e dettaglio per ogni Epic (creazione → rilascio, creazione → READY_FOR_UAT) _(in corso)_
- [ ] Gestisci errori, dati mancanti e casi limite (epiche senza data rilascio/transizione)
- [ ] Aggiorna la documentazione tecnica con esempi di input/output
  - [2026-04-09] Avviata implementazione funzione di query JIRA per epiche e changelog (READY_FOR_UAT)
  - [2026-04-09] Endpoint /api/dora/lead-time-epic: parametri validati, fetch epiche/changelog integrato, output base conforme a specifica story/OpenAPI (senza calcolo)

- [ ] Definisci o aggiorna la specifica OpenAPI per l’endpoint `/api/dora/lead-time-epic` (parametri, risposta, errori)

- [ ] Analizza la specifica e definisci la struttura dell’endpoint `/api/dora/lead-time-epic`
- [ ] Implementa la logica di query JIRA per epiche, release e transizioni di stato
- [ ] Calcola e restituisci la media e il dettaglio dei lead time (rilascio, READY_FOR_UAT)
- [ ] Gestisci errori, dati mancanti e output chiaro
- [ ] Aggiorna la documentazione tecnica e inserisci esempi
- [ ] Implementa test automatici per:
  - [ ] Parametri validi/invalidi
  - [ ] Calcolo corretto dei lead time
  - [ ] Gestione epiche senza data rilascio/transizione
  - [ ] Output conforme alle specifiche

- [ ] Definisci/aggiorna la specifica OpenAPI per la nuova funzionalità (endpoint, parametri, risposta, errori)

---

Debug Log:
  - [2026-04-09] Endpoint REST /api/dora/lead-time-epic aggiunto in routes.ts (solo struttura, status 501)
  - [2026-04-09] Avviata implementazione funzione di query JIRA per epiche e changelog (READY_FOR_UAT)
Completion Notes:

- server/routes.ts (nuovo endpoint REST)
- server/jira-client.ts (funzione query epiche e changelog)
- test/server/lead-time-epic.test.ts (test automatici)
- README.md / docs (documentazione tecnica)

## Change Log
- 2026-04-09: Creazione story file per US12 Lead Time for Changes (Epic)

## Status
ready-for-dev
