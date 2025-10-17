# ProdBuddy

## Overview

ProdBuddy is your friendly productivity assistant - a productivity dashboard application designed to evaluate and improve meeting effectiveness. It scores meetings based on factors like agenda quality, participant count, timing, action items, and attention points, integrating with Google Calendar and Google Docs to automate data syncing and note analysis. The application provides users with actionable insights into their meeting habits, supports gamification through challenges and achievements, and offers a JIRA task prediction system to help users manage their workload more effectively.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with **React and TypeScript** using **Vite**. It features a component-based architecture with **shadcn/ui** components based on Radix UI for accessibility and customization. Styling is managed with **Tailwind CSS**, supporting light/dark modes and a productivity-focused aesthetic. **TanStack Query** handles server state, caching, and API calls, while **Wouter** provides client-side routing. **React Hook Form** with **Zod** resolvers is used for form handling and validation.

**Key UI Components:**
- **DashboardHeader**: Main navigation with user avatar dropdown menu (Settings, Logout)
- **Settings Page**: User configuration for work hours and context switching parameters

### Backend

The backend uses **Express.js with TypeScript** and a REST API architecture. It includes API routes for meeting sync, retrieval, and analysis, and an abstract `IStorage` layer for data persistence. A dedicated **Scoring Engine** module calculates meeting effectiveness. **Google API integrations** for Calendar and Docs are handled through separate client modules with credential management. The system also includes a **JIRA Task Analysis System** that predicts task completion based on daily capacity, accounting for meeting times and context switching overhead.

### Data Storage

The application uses a **PostgreSQL database** via **Drizzle ORM**. Key features include upsert logic for meeting data and scores, Zod for input validation, and a schema defined for users, sessions, meetings, meetingScores, challenges, achievements, JIRA-related entities (`jiraTasks`, `dailyCapacities`, `taskPredictions`), and user settings. Migrations are managed via Drizzle.

**User Settings Table:**
- `userSettings`: Stores per-user configuration (dailyWorkHours, contextSwitchingMinutes)
- Validated with Zod constraints: dailyWorkHours (0.5-24), contextSwitchingMinutes (0-60 int)

### Authentication and Authorization

**Replit Auth with OpenID Connect (OIDC)** is used for authentication, supporting multiple OAuth providers. Session-based authentication is implemented with PostgreSQL-backed session storage. Protected API routes are secured with `isAuthenticated` middleware, and the frontend integrates an `useAuth` hook for managing user state. Security features include HTTP-only, secure, and SameSite "lax" cookies.

### Scoring Algorithm

Meeting effectiveness (0-100) is calculated based on five weighted components, incorporating principles from productivity books:

1.  **Agenda and Clarity (0-20)**: Rewards specific titles and focused agendas, penalizes generic titles and too many topics.
2.  **Participants (0-20)**: Optimal range 6-10 participants.
3.  **Timing and Efficiency (0-20)**: Optimal 31-60 minutes, heavily penalizes meetings over 90 minutes.
4.  **Actions and Accountability (0-20)**: Scores based on action items, with bonuses for accountability keywords and clear deadlines.
5.  **Attention (0-20)**: Based on identified attention points/highlights in meeting notes.

Advanced features include title analysis, topic counting, accountability detection, deadline recognition, and deep work protection.

### Gamification System

The system includes **Weekly Challenges** generated based on a user's weakest scoring criteria, with real-time progress tracking. An **Achievement System** allows users to unlock badges, track streaks, and level up.

## External Dependencies

### Third-Party Services

*   **Google Calendar API**: For syncing meeting events.
*   **Google Docs API**: For analyzing meeting notes.
*   **Replit Connectors**: Manages OAuth credentials and token refresh for Google and Atlassian services.
*   **JIRA (Atlassian)**: For syncing and analyzing user tasks.

### Key NPM Packages

**Frontend:**
*   `@tanstack/react-query`: Server state management.
*   `@radix-ui/*`: Accessible UI primitives.
*   `react-hook-form` + `@hookform/resolvers`: Form handling.
*   `zod`: Schema validation.
*   `tailwindcss`: CSS framework.
*   `recharts`: Data visualization.
*   `date-fns`: Date manipulation.

**Backend:**
*   `express`: Web server framework.
*   `drizzle-orm`: Type-safe ORM.
*   `@neondatabase/serverless`: PostgreSQL driver.
*   `googleapis`: Official Google API client.
*   `connect-pg-simple`: PostgreSQL session store.
*   `jira.js`: JIRA API client library.

**Build Tools:**
*   `vite`: Fast build tool and dev server.
*   `tsx`: TypeScript execution for development.
*   `esbuild`: Fast bundler for production server code.

### Database

*   **PostgreSQL via Neon Database**: Persistent storage for all application data, configured via `DATABASE_URL` and managed with Drizzle ORM migrations.