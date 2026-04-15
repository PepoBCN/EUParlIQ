/**
 * Streaming Search - EU ParlIQ
 * Adapted from UK ParlIQ's streamingSearch.ts
 * Uses pgvector for semantic search instead of Pinecone.
 */

import type { Express, Request, Response } from "express";
import { generateEmbedding } from "./_core/embeddings.js";
import { MODELS, getAnthropicClient } from "./_core/llm.js";
import { db } from "./_core/db.js";
import { documentChunks, documents, votingRecord, meps } from "../drizzle/schema.js";
import { eq, desc, like, sql, and } from "drizzle-orm";
import { COMMITTEES } from "../shared/committees.js";
import postgres from "postgres";

const pgClient = postgres(process.env.DATABASE_URL!);

// ─── Query Expansion for EU terminology ────────────────────────────────────
const QUERY_EXPANSIONS: Record<string, string[]> = {
  regulation: ["directive", "legislative act", "legal framework", "rules"],
  mep: ["member of european parliament", "parliamentarian", "rapporteur"],
  committee: ["ITRE", "IMCO", "JURI", "LIBE", "ECON", "ENVI"],
  vote: ["roll-call", "division", "adopted", "rejected", "plenary vote"],
  amendment: ["compromise", "tabled", "proposed change"],
  commission: ["european commission", "commissioner", "DG"],
  council: ["council of the eu", "member states", "presidency"],
  trilogue: ["interinstitutional negotiation", "compromise text", "first reading agreement"],
  rapporteur: ["shadow rapporteur", "lead negotiator", "dossier"],
  ai: ["artificial intelligence", "AI Act", "high-risk AI", "foundation model"],
  digital: ["digital markets", "gatekeeper", "platform regulation", "DMA", "DSA"],
  sustainability: ["due diligence", "corporate sustainability", "CSDDD", "supply chain"],
  climate: ["green deal", "emissions", "carbon", "net zero", "environmental"],
};

function expandQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const expansions: string[] = [query];

  for (const [keyword, synonyms] of Object.entries(QUERY_EXPANSIONS)) {
    if (lowerQuery.includes(keyword)) {
      for (const synonym of synonyms) {
        if (!lowerQuery.includes(synonym.toLowerCase())) {
          expansions.push(query.replace(new RegExp(keyword, "gi"), synonym));
          break;
        }
      }
    }
  }

  return expansions.slice(0, 3);
}

// ─── Committee Detection ───────────────────────────────────────────────────
function detectCommittees(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return COMMITTEES.filter((c) =>
    c.keywords.some((kw) => lowerQuery.includes(kw)) ||
    lowerQuery.includes(c.abbreviation.toLowerCase())
  ).map((c) => c.abbreviation);
}

// ─── MEP Query Detection ──────────────────────────────────────────────────
function extractMepNameFromQuery(query: string): string | null {
  const patterns = [
    /how\s+did\s+(.+?)\s+vote/i,
    /(.+?)(?:'s|s')\s+voting/i,
    /what\s+did\s+(.+?)\s+say/i,
    /(.+?)(?:'s|s')\s+(position|view|stance)/i,
    /mep\s+(.+?)(?:\?|$)/i,
    /about\s+(.+?)\s+(?:from|in|on)/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50) return name;
    }
  }
  return null;
}

// ─── Voting Context ───────────────────────────────────────────────────────
async function fetchVotingContext(query: string): Promise<string> {
  const mepName = extractMepNameFromQuery(query);

  if (mepName) {
    const memberVotes = await db.select().from(votingRecord)
      .where(like(votingRecord.mepName, `%${mepName}%`))
      .orderBy(desc(votingRecord.date))
      .limit(30);

    if (memberVotes.length === 0) return "";

    const name = memberVotes[0].mepName;
    const totalVotes = memberVotes.length;
    const rebellions = memberVotes.filter((v) => v.votedAgainstGroup).length;

    const voteLines = memberVotes.slice(0, 15).map((v) =>
      `    <vote date="${v.date}" title="${v.title}" votedFor="${v.memberVotedFor}" votedAgainstGroup="${v.votedAgainstGroup}" />`
    ).join("\n");

    return `\n<voting_record mep="${name}" totalVotes="${totalVotes}" rebellions="${rebellions}" group="${memberVotes[0].politicalGroup}">
${voteLines}
</voting_record>\n`;
  }

  return "";
}

// ─── MEP Context ──────────────────────────────────────────────────────────
async function fetchMepContext(query: string): Promise<string> {
  const mepName = extractMepNameFromQuery(query);
  if (!mepName) return "";

  const results = await db.select().from(meps)
    .where(like(meps.name, `%${mepName}%`))
    .limit(3);

  if (results.length === 0) return "";

  const mepLines = results.map((m) =>
    `  <mep name="${m.name}" country="${m.country}" group="${m.politicalGroup}" committees="${JSON.stringify(m.committees?.map((c: { abbreviation: string }) => c.abbreviation) || [])}" />`
  ).join("\n");

  return `\n<mep_profiles>\n${mepLines}\n</mep_profiles>\n`;
}

// ─── Vector Search via pgvector ───────────────────────────────────────────
interface SearchResult {
  id: number;
  documentId: number;
  content: string;
  sectionHeading: string | null;
  chunkType: string | null;
  speakerName: string | null;
  speakerRole: string | null;
  similarity: number;
  docTitle: string;
  docUrl: string;
  docReference: string;
  docCommittee: string;
  docDate: string;
}

async function semanticSearch(queryEmbedding: number[], limit: number = 15): Promise<SearchResult[]> {
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await pgClient`
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.section_heading,
      dc.chunk_type,
      dc.speaker_name,
      dc.speaker_role,
      1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity,
      d.title as doc_title,
      d.url as doc_url,
      d.reference as doc_reference,
      d.committee as doc_committee,
      d.publication_date as doc_date
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    ORDER BY dc.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    documentId: r.document_id as number,
    content: r.content as string,
    sectionHeading: r.section_heading as string | null,
    chunkType: r.chunk_type as string,
    speakerName: r.speaker_name as string | null,
    speakerRole: r.speaker_role as string | null,
    similarity: parseFloat(r.similarity as string),
    docTitle: r.doc_title as string,
    docUrl: r.doc_url as string,
    docReference: r.doc_reference as string,
    docCommittee: r.doc_committee as string,
    docDate: r.doc_date as string,
  }));
}

// ─── Build context XML for Claude ─────────────────────────────────────────
function buildContextXml(results: SearchResult[], votingContext: string, mepContext: string): string {
  const sources = results.map((r, i) => {
    const speaker = r.speakerName ? ` speaker="${r.speakerName}"` : "";
    const role = r.speakerRole ? ` role="${r.speakerRole}"` : "";
    return `  <source index="${i + 1}" title="${r.docTitle}" reference="${r.docReference}" committee="${r.docCommittee}" date="${r.docDate}" type="${r.chunkType}" similarity="${(r.similarity * 100).toFixed(1)}%"${speaker}${role}>
    ${r.content.substring(0, 2000)}
  </source>`;
  }).join("\n");

  return `<evidence>\n${sources}\n</evidence>\n${votingContext}${mepContext}`;
}

// ─── System Prompt ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are EUParlIQ, an AI assistant that answers questions about the European Parliament using primary source evidence.

RULES:
- Answer ONLY from the provided evidence. Do not use general knowledge.
- Cite sources using [Source N] format, where N matches the source index.
- If the evidence doesn't contain enough information, say so clearly.
- When quoting MEPs or officials, attribute the quote to the speaker.
- Use UK English spelling.
- Be concise and direct. Lead with the answer, then provide supporting evidence.
- When discussing votes, mention the political group context.
- For MEP-related queries, reference their committee memberships and political group.

CONTEXT:
- Data covers the 9th and 10th European Parliament legislatures (2019-2029)
- Three focus legislative files: AI Act, Digital Markets Act (DMA), Corporate Sustainability Due Diligence Directive (CSDDD)
- Six committees: ITRE, IMCO, JURI, LIBE, ECON, ENVI
- Sources include CRE plenary debate transcripts, roll-call votes, and procedure metadata`;

// ─── Follow-up Question Generation ────────────────────────────────────────
function generateFollowUps(query: string, results: SearchResult[]): string[] {
  const suggestions: string[] = [];
  const committees = new Set(results.map((r) => r.docCommittee).filter(Boolean));
  const speakers = new Set(results.map((r) => r.speakerName).filter(Boolean));

  if (speakers.size > 0) {
    const speaker = [...speakers][0];
    suggestions.push(`How did ${speaker} vote on this issue?`);
  }
  if (committees.size > 0) {
    const committee = [...committees][0];
    suggestions.push(`What other debates happened in ${committee}?`);
  }
  if (query.toLowerCase().includes("vote")) {
    suggestions.push("Which political groups were divided on this?");
  } else {
    suggestions.push("What were the main points of disagreement?");
  }

  return suggestions.slice(0, 3);
}

// ─── SSE Helpers ──────────────────────────────────────────────────────────
function sseWrite(res: Response, data: unknown) {
  res.write("data: " + JSON.stringify(data) + "\n\n");
}

// ─── SSE Streaming Endpoint ───────────────────────────────────────────────
export function registerStreamingSearch(app: Express) {
  app.post("/api/search/stream", async (req: Request, res: Response) => {
    const { query, mode = "quick", limit = 15 } = req.body as {
      query: string;
      mode?: "quick" | "deep";
      limit?: number;
    };

    if (!query || query.length < 3) {
      res.status(400).json({ error: "Query too short" });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      // 1. Expand query
      const expandedQueries = expandQuery(query);

      // 2. Generate embeddings for all query variants
      const embeddings = await Promise.all(
        expandedQueries.map((q) => generateEmbedding(q))
      );

      // 3. Search with each embedding, merge and deduplicate
      const allResults: SearchResult[] = [];
      const seenIds = new Set<number>();

      for (const embedding of embeddings) {
        const results = await semanticSearch(embedding, limit);
        for (const r of results) {
          if (!seenIds.has(r.id)) {
            seenIds.add(r.id);
            allResults.push(r);
          }
        }
      }

      // Sort by similarity and take top results
      allResults.sort((a, b) => b.similarity - a.similarity);
      const topResults = allResults.slice(0, limit);

      // 4. Send sources first
      sseWrite(res, {
        type: "sources",
        sources: topResults.map((r) => ({
          title: r.docTitle,
          reference: r.docReference,
          committee: r.docCommittee,
          date: r.docDate,
          url: r.docUrl,
          chunkType: r.chunkType,
          speakerName: r.speakerName,
          similarity: r.similarity,
          excerpt: r.content.substring(0, 200),
        })),
      });

      // 5. Fetch additional context
      const [votingContext, mepContext] = await Promise.all([
        fetchVotingContext(query),
        fetchMepContext(query),
      ]);

      // 6. Build context and stream AI answer
      const contextXml = buildContextXml(topResults, votingContext, mepContext);

      const client = getAnthropicClient();
      try {
        const stream = client.messages.stream({
          model: MODELS[mode],
          max_tokens: mode === "quick" ? 1024 : 4096,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: contextXml + "\n\nQuestion: " + query,
          }],
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            sseWrite(res, { type: "text", text: event.delta.text });
          }
        }
      } catch (llmErr) {
        const msg = llmErr instanceof Error ? llmErr.message : String(llmErr);
        console.error("[search] LLM error:", msg);
        if (msg.includes("401") || msg.includes("authentication")) {
          sseWrite(res, { type: "error", message: "API authentication failed." });
        } else if (msg.includes("429") || msg.includes("rate")) {
          sseWrite(res, { type: "error", message: "Rate limited. Try again in a moment." });
        } else if (msg.includes("model") || msg.includes("not_found")) {
          sseWrite(res, { type: "error", message: "AI model unavailable." });
        } else {
          sseWrite(res, { type: "error", message: `AI answer failed: ${msg.slice(0, 100)}` });
        }
        res.end();
        return;
      }

      // 7. Send follow-up questions
      const followUps = generateFollowUps(query, topResults);
      sseWrite(res, { type: "followups", questions: followUps });

      // 8. Done
      sseWrite(res, { type: "done" });
      res.end();
    } catch (err) {
      console.error("[search] Error:", err);
      sseWrite(res, { type: "error", message: "Search failed. Please try again." });
      res.end();
    }
  });
}
