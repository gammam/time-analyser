---
title: Dashboard DORA Metrics per Team
status: draft
last_updated: 2026-04-03
---

# Product Requirements Document (PRD)

## Titolo
Dashboard DORA Metrics per Team (dati JIRA, filtro temporale)

## Obiettivo
Consentire agli utenti di visualizzare, nella web app, le metriche DORA (Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR) per tutti i team, calcolate dinamicamente dai dati JIRA e filtrabili per intervallo temporale scelto dall’utente.

## Utente Target
- Engineering Manager,che vogliono monitorare le performance DevOps dei propri team.

## Flusso Utente
1. L’utente accede alla dashboard DORA.
2. Seleziona il team e l’intervallo di date desiderato.
3. Visualizza le metriche DORA aggiornate (tabella/grafico).
4. Può cambiare filtro e vedere i dati aggiornati in tempo reale.

## Requisiti Funzionali
- Integrazione sicura con JIRA (API token/configurazione per utente).
- Autenticazione utente tramite Google oAuth
- Calcolo delle metriche secondo la logica DORA standard.
- Endpoint API REST per ottenere le metriche filtrate per team e data.
- UI intuitiva per selezione team/data e visualizzazione risultati.
- Supporto a più team e a filtri temporali personalizzati.

## Requisiti Non Funzionali
- Performance: risposta rapida anche su dataset ampi.
- Sicurezza: nessun dato sensibile esposto lato frontend.
- Modularità: logica di calcolo separata dalla UI.
- Estendibilità: possibilità di aggiungere nuove metriche in futuro.

## Casi d’Uso Extra (Nice to Have)
- Esportazione CSV delle metriche.
- salvataggio in database delle metriche calcolate, in questo caso non viene ri-eseguita la query lato JIRA. Eventualmente è possibile cancellare questo dato e richiedere un update diretto verso JIRA.
- Notifiche/alert se una metrica scende sotto una soglia.
- Visualizzazione trend storico.

## Acceptance Criteria
- L’utente può selezionare team e intervallo temporale.
- Le metriche DORA sono calcolate correttamente e visualizzate.
- I dati sono aggiornati in tempo reale al cambio filtro.
- Nessun dato sensibile viene esposto lato client.
