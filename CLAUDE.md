# EUParlIQ - Project Instructions

## What is this?

EUParlIQ is an AI-powered EU parliamentary intelligence tool. It lets Brussels professionals search across legislation, plenary debates, committee hearing transcripts, votes and MEP profiles in one query. EU-specific version of the UK ParlIQ tool.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express + tRPC v11
- **Database:** PostgreSQL + pgvector on Railway (Drizzle ORM)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dims)
- **AI Answers:** Claude Haiku 4.5 (quick mode) / Claude Sonnet 4.5 (deep mode)
- **Transcription:** AssemblyAI (committee hearings)
- **Hosting:** Railway
- **Package Manager:** pnpm

## Key Architecture Decisions

- **Single database:** Postgres + pgvector replaces the UK version's MySQL + Pinecone setup. Vector embeddings and structured data in one DB.
- **Same search pattern:** Two-phase search (metadata fetch, then vector scoring), streaming SSE answers, query expansion.
- **Separate transcription pipeline:** Python service for committee hearing audio extraction + transcription + speaker attribution. Runs offline/batch.

## Data Sources (all public, no auth)

- EP Open Data Portal (REST API) - MEPs, documents, procedures
- CELLAR/EUR-Lex (SPARQL) - legislative text
- HowTheyVote.eu (REST API + CSV) - roll-call votes
- CRE plenary transcripts (XML) - debate transcripts
- EP Multimedia Centre (HLS) - committee hearing audio
- Parltrack (JSON dumps) - gap-filling

## Project Structure

```
eu-parliq/
  client/          # React frontend
    src/
      pages/       # Route pages
      components/  # UI components
      hooks/       # Custom hooks
      lib/         # Utilities
  server/          # Express backend
    _core/         # Server setup, auth, LLM
    routers/       # tRPC routers
    ingestion/     # Data ingestion scripts
  shared/          # Shared types, configs
    committees.ts  # EU committee config (single source of truth)
    interfaces.ts  # Shared types
  drizzle/         # DB schema and migrations
  transcription/   # Python transcription pipeline
  docs/            # Documentation
  discovery/       # Product discovery research
```

## Committee Config

EU committees are defined in `shared/committees.ts`. This is the single source of truth for committee names, abbreviations, slugs and colours. All frontend and backend code references this config.

**MVP Committees:** ITRE, IMCO, JURI, LIBE, ECON, ENVI

## Design System

Match the UK ParlIQ design exactly:
- shadcn/ui components
- Cards with left border stripe (committee colour)
- Tab-based navigation
- Streaming search with source citations
- Lucide icons throughout
- Uppercase tracking-wide headers
- Monospace for references and dates
- en-GB date format (14 Mar 2026)

## Deploy Protocol

1. Run `pnpm install` and commit `pnpm-lock.yaml` (Railway uses --frozen-lockfile)
2. Run `tsc --noEmit` to check types
3. Build: `vite build && esbuild server/_core/index.ts --bundle`
4. Deploy: `railway up --detach`
5. Verify: check health endpoint, test search, visual check in browser

## UK ParlIQ Reference

The UK version lives at `~/Documents/Claude builds etc/personal-projects/parliament-reports-qa/`. Use it as the reference implementation for patterns, but don't modify it.

## Rules

- UK spelling always
- Never hardcode committee colours - use shared/committees.ts
- Store data locally, don't rely on live API calls for every user query
- Surface attribution confidence for hearing transcripts (don't hide uncertainty)
- All search results must cite sources with direct links
- Test in browser before reporting features as done
