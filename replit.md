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

**Current Implementation**: PostgreSQL database via Drizzle ORM

**Key Features**:
- **Upsert Logic**: Meeting sync uses upsert operations to preserve manually enriched data (linked Google Docs) when re-syncing from Calendar
- **Score Deduplication**: Meeting scores are upserted to prevent duplicate entries and maintain data consistency
- **Input Validation**: All data validated using Zod schemas before storage operations
- **Database Tables**: users, sessions, meetings, meetingScores, challenges, achievements
- **Foreign Key Relationships**: meetings → users, meetingScores → meetings/users, challenges/achievements → users

**Database Schema**:
- Schema defined in `shared/schema.ts` using Drizzle's PostgreSQL table definitions
- Includes users, meetings, meetingScores, challenges, and achievements tables with proper foreign key relationships
- Zod schemas generated from Drizzle schemas for runtime validation
- Migration support configured via `drizzle.config.ts`

**Design Rationale**: PostgreSQL provides ACID compliance and relational integrity needed for user data and meeting analytics. Drizzle ORM was chosen for type safety and developer experience.

### Authentication and Authorization

**Current Implementation**: Replit Auth with OpenID Connect (OIDC)

**Authentication Flow**:
- OAuth 2.0 via Replit Connectors supporting Google, GitHub, X (Twitter), Apple, and email/password login
- Session-based authentication with PostgreSQL-backed session storage using `connect-pg-simple`
- Token refresh handling for long-lived sessions (1 week TTL)
- Protected API routes with `isAuthenticated` middleware that returns 401 for unauthorized requests

**Frontend Integration**:
- `useAuth` hook provides authentication state and user data
- Landing page shown to unauthenticated users with "Get Started" button
- Dashboard accessible only to authenticated users
- Logout functionality redirects to Replit's end session endpoint

**Security Features**:
- HTTP-only cookies prevent XSS attacks
- Secure cookies in production (HTTPS required)
- SameSite "lax" protection against CSRF
- Environment-aware cookie settings for development

**Design Rationale**: Replit Auth provides secure, managed authentication without requiring custom user/password management. Session-based approach with PostgreSQL storage ensures scalability and proper session lifecycle management.

### Scoring Algorithm

The meeting effectiveness score (0-100) is calculated from five weighted components, inspired by productivity and management principles from leading books:

1. **Agenda and Clarity Score (0-20)**: 
   - **Principles**: *Essentialism* (Greg McKeown) and *The ONE Thing* (Gary Keller)
   - Evaluates title specificity vs generic titles ("Meeting", "Sync", etc.)
   - Rewards focused agendas, penalizes too many unrelated topics (>5)
   - Bonus for specific titles over 20 characters
   - Based on agenda presence, length, and topic count

2. **Participants Score (0-20)**: 
   - Optimal range is 6-10 participants (20 points)
   - Penalties for too few (1-2: 10 pts) or too many (>15: 14 pts)
   - Balanced to allow effective discussion without dispersion

3. **Timing and Efficiency Score (0-20)**: 
   - **Principle**: *Deep Work* (Cal Newport) - protect time for focused work
   - Optimal: 31-60 minutes (20 points)
   - Heavy penalty for long meetings: >90 min (14 pts), >120 min (8 pts), >2h (5 pts)
   - Rationale: Long meetings "steal" Deep Work time and reduce productivity

4. **Actions and Accountability Score (0-20)**: 
   - **Principles**: *Le cinque disfunzioni del team* (Lencioni) and *The 12 Week Year* (Moran)
   - Base score from action count (6-10 actions optimal)
   - Bonus +3 points for accountability keywords ("assigned to", "owner", "responsible", "DRI")
   - Bonus +2 points for clear deadlines (dates, "by", "deadline", "due date")
   - Ensures meetings produce concrete results with clear ownership and timing

5. **Attention Score (0-20)**: 
   - Count of attention points/highlights in meeting notes
   - Keywords: "important", "critical", "decision", "blocker", "key point"
   - 3-5 points optimal (20 pts)

**Advanced Features**:
- **Title Analysis**: Detects and penalizes generic meeting titles
- **Topic Counting**: Identifies agenda items to enforce focus (The ONE Thing principle)
- **Accountability Detection**: Finds responsibility assignments in notes
- **Deadline Recognition**: Identifies dates and deadline keywords in multiple formats
- **Deep Work Protection**: Heavily penalizes meetings over 90 minutes

**Design Rationale**: The scoring integrates proven productivity principles to encourage effective meeting practices: clear focus (Essentialism), single priorities (The ONE Thing), time protection (Deep Work), accountability (Le cinque disfunzioni), and deadline-driven execution (The 12 Week Year). See `SCORING_CRITERIA.md` for detailed documentation.

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

## Recent Changes

### October 14, 2025 - Enhanced Scoring Algorithm
- ✅ **Productivity-Driven Scoring System**: Integrated principles from leading productivity books
  - *Essentialism* (McKeown): Penalizes generic titles, rewards specific focused objectives
  - *The ONE Thing* (Keller): Detects and penalizes agendas with too many unrelated topics (>5)
  - *Deep Work* (Newport): Heavy penalties for long meetings that "steal" deep work time (>90 min)
  - *The 12 Week Year* (Moran): Bonus points for clear deadlines in action items
  - *Le cinque disfunzioni* (Lencioni): Bonus points for accountability assignments
- ✅ **Advanced Text Analysis**:
  - Title specificity detection (generic vs specific meeting names)
  - Agenda topic counting to enforce focus
  - Accountability keyword detection ("assigned to", "owner", "responsible", "DRI")
  - Deadline recognition in multiple formats (dates, deadline keywords)
- ✅ **Enhanced Scoring Logic**:
  - Agenda score now evaluates title quality and topic count
  - Timing score heavily penalizes meetings >90 minutes (Deep Work principle)
  - Actions score rewards accountability (+3 pts) and deadlines (+2 pts)
- ✅ **Documentation**: Created comprehensive `SCORING_CRITERIA.md` with examples and improvement tips

### October 13, 2025 - Core Functionality
- ✅ Full Google Calendar integration with OAuth via Replit Connectors
- ✅ Google Docs integration for analyzing meeting notes
- ✅ Meeting scoring algorithm implementation (5 criteria, 100 points total)
- ✅ Frontend dashboard with trend visualization and score breakdown
- ✅ Manual Google Doc linking capability for enriching meeting scores
- ✅ Gamification system with weekly challenges and achievements
- ✅ **Authentication system with Replit Auth** (OpenID Connect)
  - Multi-provider OAuth support (Google, GitHub, X, Apple, email/password)
  - PostgreSQL session storage with 1-week TTL
  - Protected API routes with authentication middleware
  - Landing page for logged-out users
  - User profile with logout functionality

### Gamification System
- **Weekly Challenges**: Automatically generated based on user's weakest scoring criteria (agenda, participants, timing, actions, or attention)
- **Challenge Progress**: Real-time tracking of meeting quality improvements with progress bars
- **Anti-Double-Counting**: Robust mechanism using `countedMeetingIds` array to prevent inflated progress on meeting re-syncs
- **Achievement System**: Unlock badges for completing challenges, with streak tracking and level progression
- **UI Components**: `WeeklyChallengeCard` displays current challenge with visual progress; `AchievementsList` shows earned badges
- **Challenge Logic**: Targets 80% success rate across at least 5 meetings; criteria score must be ≥15/20 (75%) to count as "passed"

### Bug Fixes and Improvements
- Fixed API client to use correct parameter order (method, url, data) for POST requests
- Implemented upsert logic to preserve enriched meeting data during re-sync
- Added score deduplication to prevent duplicate score records
- Added comprehensive input validation using Zod schemas
- Fixed challenge progress double-counting by tracking which meetings have already contributed to current challenge
- Verified end-to-end workflow from sync to scoring to display

### Testing
- Successfully tested full user workflow including:
  - Meeting sync from Google Calendar
  - Score calculation and display
  - Meeting card expansion with score breakdown
  - Manual Google Doc linking dialog
  - Date range filtering (Today, 7 Days, 30 Days)
  - Trend chart visualization
  - Weekly challenge generation and progress tracking
  - Achievement unlocking system