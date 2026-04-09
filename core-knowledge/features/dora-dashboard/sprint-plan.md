---
title: Sprint Plan - DORA Dashboard
status: draft
last_updated: 2026-04-03
---

# Sprint Plan - DORA Dashboard

## Obiettivo Sprint
Implementare la dashboard DORA Metrics per Team, con backend integrato JIRA, filtri, UI e autenticazione locale per sviluppo.

## Epics & User Stories
- Epic 1: UI/UX Dashboard DORA (vedi user stories UI)
- Epic 2: Backend/API/Integration (vedi user stories backend)

## Task Breakdown

### 1. Setup & Architettura
- [ ] **Definire struttura cartelle e naming convenzioni**
    - Aggiornare la struttura client/server se necessario
    - Documentare convenzioni in README
- [ ] **Aggiornare schema DB per caching metriche**
    - Aggiungere tabella `dora_metrics_cache` (team, periodo, metriche, timestamp)
    - Aggiornare Drizzle schema e migrazioni
- [ ] **Configurare autenticazione locale per sviluppo**
    - Implementare flag/env per bypass oAuth in dev
    - Precaricare utente di test con permessi admin

### 2. Backend/API
- [ ] **Implementare integrazione sicura con JIRA (US06)**
    - Gestire storage sicuro token JIRA per utente
    - Validare token e gestire errori di autenticazione
- [ ] **Calcolo metriche DORA lato backend (US07)**
    - Implementare funzioni per ciascuna metrica (DF, LT, CFR, MTTR)
    - Scrivere test unitari per logica di calcolo
- [ ] **Creare endpoint REST per metriche DORA (US08)**
    - Definire API: `/api/dora-metrics?team=...&from=...&to=...`
    - Gestire parametri, validazione e risposta JSON
- [ ] **Gestire salvataggio/caching metriche (US09)**
    - Scrivere logica di caching DB
    - Implementare invalidazione/refresh su richiesta
- [ ] **Gestione errori/fallback (US10)**
    - Gestire errori JIRA, dati mancanti, fallback a placeholder
    - Logging dettagliato lato server

### 3. Frontend/UI
- [ ] **Implementare filtri team/data (US01)**
    - Dropdown team, date picker/intervallo
    - Stato loading e gestione errori
- [ ] **Visualizzare card metriche DORA (US02)**
    - Card responsive, badge trend, tooltip
    - Animazione aggiornamento valori
- [ ] **Visualizzare grafico storico (US03)**
    - Adattare TrendChart per metriche DORA
    - Supporto multi-metrica e legenda
- [ ] **Esportazione CSV (US04)**
    - Pulsante export, generazione file da dati filtrati
- [ ] **Alert metriche critiche (US05)**
    - Badge/alert su card, soglia configurabile
    - Tooltip/descrizione alert

### 4. Testing & QA
- [ ] **Test unitari backend (API, calcolo metriche)**
    - Copertura edge case e errori
- [ ] **Test E2E flusso dashboard**
    - Simulare utente reale, mock dati JIRA
- [ ] **Verifica autenticazione locale in dev (US11)**
    - Test login automatico, permessi, dati demo

### 5. Documentazione
- [ ] **Aggiornare knowledge base e README**
    - Documentare endpoints, flusso utente, setup dev
- [ ] **Documentare API e flussi utente**
    - Esempi di chiamata, errori, formati risposta

### Dettaglio Calcolo Metriche DORA

#### Deployment Frequency (DF)
- Attributi JIRA usati: `Fix Version`, `status`, `resolutiondate`
- Logica: Conta il numero di versioni rilasciate (status = Released) nel periodo selezionato
- Query: JQL su Epic/Story con Fix Version rilasciata e resolutiondate nel range

#### Lead Time for Changes (LT)
- Attributi JIRA usati: `changelog` (transizioni di stato), `created`, `resolutiondate`
- Logica: Calcola la differenza tra la data di inizio sviluppo (`In Progress`/`DEV & TEST`) e la data di rilascio (`Done`/`DEPLOYED`)
- Query: JQL su Epic/Story, estrazione changelog, calcolo per ogni issue

#### Change Failure Rate (CFR)
- Attributi JIRA usati: `issueType` (Bug/Incident), `Affects Version/s`, `created`, `resolutiondate`
- Logica: (Numero di release con almeno 1 Bug/Incident associato) / (Numero totale release)
- Query: JQL su Bug/Incident creati in produzione, raggruppamento per versione

#### Mean Time To Recovery (MTTR)
- Attributi JIRA usati: `issueType` (Bug/Incident), `created`, `resolutiondate`, `status`
- Logica: Media del tempo tra apertura e risoluzione di Bug/Incident in produzione
- Query: JQL su Bug/Incident in produzione, calcolo differenza created-resolutiondate

#### Note operative
- Tutte le query devono essere filtrate per team/progetto e intervallo temporale
- Gli attributi custom (es. status workflow) vanno mappati secondo la configurazione JIRA del cliente
