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
