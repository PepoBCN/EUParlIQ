/**
 * Vote Data Ingestion
 * Source: HowTheyVote.eu API (https://howtheyvote.eu/api/votes)
 * Ingests roll-call votes and individual MEP positions for target legislative files.
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { votingRecord } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const API_BASE = "https://howtheyvote.eu/api";

// Target keywords to find relevant votes
const TARGET_KEYWORDS = [
  "artificial intelligence",
  "ai act",
  "digital markets",
  "digital services",
  "due diligence",
  "csddd",
  "corporate sustainability",
];

interface HtvVote {
  id: string;
  is_main: boolean;
  timestamp: string;
  display_title: string;
  description: string;
  reference: string | null;
  result: string;
  responsible_committees?: Array<{ code: string; label: string; abbreviation: string }>;
  stats?: { for: number; against: number; abstain: number };
  member_votes?: Array<{
    member: {
      id: number;
      full_name: string;
      country: { code: string };
      group: { code: string; short_label: string };
    };
    position: string; // "FOR" | "AGAINST" | "ABSTAIN" | "DID_NOT_VOTE"
  }>;
}

async function fetchJson(url: string): Promise<unknown> {
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

async function findTargetVotes(): Promise<string[]> {
  console.log("[votes] Scanning all votes for target files...");
  const voteIds: string[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const data = (await fetchJson(`${API_BASE}/votes?page_size=100&page=${page}`)) as {
      results: HtvVote[];
      has_next: boolean;
    };

    for (const v of data.results) {
      const title = v.display_title.toLowerCase();
      const ref = (v.reference || "").toLowerCase();
      const matches = TARGET_KEYWORDS.some((kw) => title.includes(kw) || ref.includes(kw));
      if (matches) {
        voteIds.push(v.id);
      }
    }

    hasNext = data.has_next;
    page++;

    // Rate limiting
    await new Promise((r) => setTimeout(r, 200));

    if (page % 5 === 0) {
      console.log(`[votes] Scanned page ${page}, found ${voteIds.length} matching votes so far`);
    }
  }

  console.log(`[votes] Found ${voteIds.length} votes matching target files`);
  return voteIds;
}

async function ingestVote(voteId: string): Promise<number> {
  const vote = (await fetchJson(`${API_BASE}/votes/${voteId}`)) as HtvVote;

  if (!vote.member_votes?.length) {
    console.log(`[votes] Vote ${voteId} has no member votes, skipping`);
    return 0;
  }

  const committee = vote.responsible_committees?.[0]?.abbreviation || "";
  let inserted = 0;

  for (const mv of vote.member_votes) {
    if (mv.position === "DID_NOT_VOTE") continue;

    const mepId = String(mv.member.id);
    const divisionId = voteId;
    const groupCode = mv.member.group?.code || "NI";

    // Check if already exists
    const existing = await db
      .select()
      .from(votingRecord)
      .where(and(eq(votingRecord.mepId, mepId), eq(votingRecord.divisionId, divisionId)));

    if (existing.length > 0) continue;

    // Determine if voted with or against group majority
    // Simple heuristic: if stats exist and majority voted FOR, anyone voting AGAINST rebelled
    let votedAgainstGroup = false;
    if (vote.stats) {
      const majorityFor = vote.stats.for > vote.stats.against;
      const memberVotedFor = mv.position === "FOR";
      // This is simplified - ideally we'd calculate per-group majority
      votedAgainstGroup = majorityFor !== memberVotedFor;
    }

    await db.insert(votingRecord).values({
      mepId,
      mepName: mv.member.full_name,
      committee,
      politicalGroup: groupCode,
      divisionId,
      date: vote.timestamp.substring(0, 10),
      title: vote.display_title,
      memberVotedFor: mv.position === "FOR",
      votedAgainstGroup,
      totalFor: vote.stats?.for ?? null,
      totalAgainst: vote.stats?.against ?? null,
      totalAbstain: vote.stats?.abstain ?? null,
      url: `https://howtheyvote.eu/votes/${voteId}`,
    });
    inserted++;
  }

  return inserted;
}

async function main() {
  console.log("[votes] Starting vote ingestion...");

  // Find all votes matching target files
  const voteIds = await findTargetVotes();

  let totalInserted = 0;

  for (let i = 0; i < voteIds.length; i++) {
    const voteId = voteIds[i];
    console.log(`[votes] Processing vote ${i + 1}/${voteIds.length}: ${voteId}`);

    try {
      const inserted = await ingestVote(voteId);
      totalInserted += inserted;
      console.log(`[votes]   -> Inserted ${inserted} member votes`);
    } catch (err) {
      console.error(`[votes] Error processing vote ${voteId}:`, err);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[votes] Done! Total member votes inserted: ${totalInserted}`);

  // Summary
  const countResult = await client`SELECT COUNT(*) as count FROM voting_record`;
  console.log(`[votes] Total records in DB: ${countResult[0].count}`);

  const voteCount = await client`SELECT COUNT(DISTINCT division_id) as count FROM voting_record`;
  console.log(`[votes] Distinct votes: ${voteCount[0].count}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
