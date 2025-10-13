# Meeting Trend Analyzer

## Overview

The Meeting Trend Analyzer is a productivity dashboard application that analyzes meeting effectiveness by scoring them based on multiple factors including agenda quality, participant count, timing, action items, and attention points. The application integrates with Google Calendar and Google Docs to automatically sync meeting data and analyze meeting notes, providing users with insights into their meeting trends and effectiveness over time.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

The frontend follows a component-based architecture with clear separation of concerns:

- **UI Components**: Built using shadcn/ui components based on Radix UI primitives, providing accessible and customizable interface elements
- **Styling**: Tailwind CSS with custom design tokens following a "New York" style variant. The design system supports both light and dark modes with a productivity-focused aesthetic inspired by Linear, Notion, and Asana
- **State Management**: TanStack Query (React Query) handles server state, API calls, and caching with infinite stale time to minimize unnecessary refetches
- **Routing**: Wouter provides lightweight client-side routing
- **Form Handling**: React Hook Form with Zod resolvers for validation

**Design Rationale**: The component library approach allows for rapid UI development while maintaining consistency. The choice of shadcn/ui over a monolithic component library provides flexibility to customize components while benefiting from accessibility best practices through Radix UI.

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

The backend follows a simple REST API architecture:

- **API Routes**: Centralized in `server/routes.ts` handling meeting sync, retrieval, and analysis endpoints
- **Storage Layer**: Abstracted through an `IStorage` interface with an in-memory implementation (`MemStorage`), designed to be swappable with a database-backed implementation
- **Scoring Engine**: Separate module (`server/scoring.ts`) containing business logic for calculating meeting effectiveness scores based on configurable criteria
- **Google API Integration**: Separate client modules for Calendar and Docs APIs with credential management and token refresh handling

**Design Rationale**: The storage abstraction allows for easy migration from in-memory storage to a persistent database without changing business logic. Separating the scoring engine makes the algorithm testable and modifiable independently of API concerns.

### Data Storage

**Current Implementation**: In-memory storage using Maps for Users, Meetings, and Meeting Scores

**Key Features**:
- **Upsert Logic**: Meeting sync uses upsert operations to preserve manually enriched data (linked Google Docs) when re-syncing from Calendar
- **Score Deduplication**: Meeting scores are upserted to prevent duplicate entries and maintain data consistency
- **Input Validation**: All data validated using Zod schemas before storage operations

**Prepared for**: PostgreSQL via Drizzle ORM
- Schema defined in `shared/schema.ts` using Drizzle's PostgreSQL table definitions
- Includes users, meetings, and meetingScores tables with proper foreign key relationships
- Zod schemas generated from Drizzle schemas for runtime validation
- Migration support configured via `drizzle.config.ts`

**Design Rationale**: The in-memory storage serves as a development placeholder. The database schema is already defined to support seamless transition to PostgreSQL when persistence is needed. Drizzle ORM was chosen for type safety and developer experience.

### Authentication and Authorization

**Current State**: Placeholder authentication using a hardcoded "demo-user" ID

**Prepared for**: Session-based authentication
- `connect-pg-simple` package included for PostgreSQL session storage
- User schema includes username and password fields

**Design Rationale**: Authentication is intentionally simplified for initial development but the foundation is in place for proper user management.

### Scoring Algorithm

The meeting effectiveness score (0-100) is calculated from five weighted components:

1. **Agenda Score (0-20)**: Based on presence and length of meeting description/agenda
2. **Participants Score (0-20)**: Optimal range is 3-10 participants, with penalties for too few or too many
3. **Timing Score (0-20)**: Rewards meetings of 30-45 minutes, with reduced scores for very short or long meetings
4. **Actions Score (0-20)**: Based on count of action items found in linked Google Docs
5. **Attention Score (0-20)**: Based on count of attention points/highlights in meeting notes

**Design Rationale**: The multi-factor scoring provides nuanced assessment of meeting quality. Each factor is independently tunable, allowing for easy adjustments based on user feedback or organizational preferences.

## External Dependencies

### Third-Party Services

**Google Calendar API**
- Purpose: Syncs meeting events including title, description, time, and attendees
- Authentication: OAuth 2.0 via Replit Connectors
- Integration: `server/google-calendar.ts` handles credential management and API client creation

**Google Docs API**
- Purpose: Analyzes meeting notes for action items and attention points
- Authentication: OAuth 2.0 via Replit Connectors
- Integration: `server/google-docs.ts` handles credential management and API client creation

**Replit Connectors**
- Purpose: Manages OAuth credentials and token refresh for Google services
- Environment variables: Uses `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, and `WEB_REPL_RENEWAL` for authentication

### Key NPM Packages

**Frontend**
- `@tanstack/react-query`: Server state management and caching
- `@radix-ui/*`: Accessible UI primitive components
- `react-hook-form` + `@hookform/resolvers`: Form handling and validation
- `zod`: Schema validation shared between client and server
- `tailwindcss`: Utility-first CSS framework
- `recharts`: Data visualization for trend charts
- `date-fns`: Date manipulation and formatting

**Backend**
- `express`: Web server framework
- `drizzle-orm`: Type-safe ORM for database operations
- `@neondatabase/serverless`: PostgreSQL driver (serverless-compatible)
- `googleapis`: Official Google API client library
- `connect-pg-simple`: PostgreSQL session store (prepared for use)

**Build Tools**
- `vite`: Fast build tool and dev server with HMR
- `tsx`: TypeScript execution for development
- `esbuild`: Fast bundler for production server code

### Database

**PostgreSQL via Neon Database**
- Purpose: Persistent storage for users, meetings, and scores (prepared but not yet connected)
- Connection: Configured via `DATABASE_URL` environment variable
- Schema: Managed through Drizzle with migration support

**Design Rationale**: PostgreSQL provides ACID compliance and relational integrity needed for user data and meeting analytics. Neon's serverless architecture aligns with modern deployment patterns.

## Recent Changes (October 13, 2025)

### Core Functionality Completed
- ✅ Full Google Calendar integration with OAuth via Replit Connectors
- ✅ Google Docs integration for analyzing meeting notes
- ✅ Meeting scoring algorithm implementation (5 criteria, 100 points total)
- ✅ Frontend dashboard with trend visualization and score breakdown
- ✅ Manual Google Doc linking capability for enriching meeting scores

### Bug Fixes and Improvements
- Fixed API client to use correct parameter order (method, url, data) for POST requests
- Implemented upsert logic to preserve enriched meeting data during re-sync
- Added score deduplication to prevent duplicate score records
- Added comprehensive input validation using Zod schemas
- Verified end-to-end workflow from sync to scoring to display

### Testing
- Successfully tested full user workflow including:
  - Meeting sync from Google Calendar
  - Score calculation and display
  - Meeting card expansion with score breakdown
  - Manual Google Doc linking dialog
  - Date range filtering (Today, 7 Days, 30 Days)
  - Trend chart visualization