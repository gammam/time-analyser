# Meeting Trend Analyzer

A comprehensive productivity dashboard that evaluates meeting effectiveness and predicts JIRA task completion based on available time and context switching overhead.

## 🎯 Overview

Meeting Trend Analyzer is a full-stack TypeScript application designed to help teams improve their meeting habits and manage workload more effectively. It combines:

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
