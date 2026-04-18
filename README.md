# EU ParlIQ

AI-powered Q&A over European Parliament committee reports and activity. Sibling of UK ParlIQ. MVP live at [eu-parliq-app-production.up.railway.app](https://eu-parliq-app-production.up.railway.app).

Lets Brussels professionals search across legislation, plenary debates, committee hearing transcripts, votes and MEP profiles from one query.

## Tech stack

- **Frontend:** React 19 + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express + tRPC v11
- **Database:** PostgreSQL + pgvector on Railway, via Drizzle ORM
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dims)
- **AI answers:** Claude Haiku 4.5 (quick mode) and Claude Sonnet 4.5 (deep mode)
- **Transcription:** AssemblyAI (separate Python pipeline for committee hearings)
- **Hosting:** Railway
- **Package manager:** pnpm

## Quick start

```bash
git clone https://github.com/PepoBCN/EUParlIQ.git
cd EUParlIQ
pnpm install
cp .env.example .env
# fill in DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY
pnpm db:push
pnpm dev
```

App runs on `http://localhost:3000` by default.

## Environment variables

All vars are read in `server/_core/env.ts`. Copy `.env.example` to `.env` and fill in the required ones.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (must have pgvector extension enabled) |
| `OPENAI_API_KEY` | yes | Used for embeddings (`text-embedding-3-small`) |
| `ANTHROPIC_API_KEY` | yes | Used for Claude answers (Haiku quick mode, Sonnet deep mode) |
| `JWT_SECRET` | required in production, optional in dev | Signs auth tokens. In dev it defaults to `dev-secret-local-only`. In production the server refuses to boot without it. |
| `NODE_ENV` | optional | `development` or `production`. Defaults to `development`. |
| `PORT` | optional | HTTP port. Defaults to `3000`. |

## Database setup

The app expects a Postgres instance with the `pgvector` extension. Railway's Postgres plugin works out of the box once you enable pgvector.

- Schema lives in `drizzle/`
- `pnpm db:push` runs `drizzle-kit generate` then `drizzle-kit migrate` to apply the schema
- `pnpm db:studio` opens Drizzle Studio for browsing data

For a fresh local setup, point `DATABASE_URL` at an empty database, then run `pnpm db:push`.

## Deploy (Railway)

The project is hosted on Railway. `railway.toml` has the config.

1. `pnpm install` and commit `pnpm-lock.yaml` (Railway builds with `--frozen-lockfile`)
2. `pnpm check` to type-check
3. `pnpm build` (Vite + esbuild bundle)
4. `railway up --detach`
5. Check the health endpoint and run a test search in the browser

Env vars must be set in the Railway service dashboard, not checked in.

## Ingestion scripts

Data is pulled from public EU sources and stored locally so user queries don't hit live APIs. Scripts live in `server/ingestion/`.

| Command | What it does |
|---|---|
| `pnpm ingest:meps` | Pulls MEP profiles from the EP Open Data Portal |
| `pnpm ingest:legislation` | Pulls legislative procedures and documents |
| `pnpm ingest:plenary` | Pulls plenary debate transcripts (CRE XML) |
| `pnpm ingest:votes` | Pulls roll-call votes from HowTheyVote.eu |
| `pnpm ingest:all` | Runs all four in sequence |

Committee hearing audio transcription is a separate Python pipeline in `transcription/` and runs offline/batch.

## Project structure

```
eu-parliq/
  client/          React frontend
  server/          Express + tRPC backend
    _core/         Server setup, auth, env, LLM wrappers
    routers/       tRPC routers
    ingestion/     Data ingestion scripts
  shared/          Shared types and committee config
  drizzle/         DB schema and migrations
  transcription/   Python transcription pipeline
  docs/            Documentation
```

See `CLAUDE.md` for architecture notes, data sources and design system rules.

## Scripts reference

- `pnpm dev` - local dev server with hot reload
- `pnpm build` - production build
- `pnpm start` - run the production build
- `pnpm check` - TypeScript type-check
- `pnpm format` - Prettier
- `pnpm test` - Vitest

## Licence

MIT.
