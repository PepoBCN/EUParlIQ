import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

/**
 * Enable pgvector extension - run once on database setup
 */
export async function enablePgvector() {
  await client`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("[db] pgvector extension enabled");
}

/**
 * Create HNSW index on document_chunks embedding column
 * Run after initial schema migration
 */
export async function createVectorIndex() {
  await client`
    CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `;
  console.log("[db] HNSW vector index created");
}

/**
 * One-time data fixes. Idempotent - safe to run multiple times.
 * Fixes: #10 (procedure statuses), #11 (vote committee backfill)
 */
export async function runDataFixes() {
  // Fix #10: Correct procedure statuses
  const aiAct = await client`
    UPDATE procedures SET status = 'adopted', updated_at = NOW()
    WHERE reference = '2021/0106(COD)' AND status != 'adopted'
  `;
  const dma = await client`
    UPDATE procedures SET status = 'adopted', updated_at = NOW()
    WHERE reference = '2020/0374(COD)' AND status != 'adopted'
  `;
  if (Number(aiAct.count) + Number(dma.count) > 0) {
    console.log(`[db] Fix #10: Updated ${Number(aiAct.count) + Number(dma.count)} procedure status(es)`);
  }

  // Fix #11: Backfill committee on voting records
  const itre = await client`
    UPDATE voting_record SET committee = 'ITRE'
    WHERE (committee = '' OR committee IS NULL)
    AND (title ILIKE '%artificial intelligence%' OR title ILIKE '%ai act%')
  `;
  const imco = await client`
    UPDATE voting_record SET committee = 'IMCO'
    WHERE (committee = '' OR committee IS NULL)
    AND (title ILIKE '%digital markets%' OR title ILIKE '%gatekeeper%' OR title ILIKE '%digital services%')
  `;
  const juri = await client`
    UPDATE voting_record SET committee = 'JURI'
    WHERE (committee = '' OR committee IS NULL)
    AND (title ILIKE '%due diligence%' OR title ILIKE '%corporate sustainability%' OR title ILIKE '%csddd%')
  `;
  const total = Number(itre.count) + Number(imco.count) + Number(juri.count);
  if (total > 0) {
    console.log(`[db] Fix #11: Backfilled committee on ${total} voting record(s) (ITRE:${itre.count}, IMCO:${imco.count}, JURI:${juri.count})`);
  }
}
