---
stepsCompleted:
  - step-01-validate-prerequisites
inputDocuments:
  - prd.md
---

# Cost Analyze - Epic Breakdown

## Overview

This document decomposes the requirements from the Cost Analyze PRD into actionable epics and stories for implementation.

## Requirements Inventory

### Functional Requirements
- For each Jira Epic, time spent is recorded in a child issue of type SEND Analysis Ticket.
- The system must aggregate and display the total hours spent per Epic and per team member.
- The report must be filterable by time range.
- Only authenticated users with Engineering Manager role can access this feature.
- Data must be fetched securely from Jira using user-specific credentials.

### Non-Functional Requirements
- Performance: Reports should generate in under 3 seconds for up to 100 Epics.
- Security: No sensitive Jira credentials or tokens are exposed in the frontend or logs.
- Usability: The report UI must be responsive and accessible on desktop and tablet.
- Extensibility: The solution should allow for future addition of new report types or export formats (e.g., CSV).

### Additional Requirements
- None specified beyond PRD.

### UX Design Requirements
- The report UI must be clear, responsive, and accessible.
- Table must show Epic Name, Epic ID, Team Member, Hours Spent, and total hours per Epic.

### FR Coverage Map
| FR | Epic(s) | Story(s) |
|----|---------|----------|
| Record time in SEND Analysis Ticket | 1 | 1.1 |
| Aggregate/display hours per Epic/member | 1 | 1.2 |
| Filter by time range | 1 | 1.3 |
| Authenticated access | 1 | 1.4 |
| Secure Jira data fetch | 1 | 1.5 |

## Epic List
1. Cost Analyze Reporting

## Epic 1: Cost Analyze Reporting

Goal: Enable Engineering Managers to generate and view time-spent reports per Epic and team member, filtered by time range, using secure Jira integration.

### Story 1.1: Record Time in SEND Analysis Ticket
As a backend service,
I want to extract time spent from SEND Analysis Tickets linked to each Epic,
So that I can accurately report hours per team member and Epic.

**Acceptance Criteria:**
- Given a Jira Epic with SEND Analysis Tickets, when the backend queries Jira, then it retrieves all relevant worklog/time data per team member.
- Data is mapped to the correct Epic and user.

### Story 1.2: Aggregate and Display Hours per Epic and Member
As an Engineering Manager,
I want to see a report that aggregates hours spent per Epic and per team member,
So that I can understand resource allocation and project costs.

**Acceptance Criteria:**
- Given a selected time range, when the report is generated, then it shows a table with Epic Name, Epic ID, Team Member, Hours Spent, and total hours per Epic.
- Totals are accurate and match Jira data.
- Show Epics with no costs

### Story 1.3: Filter Report by Time Range
As an Engineering Manager,
I want to filter the report by a custom time range,
So that I can analyze costs for specific periods.

**Acceptance Criteria:**
- Given a time range input, when the report is requested, then only Epics and SEND Analysis Tickets within that range are included.
- Date validation prevents invalid ranges.

### Story 1.4: Authenticated Access for Engineering Managers
As an Engineering Manager,
I want the report feature to be accessible only to authorized users,
So that sensitive project data is protected.

**Acceptance Criteria:**
- Only authenticated users with the Engineering Manager role can access the report page and API.
- Unauthorized access attempts are blocked and logged.

### Story 1.5: Secure Jira Data Fetch
As a backend service,
I want to fetch Jira data using secure, user-specific credentials,
So that no sensitive tokens are exposed and data privacy is maintained.

**Acceptance Criteria:**
- Jira API calls use per-user tokens stored securely on the backend.
- No credentials or tokens are sent to the frontend or logged.
- All API responses are sanitized for sensitive data.
