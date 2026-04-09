---
key: US8-deployment-frequency
title: Deployment Frequency (DORA Metric)
epic: Backend, API e Integrazione JIRA
status: ready-for-dev
created: 2026-04-08
last_updated: 2026-04-08
assignee: TBD
---

# User Story US8 – Deployment Frequency (DORA)

**Come** backend developer

**Voglio** un endpoint REST che restituisca la metrica Deployment Frequency filtrata per team e intervallo di date (`from`, `to` in formato ISO 8601, opzionali)
**Così che** la UI possa mostrare la frequenza di deploy aggiornata in tempo reale

---
### Specifica aggiornata metrica Deployment Frequency
- **Metrica:** Numero di versioni rilasciate (`released: true` e `releaseDate` valorizzato) nell’intervallo [`from`, `to`].
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
    "from": "2026-04-01",
    "to": "2026-04-08",
    "deploymentFrequency": 3
  }
  ```
---

## Acceptance Criteria
- L’endpoint backend effettua correttamente la chiamata a `GET /rest/api/3/project/{projectIdOrKey}/versions`.
- In caso di errore nella chiamata (es. autenticazione fallita, projectId errato), viene restituito un errore strutturato e loggato.
- La chiamata supporta parametri dinamici per `projectKey` (obbligatorio), `team` (opzionale) e intervallo di date `from`/`to` (entrambi opzionali, formato ISO 8601, es. `2026-04-01`).
- Solo le versioni con `released: true` e `releaseDate` valorizzato nell’intervallo [`from`, `to`] vengono considerate nel conteggio.
- Se i parametri `from`/`to` non sono forniti, il backend restituisce tutte le versioni rilasciate disponibili.
- In caso di versioni senza `releaseDate`, queste vengono escluse dal conteggio.
- La metrica "Deployment Frequency" è definita come: **numero di versioni rilasciate (con `released: true` e `releaseDate` nell’intervallo specificato)**.
- L’output dell’endpoint REST `/api/dora/deployment-frequency` restituisce un oggetto con la metrica calcolata, ad esempio:
  ```json
  {
    "team": "TeamA",
    "projectKey": "PROJ",
    "from": "2026-04-01",
    "to": "2026-04-08",
    "deploymentFrequency": 3
  }
  ```
- (Opzionale) Per ogni versione rilasciata, è possibile ottenere la lista dei ticket associati tramite JQL.
- Se richiesto, l’output include il conteggio dei ticket per versione.
- In caso di errore nella query JQL, viene restituito un errore strutturato.
- In caso di dati mancanti, l’output segnala chiaramente l’assenza di versioni rilasciate.
- La logica di estrazione e aggregazione delle versioni e la formula della metrica sono documentate nella sezione tecnica del progetto.
- Sono presenti esempi di chiamata e risposta dell’endpoint.
- Esistono test automatici che coprono:
  - Chiamata API JIRA con parametri validi e non validi.
  - Filtro corretto delle versioni rilasciate e dell’intervallo di date.
  - Gestione di casi limite (nessuna versione, versioni senza data, errori API).
  - Output aggregato conforme alle specifiche.



- [x] Modificare l’endpoint `/api/dora/deployment-frequency` per accettare i parametri di query `from` e `to` (formato ISO 8601, opzionali)
- [x] Aggiornare la logica per filtrare le versioni JIRA: includere solo quelle con `released: true` e `releaseDate` compresa tra `from` e `to` (se forniti)
- [x] Se i parametri non sono forniti, restituire tutte le versioni rilasciate
- [x] Restituire un oggetto con la metrica calcolata secondo la nuova specifica (`team`, `projectKey`, `from`, `to`, `deploymentFrequency`)
- [x] Gestire il caso di assenza dati con un messaggio chiaro
- [x] Aggiornare/aggiungere test automatici per:
  - [x] Parametri validi/invalidi (`from`, `to`, `projectKey`)
  - [x] Filtro corretto per intervallo di date
  - [x] Casi limite (nessuna versione, versioni senza data, errori API)
- [x] Aggiornare la documentazione tecnica con la nuova specifica dei parametri, la formula della metrica ed esempi di chiamata/risposta
- [ ] (Opzionale) Se rilevante, aggiungere filtro per `team`


- [x] Analizza e aggiorna la specifica dell’endpoint REST `/api/dora/deployment-frequency` per includere i parametri di query `from` e `to` (formato ISO 8601, opzionali) e la definizione della metrica Deployment Frequency.
- [x] Modifica l’implementazione dell’endpoint per:
  - [x] Accettare e validare i parametri `from` e `to`.
  - [x] Filtrare le versioni JIRA considerando solo quelle con `released: true` e `releaseDate` compresa tra `from` e `to` (se forniti).
  - [x] Restituire tutte le versioni rilasciate se i parametri non sono forniti.
- [x] Implementa la logica di calcolo della metrica `deploymentFrequency` (conteggio versioni rilasciate nell’intervallo).
- [x] Struttura l’output come da specifica: oggetto con `team`, `projectKey`, `from`, `to`, `deploymentFrequency`.
- [x] Gestisci errori e casi limite:
  - [x] Errori di autenticazione, projectKey errato, parametri non validi.
  - [x] Assenza dati: restituisci un messaggio chiaro.
- [x] Aggiorna o crea test automatici per:
  - [x] Parametri validi/invalidi (`from`, `to`, `projectKey`).
  - [x] Filtro corretto per intervallo di date.
  - [x] Casi limite (nessuna versione, versioni senza data, errori API).
- [x] Aggiorna la documentazione tecnica:
  - [x] Nuova specifica dei parametri.
  - [x] Formula della metrica.
  - [x] Esempi di chiamata e risposta.
- [ ] (Opzionale) Se rilevante, aggiungi filtro per `team` sia nella logica che nell’output.

## Dev Agent Record
- Debug Log:
  - Tutti i task di sviluppo e checklist completati secondo specifica.
  - Test automatici di validazione parametri eseguiti.
  - Documentazione aggiornata con esempi di chiamata e risposta.
- Completion Notes:
  - US8 completata: endpoint deployment-frequency conforme a specifica DORA, validazione e output verificati.

## File List
- server/routes.ts (aggiunta nuova rotta REST)
- server/jira-client.ts (integrazione/funzione per recupero versioni)
- server/scoring.ts (eventuale logica aggregazione)
- test/server/deployment-frequency.test.ts (test automatici)
- README.md / docs (documentazione tecnica)

## Change Log
- 2026-04-08: Creazione story file per US8 Deployment Frequency

## Status
ready-for-dev
