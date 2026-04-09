---
title: User Stories - DORA Dashboard UI
status: draft
last_updated: 2026-04-03
---

# User Stories - DORA Dashboard UI

## Epic: Visualizzazione metriche DORA per team

### US01 - Selezione Team e Intervallo Temporale
**Come** Engineering Manager
**Voglio** selezionare un team e un intervallo di date dalla dashboard
**Così che** possa vedere le metriche DORA aggiornate per il periodo e il team scelto

**Acceptance Criteria:**
- È presente un dropdown per la selezione del team
- È presente un date picker/intervallo per la selezione delle date
- Al cambio di filtro, la dashboard si aggiorna automaticamente

---

### US02 - Visualizzazione Card Metriche DORA
**Come** Engineering Manager
**Voglio** vedere le metriche DORA (Deployment Frequency, Lead Time, CFR, MTTR) in formato card
**Così che** possa avere una panoramica immediata delle performance del team

**Acceptance Criteria:**
- Sono presenti 4 card, una per ogni metrica DORA
- Ogni card mostra valore, icona, badge trend e tooltip descrittivo
- Le card si aggiornano in base ai filtri selezionati

---

### US03 - Visualizzazione Grafico Storico
**Come** Engineering Manager
**Voglio** visualizzare un grafico dell’andamento delle metriche DORA nel tempo selezionato
**Così che** possa individuare trend e variazioni

**Acceptance Criteria:**
- È presente un grafico (line/bar chart) per le metriche selezionate
- Il grafico si aggiorna in base a team e intervallo scelto

---

### US04 - Esportazione Dati
**Come** Engineering Manager
**Voglio** poter esportare le metriche DORA in CSV
**Così che** possa analizzarle o condividerle offline

**Acceptance Criteria:**
- È presente un pulsante “Esporta CSV”
- Il file esportato rispetta i filtri attivi

---

### US05 - Alert Metriche Critiche
**Come** Engineering Manager
**Voglio** ricevere un alert/badge se una metrica scende sotto una soglia critica
**Così che** possa intervenire tempestivamente

**Acceptance Criteria:**
- Se una metrica è critica, la card mostra un badge/alert visivo
- La soglia è configurabile lato backend o impostata di default
