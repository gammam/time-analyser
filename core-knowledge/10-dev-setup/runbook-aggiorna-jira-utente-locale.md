# Runbook: Aggiornare le credenziali JIRA dell'utente di test locale

Questa guida spiega come aggiornare le credenziali JIRA per l'utente di test locale nel database, utilizzando le variabili d'ambiente e lo script fornito.

## Prerequisiti
- Le seguenti variabili d'ambiente devono essere impostate (ad esempio in `.env` o esportate nel terminale):
  - `LOCAL_USER_ID` (es: `local-dev-user`)
  - `LOCAL_JIRA_EMAIL` (email JIRA valida)
  - `LOCAL_JIRA_API_TOKEN` (token API JIRA valido)
  - `LOCAL_JIRA_HOST` (opzionale, default: `https://pagopa.atlassian.net`)
  - `LOCAL_JIRA_ENCRYPTION_KEY` (la chiave di cifratura a 32 caratteri usata per l'utente)

## Passaggi

1. **Verifica/aggiorna le variabili d'ambiente**
   - Modifica il file `.env` oppure esporta le variabili nel terminale:
     ```sh
     export LOCAL_USER_ID=local-dev-user
     export LOCAL_JIRA_EMAIL=la-tua-email@esempio.com
     export LOCAL_JIRA_API_TOKEN=il-tuo-api-token
     export LOCAL_JIRA_HOST=https://pagopa.atlassian.net
     export LOCAL_JIRA_ENCRYPTION_KEY=la-tua-chiave-32-caratteri
     ```

2. **Modifica lo script di aggiornamento**
   - Apri `scripts/set-local-jira-credentials.ts` e assicurati che usi la chiave di cifratura per cifrare il token:
     ```typescript
     const encryptedToken = encryptJiraToken(jiraApiToken, process.env.LOCAL_JIRA_ENCRYPTION_KEY!);
     await storage.upsertUserSettings(userId, {
       jiraEmail,
       jiraApiToken: encryptedToken,
       jiraHost,
       jiraEncryptionKey: process.env.LOCAL_JIRA_ENCRYPTION_KEY,
     });
     ```

3. **Esegui lo script**
   - Dal terminale, lancia:
     ```sh
     npx ts-node ./scripts/set-local-jira-credentials.ts
     ```
   - Se tutto è corretto, vedrai un messaggio di conferma.

4. **Verifica**
   - Puoi lanciare lo smoketest per verificare che le credenziali siano correttamente aggiornate e funzionanti:
     ```sh
     npx ts-node ./server/jira-client-smoketest.ts
     ```

---

**Nota:**
- La chiave di cifratura deve essere la stessa usata per cifrare/decifrare il token JIRA dell'utente.
- Se cambi la chiave, aggiorna sia la variabile d'ambiente che il valore nel database tramite lo script.
