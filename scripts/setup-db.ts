import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url);

async function main() {
  // Enable pgvector
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("[setup] pgvector extension enabled");

  // Verify
  const result = await sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`;
  console.log("[setup] Verified extensions:", result.map((r) => r.extname));

  await sql.end();
  console.log("[setup] Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
