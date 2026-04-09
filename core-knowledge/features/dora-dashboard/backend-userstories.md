---
title: User Stories - DORA Dashboard Backend & Integration
status: draft
last_updated: 2026-04-03
---

# User Stories - DORA Dashboard Backend & Integration

## Epic: Backend, API e Integrazione JIRA

### US06 - Integrazione JIRA sicura
**Come** sviluppatore
**Voglio** che il sistema si autentichi in modo sicuro a JIRA tramite API token per ogni utente
**Così che** i dati delle metriche siano sempre aggiornati e protetti

**Acceptance Criteria:**
- Ogni utente può configurare le proprie credenziali JIRA in modo sicuro
- I token non sono mai esposti lato frontend
- L’integrazione supporta più team/account

**Checklist di sviluppo:**
- [x] Progetta la struttura dati per salvare in modo sicuro le credenziali JIRA per utente (es. cifratura in DB)
- [x] Implementa endpoint backend per salvare/recuperare le credenziali JIRA (mai esporre token al frontend)
- [x] Modifica il client JIRA backend per usare credenziali per-utente (vedi server/jira-client.ts)
- [x] Esegui un test reale: effettua una query qualsiasi verso JIRA usando il client per-utente e verifica che la risposta sia corretta
	- Smoketest eseguito con successo: token decifrato, client autenticato, progetti JIRA recuperati correttamente per utente.
- [ ] Testa che i token non siano mai inviati al frontend (controlla le risposte API)
- [x] Aggiorna la documentazione tecnica e la story file (Dev Agent Record, File List, Change Log, Status)
- [x] Aggiorna file openApi del backend

---

### US07 - Calcolo metriche DORA lato backend
**Come** sviluppatore
**Voglio** che le metriche DORA vengano calcolate lato backend a partire dai dati JIRA
**Così che** il frontend riceva solo i risultati aggregati e non i dati raw

**Acceptance Criteria:**
- Il backend esegue le query JIRA necessarie (JQL)
- Le metriche sono calcolate secondo la logica DORA standard
- Il risultato è filtrabile per team e intervallo temporale

---

### US08 - Endpoint API REST per metriche DORA

**Come** frontend developer
**Voglio** un endpoint REST che restituisca le metriche DORA filtrate per team e data
**Così che** la UI possa mostrare i dati aggiornati in tempo reale

**Acceptance Criteria:**
- L’endpoint accetta parametri team e date
- Restituisce le metriche DORA aggregate
- Gestisce errori e casi di dati mancanti

---


#### Scomposizione per metrica DORA

**1. Deployment Frequency (Frequenza di deploy)**
	- **Descrizione:** Misura quanto spesso il team rilascia codice in produzione.
	- **Obiettivo:** Aumentare la frequenza di rilascio per favorire iterazioni rapide e time-to-market.
	- Algoritmo: Recupera le versioni (releases) del progetto tramite API JIRA "Get project versions" (`GET /rest/api/3/project/{projectIdOrKey}/versions`). Conta le versioni con `released: true` e, opzionalmente, incrocia i ticket associati tramite il campo `fixVersion` per ottenere dettagli sui rilasci.
	- JIRA API: [Get project versions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-project-projectidorkey-versions-get)
	- Attributi: name, released, releaseDate, archived, fixVersion
	- Output: Numero di versioni rilasciate per periodo
	- **Esempio chiamata API:**
  ```
  GET /rest/api/3/project/<PROJECT_KEY>/versions
  ```
	- **Esempio di filtro sulle versioni:**
    - Solo versioni con `released: true` e `releaseDate` nel periodo desiderato
	- **Esempio JQL (per ticket associati a una versione):**
  ```
  project = <TEAM> AND fixVersion = "<VERSION_NAME>"
  ```

**Checklist di sviluppo:**

**Acceptance Criteria dettagliati per Deployment Frequency (US08):**

1. **Implementazione chiamata API JIRA "Get project versions"**
	- L’endpoint backend effettua correttamente la chiamata a `GET /rest/api/3/project/{projectIdOrKey}/versions`.
	- In caso di errore nella chiamata (es. autenticazione fallita, projectId errato), viene restituito un errore strutturato e loggato.
	- La chiamata supporta parametri dinamici per project/team.

2. **Filtro versioni rilasciate**
	- Solo le versioni con `released: true` e `releaseDate` valorizzato nell’intervallo richiesto vengono considerate nel conteggio.
	- Il filtro su `releaseDate` rispetta i parametri di data forniti dall’endpoint.
	- In caso di versioni senza `releaseDate`, queste vengono escluse dal conteggio.

3. **(Opzionale) Recupero ticket associati tramite `fixVersion`**
	- Per ogni versione rilasciata, è possibile ottenere la lista dei ticket associati tramite JQL.
	- Se richiesto, l’output include il conteggio dei ticket per versione.
	- In caso di errore nella query JQL, viene restituito un errore strutturato.

4. **Esporre dati aggregati tramite endpoint backend**
	- L’endpoint REST `/api/dora/deployment-frequency` accetta parametri `team` e intervallo di date.
	- L’output restituisce il numero di deploy (versioni rilasciate) per periodo e team.
	- In caso di dati mancanti, l’output segnala chiaramente l’assenza di versioni rilasciate.

5. **Documentazione tecnica**
	- La logica di estrazione e aggregazione delle versioni è documentata nella sezione tecnica del progetto.
	- Sono presenti esempi di chiamata e risposta dell’endpoint.

6. **Test automatici**
	- Esistono test automatici che coprono:
	  - Chiamata API JIRA con parametri validi e non validi.
	  - Filtro corretto delle versioni rilasciate.
	  - Gestione di casi limite (nessuna versione, versioni senza data, errori API).
	  - Output aggregato conforme alle specifiche.

**2. Lead Time for Changes (Tempo di attraversamento)**
	- **Descrizione:** Tempo medio che intercorre tra la richiesta di una modifica (creazione ticket) e il suo rilascio in produzione.
	- **Obiettivo:** Ridurre il tempo di attraversamento per aumentare la reattività e l’efficienza del team.
	- Algoritmo: Differenza tra data creazione e data rilascio (“Done”) per ogni Story/Task/Bug completato. Media dei risultati.
	- JIRA Issue Types: Story, Task, Bug
	- Filtri: project = <TEAM>, issuetype in (Story, Task, Bug), status in (Done, Released, Deployed), resolved tra <startDate> e <endDate>
	- Attributi: created, resolved, issuetype, project
	- Output: Media/percentile dei lead time
	- **Esempio JQL:**
  ```
  project = <TEAM> AND issuetype in (Story, Task, Bug) AND status in (Done, Released, Deployed) AND resolved >= "<startDate>" AND resolved <= "<endDate>"
  ```

**3. Change Failure Rate (Tasso di fallimento dei cambiamenti)**
	- **Descrizione:** Percentuale di rilasci che causano errori in produzione (incident, bug, hotfix).
	- **Obiettivo:** Minimizzare il rischio di regressioni e aumentare la qualità dei rilasci.
	- Algoritmo: Rapporto tra ticket Bug/Incident/Hotfix creati dopo un deploy e numero totale di deploy.
	- JIRA Issue Types: Bug, Incident, Hotfix
	- Filtri: project = <TEAM>, issuetype in (Bug, Incident, Hotfix), created tra <startDate> e <endDate>
	- Attributi: created, issuetype, project
	- Output: Percentuale di deploy con almeno un failure
	- **Esempio JQL:**
  ```
  project = <TEAM> AND issuetype in (Bug, Incident, Hotfix) AND created >= "<startDate>" AND created <= "<endDate>"
  ```

**4. Mean Time to Restore (MTTR)**
	- **Descrizione:** Tempo medio necessario per ripristinare il servizio dopo un incidente.
	- **Obiettivo:** Ridurre il tempo di ripristino per garantire continuità e affidabilità del servizio.
	- Algoritmo: Per ogni Incident/Bug/Hotfix, tempo tra creazione e risoluzione. Media dei risultati.
	- JIRA Issue Types: Incident, Bug, Hotfix
	- Filtri: project = <TEAM>, issuetype in (Incident, Bug, Hotfix), status = Done, resolved tra <startDate> e <endDate>
	- Attributi: created, resolved, issuetype, project
	- Output: Media/percentile del tempo di ripristino
	- **Esempio JQL:**
  ```
  project = <TEAM> AND issuetype in (Incident, Bug, Hotfix) AND status = Done AND resolved >= "<startDate>" AND resolved <= "<endDate>"
  ```

**Attributi JIRA richiesti:** project, issuetype, status, created, resolved (opzionale: custom field per “release date”)

**Note:**
- I filtri JQL devono essere dinamici in base ai parametri dell’endpoint (team, date).
- Gestire casi di dati mancanti (ticket senza resolved).
- Per team cross-progetto, usare filtri su più project o custom field “team”.

---

### US09 - Salvataggio e caching metriche
**Come** sviluppatore
**Voglio** che le metriche calcolate possano essere salvate in database e riutilizzate
**Così che** si riducano le chiamate a JIRA e si migliori la performance

**Acceptance Criteria:**
- Le metriche possono essere salvate e invalidate su richiesta
- Se esistono metriche già calcolate e non scadute, vengono restituite senza nuova query JIRA
- L’utente può forzare un refresh dei dati

---

### US10 - Gestione errori e fallback
**Come** utente
**Voglio** ricevere messaggi chiari in caso di errori di integrazione o dati mancanti
**Così che** possa capire cosa non funziona e come agire

**Acceptance Criteria:**
- Se la connessione a JIRA fallisce, viene mostrato un messaggio d’errore
- Se non ci sono dati disponibili, la UI mostra uno stato vuoto/placeholder
- Tutti gli errori sono loggati lato backend

---

### US11 - Autenticazione locale in ambiente di sviluppo
**Come** sviluppatore
**Voglio** poter accedere all’applicazione in ambiente di sviluppo senza autenticazione Google oAuth
**Così che** possa testare e sviluppare le funzionalità usando un’utenza locale precaricata

**Acceptance Criteria:**
- Se l’ambiente è di sviluppo (es. NODE_ENV=development), l’autenticazione Google oAuth viene bypassata
- L’utente viene autenticato automaticamente con un account locale di test
- L’account locale ha permessi e dati coerenti con un utente reale
- In produzione, l’autenticazione Google oAuth è sempre attiva
