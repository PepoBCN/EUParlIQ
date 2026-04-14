# EU ParlIQ - Technical Architecture

**Version**: 1.0 | **Date**: 6 April 2026 | **Author**: Claude Code (directed by Josh Feldberg)

---

## 0. Executive Summary

EU ParlIQ is an EU version of the existing UK ParlIQ parliamentary intelligence tool. The UK version searches across select committee reports, oral evidence transcripts, Hansard debates, voting records and written questions using semantic search powered by OpenAI embeddings and Claude for answer synthesis. The EU version would do the same for European Parliament data - but with a fundamentally different (and in many ways easier) data access story, and one much harder problem: committee hearing transcription.

This document maps the existing UK codebase, assesses what's reusable, and designs the full technical architecture for an EU MVP.

---

## 1. What Can Be Reused from UK ParlIQ

### Full Component Map

The UK ParlIQ codebase lives at `~/Documents/Claude builds etc/personal-projects/parliament-reports-qa/` and consists of these components:

| Component | Files | Reuse Assessment |
|---|---|---|
| **Express + tRPC server scaffold** | `server/_core/index.ts`, `server/routers.ts`, `server/db.ts` | **Reuse as-is**. The Express + tRPC + Drizzle wiring is generic. Copy the scaffold wholesale. |
| **Embedding generation** | `server/embeddings.ts` | **Reuse as-is**. `generateEmbedding()` and `generateEmbeddingBatch()` call OpenAI's API directly. Model-agnostic if we swap to a multilingual model later. |
| **Cosine similarity + vector scoring** | `server/reportsDb.ts` (lines 196-279) | **Reuse as-is**. The `scoreChunksBySimilarity()` function with Pinecone-first, MySQL-fallback logic is stack-agnostic. |
| **Streaming search endpoint** | `server/streamingSearch.ts` | **Adapt**. The SSE streaming pattern, Claude API call, and query expansion logic are all reusable. Need to swap UK-specific system prompts, committee detection, and voting context injection. ~60% reusable. |
| **Search router (tRPC)** | `server/searchRouter.ts` | **Adapt**. Same as streaming search - the search pipeline pattern (expand query, embed, score, build XML context, call Claude, generate follow-ups) is the core IP. System prompts and member/voting context need EU equivalents. ~50% reusable. |
| **Committee router** | `server/committeeRouter.ts` | **Rebuild**. Every API call hits UK Parliament APIs (`committees-api.parliament.uk`, `hansard-api.parliament.uk`). The caching pattern is reusable but all endpoints change. |
| **Committee config** | `shared/committees.ts` | **Adapt**. The pattern (single source of truth, derived lookup maps) is excellent. Replace UK committee data with EU committee data. The `CommitteeConfig` interface needs EU-specific fields (e.g. `abbreviation` like "ITRE", "ECON"). |
| **Database schema** | `drizzle/schema.ts` | **Adapt**. Core tables (`reports`, `reportChunks`) map well. `hansardActivity` becomes plenary CRE activity. `votingRecord` maps to EP roll-call votes. `writtenQuestions` maps to EP parliamentary questions. Need new tables for transcriptions, MEP data. ~40% reusable. |
| **Report ingestion** | `server/ingestReports.ts` | **Rebuild**. UK version hits Parliament API for publications + PDF extraction. EU version will hit CELLAR/EUR-Lex SPARQL. Different data shape entirely. The chunking and embedding insertion pattern is reusable. |
| **Oral evidence ingestion** | `server/ingestOralEvidence.ts` | **Rebuild**. UK version parses HTML transcripts scraped from parliament.uk. EU version will ingest AI-generated transcripts from a separate pipeline. The speaker-turn parsing and chunk-by-speaker pattern might inform the transcript chunk format. |
| **Written evidence ingestion** | `server/ingestWrittenEvidence.ts` | **Rebuild**. Different source entirely. |
| **Hansard ingestion** | `server/ingestHansard.ts` | **Adapt to CRE**. EU plenary CRE reports come in XML. Different parser but same concept (debate transcripts with speaker attribution). |
| **Votes ingestion** | `server/ingestVotes.ts` | **Adapt**. EU roll-call votes have a different schema but same concept. HowTheyVote.eu provides clean CSV data. |
| **Written questions ingestion** | `server/ingestWrittenQuestions.ts` | **Adapt**. EP has parliamentary questions with a different API but same concept. |
| **React frontend** | `client/src/` | **Adapt heavily**. The page structure (Home, Committee, MemberProfile, Witnesses, About) maps well conceptually. UI components (search bar, answer streaming, source cards, committee tabs) are directly reusable. All UK-specific copy, branding and committee colours need replacing. ~50% reusable. |
| **Frontend pages** | `client/src/pages/Home.tsx` (search + answers), `Committee.tsx` (4-tab detail), `MemberProfile.tsx`, `Witnesses.tsx`, `Submitters.tsx`, `About.tsx`, `Technical.tsx` | Home search page is ~70% reusable. Committee page tabs need EU equivalents. MemberProfile concept maps to MEP profiles. Witnesses/Submitters are UK-specific concepts. |
| **UI components** | `client/src/components/` (SiteHeader, SiteFooter, AppShell, ErrorBoundary) | **Adapt**. Layout shell, header/footer, error handling all reusable with branding swap. |
| **Boilerplate filter** | `server/boilerplate.ts` | **Rebuild**. UK-specific boilerplate patterns (e.g. "Ordered by the House of Commons to be printed"). EU has its own boilerplate. |
| **Export (DOCX)** | `server/exportRouter.ts` | **Reuse as-is**. Generic DOCX generation from search results. |
| **Chat sessions** | `server/chatRouter.ts`, `drizzle/schema.ts` (chatSessions, chatMessages) | **Reuse as-is**. Generic conversation storage. |
| **Alerts** | `server/alertsRouter.ts` | **Reuse as-is**. Generic keyword alert system. |
| **Recommendations tracker** | `server/recommendationsRouter.ts` | **Adapt**. EU reports have different recommendation structures but same concept. |
| **Pre-generated profiles** | `server/pregenProfiles.ts` | **Adapt**. Same pattern for MEP profiles. Change data sources. |
| **Auth system** | `server/_core/` (auth, cookies, env) | **Reuse as-is**. |
| **Build/deploy config** | `vite.config.ts`, `tsconfig.json`, `railway.toml`, `package.json` | **Reuse as-is**. |
| **Scraping server** | `scripts/scrape-server.py` | **Not needed**. EU data is API-accessible. This was a workaround for parliament.uk's Cloudflare protection. |

### Summary Scorecard

- **Reuse as-is**: ~30% of codebase (scaffolding, embeddings, auth, export, chat, alerts, build config)
- **Adapt (significant rewrite)**: ~40% (search pipeline, frontend, schema, ingestion patterns)
- **Rebuild from scratch**: ~30% (data ingestion scripts, committee router, boilerplate, transcription pipeline - entirely new)

---

## 2. Tech Stack Recommendation

### Verdict: Same stack, with one addition

**Keep**: React + Express + tRPC + Drizzle ORM + MySQL + Railway + Vite + Tailwind + shadcn/ui

**Reasoning**:
1. Josh (and Claude Code) already know this stack. The entire UK ParlIQ was built with it. Switching stacks introduces risk and learning curve for no gain.
2. Railway Hobby plan works fine for a demo/MVP. Same $5/month base + usage.
3. MySQL on Railway handles the data volumes (EU Parliament generates less document volume than UK Parliament per committee, but more languages).
4. The UK version's memory optimisations (two-phase search, batched embedding fetch, Pinecone offload) already solve the hard scaling problems.

**Add**: A separate lightweight Python service for the transcription pipeline (Whisper/diarisation). This runs offline/batch, not in the main server. Could be a Railway service, a local script, or even a cloud function. The transcription pipeline is CPU/GPU-intensive and shouldn't share the 2GB Express container.

**Alternative considered and rejected**: Next.js + Supabase (the Third City stack). No benefit here - we're not building a multi-tenant dashboard, we're building a search tool with streaming AI answers. Express + tRPC is simpler and already proven.

### Dependency Changes from UK Version

**Keep**: All current dependencies. The `package.json` carries over.

**Add**:
- None in the main app. The transcription pipeline is a separate service.
- Potentially `sparql-http-client` or just raw `fetch` for CELLAR SPARQL queries.

**Remove**:
- `playwright` (was for UK scraping, not needed for EU)

### Infrastructure

| Component | UK ParlIQ | EU ParlIQ |
|---|---|---|
| Main app | Railway Hobby, 2 vCPU / 2GB | Same |
| Database | Railway MySQL | Same |
| Vector search | Pinecone free tier | Same index, new namespace |
| Embeddings | OpenAI text-embedding-3-small | Same (or Cohere multilingual - see Section 5) |
| AI answers | Claude Sonnet 4 / Haiku 4.5 | Same |
| Transcription | N/A | Separate Python service (see Section 4) |
| Estimated monthly cost | ~$8-12/month | ~$12-18/month (+ transcription costs) |

---

## 3. Data Ingestion Architecture

### 3.1 EUR-Lex / CELLAR (Legislative Texts)

**What it provides**: Full text of EU legislation - regulations, directives, decisions, opinions, preparatory acts. This is the EU equivalent of UK committee reports.

**How to access**:
- **SPARQL endpoint**: `https://publications.europa.eu/webapi/rdf/sparql`
- **REST API**: `https://publications.europa.eu/resource/cellar/{CELLAR_ID}`
- **No auth required**. Fully open.

**Data format**: RDF triples (metadata) + HTML/PDF/XML content files.

**Query pattern**:
```sparql
# Example: Find all legislative acts related to AI from 2024-2025
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT ?work ?title ?date
WHERE {
  ?work cdm:work_date_document ?date .
  ?work cdm:work_title ?title .
  FILTER (LANG(?title) = "en")
  FILTER (?date >= "2024-01-01"^^xsd:date)
  FILTER (CONTAINS(LCASE(?title), "artificial intelligence"))
}
LIMIT 50
```

**Processing pipeline**:
1. Query CELLAR SPARQL for documents matching target legislative files (by procedure reference, e.g. "2021/0106(COD)" for the AI Act)
2. Download HTML/XML content via REST API using the CELLAR URI
3. Parse HTML to extract structured text (sections, recitals, articles, annexes)
4. Chunk by article/section (natural boundaries, not arbitrary word counts)
5. Generate embeddings per chunk
6. Insert into `reportChunks` table with `chunkType` values like "article", "recital", "amendment", "opinion"

**Key difference from UK**: EU legislative texts have clean structural markup (articles, recitals, chapters). Chunking is easier and more meaningful than UK committee reports which are prose-heavy.

**Auth**: None required.

### 3.2 OEIL (Legislative Observatory - Procedure Tracking)

**What it provides**: The lifecycle of every legislative procedure - who proposed it, which committees handled it, what stage it's at, links to all related documents.

**How to access**:
- Primary: `https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference={PROCEDURE_REF}`
- The EP Open Data Portal (`data.europarl.europa.eu`) exposes procedure data via REST API
- XML download available per procedure

**Data format**: HTML (scraping needed) or XML exports.

**Processing pipeline**:
1. For each target legislative file, query OEIL by procedure reference (e.g. "2021/0106(COD)")
2. Extract: current stage, responsible committee, rapporteur, shadow rapporteurs, timeline of events, linked documents
3. Store as procedure metadata (new `procedures` table)
4. Use document links to feed into CELLAR/committee document ingestion

**Auth**: None required.

### 3.3 EP Plenary CRE Transcripts (Verbatim Reports)

**What it provides**: Full verbatim transcripts of plenary debates, with speaker attribution. The EU equivalent of Hansard.

**How to access**:
- EP Open Data Portal: `https://data.europarl.europa.eu/en/datasets/documents-related-to-the-plenary-activities-of-the-european-parliament-session{DATE}`
- Direct XML from EP's Public Register of Documents
- HTML from `europarl.europa.eu/doceo/document/CRE-{session}-{date}_EN.html`

**Data format**: XML (structured, with speaker tags) or HTML.

**Processing pipeline**:
1. Download CRE XML for relevant plenary sessions
2. Parse XML to extract speaker turns (MEP name, political group, speech text)
3. Chunk by speaker turn (natural boundary)
4. Tag with debate topic, MEP ID, political group
5. Generate embeddings, insert into `reportChunks` with `chunkType: "plenary_debate"`

**Key advantage**: CRE transcripts are officially produced in all 24 languages. English versions are always available. No transcription needed - these are official records.

**Auth**: None required.

### 3.4 EP Roll-Call Votes

**What it provides**: How every MEP voted on every roll-call division.

**How to access**:
- **Best source**: HowTheyVote.eu dataset - `https://github.com/HowTheyVote/data/releases/latest/download/votes.csv.gz`
- Also: EP Open Data Portal vote result datasets
- Also: `itsyourparliament.eu/api/` (XML format, 2004-2026)

**Data format**: CSV (HowTheyVote) or XML.

**Processing pipeline**:
1. Download HowTheyVote CSV dump (updated weekly)
2. Parse CSV: vote ID, date, title, MEP ID, MEP name, political group, vote (for/against/abstain)
3. Calculate rebellions (voted against political group majority)
4. Insert into `votingRecord` table (adapted from UK schema)

**Auth**: None. HowTheyVote is open data.

### 3.5 MEP Data

**What it provides**: Biographical info, committee memberships, political group, contact details.

**How to access**:
- EP Open Data Portal: `https://data.europarl.europa.eu/api/v1/meps?parliamentary-term=10`
- REST endpoint returns JSON-LD

**Data format**: JSON-LD (RDF serialisation).

**Processing pipeline**:
1. Fetch all current MEPs from Open Data Portal
2. Extract: name, country, political group, committee memberships, photo URL
3. Store in new `meps` table
4. Build committee membership lookup (equivalent of UK's Parliament API committee members endpoint)

**Auth**: None required.

### 3.6 EP Committee Documents

**What it provides**: Reports, opinions, amendments, studies published by EP committees.

**How to access**:
- EP Open Data Portal: `https://data.europarl.europa.eu/en/datasets/committee-documents-of-the-european-parliament-year{YEAR}`
- REST API returns document metadata with links to content

**Data format**: JSON-LD metadata + PDF/HTML content.

**Processing pipeline**:
1. Query by committee and year
2. Download document content (HTML preferred, PDF fallback)
3. Parse and chunk by section
4. Generate embeddings, insert with committee and document type metadata

**Auth**: None required.

### 3.7 Parliamentary Questions

**What it provides**: Written and oral questions from MEPs to the Commission, with answers.

**How to access**:
- EP Open Data Portal: parliamentary questions dataset
- Also: `europarl.europa.eu/doceo/document/` URLs

**Data format**: XML/HTML.

**Processing pipeline**:
1. Query by MEP or by topic
2. Extract: question text, answer text, MEP name, date, answering Commissioner
3. Store in adapted `writtenQuestions` table
4. Generate embeddings for searchability

**Auth**: None required.

### Data Access Summary

| Source | Access Method | Auth | Format | Scraping Needed? |
|---|---|---|---|---|
| EUR-Lex / CELLAR | SPARQL + REST | None | RDF/HTML/XML | No |
| OEIL | REST / XML export | None | JSON/XML | Minimal |
| CRE Plenary | REST / XML download | None | XML | No |
| Roll-call votes | CSV download | None | CSV | No |
| MEP data | REST API | None | JSON-LD | No |
| Committee documents | REST API | None | JSON-LD + PDF | No |
| Parliamentary questions | REST / HTML | None | XML/HTML | Minimal |
| **Committee hearings** | **Video stream** | **None** | **HLS video** | **Yes - transcription** |

The critical insight: every EU data source except committee hearings is available via API or structured download. No Cloudflare battles. No browser injection tricks. This is vastly simpler than the UK version's scraping nightmare.

---

## 4. Transcription Pipeline (Critical)

This is the hardest part of the entire project. EU Parliament committee hearings are broadcast as video but - unlike plenary sessions which have official CRE transcripts - committee hearings have **no official text transcript**. We need to build a pipeline that turns video into searchable, attributed text.

### 4.1 Accessing Committee Hearing Video

**Source**: `multimedia.europarl.europa.eu`

EP committee meetings are livestreamed and archived. Each meeting has a video page with multiple audio channels - one per interpretation language, plus the "floor" (original language).

**How to get the audio**:
1. Navigate to a specific committee meeting on `multimedia.europarl.europa.eu`
2. The video player uses HLS (HTTP Live Streaming) - `.m3u8` playlist files
3. Each language interpretation is a separate audio track in the HLS manifest
4. Use `ffmpeg` to download the English interpretation audio track:

```bash
# Extract English audio from HLS stream
ffmpeg -i "https://multimedia.europarl.europa.eu/.../{meeting_id}_EN.m3u8" \
  -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
```

**Important**: The English interpretation track is what we want for MVP. It's a single-channel audio stream of an interpreter speaking English, translating all non-English speakers. English-speaking MEPs/witnesses are heard directly on the floor channel.

**Challenge**: The HLS URLs aren't exposed via a clean API. We'll need to:
1. Scrape the meeting page to find the video player's source URLs
2. Parse the HLS manifest to identify the English audio track
3. Download and convert to WAV (16kHz mono, optimal for Whisper)

This is a one-time extraction per meeting, not a live pipeline.

### 4.2 Transcription: Model Selection

**Recommendation: OpenAI Whisper API for MVP, self-hosted Whisper Large v3 for scale.**

| Option | Accuracy (WER) | Cost | Diarisation | Multilingual |
|---|---|---|---|---|
| **OpenAI Whisper API** | ~9.2% | $0.006/min ($0.36/hr) | No | Yes |
| **AssemblyAI** | ~8.4% | $0.006/min + $0.02/hr diarisation | Yes (built-in) | Limited |
| **Self-hosted Whisper Large v3** | ~9.2% | GPU cost only (~$0.50/hr on cloud GPU) | No (add separately) | Yes |
| **Whisper Large v3 + pyannote** | ~9.2% | GPU cost only | Yes (pyannote) | Yes |

**MVP recommendation**: Use **AssemblyAI** for the first 5-10 transcripts. It gives you transcription + speaker diarisation in one API call, which saves building the diarisation pipeline. At $0.37/hour of audio, 10 two-hour committee hearings = ~$7.40 total. Trivial for MVP.

**Scale recommendation**: Move to self-hosted **Whisper Large v3 + pyannote** for speaker diarisation. Run on a cloud GPU instance (Modal, RunPod, or even a Railway GPU service if available). Much cheaper at volume.

### 4.3 Speaker Diarisation

Diarisation answers "who is speaking when?" - it segments the audio into speaker turns and labels them (Speaker 1, Speaker 2, etc.). It does NOT identify who Speaker 1 is by name.

**AssemblyAI approach** (MVP):
- Enable `speaker_labels: true` in the API call
- Returns transcript segments with `speaker: "A"`, `speaker: "B"`, etc.
- Handles up to 50 speakers per recording
- Cost: $0.02/hour extra

**Self-hosted approach** (scale):
- Use `pyannote/speaker-diarization-3.1` (HuggingFace, MIT licence)
- Requires accepting terms on HuggingFace
- Produces RTTM files with speaker segments and timestamps
- Merge with Whisper transcript by aligning timestamps

### 4.4 Speaker Attribution (The Hard Problem)

This is where it gets genuinely difficult. Diarisation gives you "Speaker A said X at 14:32". You need to map "Speaker A" to "MEP Anna Cavazzini, Greens/EFA, Germany".

**Strategy for 80%+ accuracy** (multi-signal approach):

**Signal 1: Committee attendance list**
- The EP publishes attendance for each committee meeting
- Available from committee pages on `europarl.europa.eu` or via the Open Data Portal
- This gives you the pool of possible speakers (typically 15-40 people)

**Signal 2: Chair identification**
- Committee chairs are known (from MEP data)
- The chair typically speaks first and last, introduces agenda items, calls on speakers by name
- Pattern: first long speaking segment = chair's opening. Mark as Chair.

**Signal 3: Name mentions in transcript**
- When the chair calls on someone: "Thank you. I now give the floor to Mr Weber."
- Parse these handover phrases to create a mapping: the next diarised speaker after "I give the floor to Mr Weber" = Speaker C = Mr Weber
- Regex patterns for common handover phrases:
  - "I give the floor to {name}"
  - "Thank you, {name}"
  - "{name}, you have the floor"
  - "The floor is yours, {name}"

**Signal 4: Voice fingerprinting (optional, hard)**
- If an MEP speaks across multiple hearings, a voice embedding model (e.g. `speechbrain/spkrec-ecapa-voxceleb`) could build a voice profile
- Match against future recordings
- This is ambitious for MVP. Skip it.

**Signal 5: Speaking order from agenda**
- Committee meeting agendas often list the order of speakers for hearings
- If available, the Nth external speaker in the diarisation likely maps to the Nth invited speaker on the agenda

**Signal 6: LLM post-processing**
- After all other signals, feed the partially-attributed transcript to Claude
- Ask it to infer remaining speaker identities from context (e.g., if someone says "In my country, Romania..." and an MEP from Romania is on the attendance list)
- This is a cleanup step, not a primary source

**Attribution pipeline**:
```
1. Get attendance list for meeting -> pool of possible speakers
2. Run diarisation -> Speaker A, B, C, D...
3. Identify chair (first/last speaker, known from MEP data)
4. Parse handover phrases in transcript -> map speaker labels to names
5. Cross-reference with agenda speaking order
6. LLM cleanup pass for remaining unattributed segments
7. Store with confidence score per attribution
```

**Expected accuracy**: 70-85% for speakers who are called on by name. Lower (~50%) for brief interventions where no name is mentioned. Higher for formal hearings with a clear agenda vs. free-flowing debates.

**Honest caveat**: This will not be perfect. Some speaker segments will be attributed as "Unknown" or with low confidence. The system should surface this uncertainty to users rather than guessing wrong.

### 4.5 Transcript Storage

Each transcribed hearing produces:

```typescript
{
  meetingId: string;          // EP meeting reference
  committee: string;          // e.g., "ITRE"
  date: string;               // ISO date
  title: string;              // Meeting agenda title
  videoUrl: string;           // Link to EP multimedia
  duration: number;           // Minutes
  segments: [
    {
      speakerLabel: string;   // Diarisation label ("A", "B"...)
      speakerName: string | null;  // Attributed name or null
      speakerConfidence: number;   // 0-1 confidence of attribution
      speakerRole: "chair" | "mep" | "witness" | "unknown";
      startTime: number;      // Seconds from start
      endTime: number;
      text: string;           // Transcribed text
    }
  ]
}
```

For search, these segments get chunked (grouping consecutive segments by speaker, capping at ~500 words), embedded, and stored in `reportChunks` with `chunkType: "committee_hearing"`.

The timestamp enables deep-linking: clicking a search result can jump to the exact moment in the video.

### 4.6 Cost Estimates for Transcription

| Scenario | Hours of Audio | AssemblyAI Cost | Self-hosted Cost |
|---|---|---|---|
| MVP (10 hearings) | ~20 hours | ~$7.40 | ~$10 (GPU rental) |
| 50 hearings | ~100 hours | ~$37 | ~$50 |
| Full year (200 hearings) | ~400 hours | ~$148 | ~$200 |

These are modest costs. AssemblyAI is fine even at scale for this project.

### 4.7 Transcription Pipeline Architecture

```
[EP Multimedia Centre]
        |
        v
[1. Meeting URL Scraper] -- Python script, finds HLS URLs for target meetings
        |
        v
[2. Audio Extractor] -- ffmpeg, extracts English interpretation audio track
        |
        v
[3. Transcription] -- AssemblyAI API (MVP) or Whisper Large v3 (scale)
        |
        v
[4. Speaker Diarisation] -- AssemblyAI built-in (MVP) or pyannote (scale)
        |
        v
[5. Speaker Attribution] -- Python script, uses attendance list + handover parsing + LLM cleanup
        |
        v
[6. Transcript JSON] -- Stored as structured JSON files
        |
        v
[7. Ingestion into ParlIQ] -- Chunk, embed, insert into MySQL + Pinecone (same as other content)
```

Steps 1-6 are a **separate Python pipeline**, run offline/batch. Step 7 is a TypeScript ingestion script in the main app, similar to `ingestOralEvidence.ts` in the UK version.

---

## 5. Embedding and Search Strategy

### The Multilingual Question

EU Parliament content is inherently multilingual. Even when using English translations/interpretations, document titles, MEP names, and some content will include terms from other languages. The question: does this matter enough to change embedding models?

### Recommendation: Start with OpenAI text-embedding-3-small, monitor, consider Cohere later

**Why start with OpenAI**:
- UK ParlIQ already uses it. Zero migration effort.
- At $0.02 per million tokens, it's the cheapest option.
- For MVP with English-language content (English translations of EU documents, English interpretation transcripts), it works fine.
- 1536 dimensions, same as current Pinecone index (can use a separate namespace in the same index).

**When to consider Cohere embed-multilingual-v3.0**:
- If users search in French/German and expect to find English-language results
- If we ingest documents in their original language alongside English
- Cohere multilingual scores ~15-20% better on non-Latin script queries
- Cost: $0.10 per million tokens (5x more expensive than OpenAI small)
- 1024 dimensions (would need a new Pinecone index or namespace with different config)

**Practical answer**: For an MVP targeting English-speaking policy professionals who want EU parliamentary intelligence in English, OpenAI text-embedding-3-small is fine. Cross-language search is a Phase 2 feature.

### Search Pipeline (Adapted from UK)

The UK ParlIQ search pipeline is well-optimised and the core pattern carries over:

1. **Query expansion**: Adapt the `QUERY_EXPANSIONS` dictionary for EU terminology (e.g., "regulation" -> "directive", "committee" -> "rapporteur", "MEP" -> "Member")
2. **Multi-query embedding**: Generate embeddings for original + expanded queries (same as UK)
3. **Two-phase search**: Fetch metadata without embeddings, then score via Pinecone (same as UK)
4. **Committee detection**: Replace UK committee keyword matching with EU committee abbreviations (ITRE, ECON, ENVI, LIBE, etc.)
5. **Context building**: Same XML context structure for Claude
6. **System prompt**: Replace UK-specific instructions with EU-specific ones
7. **Streaming SSE**: Same architecture

### Pinecone Configuration

- Use the existing Pinecone index `parliq-chunks` with a new namespace: `eu-parliq`
- Same 1536 dimensions, cosine similarity
- Chunk IDs use EU-specific prefixes: `eu-leg-{id}`, `eu-cre-{id}`, `eu-hearing-{id}`, `eu-vote-{id}`

---

## 6. Database Schema (High Level)

### Tables Carried Over (Adapted)

```
reports (renamed conceptually to "documents")
  - id, externalId, title, committee, publicationDate, reference, url, summary
  - documentType: "legislative_text" | "committee_report" | "committee_opinion" | "study"
  - procedureReference: e.g. "2021/0106(COD)"
  - NEW: language (default "EN")

reportChunks (unchanged structure)
  - id, reportId, externalId, content, sectionHeading, paragraphStart, paragraphEnd
  - chunkType: expanded enum - "article" | "recital" | "amendment" | "opinion" | 
    "plenary_debate" | "committee_hearing" | "parliamentary_question" | "analysis"
  - speakerName, speakerRole, speakers, embedding
  - NEW: timestamp (for hearing chunks - seconds from video start)
  - NEW: videoUrl (deep link to video moment)
  - NEW: attributionConfidence (0-1, for hearing speaker attribution)

votingRecord (adapted)
  - id, mepId (was memberId), mepName, committee, politicalGroup (NEW)
  - divisionId, date, title, memberVotedFor (was memberVotedAye)
  - votedAgainstGroup (was rebelledAgainstParty)
  - totalFor, totalAgainst, totalAbstain (NEW)
  - url

writtenQuestions (adapted)
  - id, mepId, mepName, committee, questionId
  - dateTabled, heading, questionText, answerText
  - answeringCommissioner (was answeringBody)
  - dateAnswered, url

chatSessions - unchanged
chatMessages - unchanged
alerts - unchanged
recommendations (adapted)
  - reportId, content, status, category
  - NEW: articleReference (e.g. "Article 14(2)")
users - unchanged
```

### New Tables

```
meps
  - id (auto), epId (EP's internal ID), name, country, politicalGroup
  - photoUrl, email
  - committees (JSON array of committee memberships with roles)
  - isActive (boolean)
  - createdAt, updatedAt

procedures
  - id (auto), reference (e.g. "2021/0106(COD)")
  - title, type ("COD" = co-decision, "CNS" = consultation, etc.)
  - status ("ongoing" | "adopted" | "rejected" | "withdrawn")
  - responsibleCommittee, rapporteur, rapporteurMepId
  - proposalDate, latestEventDate
  - oeilUrl
  - createdAt, updatedAt

committees (NEW - was config-only in UK, now needs DB backing)
  - id (auto), abbreviation ("ITRE", "ECON", etc.)
  - fullName, shortName, slug
  - chairMepId, colour
  - isActive

hearings (NEW - metadata for transcribed committee hearings)
  - id (auto), committeeId, title, date
  - videoUrl, duration (minutes)
  - transcriptionStatus ("pending" | "transcribed" | "attributed" | "ingested")
  - speakerCount, wordCount
  - createdAt

plenaryDebates (NEW - metadata for CRE debate sessions)
  - id (auto), sessionDate, title, debateType
  - procedureReference (nullable - links to procedures table)
  - createdAt
```

### Key Schema Differences from UK

1. **MEP table is first-class** - UK version relied on the Parliament API for member data and cached locally. EU version should store MEP data in the DB because multiple APIs reference MEPs by different ID schemes.
2. **Procedures table** - UK had no equivalent. EU legislative procedures are the core organising unit (a procedure can have multiple documents, votes, debates).
3. **Hearings table** - Tracks the transcription pipeline status. No UK equivalent because UK oral evidence came pre-transcribed.
4. **Political groups instead of parties** - EU political groups (EPP, S&D, Renew, Greens/EFA, ECR, ID, The Left, NI) replace UK parties.
5. **Timestamps on chunks** - Hearing chunks include video timestamps for deep-linking.

---

## 7. Full Feature Map with Technical Complexity

### Core Search & AI

| Feature | Complexity | Notes |
|---|---|---|
| Semantic search across all EU content | **Medium** (1 week) | Adapt UK search pipeline. New system prompts, EU terminology expansion. |
| Streaming AI answers with citations | **Easy** (2-3 days) | Reuse UK SSE streaming. Swap system prompt. |
| Follow-up question generation | **Easy** (1 day) | Reuse UK pattern as-is. |
| Query expansion for EU terminology | **Easy** (1 day) | New expansion dictionary. |
| Cross-committee search | **Easy** (1 day) | Already implemented in UK version. Adapt committee detection. |
| Search filters (committee, date, document type) | **Medium** (3-4 days) | More filter dimensions than UK. |
| Concise / detailed answer modes | **Easy** (1 day) | Already in UK version. |

### Data Ingestion

| Feature | Complexity | Notes |
|---|---|---|
| EUR-Lex/CELLAR legislative text ingestion | **Medium** (1 week) | SPARQL queries, HTML parsing, article-level chunking. |
| CRE plenary transcript ingestion | **Medium** (1 week) | XML parsing, speaker attribution from structured data. |
| Roll-call vote ingestion | **Easy** (2-3 days) | CSV parsing from HowTheyVote. |
| MEP data ingestion | **Easy** (2 days) | REST API, JSON-LD parsing. |
| Committee document ingestion | **Medium** (1 week) | PDF parsing needed for some documents. |
| Parliamentary questions ingestion | **Easy** (2-3 days) | Structured data from EP portal. |
| OEIL procedure tracking | **Medium** (3-4 days) | HTML parsing or XML export. |

### Transcription Pipeline

| Feature | Complexity | Notes |
|---|---|---|
| Committee hearing audio extraction | **Medium** (3-4 days) | HLS URL discovery, ffmpeg extraction. |
| Transcription (AssemblyAI) | **Easy** (2 days) | API call, handle response. |
| Speaker diarisation | **Easy** (included) | Built into AssemblyAI. |
| Speaker attribution from attendance lists | **Hard** (1-2 weeks) | Multiple signals, name matching, confidence scoring. |
| Speaker attribution from handover phrases | **Medium** (3-4 days) | Regex parsing, speaker label mapping. |
| LLM attribution cleanup | **Medium** (2-3 days) | Claude prompt engineering. |
| Transcript-to-video deep linking | **Easy** (1-2 days) | Timestamp math, URL construction. |
| Voice fingerprinting for repeat speakers | **Very Hard** (1+ month) | Phase 2/3. Requires voice embedding model. |

### Frontend

| Feature | Complexity | Notes |
|---|---|---|
| Home page with search | **Easy** (2-3 days) | Adapt UK Home.tsx. New branding. |
| Committee detail pages | **Medium** (1 week) | EU committee tabs: Members, Documents, Hearings, Votes. |
| MEP profile pages | **Medium** (1 week) | Adapt from UK MemberProfile. Add political group, country, photo. |
| Legislative file tracker | **Medium** (1 week) | New page. Show procedure status, timeline, linked documents. |
| Hearing transcript viewer | **Medium** (1 week) | New page. Show attributed transcript with video player + timestamp sync. |
| Vote visualisation | **Medium** (3-4 days) | Show roll-call results by political group. |
| About / Technical pages | **Easy** (1-2 days) | Reuse UK pattern. |
| Dark mode | **Easy** (1 day) | Already scaffolded in UK version. |

### Infrastructure

| Feature | Complexity | Notes |
|---|---|---|
| Railway deployment | **Easy** (1 day) | Same as UK. |
| Pinecone namespace setup | **Easy** (half day) | New namespace in existing index. |
| Database schema migration | **Easy** (1 day) | Drizzle ORM handles this. |
| Transcription pipeline deployment | **Medium** (2-3 days) | Separate Python service on Railway or cloud function. |
| CI/CD | **Easy** (1 day) | Same pattern as UK. |

---

## 8. MVP Build Plan

### MVP Scope

Three legislative files (e.g., AI Act, Corporate Sustainability Due Diligence Directive, Digital Markets Act), 5-10 committee hearing transcripts, plenary debates on those files, roll-call votes, and basic MEP data.

### Critical Path

The critical path runs through **transcription** - it's the slowest, least predictable part. Start it immediately and in parallel with everything else.

### Week-by-Week Plan

**Week 1: Foundation + Transcription Start**

Day 1-2: Project scaffolding
- Fork UK ParlIQ repo or create new repo with copied scaffold
- Strip UK-specific code (committee config, system prompts, boilerplate rules)
- Set up Railway environment (new project, MySQL, env vars)
- Create EU committee config in `shared/committees.ts` (start with ITRE, IMCO, JURI - the three committees that handled the target legislative files)
- Run `drizzle-kit generate` with new schema

Day 3-4: MEP data + committee membership
- Build MEP ingestion script (EP Open Data Portal REST API)
- Populate `meps` and `committees` tables
- Build basic committee router (adapted from UK)

Day 5: Transcription pipeline kickoff (PARALLEL TRACK)
- Write Python script to scrape HLS URLs from multimedia.europarl.europa.eu for 5 target committee hearings
- Extract English audio tracks using ffmpeg
- Submit first batch to AssemblyAI with diarisation enabled
- This runs in background while we build the rest

**Week 2: Core Data Ingestion**

Day 1-3: EUR-Lex/CELLAR ingestion
- Write SPARQL queries for the three target legislative files
- Download and parse HTML content
- Build article-level chunking logic
- Generate embeddings, insert into DB + Pinecone

Day 4-5: CRE plenary ingestion
- Download CRE XML for plenary debates on the three target files
- Parse speaker turns from XML
- Chunk, embed, insert

**Week 3: Votes + Search**

Day 1-2: Roll-call vote ingestion
- Download HowTheyVote CSV
- Filter for votes on the three target legislative files
- Parse and insert into `votingRecord`

Day 3-5: Search pipeline adaptation
- Adapt `streamingSearch.ts` with EU system prompts
- Update query expansion dictionary for EU terminology
- Update committee detection logic for EU abbreviations (ITRE, IMCO, JURI)
- Inject MEP data context for member-related queries
- Inject voting context for vote-related queries
- Test end-to-end search on ingested data

**Week 4: Transcription Attribution + Frontend**

Day 1-3: Transcription pipeline completion
- Process AssemblyAI results
- Build speaker attribution pipeline (attendance lists + handover phrase parsing)
- Run LLM cleanup pass
- Ingest attributed transcripts into ParlIQ

Day 4-5: Frontend MVP
- Adapt Home.tsx (new branding, EU-specific intro text)
- Adapt committee pages (EU committee tabs)
- Basic MEP profile page
- Deploy to Railway

**Week 5: Polish + Testing**

Day 1-2: Hearing transcript viewer
- Build transcript viewer page with video embed + timestamp sync
- Link from search results to specific transcript moments

Day 3-4: Testing and fixes
- End-to-end search testing across all content types
- Fix attribution errors in transcripts
- Data integrity checks (adapted from UK `/check` protocol)

Day 5: Demo deployment
- Final production deploy
- Data integrity verification
- Demo walkthrough

### Total Estimated Timeline: 5 weeks for a working MVP

This assumes Claude Code does the building with Josh directing. The transcription pipeline runs in parallel with other work, which is why it doesn't add to the critical path - but it is the riskiest element.

### MVP Deliverables

1. Searchable database of 3 major EU legislative files (AI Act, CSDDD, DMA) with full text
2. 5-10 transcribed and speaker-attributed committee hearings related to those files
3. Plenary debate transcripts (CRE) for debates on those files
4. Roll-call vote data for votes on those files
5. MEP profiles for members of the relevant committees
6. Semantic search with streaming AI answers, citations, and follow-up questions
7. Committee detail pages with members, documents, hearings
8. Basic transcript viewer with video deep-linking
9. Deployed on Railway, accessible via URL

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| HLS audio extraction breaks (EP changes video player) | Medium | High | Fall back to manual download via browser |
| Speaker attribution accuracy below 60% | Medium | Medium | Surface confidence scores in UI, let users correct |
| CELLAR SPARQL returns incomplete data | Low | Medium | Supplement with direct HTML download from EUR-Lex |
| AssemblyAI transcription quality poor on interpreted audio | Medium | Medium | Interpreted speech has different acoustics. Test early. If poor, try Whisper with EU-specific fine-tuning |
| EP Open Data Portal rate limiting | Low | Low | Cache aggressively, batch requests |

---

## Appendix A: EU Committee Reference

For MVP, focus on committees that handled the three target legislative files:

| Abbreviation | Full Name | Colour | Target File |
|---|---|---|---|
| ITRE | Industry, Research and Energy | `bg-blue-600` | AI Act (responsible) |
| IMCO | Internal Market and Consumer Protection | `bg-orange-600` | DMA (responsible) |
| JURI | Legal Affairs | `bg-purple-600` | CSDDD (responsible), AI Act (opinion) |
| LIBE | Civil Liberties, Justice and Home Affairs | `bg-red-600` | AI Act (opinion) |
| ECON | Economic and Monetary Affairs | `bg-emerald-600` | Future expansion |
| ENVI | Environment, Public Health and Food Safety | `bg-green-600` | Future expansion |

## Appendix B: Key API Endpoints Reference

| API | Base URL | Notes |
|---|---|---|
| CELLAR SPARQL | `https://publications.europa.eu/webapi/rdf/sparql` | POST with `query` parameter |
| CELLAR REST | `https://publications.europa.eu/resource/cellar/{id}` | Content negotiation via Accept header |
| EP Open Data Portal | `https://data.europarl.europa.eu/api/v1/` | REST, JSON-LD responses |
| HowTheyVote | `https://github.com/HowTheyVote/data/releases/latest/download/` | CSV downloads |
| EP Multimedia | `https://multimedia.europarl.europa.eu/` | Web scraping for HLS URLs |
| OEIL | `https://oeil.secure.europarl.europa.eu/` | Web or XML exports |
| CRE Transcripts | `https://www.europarl.europa.eu/doceo/document/CRE-{ref}_EN.html` | HTML/XML |

## Appendix C: Cost Projection (Monthly, Post-MVP)

| Item | Cost |
|---|---|
| Railway Hobby (app + DB) | ~$10-15 |
| Pinecone (free tier) | $0 |
| OpenAI embeddings (re-embedding rare) | ~$1-2 |
| Claude API (search answers) | ~$5-15 (usage-dependent) |
| AssemblyAI transcription (5 new hearings/month) | ~$4 |
| **Total** | **~$20-36/month** |

---

*Document generated 6 April 2026. Based on analysis of UK ParlIQ codebase at `~/Documents/Claude builds etc/personal-projects/parliament-reports-qa/` and research into EU Parliament open data sources.*
