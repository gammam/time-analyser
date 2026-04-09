# Report di Chiusura – US8 Deployment Frequency (DORA Metric)

**Story Key:** US8-deployment-frequency  
**Titolo:** Deployment Frequency (DORA Metric)  
**Epic:** Backend, API e Integrazione JIRA  
**Data completamento:** 2026-04-09

---

## Sommario
La user story US8 aveva l’obiettivo di implementare un endpoint REST che restituisse la metrica Deployment Frequency, filtrata per team e intervallo di date, secondo le specifiche DORA. Tutti i task di sviluppo, test e documentazione sono stati completati secondo le acceptance criteria e checklist definite.

---

## Risultati raggiunti
- Endpoint `/api/dora/deployment-frequency` aggiornato per accettare parametri `projectKey`, `team`, `from`, `to`.
- Logica di filtro su versioni JIRA (`released: true` e `releaseDate` nell’intervallo) implementata.
- Output conforme alla specifica, con esempio di risposta documentato.
- Gestione robusta di errori e casi limite.
- Test automatici creati per validazione parametri e casi limite.
- Documentazione tecnica aggiornata (README, story file).

---

## Esempio di chiamata e risposta
**Richiesta:**
```
GET /api/dora/deployment-frequency?projectKey=PROJ&from=2026-01-01&to=2026-01-31
```
**Risposta:**
```json
{
  "team": null,
  "projectKey": "PROJ",
  "from": "2026-01-01",
  "to": "2026-01-31",
  "deploymentFrequency": 4
}
```

---

## Note di completamento
- Tutti i task di sviluppo e checklist risultano completati.
- La metrica è ora calcolata e aggregata secondo le best practice DORA.
- La story può essere archiviata come "done".

---

**Responsabile:** mario
**Data:** 2026-04-09
