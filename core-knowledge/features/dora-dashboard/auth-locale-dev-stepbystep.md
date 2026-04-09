---
title: Guida step-by-step - Autenticazione locale in dev
status: draft
last_updated: 2026-04-03
---

# Guida step-by-step: Autenticazione locale in ambiente di sviluppo

## Obiettivo
Permettere l’accesso automatico con un utente demo quando l’app gira in ambiente di sviluppo, senza passare da Google oAuth.

## Step 0: Crea la nuova landing page per la feature
- Crea una nuova pagina React (es. `client/src/pages/DoraDashboard.tsx`)
- Aggiungi la route corrispondente nel router dell’app
- Inserisci un placeholder (es. titolo, descrizione, link a documentazione) per validare la navigazione
- Verifica che la pagina sia accessibile sia in dev che in prod

## Step 1: Identifica il punto di ingresso dell’autenticazione
- Individua dove viene gestito il login (es. server/google-oauth.ts, server/index.ts, middleware auth).

## Step 2: Aggiungi una variabile d’ambiente per la modalità dev
- Usa `NODE_ENV=development` o crea una variabile custom (es. `LOCAL_AUTH=true`).
- Aggiorna il file `.env` locale se necessario.

## Step 3: Implementa il bypass oAuth
- Se l’app è in dev, salta il redirect o il check Google oAuth.
- Inietta direttamente nel session store un oggetto utente demo (es. `{ id: 'demo', email: 'demo@local', role: 'admin' }`).
- Assicurati che tutte le route protette riconoscano l’utente demo come autenticato.

## Step 4: Precarica dati demo
- Se necessario, crea nel DB locale l’utente demo con permessi admin e dati coerenti.
- Popola eventuali dati di test (team, task, metriche) associati all’utente demo.

## Step 5: Testa il flusso
- Avvia l’app in dev (`npm run dev` o equivalente).
- Verifica che l’utente venga autenticato automaticamente e abbia accesso a tutte le funzionalità protette.
- Prova logout/login per assicurarti che il bypass funzioni solo in dev.

## Step 6: Documenta il comportamento
- Aggiorna README/knowledge base spiegando la differenza tra auth in dev e in prod.
- Specifica come cambiare utente demo o disabilitare il bypass.

## Note di sicurezza
- Il bypass deve essere attivo solo in ambiente di sviluppo!
- In produzione, Google oAuth deve essere sempre richiesto.

---

> Segui questi step per implementare e validare la user story “autenticazione locale in dev”.
