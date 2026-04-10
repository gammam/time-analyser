## 📈 Deployment Frequency (DORA Metric)

L’endpoint REST `/api/dora/deployment-frequency` restituisce la metrica Deployment Frequency filtrata per team e intervallo di date.

**Parametri:**
- `projectKey` (obbligatorio)
- `team` (opzionale)
- `from` (opzionale, ISO 8601)
- `to` (opzionale, ISO 8601)

**Output:**
```json
{
   "team": "TeamA",
   "projectKey": "PROJ",
   "from": "2026-04-01",
   "to": "2026-04-08",
   "deploymentFrequency": 3
}
```

**Formula:**
Numero di versioni rilasciate (`released: true` e `releaseDate` valorizzato) nell’intervallo [`from`, `to`].

**Esempio di chiamata:**
```
GET /api/dora/deployment-frequency?projectKey=PROJ&from=2026-04-01&to=2026-04-08
```

**Gestione errori:**
- 400 se mancano parametri obbligatori o date non valide
- 401/404/500 per errori autenticazione, projectKey errato, errori JIRA

## 🚨 Change Failure Rate (DORA + SEND)

L'endpoint REST `/api/dora/change-failure-rate` restituisce due metriche:
- `dora`: change failure rate su tutte le release nel periodo.
- `send`: change failure rate su sole release GA/HOTFIX nel periodo.

**Parametri:**
- `projectKey` (obbligatorio)
- `team` (opzionale)
- `from` (opzionale, ISO 8601)
- `to` (opzionale, ISO 8601)

**Formula:**
- `dora.changeFailureRate = failedDeployments / totalDeployments * 100`
- `send.changeFailureRate = failedDeployments / totalDeployments * 100` (solo su release GA/HOTFIX)

**Regole di calcolo:**
- Denominatore DORA: tutte le release con `released: true` e `releaseDate` valorizzato nell'intervallo.
- Denominatore SEND: subset delle release DORA con nome che inizia con `GA` o contiene `HOTFIX` (case-insensitive).
- Numeratore: release con almeno un issue Jira di tipo `[SEND] Bug Prod` mappato tramite `Affects Version/s`.
- Numeratore SEND: release GA/HOTFIX con almeno un `[SEND] Bug Prod` associato.
- Se `totalDeployments = 0`, `changeFailureRate = null`.

**Campi Jira usati:**
- Release/versioni: `id`, `name`, `released`, `releaseDate`, `archived`
- Failure issues: `key`, `fields.summary`, `fields.created`, `fields.issuetype`, `fields.versions`, `fields.affectedVersions`

**Output esempio:**
```json
{
   "team": "TeamA",
   "projectKey": "PROJ",
   "from": "2026-03-01",
   "to": "2026-03-31",
   "dora": {
      "totalDeployments": 5,
      "failedDeployments": 2,
      "changeFailureRate": 40
   },
   "send": {
      "totalDeployments": 3,
      "failedDeployments": 2,
      "hotfixReleases": 1,
      "changeFailureRate": 33.33
   },
   "releases": [
      {
         "id": "10010",
         "name": "GA.1.4.0",
         "releaseDate": "2026-03-05",
         "isGaRelease": true,
         "isHotfixRelease": false,
         "failureCount": 1,
         "failureIssues": [
            { "key": "PROJ-101", "issueType": "[SEND] Bug Prod", "created": "2026-03-06" }
         ]
      }
   ],
   "unmappedFailures": [
      {
         "key": "PROJ-130",
         "summary": "Production issue without version mapping",
         "created": "2026-03-28",
         "reason": "No Affects Version/s value found"
      }
   ]
}
```

**Esempio chiamata:**
```
GET /api/dora/change-failure-rate?projectKey=PROJ&from=2026-03-01&to=2026-03-31
```

**Gestione errori:**
- 400 se `projectKey` manca o date non valide
- 401 per credenziali JIRA non valide
- 404 per `projectKey` non trovato
- 500 per errori interni/JIRA non classificati

## 🛠️ Mean Time to Restore (MTTR) — SEND Prod BUG

L'endpoint REST `/api/dora/mean-time-to-restore` calcola il tempo medio di ripristino dei bug di produzione SEND.

**Parametri:**
- `projectKey` (obbligatorio)
- `team` (opzionale)
- `from` (opzionale, ISO 8601)
- `to` (opzionale, ISO 8601)

**Formula:**
- `restoreHours = (resolutionDate - created) in ore`
- `mttrHours = media(restoreHours)`

**Regole di calcolo:**
- Scope esclusivo: issue Jira con `issuetype = "[SEND] Bug Prod"`.
- Le issue senza `resolutiondate` sono escluse dal calcolo e riportate in `skippedIssues`.
- Se non ci sono issue risolte nel periodo, `mttrHours = null`.
- Percentili `p50Hours` e `p90Hours` calcolati sulle sole issue risolte.

**Campi Jira usati:**
- `key`
- `fields.summary`
- `fields.created`
- `fields.resolutiondate`
- `fields.issuetype`
- `fields.status`

**Output esempio:**
```json
{
   "team": "TeamA",
   "projectKey": "PN",
   "from": "2026-03-01",
   "to": "2026-03-31",
   "mttrHours": 18.25,
   "p50Hours": 12,
   "p90Hours": 36,
   "totalIncidents": 8,
   "resolvedIncidents": 6,
   "unresolvedIncidents": 2,
   "issues": [
      {
         "key": "PN-19053",
         "summary": "Errore in produzione su recapito",
         "created": "2026-03-19T10:23:28.776+0100",
         "resolutionDate": "2026-03-20T09:10:00.000+0100",
         "restoreHours": 22.78,
         "issueType": "[SEND] Bug Prod",
         "status": "Done"
      }
   ],
   "skippedIssues": [
      {
         "key": "PN-19299",
         "summary": "Bug ancora aperto",
         "created": "2026-03-30T11:02:10.111+0100",
         "reason": "Missing resolutiondate"
      }
   ]
}
```

**Esempio chiamata:**
```
GET /api/dora/mean-time-to-restore?projectKey=PROJ&from=2026-03-01&to=2026-03-31
```

**Gestione errori:**
- 400 se `projectKey` manca o date non valide
- 401 per credenziali JIRA non valide
- 404 per `projectKey` non trovato
- 500 per errori interni/JIRA non classificati

# ProdBuddy

Your friendly productivity assistant that evaluates meeting effectiveness and predicts JIRA task completion based on available time and context switching overhead.

## 🎯 Overview

ProdBuddy is a full-stack TypeScript application designed to help teams improve their meeting habits and manage workload more effectively. It combines:

- **Meeting Effectiveness Scoring** (0-100 points) based on productivity principles
- **Google Calendar & Docs Integration** for automated data syncing and note analysis
- **JIRA Task Prediction System** to forecast task completion based on daily capacity
- **Gamification** through challenges and achievements
- **Dark Mode Support** for comfortable viewing

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- React Hook Form + Zod for validation

**Backend:**
- Express.js + TypeScript
- PostgreSQL (Neon) via Drizzle ORM
- Replit Auth (OIDC) for authentication
- Google Calendar & Docs APIs
- JIRA REST API v3

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── lib/           # API client & utilities
│   │   └── hooks/         # Custom React hooks
├── server/                # Express backend
│   ├── routes.ts          # API endpoints
│   ├── scoring.ts         # Meeting scoring engine
│   ├── storage.ts         # Database layer
│   ├── capacity-calculator.ts  # Task prediction logic
│   └── jira-client.ts     # JIRA API integration
└── shared/                # Shared types & schema
    └── schema.ts          # Database schema & Zod validation
```

## 📊 Meeting Scoring System

The application calculates meeting effectiveness on a scale of **0-100 points** using five weighted components, each contributing a maximum of 20 points. The scoring algorithm is inspired by productivity principles from leading management and efficiency books.

### Scoring Components

#### 1. Agenda and Clarity (0-20 points)

Evaluates meeting preparation and focus based on **"Essentialism"** and **"The ONE Thing"** principles.

**Scoring Logic:**
- **No agenda:** 0-5 points
  - Generic title (e.g., "sync", "catch up"): 0 points
  - Specific title: 5 points
- **Short agenda (< 50 chars):** 8 points
- **Moderate agenda (50-150 chars):** 15 points
- **Detailed agenda (150-300 chars):** 20 points
- **Verbose agenda (> 300 chars):** 18 points (penalty for over-complexity)

**Bonuses & Penalties:**
- **+3 points:** Specific, descriptive title (≥20 chars, non-generic)
- **-5 points:** > 5 agenda topics (violates focus principle)

**Detection Criteria:**
- Keywords: "agenda", "topics", "discussion points", "objectives", "goals"
- Bullet points or numbered lists
- 3+ distinct lines

**Reference:** *"Essentialism: The Disciplined Pursuit of Less"* by Greg McKeown emphasizes clarity and focus; *"The ONE Thing"* by Gary Keller advocates for singular focus.

#### 2. Participants (0-20 points)

Optimal team size based on communication efficiency research.

**Scoring Logic:**
- **0 participants:** 0 points
- **1-2 participants:** 10 points
- **3-5 participants:** 16 points
- **6-10 participants:** 20 points (optimal range)
- **11-15 participants:** 18 points
- **16+ participants:** 14 points

**Principle:** Smaller, focused groups are more effective. The "two-pizza team" rule suggests 6-10 is ideal for decision-making.

#### 3. Timing and Efficiency (0-20 points)

Evaluates duration to protect deep work time, inspired by **"Deep Work"** by Cal Newport.

**Scoring Logic:**
- **0 minutes:** 0 points
- **1-15 minutes:** 12 points (too short to be effective)
- **16-30 minutes:** 18 points (respects people's time)
- **31-60 minutes:** 20 points (optimal for deep discussion)
- **61-90 minutes:** 14 points (starts stealing deep work time)
- **91-120 minutes:** 8 points (significant productivity disruption)
- **120+ minutes:** 5 points (excessive, major productivity drain)

**Reference:** *"Deep Work"* emphasizes protecting large blocks of uninterrupted time for cognitively demanding work.

#### 4. Actions and Accountability (0-20 points)

Measures actionable outcomes based on **"The Five Dysfunctions of a Team"** (accountability) and **"The 12 Week Year"** (deadlines).

**Base Scoring:**
- **0 action items:** 5 points (baseline for discussion meetings)
- **1-2 action items:** 12 points
- **3-5 action items:** 18 points
- **6-10 action items:** 20 points
- **11+ action items:** 16 points (possibly unfocused)

**Bonuses:**
- **+3 points:** Has accountability keywords (capped at 20 total)
  - Keywords: "assigned to", "owner", "responsible", "accountability", "DRI", "who will"
- **+2 points:** Has clear deadlines (capped at 20 total)
  - Patterns: "by", "deadline", "due date", "before", "until", date formats

**Detection Logic:**
- Action keywords: "action", "todo", "task", "follow up", "next steps", "assigned to"
- Deadline patterns: word boundaries + date patterns (MM/DD/YYYY, YYYY-MM-DD, "Jan 15", etc.)

**Reference:** *"The Five Dysfunctions of a Team"* by Patrick Lencioni emphasizes accountability; *"The 12 Week Year"* by Brian Moran stresses deadline-driven execution.

#### 5. Attention and Key Points (0-20 points)

Identifies important takeaways and decisions from meeting notes.

**Scoring Logic:**
- **0 attention points:** 8 points
- **1-2 attention points:** 14 points
- **3-5 attention points:** 20 points (optimal)
- **6-8 attention points:** 18 points
- **9+ attention points:** 16 points

**Detection Keywords:**
- "important", "note", "attention", "critical", "key point", "decision", "blocker"

### Total Score Calculation

```typescript
totalScore = agendaScore + participantsScore + timingScore + actionsScore + attentionScore
```

**Score Range:** 0-100 points

**Interpretation:**
- **80-100:** Excellent meeting effectiveness
- **60-79:** Good, with room for improvement
- **40-59:** Average, needs attention
- **0-39:** Poor, significant improvements needed

### Example Scoring

**High-Quality Meeting:**
```
Title: "Q4 Product Roadmap Review - Feature Prioritization"
Participants: 7
Duration: 45 minutes
Agenda: Detailed agenda with 4 topics
Actions: 5 action items with owners and deadlines
Notes: 4 key decisions documented

Scores:
- Agenda: 20 (detailed + specific title)
- Participants: 20 (optimal size)
- Timing: 20 (optimal duration)
- Actions: 20 (good actions + accountability + deadlines)
- Attention: 20 (key points captured)
Total: 100 points
```

**Low-Quality Meeting:**
```
Title: "Weekly Sync"
Participants: 3
Duration: 75 minutes
Agenda: None
Actions: 0
Notes: General discussion, no specific outcomes

Scores:
- Agenda: 0 (generic title, no agenda)
- Participants: 16 (acceptable size)
- Timing: 14 (too long)
- Actions: 5 (baseline, no actions)
- Attention: 8 (no key points)
Total: 43 points
```

## 🔮 JIRA Task Prediction

The system predicts task completion based on:

1. **Daily Capacity Calculation**
   - Total work hours (default: 8h/day)
   - Meeting time (from Google Calendar)
   - Context switching overhead (~20 min per task)

2. **Weekly Prediction Algorithm**
   - Available hours across the week
   - Task estimates and priorities
   - Completion probability (0-100%)
   - Risk levels: Low, Medium, High

3. **Smart Scheduling**
   - Prioritizes by JIRA priority and due date
   - Accounts for context switching between tasks
   - Provides estimated completion dates

## 🎮 Gamification

- **Weekly Challenges:** Auto-generated based on weakest scoring criteria
- **Achievement System:** Unlock badges and track streaks
- **Progress Tracking:** Real-time updates on challenge completion

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google Cloud Project with Calendar & Docs APIs enabled
- JIRA account with API access

### Environment Variables

Create or configure these secrets in Replit:

```bash
# Database
DATABASE_URL=<your-postgres-connection-string>

# Session
SESSION_SECRET=<random-secret-key>

# JIRA Configuration
JIRA_EMAIL=<your-jira-email>
JIRA_API_TOKEN=<your-jira-api-token>
JIRA_JQL_QUERY=type IN (Task) and assignee = currentUser() and statusCategory != Done order BY type DESC
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run db:push
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📝 Configuration

### Customizing JQL Query

Update the `JIRA_JQL_QUERY` secret to filter tasks according to your needs:

**Examples:**
```jql
# Only high-priority tasks
type IN (Task, Bug) and assignee = currentUser() and priority = High and statusCategory != Done

# Tasks due this month
type IN (Task) and assignee = currentUser() and due >= startOfMonth() and statusCategory != Done

# Specific project tasks
project = MYPROJ and assignee = currentUser() and statusCategory != Done
```

### Work Hours & Context Switching

Configure in the Settings page:
- Daily work hours (default: 8)
- Context switching time per task (default: 20 minutes)

## 🔗 API Endpoints

### Meetings
- `GET /api/meetings` - List user's meetings
- `POST /api/meetings/sync` - Sync from Google Calendar
- `GET /api/stats` - Get meeting statistics

### Tasks
- `GET /api/jira/tasks` - List JIRA tasks
- `POST /api/jira/sync` - Sync from JIRA
- `POST /api/tasks/predict` - Generate weekly predictions
- `GET /api/tasks/predictions` - Get task predictions


### DORA Metrics

- `GET /api/dora/deployment-frequency?projectKey=PN` — Deployment Frequency (vedi sopra)
- `GET /api/dora/lead-time-epic?projectKey=PN` — Lead Time for Changes (Epic)

#### Lead Time for Changes (Epic)

Calcola il tempo medio (in giorni) tra la creazione e il rilascio in produzione delle epiche di sviluppo JIRA, con possibilità di filtro per team e periodo.

**Parametri:**
- `projectKey` (obbligatorio)
- `team` (opzionale)
- `from` (opzionale, ISO 8601)
- `to` (opzionale, ISO 8601)

**Esempio di chiamata:**
```
GET /api/dora/lead-time-epic?projectKey=PROJ&from=2026-01-01&to=2026-03-31
```


**Esempio di risposta:**
```json
{
   "team": "TeamA",
   "projectKey": "PROJ",
   "from": "2026-01-01",
   "to": "2026-03-31",
   "meanLeadTimeDays": 12.5,
   "meanLeadTimeReadyForUAT": 8.2,
   "epics": [
      {
         "key": "EPIC-123",
         "summary": "Feature X",
         "created": "2026-01-10",
         "fixVersions": [
            { "id": "10001", "name": "Release 1.4.0", "releaseDate": "2026-01-25" }
         ],
         "releaseDate": "2026-01-25",
         "readyForUATDate": "2026-01-20",
         "leadTimeDays": 15,
         "leadTimeReadyForUAT": 10
      },
      {
         "key": "EPIC-124",
         "summary": "Feature Y",
         "created": "2026-02-01",
         "fixVersions": [
            { "id": "10002", "name": "Release 1.5.0", "releaseDate": "2026-02-10" }
         ],
         "releaseDate": "2026-02-10",
         "readyForUATDate": null,
         "leadTimeDays": 9,
         "leadTimeReadyForUAT": null
      }
   ],
   "skippedEpics": [
      {
         "key": "EPIC-125",
         "summary": "Feature Z",
         "created": "2026-03-01",
         "fixVersions": [],
         "releaseDate": null,
         "readyForUATDate": null,
         "reason": "Mancano releaseDate e transizione READY_FOR_UAT"
      }
   ]
}
```

**Nota:** Le epiche senza data di rilascio o transizione READY_FOR_UAT vengono escluse dal calcolo e segnalate nel campo `skippedEpics`.

**Come viene calcolato il lead time:**

L'endpoint interroga JIRA cercando tutte le issue di tipo `Epic` del progetto richiesto:

- `project = <projectKey> AND issuetype = Epic`
- filtro opzionale per `team`
- filtro opzionale su `created >= from`
- filtro opzionale su `created <= to`

Per ogni epic, il backend valuta due tempi distinti:

1. `leadTimeDays`
   - parte da `fields.created`
   - usa come data di rilascio `fields.fixVersions[0].releaseDate`
   - calcola la differenza in giorni interi tra creazione e rilascio

2. `leadTimeReadyForUAT`
   - parte da `fields.created`
   - cerca nel changelog la prima transizione di stato con:
     - `item.field === "status"`
     - `item.toString === "READY_FOR_UAT"`
   - usa `history.created` di quella transizione come `readyForUATDate`
   - calcola la differenza in giorni interi tra creazione e passaggio a READY_FOR_UAT

Le medie esposte in risposta sono:

- `meanLeadTimeDays`: media dei `leadTimeDays` disponibili
- `meanLeadTimeReadyForUAT`: media dei `leadTimeReadyForUAT` disponibili

Se un'epica non ha né `releaseDate` né una transizione `READY_FOR_UAT`, non entra nel calcolo delle medie e viene riportata in `skippedEpics`.

**Campi JIRA usati nella valutazione:**

- `key`: identificativo dell'epica, restituito nel payload finale
- `fields.summary`: titolo leggibile dell'epica
- `fields.created`: data di creazione, base di tutti i calcoli
- `fields.fixVersions`: elenco delle fix version associate all'epica
- `fields.fixVersions[0].releaseDate`: data di rilascio usata per `leadTimeDays`
- `changelog.histories[].created`: timestamp della transizione di stato
- `changelog.histories[].items[]`: elementi del changelog usati per identificare il passaggio a `READY_FOR_UAT`

In pratica, la metrica misura quanto tempo passa dall'apertura dell'epica al suo primo rilascio tracciato in `fixVersions`, e in parallelo quanto tempo passa fino a quando l'epica raggiunge lo stato `READY_FOR_UAT`.

**Gestione errori:**
- 400 se mancano parametri obbligatori o non validi
- 401/404/500 per errori autenticazione, projectKey errato, errori JIRA

**Specifica OpenAPI:**
La definizione dettagliata dell’endpoint è disponibile in [`docs/openapi.yaml`](docs/openapi.yaml), sezione `/api/dora/lead-time-epic`.

### Challenges & Achievements
- `GET /api/challenge/current` - Get current weekly challenge
- `GET /api/achievements` - List user achievements

## 📚 Documentation References

The scoring system is built on principles from:

1. **"Essentialism: The Disciplined Pursuit of Less"** - Greg McKeown
   - Focus on what's truly essential
   - Eliminate the trivial many

2. **"The ONE Thing"** - Gary Keller & Jay Papasan
   - Focus on singular priorities
   - Avoid multitasking

3. **"Deep Work"** - Cal Newport
   - Protect time for cognitively demanding work
   - Minimize interruptions and context switching

4. **"The Five Dysfunctions of a Team"** - Patrick Lencioni
   - Accountability for results
   - Clear ownership and responsibility

5. **"The 12 Week Year"** - Brian Moran & Michael Lennington
   - Deadline-driven execution
   - Short-term focus for long-term results

## 🤝 Contributing

This project uses:
- **TypeScript** for type safety
- **Drizzle ORM** for database operations (no manual migrations)
- **TanStack Query** for data fetching
- **Zod** for validation

## 📄 License

MIT

## 🙏 Acknowledgments

Built with modern web technologies and inspired by leading productivity and management literature.
