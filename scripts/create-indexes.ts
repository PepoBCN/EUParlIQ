import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url);

async function main() {
  // Create HNSW index for vector similarity search
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `;
  console.log("[index] HNSW vector index created");

  // Verify tables
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log("[index] Tables:", tables.map((t) => t.tablename).join(", "));

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
