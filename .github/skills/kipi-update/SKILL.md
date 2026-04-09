---
name: kipi-update
description: "Invoke to trigger a Kipi knowledge update after code changes. Use when: code was just changed, a feature was added, a bug was fixed, and docs need to be synced. Any agent can invoke this skill after making modifications."
---

# Kipi Update Skill

Use this skill immediately after making code changes to keep the `core-knowledge/` documentation in sync.

## When to Invoke

Invoke this skill after:
- Modifying server routes, auth logic, database schema, or business logic
- Adding or removing features
- Changing environment configuration or setup steps
- Fixing bugs that affect documented behavior

## Steps

1. **Summarize what changed**
   Briefly describe the files modified and the nature of the change (new feature, bugfix, refactor, config update).

2. **Identify affected chapters**
   Map the change to one or more `core-knowledge/` chapters:
   | Changed area | Chapter |
   |---|---|
   | `server/replitAuth.ts`, `server/routes.ts` | `02-auth` |
   | `shared/schema.ts`, `server/storage.ts`, `server/db.ts` | `03-database` |
   | `server/routes.ts` | `04-api-routes` |
   | `server/scoring.ts` | `05-scoring-engine` |
   | `server/google-*.ts` | `06-google-integration` |
   | `server/jira-client.ts`, `server/capacity-calculator.ts` | `07-jira-integration` |
   | `server/gamification.ts` | `08-gamification` |
   | `client/src/**` | `09-frontend` |
   | `.env`, `package.json`, `drizzle.config.ts` | `10-dev-setup` |

3. **Propose doc updates**
   For each affected chapter, quote the specific section(s) to update and show the proposed new content. Do not write yet.

4. **Wait for user approval**

5. **Apply approved updates**
   Edit only the approved sections. Bump the `Last updated` date in the chapter header.

6. **Update workflow-state.json**
   Record the update in `core-knowledge/workflow-state.json`.

## Output Format

After invoking this skill, return a summary:
```
✅ Kipi Update Complete
Chapters updated: [list]
Sections changed: [count]
Next recommended action: Run [5] Status to review overall coverage.
```
