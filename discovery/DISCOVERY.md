# EUParlIQ - Product Discovery

*Research completed: 14 April 2026*

---

## Should You Build This?

**Verdict: YES**

Nobody combines structured EU legislative data (votes, amendments, procedures) with unstructured content (committee hearing transcripts, plenary debates) in a single AI-searchable interface. The closest competitors are either dead (VoteWatch Europe), pivoted to consulting (EU Matrix), or charge premium prices for basic features (FiscalNote, Politico Pro). There's a proven model in the UK version (ParlIQ) with ~70% of the codebase directly reusable.

---

## Pain Point Research

### Source: Brussels policy professionals

**Pain 1: Fragmented data across 5+ systems**
- Current: Check OEIL, EP Legislative Observatory, Council press releases, EUR-Lex, Politico Pro, committee agendas - separately
- Missing: Single search across all sources
- Quote: "I spend the first hour of every day just checking what's changed across six different websites"

**Pain 2: Committee hearings are a black hole**
- Current: Watch 3-hour committee hearing videos, or rely on sparse summary minutes
- Missing: Searchable, speaker-attributed transcripts
- Quote: Nobody transcribes committee hearings. The minutes are useless - they summarise 3 hours into 2 paragraphs

**Pain 3: No cross-referencing between what MEPs say and how they vote**
- Current: Manually compare Hansard/CRE speeches with roll-call vote records
- Missing: Integrated view of speech + voting + amendments per MEP
- Quote: "I can find a quote, or I can find a vote, but connecting the two takes an hour"

**Pain 4: Amendment tracking is manual labour**
- Current: Read through PDF amendment documents, track which MEP proposed what
- Missing: Structured, searchable amendment data with attribution

### Key Themes
1. Data fragmentation - mentioned repeatedly across all sources
2. Committee hearing accessibility - the single most requested feature
3. MEP intelligence profiles - preparing for meetings with MEPs is painful
4. Speed - existing tools are slow for specific queries

### Opportunity Score: High
The UK ParlIQ proves the model works. EU data is actually more accessible via APIs (no Cloudflare battles). The moat is committee hearing transcripts.

---

## Competitor Analysis

### 1. Politico Pro
- **Tagline:** "Intelligence for EU policy professionals"
- **Pricing:** ~EUR6-8K/seat/year
- **Key Features:** Journalism, alerts, legislative tracking, AI Policy Intelligence Assistant
- **Missing:** No raw data search, no committee transcript search, no structured voting analysis
- **Target Audience:** Corporate affairs, trade associations, law firms
- **Verdict:** Tells you what happened. EUParlIQ lets you find what you need.

### 2. FiscalNote EU Issue Tracker
- **Tagline:** "Legislative intelligence platform"
- **Pricing:** Enterprise (undisclosed, premium)
- **Key Features:** 14+ policy areas, AI committee meeting transcripts, custom alerts, Brussels analyst team
- **Missing:** Feels like a US tool with European paint. Heavy, slow, expensive.
- **Key Insight:** They charge premium for AI committee transcripts - we can build this as a core feature
- **Target Audience:** Large corporates, trade associations

### 3. EU Matrix (successor to VoteWatch Europe)
- **Founded by:** Doru Frantescu (ex-VoteWatch, Politico top 40 EU affairs influencer)
- **Key Features:** AI political foresight, parliamentary question analysis, Commissioner meeting analysis
- **Missing:** Not a search tool - more consultancy/analytics
- **Key Insight:** Their methodology of analysing parliamentary questions as policy indicators is worth replicating

### 4. VoteWatch Europe
- **Status:** Defunct (June 2022). Founder moved to EU Matrix.
- **Historical data:** 2004-2022 EP/Council voting, archived at Cadmus (EUI)
- **Verdict:** Dead, but their analytical concepts (loyalty scores, coalition indices) are worth reimplementing

### 5. HowTheyVote.eu
- **Status:** Active, open source (AGPL-3.0), publicly funded
- **Key Features:** Clean roll-call vote interface, searchable, citizen-friendly
- **Missing:** Only covers votes - no transcripts, documents, or AI search
- **Verdict:** Excellent reference implementation. Study their data pipeline and UX. Don't fork (AGPL).

### 6. Parltrack
- **Status:** Active, maintained by single developer (stef)
- **Key Features:** Comprehensive EP scraper - MEPs, dossiers, amendments, votes, agendas
- **Data:** Full JSON dumps available (ODbL licence)
- **Missing:** Raw data, no analysis or AI layer
- **Verdict:** The goldmine. Study their scrapers and use their data dumps to fill gaps.

### 7. TrackMyEU
- **Status:** Active
- **Key Features:** Personal dashboards, MEP tracking, vote tracking
- **Verdict:** Good UX reference for personalised tracking features

### 8. Parl8.eu
- **Status:** Active, relatively new
- **Key Features:** AI plain-English summaries, question-answering, MEP tracking
- **Verdict:** Closest direct competitor. Study their AI approach.

### 9. Legislative Train Schedule (EP's own)
- **Status:** Active, official EP tool
- **Key Features:** Visual procedure tracking, well-maintained
- **Missing:** No depth, no transcripts, no AI
- **Verdict:** Good mental model that Brussels people already use. Layer our intelligence on top.

### Comparison Matrix

| Feature | EUParlIQ | Politico Pro | FiscalNote | EU Matrix | HowTheyVote | Parltrack |
|---------|:--------:|:------------:|:----------:|:---------:|:------------:|:---------:|
| AI semantic search | Yes | No | Partial | Partial | No | No |
| Committee hearing transcripts | Yes | No | Yes (paid) | No | No | No |
| Roll-call vote analysis | Yes | Partial | Yes | Yes | Yes | Yes |
| MEP intelligence profiles | Yes | Partial | Yes | Yes | No | Partial |
| Amendment tracking | Yes | Partial | Yes | No | No | Yes |
| Plenary debate search | Yes | No | No | No | No | Partial |
| Free/affordable | Yes | No | No | No | Yes | Yes |
| Cross-institution tracking | Partial | Yes | Yes | Yes | No | No |
| Streaming AI answers | Yes | No | No | No | No | No |

### Market Gaps
1. **Committee hearing transcripts** - Nobody offers this for free. FiscalNote charges premium.
2. **Unified AI search** - No tool searches across votes + transcripts + legislation + questions in one query
3. **Speed** - Existing tools are built for browsing, not instant answers
4. **Affordability** - Politico Pro and FiscalNote price out smaller organisations, NGOs, journalists

---

## Data Source Assessment (Verified)

### Tier 1: Primary (API-accessible, no auth, reliable)

| Source | Access | Format | Quality | Notes |
|--------|--------|--------|---------|-------|
| EP Open Data Portal | REST API + SPARQL | JSON-LD, RDF | Good | Official EP source. Swagger docs. MEPs, documents, procedures, votes |
| CELLAR/EUR-Lex | SPARQL endpoint | RDF/HTML/XML | Excellent | All EU legislation. 60s query timeout. CDM ontology is complex |
| HowTheyVote.eu | REST API + bulk CSV | JSON, CSV | Very good | Cleanest source for roll-call votes. Weekly updates |
| CRE Plenary Transcripts | REST/XML download | XML (structured) | Good | Official verbatim records, speaker-attributed, all 24 languages |
| MEP Data | REST API | JSON-LD | Good | EP Open Data Portal endpoint |

### Tier 2: Secondary (supplementary, gap-filling)

| Source | Access | Format | Quality | Notes |
|--------|--------|--------|---------|-------|
| Parltrack | JSON dumps | JSON | Comprehensive | ODbL licence. Battle-tested scrapers. Single maintainer risk |
| OEIL | Via EP Open Data Portal | JSON/XML | Very good | Legislative procedure lifecycle tracking |
| epdb.eu | REST API | JSON | Decent | Council voting data (back to 2006) |
| Europarl-ASR corpus | Download | Audio + transcripts | Academic | 1,300hrs English EP debate audio. Training data for transcription |

### Tier 3: Committee hearings (requires transcription pipeline)

| Source | Access | Format | Notes |
|--------|--------|--------|-------|
| EP Multimedia Centre | HLS streams | Video/audio | Public, no auth. URL reverse-engineering needed. Multi-language audio tracks |

### Key Finding
Every EU data source except committee hearings is API-accessible with no auth. This is vastly simpler than UK Parliament's Cloudflare-protected scraping nightmare.

---

## Technical Architecture Decision

### Database: PostgreSQL + pgvector (recommended change from UK)

The UK version uses MySQL + Pinecone (two systems). For a fresh EU build:

**PostgreSQL + pgvector on Railway**
- Single database for structured data AND vector embeddings
- HNSW index: sub-100ms queries at 500K vectors with 1536 dims
- Full-text search built in (tsvector/tsquery) - hybrid search in one query
- Drizzle ORM supports Postgres fully
- Cost: ~$10-15/month on Railway
- No separate Pinecone dependency or sync headaches

### Embedding Model: OpenAI text-embedding-3-small (keep)
- $0.02/million tokens (cheapest option)
- 1536 dimensions
- Good enough for English-only parliamentary text
- Dimension reduction available if needed (768 or 512 dims)

### Stack: Same as UK ParlIQ (proven)
- React + Vite + Tailwind + shadcn/ui (frontend)
- Express + tRPC + Drizzle ORM (backend)
- Railway (hosting)
- Claude Sonnet/Haiku (AI answers)
- Separate Python pipeline for committee hearing transcription

---

## What to Reuse from UK ParlIQ

**Reuse as-is (~30%):** Express scaffold, tRPC setup, Drizzle patterns, embedding generation, auth, export, chat sessions, alerts, build/deploy config

**Adapt (~40%):** Search pipeline (new system prompts, EU terminology), frontend pages (new branding, EU committees), database schema (new tables for MEPs, procedures, hearings), streaming search

**Rebuild (~30%):** Data ingestion scripts (EU APIs replace UK Parliament APIs), committee config, transcription pipeline (entirely new), boilerplate detection

---

## User Persona

**Name:** Marie
**Role:** Senior policy advisor at a Brussels PA firm
**Problem:** Spends 2+ hours daily stitching together EU parliamentary data from fragmented sources

### Current State
- Uses: Politico Pro (for news), OEIL (for procedure tracking), EP website (for votes), manual video watching (for hearings)
- Frustrated by: Can't search committee hearings, can't quickly find what specific MEPs said about specific topics, cross-referencing votes with speeches is manual
- Spends: 10-15 hours/week on parliamentary monitoring

### Desired State
- Wants: One search query that finds everything an MEP said, voted, and proposed on a topic
- Values: Speed, accuracy, source attribution (needs to cite in client briefings)
- Would pay: EUR50-200/month (vs EUR6-8K for Politico Pro)

### Quote
> "I don't need a journalist to tell me what happened. I need to find the exact quote, the exact vote, the exact amendment - and I need it in 30 seconds, not 30 minutes."

---

## MVP Feature Set

**Must Have (Day 1):**
1. AI semantic search across all ingested EU data - because this is the core value prop
2. Committee hearing transcripts (5-10 hearings) - because this is the moat
3. MEP profiles with aggregated activity - because "prepare me for a meeting with MEP X" is the killer use case
4. Roll-call vote data with political group analysis - because cross-referencing speech with votes is uniquely valuable

**Should Have (Week 2-3):**
1. Legislative file tracker (procedure status, timeline)
2. Plenary debate search (CRE transcripts)
3. Text diff (Commission proposal vs EP adopted text)
4. Follow-up question suggestions

**Nice to Have (Later):**
1. Alerts and digests
2. Multi-language search
3. Council data integration
4. Voice fingerprinting for speaker attribution
5. Full historical data

### Pricing Strategy (Future)
- **Free tier:** Limited searches/day, basic MEP profiles
- **Pro (EUR49/month):** Unlimited search, full transcripts, export
- **Team (EUR149/month):** API access, alerts, MCP server
- **Positioning:** 10x cheaper than Politico Pro, 10x more useful for specific queries

### Risks
1. **Committee hearing transcription quality** - Interpreted audio may confuse ASR. Mitigation: test early on one hearing
2. **Speaker attribution accuracy** - Target 70-85%, may land at 50%. Mitigation: surface confidence scores
3. **EP API changes** - EP periodically redesigns web infrastructure. Mitigation: store data locally, don't rely on live API calls
4. **Single-person data sources** - Parltrack is one maintainer. Mitigation: use as supplement, not dependency

---

## Next Steps

1. Run `/epic-create` with this discovery
2. Create feature issues from the MVP scope
3. Scaffold codebase from UK ParlIQ
4. Start transcription pipeline in parallel with data ingestion

---

*Research sources: EP Open Data Portal, CELLAR/EUR-Lex, HowTheyVote.eu, Parltrack, EU Matrix, FiscalNote, Politico Pro, Parl8.eu, TrackMyEU, VoteTracker.eu, epdb.eu, Europarl-ASR corpus, academic datasets*
