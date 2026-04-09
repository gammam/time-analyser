---
title: Architettura DORA Dashboard
feature: DORA Dashboard Metrics per Team
status: draft
created: 2026-04-08
last_updated: 2026-04-08
stepsCompleted: [1]
source_prd: ../../core-knowledge/features/dora-dashboard/prd.md
---

# Architettura DORA Dashboard

## Contesto e Obiettivo
La DORA Dashboard consente agli Engineering Manager di visualizzare le metriche DORA (Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR) per tutti i team, calcolate dinamicamente dai dati JIRA e filtrabili per intervallo temporale. L’obiettivo è fornire una vista chiara e aggiornata delle performance DevOps, con filtri per team e periodo, e garantire sicurezza, modularità e performance.

## Input di Progetto (estratti dal PRD)
- Integrazione sicura con JIRA (API token/configurazione per utente)
- Autenticazione tramite Google oAuth
- Calcolo metriche secondo logica DORA standard
- Endpoint API REST per metriche filtrate per team/data
- UI intuitiva per selezione team/data e visualizzazione risultati
- Supporto multi-team e filtri temporali personalizzati
- Performance e sicurezza come requisiti non funzionali
- Modularità e estendibilità per nuove metriche

## Prossimi Passi
- Raccolta vincoli tecnici e domande chiave
- Definizione pattern architetturali e componenti principali
- Identificazione punti critici e rischi

## Sintesi Architetturale Basata sullo Stack Attuale

**Backend**
- Node.js + Express (TypeScript): API REST sicure, gestione autenticazione (Google oAuth), sessioni persistenti, logica di calcolo DORA e aggregazione dati.
- Integrazione JIRA tramite libreria jira.js e chiamate REST v3, autenticazione per-utente, nessun dato sensibile esposto al frontend.
- Drizzle ORM per accesso e migrazione dati su PostgreSQL.
- Validazione dati con Zod, testing con Jest.

**Frontend**
- React 18 (SPA) con Vite, UI moderna e reattiva.
- Radix UI per componenti accessibili, Tailwind CSS per styling, React Query per gestione dati asincroni.
- Visualizzazione metriche tramite Recharts (grafici) e filtri dinamici (team, periodo).

**Database**
- PostgreSQL, schema gestito con Drizzle ORM e Drizzle Kit.
- Persistenza di metriche, utenti, sessioni e caching opzionale dei risultati DORA.

**Pattern Architetturali**
- Separazione netta client/server: frontend solo UI, backend tutta la logica di business e sicurezza.
- API REST come unico punto di accesso ai dati e alle metriche.
- Modularità: logica di calcolo e aggregazione separata dalla UI, facile estensione per nuove metriche.
- Sicurezza: nessun token o dato sensibile esposto al client, validazione e logging centralizzati.

**Componenti Chiave**
- server/routes.ts: definizione endpoint REST e orchestrazione flusso dati.
- server/jira-client.ts: integrazione e fetch dati da JIRA.
- shared/schema.ts: definizione schema dati condiviso.
- client/src/: SPA React per dashboard, filtri e visualizzazione.

**Rischi e Punti Critici**
- Rate limit e performance API JIRA.
- Sicurezza gestione token e sessioni.
- Scalabilità su dataset ampi e multi-team.

---

---

> Conferma che il contesto e gli obiettivi sono corretti o aggiungi dettagli/vincoli chiave prima di procedere allo step successivo dell’architettura.
