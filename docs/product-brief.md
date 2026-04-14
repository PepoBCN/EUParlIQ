# EU ParlIQ - Product Brief

*Created: 6 April 2026*

## The Bet

Brussels professionals waste hours stitching together fragmented sources that an AI layer could unify in seconds. Nobody combines structured legislative data (votes, amendments, procedures) with unstructured content (hearing transcripts, debate speeches) in a single AI-searchable interface.

## One-liner

"Search everything the EU institutions have said, voted, and published on any policy topic - including committee hearings nobody else transcribes - in one AI-powered query."

---

## 1. User Scenarios

### A: "What's the latest on the AI Act trilogue?"
A consultant at a Brussels PA firm has a client meeting in two hours. They need: what amendments were adopted in IMCO/LIBE, what the Council's general approach changed, where the trilogue landed, and which MEPs drove the key compromises. Today this means checking OEIL, the EP Legislative Observatory, digging through Council press releases, and reading Politico Pro's summary. EU ParlIQ answers it in one query, with attributed sources.

### B: "Prepare me for a meeting with MEP X"
A legal team meeting an MEP on the ENVI committee needs: what reports has she been rapporteur on, what questions has she asked in committee, how did she vote on key environmental files, what written questions has she tabled, and what did she say during the last CSRD hearing. Today this requires manually searching the EP website across five different sections. EU ParlIQ builds this profile automatically.

### C: "Who's pushing back on scope 3 reporting in CSRD?"
A sustainability consultancy wants to know which MEPs and political groups are hostile to mandatory scope 3 reporting. They need specific quotes from committee hearings, amendment text, and voting patterns. Currently almost impossible without watching hours of committee video. EU ParlIQ surfaces the quotes, attributes them, and links to the timestamp.

### D: "Alert me when anything moves on packaging regulation"
A trade association monitors the Packaging and Packaging Waste Regulation across all institutions. Commission proposal updates, EP committee votes, Council working party progress, new amendments. Today they pay someone to check five websites daily. EU ParlIQ sends a digest.

### E: "Compare the Commission proposal with the EP's adopted amendments"
A law firm advising on compliance needs to understand exactly what changed between the Commission's original text and what Parliament adopted. Line-by-line diff with context on who proposed what and why. Currently done manually in Word with track changes.

### F: "What did the expert witnesses say about AI liability?"
During a JURI committee hearing on the AI Liability Directive, several experts testified. A policy officer needs the key arguments, attributed to speakers, searchable. Today: watch a three-hour video in a language you may not speak, or hope someone published minutes (they often don't, or they're sparse).

---

## 2. Competitor Analysis

### Politico Pro
- **Strengths:** Excellent journalism, good alerting, strong political context
- **Weaknesses:** No raw data access, no structured search across legislative text, zero committee transcript search
- **Pricing:** ~EUR6-8K/seat/year
- **Gap EU ParlIQ fills:** Politico tells you what happened. EU ParlIQ lets you find what you need.

### FiscalNote (inc. CQ Roll Call, VoterVoice)
- **Strengths:** Strong US presence, decent dashboards
- **Weaknesses:** EU coverage is bolted on and shallow. Feels like a US tool with European paint. No transcript search, limited amendment tracking.

### Dods (now Govnet)
- **Strengths:** Decent UK coverage
- **Weaknesses:** EU offering is thin. Manual curation rather than AI. Slow.

### VoteWatch Europe
- **Strengths:** Was the best free source for EP voting data. Genuinely useful voting analysis.
- **Weaknesses:** Declining/pivoting since ~2023. Product stagnated, dated interface, basic search.
- **Gap:** Their decline left MEP voting analysis underserved.

### Legislative Train Schedule (EP's own tool)
- **Strengths:** Free, well-maintained, excellent for tracking where a file sits in the process. The mental model Brussels people already use.
- **Weaknesses:** Zero depth - no transcript search, no amendment detail, no AI.

### Opolitics
- **Strengths:** Newer, AI-focused. Decent NLP.
- **Weaknesses:** Limited data sources - mostly public documents, not transcripts or structured voting data. Light on attribution.

### Govlix
- Different market (public procurement, not legislative intelligence).

### The moat
Nobody combines structured legislative data with unstructured content (hearing transcripts, debate speeches) in a single AI-searchable interface. The committee hearing transcripts - searchable, speaker-attributed - are the single feature that would make someone say "I need this."

---

## 3. Data Sources

### European Parliament
| Source | Format | API? | Notes |
|---|---|---|---|
| OEIL (Legislative Observatory) | Structured | Yes | Procedure tracking, rapporteur assignments, committee referrals |
| EP Plenary (CRE verbatim reports) | XML, speaker-attributed | Yes | Available in all EU languages. This is gold. |
| EP Committee documents | PDFs, some structured | Partial | Agendas, draft reports, amendments, voting results |
| EP Roll-call votes | XML (PV documents) | Yes | Structured voting data |
| MEP Profiles | Structured | Yes | Activities, declarations, questions |
| Parliamentary Questions | Structured | Yes | Written and oral, with answers |
| Amendments | PDFs per legislative file | No | Needs PDF parsing. Messy but essential. |

### Committee Hearings / Video Transcripts (The Hard Bit)
- EP committee hearings streamed on EP Multimedia (multimedia.europarl.europa.eu)
- Video archive is comprehensive going back years
- **Verbatim transcripts exist for plenary (CRE) but NOT for committee hearings** in most cases. Committee minutes are summary only.
- Interpretation audio available in multiple languages (simultaneous interpretation feeds)
- **Speaker attribution is the core challenge.** Unlike plenary (where the President announces each speaker), committee chairs don't always name speakers clearly.
- **Practical approach:** Use EP's multilingual video with English interpretation audio track. Run through Whisper (or AssemblyAI for better diarisation). Cross-reference committee attendance list and agenda to attribute speakers. Won't be perfect but 80%+ accurate - far better than nothing.

### European Commission
| Source | Format | API? | Notes |
|---|---|---|---|
| EUR-Lex | Structured (CELLAR/SPARQL) | Yes | All legislation, proposals, delegated acts. EuroVoc taxonomy. |
| Impact Assessments | PDFs | No | Published alongside proposals. Need parsing. |
| Public Consultations | Structured | Partial | Have Your Say portal. |
| Comitology Register | Semi-structured | Limited | Implementing and delegated acts in preparation. |

### Council of the EU (The Black Box)
- Press releases and outcome documents - available
- Compromise texts / negotiating mandates - rarely published until adopted
- Voting records - published post-adoption only
- **Practical approach:** Ingest what's public. Don't promise Council transparency you can't deliver.

### Cross-Institutional
- EUR-Lex for definitive legal text at each stage
- EuroVoc for taxonomy/tagging (standardised thesaurus, essential for cross-referencing)
- Interinstitutional Register for trilogue documents (limited but growing)

---

## 4. Full Feature Set

### Search and Discovery
- AI-powered natural language search across all sources
- Semantic search (embeddings)
- Source attribution with direct links
- Multi-language query support (ask in English, find French-language hearing results)

### Legislative Tracking
- File-level dashboards: procedure status, key dates, responsible committees, rapporteur/shadows
- Amendment tracker with diff view
- Timeline of a file's journey through institutions

### People Intelligence
- MEP profiles with aggregated activity (speeches, votes, questions, reports)
- Political group analysis
- Expert witness profiles (who testifies, on what, how often)
- Voting pattern analysis

### Committee Monitoring
- Hearing transcript search with speaker attribution
- Committee activity feeds
- Agenda tracking with alerts

### Alerts and Digests
- Configurable alerts by topic, committee, MEP, or legislative file
- Daily/weekly AI-generated digests
- "What changed since I last looked" summaries

### Analysis Tools
- Compare text across legislative stages (proposal vs amendments vs adopted)
- Voting cohesion analysis by political group
- Cross-reference who said what with how they voted

---

## 5. MVP Scope

**Timeframe:** 6-8 weeks. One developer (Claude Code-assisted).

**Data scope:** Pick three active, high-profile legislative files (e.g. AI Act implementation, CSRD delegated acts, Net Zero Industry Act). Ingest everything related to these three files only.

### MVP features
1. **Search** - AI-powered Q&A across all ingested data for these three files. "What did MEP X say about AI Act Article 6?"
2. **File dashboard** - One-page view of each file's status, key actors, timeline
3. **Transcript search** - Process 5-10 committee hearings related to these files. Whisper transcription, basic speaker attribution. Searchable with timestamps linking to video.
4. **MEP profiles** - For MEPs involved in these three files. Activity feed, voting record on relevant votes.
5. **Text diff** - For at least one file, show Commission proposal vs EP adopted text with changes highlighted.

### What this proves
- Unified search across structured data + transcripts is genuinely useful
- Transcript processing works well enough
- UX is faster than Politico Pro for specific queries

### What this deliberately excludes (for later)
- Council data (too opaque for MVP)
- Alerts/digests (nice-to-have, not proof-of-concept)
- Full multilingual search (English only for MVP)
- Historical data (current session only, like UK ParlIQ)

---

## 6. Why Switch from Politico Pro?

Politico Pro is a newspaper with alerts. EU ParlIQ is an intelligence tool with answers. They're complementary, but for "I need to know exactly what MEP Muller said about scope 3 in the ENVI hearing on March 12th," Politico can't help and EU ParlIQ can.

**The real unlock:** Committee hearing transcripts. Nobody else has them in searchable form. Brussels professionals currently watch hours of video or rely on colleagues' notes. Making this searchable and speaker-attributed is the single feature that would make someone say "I need this."
