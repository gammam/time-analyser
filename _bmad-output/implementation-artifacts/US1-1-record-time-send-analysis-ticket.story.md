---
title: Story 1.1 - Record Time in SEND Analysis Ticket
created: 2026-04-20
last_updated: 2026-04-20
status: draft
sourceEpic: Cost Analyze Reporting
sourceStory: 1.1
inputDocuments:
  - epics.md
  - prd.md
  - cost-analyze-architecture.md
  - project-context.md
  - ux-design-specification.md
---

# Story 1.1: Record Time in SEND Analysis Ticket

## Context
This story is part of the Cost Analyze Reporting epic. The goal is to extract and map time spent from SEND Analysis Tickets (child issues) linked to each Jira Epic, so that hours per team member and Epic can be accurately reported.

## User Story
As a backend service,
I want to extract time spent from SEND Analysis Tickets linked to each Epic,
So that I can accurately report hours per team member and Epic.

## Acceptance Criteria
- Given a Jira Epic with SEND Analysis Tickets, when the backend queries Jira, then it retrieves all relevant worklog/time data per team member.
- Data is mapped to the correct Epic and user.

## Implementation Tasks
1. **Jira API Integration**
   - Implement secure connection to Jira REST API using user-specific credentials.
   - Write a function to query all Epics within the selected time range.
   - For each Epic, query for child issues of type SEND Analysis Ticket.
2. **Worklog Extraction**
   - For each SEND Analysis Ticket, extract worklog or custom time fields per team member.
   - Normalize and validate time data (handle missing or malformed entries).
3. **Data Mapping**
   - Map extracted time data to the corresponding Epic and user.
   - Structure the data for aggregation (Epic ID, Epic Name, Team Member, Hours).
4. **Error Handling & Logging**
   - Handle Jira API errors, missing tickets, or permission issues gracefully.
   - Log errors securely without exposing sensitive data.
5. **Unit Tests**
   - Write tests for Jira query logic, data extraction, and mapping functions.
   - Mock Jira API responses for edge cases (no SEND tickets, incomplete worklogs, etc.).
6. **Documentation**
   - Document the API contract, data structures, and configuration required for Jira integration.

## Notes & Constraints
- Use existing backend stack (Node.js/Express, TypeScript).
- All Jira credentials/tokens must be stored and used securely (never exposed to frontend).
- Follow project conventions for error handling and logging.
- Ensure code is modular and testable for future extension.

## Open Questions
- Are there custom fields in SEND Analysis Tickets for time, or only standard worklogs?
- Should the system support aggregation across multiple Jira projects?
- What is the expected maximum number of Epics and SEND tickets per query?
