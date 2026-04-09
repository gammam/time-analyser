# DORA Dashboard — Feature Knowledge Base

Questa cartella raccoglie tutta la documentazione relativa alla feature "Dashboard DORA Metrics per Team".

## Indice dei documenti

- [PRD — Product Requirements Document](prd.md)
- [User Stories — UI](ui-userstories.md)
- [User Stories — Backend & Integration](backend-userstories.md)
- [Sprint Plan](sprint-plan.md)
- [Guida step-by-step: Autenticazione locale in dev](auth-locale-dev-stepbystep.md)

## Vedi anche
- [Best Practices & Shared Knowledge](../best-practices/README.md)

## Descrizione

La dashboard DORA consente di visualizzare e analizzare le metriche DevOps (Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR) per tutti i team, con dati estratti da JIRA e filtri temporali personalizzati. Tutti i documenti di analisi, progettazione, implementazione e test sono raccolti qui per garantire tracciabilità e onboarding rapido.

---

## 🔎 Come eseguire lo smoketest JIRA

Per verificare che il client JIRA funzioni correttamente con le credenziali per-utente:

1. Assicurati di aver salvato le credenziali JIRA per l’utente di test (vedi script set-local-jira-credentials.ts).
2. Esporta la variabile d’ambiente con l’ID utente:
	```sh
	export LOCAL_USER_ID="<id-utente>"
	```
3. Esegui lo script:
	```sh
	npx ts-node server/jira-client-smoketest.ts
	```
4. Dovresti vedere in output l’elenco dei progetti JIRA disponibili per quell’utente. In caso di errore, controlla le credenziali e i permessi.

Questo test garantisce che la connessione e la decifratura delle credenziali funzionino end-to-end.

> Aggiorna questo README ogni volta che aggiungi documentazione o modifichi la struttura della feature.
