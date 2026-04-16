/**
 * CRE Plenary Transcript Ingestion
 * Source: EP Doceo CRE pages (https://www.europarl.europa.eu/doceo/document/CRE-{term}-{date}_EN.html)
 * Parses speaker-attributed debate transcripts for target legislative files.
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { documents, documentChunks, plenaryDebates } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { generateEmbedding, generateEmbeddingBatch } from "../_core/embeddings.js";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const CACHE_DIR = path.join(import.meta.dirname, "../../.cache/cre");

// Target debate sessions - dates when our 3 files were debated/voted
const TARGET_SESSIONS = [
  // AI Act
  { date: "2024-03-13", term: 9, title: "AI Act - Final Vote", file: "AI Act", keywords: ["artificial intelligence", "ai act", "regulation on artificial intelligence"] },
  { date: "2023-06-14", term: 9, title: "AI Act - EP First Reading", file: "AI Act", keywords: ["artificial intelligence", "ai act"] },
  // DMA
  { date: "2022-07-05", term: 9, title: "DMA - Final Vote", file: "Digital Markets Act", keywords: ["digital markets act", "gatekeeper", "contestable and fair markets"] },
  { date: "2021-12-15", term: 9, title: "DMA - EP Committee Vote", file: "Digital Markets Act", keywords: ["digital markets", "gatekeeper"] },
  // CSDDD
  { date: "2024-04-24", term: 9, title: "CSDDD - Final Vote", file: "CSDDD", keywords: ["due diligence", "corporate sustainability", "supply chain"] },
  { date: "2023-06-01", term: 9, title: "CSDDD - EP First Reading", file: "CSDDD", keywords: ["due diligence", "corporate sustainability"] },
];

interface SpeakerTurn {
  speakerName: string;
  speakerRole: string | null;  // "on behalf of the PPE Group", "Vice-President of the Commission", etc.
  text: string;
  agendaItem: string | null;
}

async function downloadCre(date: string, term: number): Promise<string> {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const filename = `CRE-${term}-${date}_EN.html`;
  const filepath = path.join(CACHE_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log(`[plenary] Using cached ${filename}`);
    return fs.readFileSync(filepath, "utf-8");
  }

  const url = `https://www.europarl.europa.eu/doceo/document/${filename}`;
  console.log(`[plenary] Downloading ${url}...`);
  const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const html = await resp.text();
  fs.writeFileSync(filepath, html);
  return html;
}

/** Check if text is likely English by counting common function words */
function isLikelyEnglish(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const markers = ["the", "and", "of", "to", "in", "is", "that", "for", "this", "with", "was", "are", "have", "not"];
  const count = markers.filter((m) => words.includes(m)).length;
  return count >= 3;
}

function parseSpeakerTurns(html: string, targetKeywords: string[]): SpeakerTurn[] {
  const turns: SpeakerTurn[] = [];

  // Split by speaker entries (doc_subtitle_level1_bis marks each speaker)
  const speakerPattern = /<span class="doc_subtitle_level1_bis"><span class="bold">(.*?)<\/span><\/span>/g;
  const contentPattern = /<p class="contents">(.*?)<\/p>/gs;
  const agendaPattern = /<a name="creitem(\d+)"><\/a>/g;

  // Find all agenda items first
  const agendaItems: Array<{ index: number; id: string }> = [];
  let agendaMatch;
  while ((agendaMatch = agendaPattern.exec(html)) !== null) {
    agendaItems.push({ index: agendaMatch.index, id: agendaMatch[1] });
  }

  // Find all speaker entries and their positions
  const speakers: Array<{ name: string; role: string | null; index: number }> = [];
  let speakerMatch;
  while ((speakerMatch = speakerPattern.exec(html)) !== null) {
    let name = speakerMatch[1].replace(/,?\s*$/, "").trim();
    // Remove trailing punctuation
    name = name.replace(/[.–\-,]\s*$/, "").trim();

    // Try to find role (in italic span after the speaker name)
    const rolePattern = /<span class="italic">(.*?)<\/span>/;
    const afterSpeaker = html.substring(speakerMatch.index, speakerMatch.index + 500);
    const roleMatch = afterSpeaker.match(rolePattern);
    const role = roleMatch ? roleMatch[1].replace(/[.–]/g, "").trim() : null;

    speakers.push({ name, role, index: speakerMatch.index });
  }

  // Extract text for each speaker
  for (let i = 0; i < speakers.length; i++) {
    const startIdx = speakers[i].index;
    const endIdx = i + 1 < speakers.length ? speakers[i + 1].index : html.length;
    const section = html.substring(startIdx, endIdx);

    // Extract all paragraph content
    const paragraphs: string[] = [];
    let pMatch;
    const pPattern = /<p class="contents">(.*?)<\/p>/gs;
    while ((pMatch = pPattern.exec(section)) !== null) {
      // Strip HTML tags
      let text = pMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#8211;/g, "-")
        .replace(/&#8217;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
      if (text && !text.startsWith("(") && text.length > 20) {
        paragraphs.push(text);
      }
    }

    const fullText = paragraphs.join("\n\n");
    if (fullText.length < 50) continue; // Skip very short interventions
    if (!isLikelyEnglish(fullText)) continue; // Skip non-English speeches

    // Determine current agenda item
    let agendaItem: string | null = null;
    for (const item of agendaItems) {
      if (item.index < startIdx) {
        agendaItem = item.id;
      }
    }

    turns.push({
      speakerName: speakers[i].name,
      speakerRole: speakers[i].role,
      text: fullText,
      agendaItem,
    });
  }

  // Filter to only speeches related to our target files
  const relevantTurns = turns.filter((turn) => {
    const lowerText = turn.text.toLowerCase();
    return targetKeywords.some((kw) => lowerText.includes(kw));
  });

  console.log(`[plenary] Found ${turns.length} total speaker turns, ${relevantTurns.length} relevant to target files`);

  // If very few relevant turns, include all - the whole debate might be about the file
  if (relevantTurns.length < 5 && turns.length > 0) {
    console.log(`[plenary] Few keyword matches - including all turns from this session`);
    return turns;
  }

  return relevantTurns;
}

async function ingestSession(session: typeof TARGET_SESSIONS[0]): Promise<number> {
  console.log(`[plenary] Processing: ${session.title} (${session.date})`);

  const html = await downloadCre(session.date, session.term);
  const turns = parseSpeakerTurns(html, session.keywords);

  if (turns.length === 0) {
    console.log(`[plenary] No relevant speeches found for ${session.date}`);
    return 0;
  }

  // Create debate record
  const existingDebate = await db.select().from(plenaryDebates)
    .where(eq(plenaryDebates.sessionDate, session.date));

  let debateId: number;
  if (existingDebate.length > 0) {
    debateId = existingDebate[0].id;
    console.log(`[plenary] Debate record already exists (id: ${debateId})`);
  } else {
    const [newDebate] = await db.insert(plenaryDebates).values({
      sessionDate: session.date,
      title: session.title,
      debateType: "plenary",
      procedureReference: null,
    }).returning();
    debateId = newDebate.id;
  }

  // Create document record for this debate
  const docExternalId = `cre-${session.term}-${session.date}-${session.file.toLowerCase().replace(/\s+/g, "-")}`;
  const existingDoc = await db.select().from(documents).where(eq(documents.externalId, docExternalId));

  let docId: number;
  if (existingDoc.length > 0) {
    docId = existingDoc[0].id;
    console.log(`[plenary] Document record already exists (id: ${docId})`);
  } else {
    const [newDoc] = await db.insert(documents).values({
      externalId: docExternalId,
      title: `${session.title} - CRE Plenary Debate`,
      committee: session.file,
      publicationDate: session.date,
      reference: `CRE-${session.term}-${session.date}`,
      url: `https://www.europarl.europa.eu/doceo/document/CRE-${session.term}-${session.date}_EN.html`,
      documentType: "plenary_debate",
      language: "EN",
    }).returning();
    docId = newDoc.id;
  }

  // Generate embeddings and insert chunks
  console.log(`[plenary] Generating embeddings for ${turns.length} speech chunks...`);

  const texts = turns.map((t) => `${t.speakerName}: ${t.text}`.substring(0, 8000));
  const embeddings = await generateEmbeddingBatch(texts);

  let inserted = 0;
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const chunkExternalId = `${docExternalId}-${i}`;

    const existing = await db.select().from(documentChunks)
      .where(eq(documentChunks.externalId, chunkExternalId));
    if (existing.length > 0) continue;

    await db.insert(documentChunks).values({
      documentId: docId,
      externalId: chunkExternalId,
      content: turn.text.substring(0, 10000),
      sectionHeading: turn.agendaItem ? `Agenda item ${turn.agendaItem}` : session.title,
      chunkType: "plenary_debate",
      speakerName: turn.speakerName,
      speakerRole: turn.speakerRole?.includes("behalf") ? "mep" :
                   turn.speakerRole?.includes("Commission") ? "witness" :
                   turn.speakerRole?.includes("President") || turn.speakerRole?.includes("Chair") ? "chair" :
                   "mep",
      speakers: [turn.speakerName],
      embedding: embeddings[i],
    });
    inserted++;
  }

  console.log(`[plenary] Inserted ${inserted} speech chunks for ${session.title}`);
  return inserted;
}

async function main() {
  console.log("[plenary] Starting CRE plenary transcript ingestion...");

  let totalInserted = 0;

  for (const session of TARGET_SESSIONS) {
    try {
      const inserted = await ingestSession(session);
      totalInserted += inserted;
    } catch (err) {
      console.error(`[plenary] Error processing ${session.date}:`, err);
    }
  }

  console.log(`[plenary] Done! Total speech chunks inserted: ${totalInserted}`);

  // Summary
  const chunkCount = await client`SELECT COUNT(*) as count FROM document_chunks WHERE chunk_type = 'plenary_debate'`;
  console.log(`[plenary] Total plenary debate chunks in DB: ${chunkCount[0].count}`);

  const speakerCount = await client`SELECT COUNT(DISTINCT speaker_name) as count FROM document_chunks WHERE chunk_type = 'plenary_debate'`;
  console.log(`[plenary] Distinct speakers: ${speakerCount[0].count}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
