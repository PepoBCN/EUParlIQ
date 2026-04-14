# EUParlIQ - Project Plan

*Created: 14 April 2026*

---

## Epic: EUParlIQ MVP

**Goal:** Build a working MVP of EUParlIQ that lets Brussels professionals search across EU Parliament data - legislation, plenary debates, committee hearing transcripts, votes and MEP profiles - in one AI-powered query.

**Target User:** Policy advisors, PA consultants, journalists, law firms working with EU institutions.

**Problem:** Brussels professionals waste hours stitching together fragmented sources. Nobody combines structured legislative data with unstructured content (hearing transcripts, debate speeches) in a single AI-searchable interface.

**Differentiation:** Searchable, speaker-attributed committee hearing transcripts. Nobody else offers this for free.

**Success Metric:** A user can ask "What did MEP X say about AI Act Article 6?" and get an accurate, sourced answer in under 10 seconds.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + Vite + Tailwind + shadcn/ui | Same as UK ParlIQ |
| Backend | Express + tRPC v11 + Drizzle ORM | Same as UK ParlIQ |
| Database | PostgreSQL + pgvector on Railway | Changed from MySQL + Pinecone |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) | Same as UK ParlIQ |
| AI Answers | Claude Haiku 4.5 (quick) / Sonnet 4.5 (deep) | Same as UK ParlIQ |
| Transcription | AssemblyAI (MVP) | New - for committee hearings |
| Hosting | Railway | Same as UK ParlIQ |
| Cost | ~$20-36/month | Comparable to UK |

---

## Data Sources (MVP)

| Source | API | Format | What We Get |
|--------|-----|--------|-------------|
| EP Open Data Portal | REST | JSON-LD | MEPs, committees, documents, procedures |
| CELLAR/EUR-Lex | SPARQL | RDF/HTML | Legislative text (3 target files) |
| HowTheyVote.eu | REST + CSV | JSON/CSV | Roll-call vote data |
| CRE Transcripts | REST/XML | XML | Plenary debate transcripts |
| EP Multimedia | HLS streams | Audio | Committee hearing audio for transcription |
| Parltrack | JSON dumps | JSON | Gap-filling, cross-reference |

---

## MVP Scope

**Legislature:** 10th (2024-2029, current). For the 3 target files, include full history from 9th term (2019-2024) since that's when the legislative action happened.

**3 target legislative files:**
1. AI Act (2021/0106(COD)) - ITRE/IMCO/LIBE
2. Corporate Sustainability Due Diligence Directive (CSDDD) - JURI
3. Digital Markets Act (DMA) - IMCO

**Core dataset (all structured, API-accessible, English):**
- CRE plenary transcripts - who said what, when, on which file
- Committee reports and opinions - formal written outputs per dossier
- Written and oral questions - MEPs to Commission
- Amendments - tabled by MEPs in committee and plenary
- Roll-call voting records - per MEP
- MEP profiles for members of relevant committees

**Parked for Phase 2:**
- Committee hearing transcription (video → text pipeline)
- Hearing transcript viewer with video sync

---

## Features

### Feature 1: Project Foundation
- Codebase scaffolded from UK ParlIQ (Express + tRPC + Drizzle + Vite + Tailwind)
- PostgreSQL + pgvector on Railway (replacing MySQL + Pinecone)
- EU committee configuration (ITRE, IMCO, JURI, LIBE, ECON, ENVI)
- Database schema migrated (meps, procedures, committees, hearings tables)
- Branding: EUParlIQ with same design language as UK ParlIQ

### Feature 2: Data Ingestion Pipeline
- MEP data ingestion (EP Open Data Portal)
- EUR-Lex legislative text ingestion (CELLAR SPARQL) for 3 target files
- CRE plenary transcript ingestion (XML parsing, speaker attribution)
- Roll-call vote ingestion (HowTheyVote CSV)
- Parliamentary questions ingestion
- OEIL procedure tracking data

### Feature 3: Committee Hearing Transcription Pipeline (PHASE 2)
- Parked - structured data MVP first
- Audio extraction, transcription and speaker attribution deferred

### Feature 4: Search and AI Answers
- Semantic search across all content types
- Streaming AI answers with source citations
- EU terminology query expansion
- Concise (Quick) and detailed (Deep) answer modes
- Follow-up question generation
- Committee hearing results with video deep-links

### Feature 5: Frontend
- Home/search page (same design as UK ParlIQ)
- Committee detail pages (Members, Documents, Hearings, Votes tabs)
- MEP profile pages (photo, political group, country, activity feed)
- Legislative file tracker (procedure status, timeline)
- Hearing transcript viewer with video sync
- About page with product description

---

## Build Order

**Week 1:** Foundation + MEP data ingestion
**Week 2:** Data ingestion (legislation, CRE plenary, amendments, questions)
**Week 3:** Votes, procedures + search pipeline + frontend MVP
**Week 4:** Polish, testing, deploy

---

## What to Reuse from UK ParlIQ

**As-is:** Express scaffold, tRPC setup, auth, export, chat sessions, alerts, build config, embedding generation, streaming SSE pattern, UI components (AppShell, SiteHeader, SiteFooter, ErrorBoundary, shadcn/ui), Drizzle ORM patterns

**Adapt:** Search pipeline (new system prompts), frontend pages (new branding), database schema, committee config, streaming search, member profiles

**Rebuild:** Data ingestion scripts, transcription pipeline, boilerplate detection, committee router

---

## Design

Match UK ParlIQ exactly:
- Same shadcn/ui component library
- Same card patterns (left border stripe with committee colour)
- Same tab-based navigation
- Same search UI with streaming answers
- Same Lucide icon set
- Same typography hierarchy (uppercase tracking-wide headers, text-sm body)
- Same colour system adapted for EU political groups and committees

**EU Committee Colours:**
- ITRE: bg-blue-600
- IMCO: bg-orange-600
- JURI: bg-purple-600
- LIBE: bg-red-600
- ECON: bg-emerald-600
- ENVI: bg-green-600

**EU Political Group Colours:**
- EPP: bg-blue-600
- S&D: bg-red-600
- Renew: bg-yellow-500
- Greens/EFA: bg-green-600
- ECR: bg-sky-700
- ID: bg-indigo-800
- The Left: bg-rose-700
- NI: bg-gray-500
