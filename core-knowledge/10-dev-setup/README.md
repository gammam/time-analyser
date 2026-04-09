# 10 — Dev Setup

> **Last updated**: 2026-04-02 | **Status**: ✅ complete
> **Source files**: `package.json`, `server/index.ts`, `drizzle.config.ts`, `vite.config.ts`, `tsconfig.json`, `server/replitAuth.ts`

## Summary

Guida completa per avviare ProdBuddy in ambiente locale. Il progetto è un monorepo TypeScript con frontend Vite e backend Express che vengono serviti dallo stesso processo Node in sviluppo. Non è richiesta alcuna autenticazione in locale: viene usato automaticamente un utente fake preimpostato.

## Table of Contents
- [Prerequisiti](#prerequisiti)
- [Variabili d'ambiente](#variabili-dambiente)
- [Setup database](#setup-database)
- [Avvio sviluppo](#avvio-sviluppo)
- [Script disponibili](#script-disponibili)
- [Configurazione porta](#configurazione-porta)
- [Autenticazione in locale](#autenticazione-in-locale)
- [Alias TypeScript](#alias-typescript)
- [Common Issues & Gotchas](#common-issues--gotchas)

## Prerequisiti

- **Node.js 20+** (testato con v23.9.0)
- **PostgreSQL** — locale via Docker o servizio cloud (es. Neon)
- **npm** (incluso con Node.js)

Docker one-liner per DB locale:
```bash
docker run --name dev-postgres -e POSTGRES_PASSWORD=devpass -p 5432:5432 -d postgres:15
```

## Variabili d'ambiente

Creare un file `.env` nella root del progetto con:

```env
# Database (obbligatoria)
DATABASE_URL=postgres://postgres:devpass@localhost:5432/postgres

# Session (obbligatoria)
SESSION_SECRET=dev-secret-key

# Porta server (opzionale, default: 3000)
PORT=3000

# Google OAuth (opzionale, solo per testare integrazione Google)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback

# JIRA (opzionale, solo per testare integrazione JIRA)
JIRA_EMAIL=your-jira-email@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_JQL_QUERY=type IN (Task) and assignee = currentUser() and statusCategory != Done order BY type DESC
```

> **Nota**: `dotenv/config` viene importato in cima a `server/index.ts`, quindi il file `.env` viene caricato automaticamente all'avvio.

## Setup database

Dopo aver configurato `DATABASE_URL`, creare tutte le tabelle con:

```bash
npm run db:push
```

Questo comando legge `shared/schema.ts` tramite `drizzle-kit` e applica lo schema al DB. La cartella `migrations/` verrà creata automaticamente.

> **Attenzione**: il session store ha `createTableIfMissing: true` per la tabella `sessions`, ma le altre tabelle (es. `users`) devono essere create prima tramite `db:push`.

## Avvio sviluppo

```bash
npm install       # installa dipendenze
npm run db:push   # crea tabelle nel DB (solo la prima volta)
npm run dev       # avvia server + frontend sulla stessa porta
```

L'app è disponibile su `http://localhost:3000` (o la porta configurata in `PORT`).

In sviluppo, Vite viene servito inline dal processo Express tramite `server/vite.ts`. Non è necessario un processo separato per il frontend.

## Script disponibili

| Script | Comando | Descrizione |
|--------|---------|-------------|
| `dev` | `NODE_ENV=development tsx server/index.ts` | Avvia server Express + Vite in development |
| `client` | `vite --config vite.config.ts --root client` | Avvia solo Vite (standalone) |
| `dev:all` | `npm-run-all --parallel dev client` | Avvia server e client in parallelo (alternativo) |
| `build` | `vite build && esbuild ...` | Build produzione frontend + backend |
| `start` | `node dist/index.js` | Avvia build di produzione |
| `check` | `tsc` | Type-check TypeScript (no emit) |
| `db:push` | `drizzle-kit push` | Applica schema al DB |

## Configurazione porta

La porta è configurabile via variabile d'ambiente `PORT`. Default: `3000`.

```typescript
// server/index.ts
const port = parseInt(process.env.PORT || '3000', 10);
server.listen(port, () => { log(`serving on port ${port}`); });
```

> **Gotcha macOS**: binding esplicito su `0.0.0.0` o `127.0.0.1` causa `ENOTSUP` su alcune versioni macOS. Il server ora ascolta senza host esplicito.

## Autenticazione in locale

**Non è richiesta alcuna autenticazione in ambiente di sviluppo.**

`server/replitAuth.ts` è configurato con `isLocalAuthBypassed() → true`. Il middleware `isAuthenticated` inietta automaticamente un utente fake in ogni request:

```typescript
const LOCAL_DEV_USER_ID = "local-dev-user";
// user fake: { id, email: "local@example.com", firstName: "Local", lastName: "Developer", hasCompletedOnboarding: 1 }
```

La route `/api/auth/user` restituisce questo utente direttamente senza query al DB.

Le route `/api/login`, `/api/callback`, `/api/logout` fanno redirect immediato a `/`.

> Per abilitare autenticazione reale in produzione, `isLocalAuthBypassed()` deve restituire `false` e la logica OIDC deve essere reintegrata.

## Alias TypeScript

Configurati in `tsconfig.json`:

| Alias | Percorso reale |
|-------|----------------|
| `@/*` | `client/src/*` |
| `@shared/*` | `shared/*` |
| `@assets/*` | `attached_assets/*` (via Vite) |

## Key Files

| File | Scopo |
|------|-------|
| `server/index.ts` | Entry point backend, carica dotenv, avvia Express e Vite |
| `package.json` | Script npm, dipendenze |
| `.env` | Variabili d'ambiente locali (non committare) |
| `drizzle.config.ts` | Config drizzle-kit per db:push |
| `shared/schema.ts` | Schema Drizzle — fonte di verità per tutte le tabelle |
| `server/replitAuth.ts` | Auth locale con utente fake |
| `vite.config.ts` | Config Vite + alias path |
| `tsconfig.json` | Config TypeScript con alias `@/` e `@shared/` |

## Common Issues & Gotchas

- **`ENOTSUP` sulla porta**: avviene su macOS con `host: "0.0.0.0"` o `host: "localhost"`. Soluzione: non passare il parametro `host`.
- **`EADDRINUSE`**: porta occupata. Liberarla con `lsof -tiTCP:<porta> -sTCP:LISTEN | xargs kill -9`.
- **`relation "sessions" does not exist`**: eseguire `npm run db:push`. Il flag `createTableIfMissing: true` non basta se le altre tabelle non esistono.
- **`DATABASE_URL must be set`**: il file `.env` non viene trovato. Verificare che esista nella root.
- **Porta 5000 bloccata su macOS**: riservata ad AirPlay Receiver. Usare porta `3000` o configurarne un'altra via `PORT`.
- **Redirect a Replit su "Get Started"**: non deve succedere — `isLocalAuthBypassed()` restituisce sempre `true`. Se accade, verificare che `NODE_ENV` non sia impostato a `production`.
