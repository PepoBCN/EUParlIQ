/**
 * One-off script to fix data quality issues in production DB.
 * Run: DATABASE_URL=... npx tsx scripts/fix-data.ts
 *
 * Fixes:
 * - #10: AI Act and DMA procedure statuses (ongoing → adopted)
 * - #11: Backfill committee field on voting records using title keywords
 */

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url);

async function main() {
  console.log("[fix-data] Starting data fixes...\n");

  // ── Fix #10: Procedure statuses ────────────────────────────────────────
  console.log("── Fix #10: Procedure statuses ──");

  const aiAct = await sql`
    UPDATE procedures SET status = 'adopted', updated_at = NOW()
    WHERE reference = '2021/0106(COD)' AND status != 'adopted'
  `;
  console.log(`  AI Act (2021/0106(COD)): ${aiAct.count} row(s) updated`);

  const dma = await sql`
    UPDATE procedures SET status = 'adopted', updated_at = NOW()
    WHERE reference = '2020/0374(COD)' AND status != 'adopted'
  `;
  console.log(`  DMA (2020/0374(COD)): ${dma.count} row(s) updated`);

  // Verify
  const procs = await sql`SELECT reference, status FROM procedures ORDER BY reference`;
  for (const p of procs) {
    console.log(`  ✓ ${p.reference} → ${p.status}`);
  }

  // ── Fix #11: Backfill committee on voting records ──────────────────────
  console.log("\n── Fix #11: Vote committee backfill ──");

  const itre = await sql`
    UPDATE voting_record SET committee = 'ITRE'
    WHERE (committee = '' OR committee IS NULL)
    AND (title ILIKE '%artificial intelligence%' OR title ILIKE '%ai act%')
  `;
  console.log(`  ITRE (AI-related votes): ${itre.count} row(s) updated`);

  const imco = await sql`
    UPDATE voting_record SET committee = 'IMCO'
    WHERE (committee = '' OR committee IS NULL)
    AND (title ILIKE '%digital markets%' OR title ILIKE '%gatekeeper%' OR title ILIKE '%digital services%')
  `;
  console.log(`  IMCO (DMA-related votes): ${imco.count} row(s) updated`);

  const juri = await sql`
    UPDATE voting_record SET committee = 'JURI'
    WHERE (committee = '' OR committee IS NULL)
    AND (title ILIKE '%due diligence%' OR title ILIKE '%corporate sustainability%' OR title ILIKE '%csddd%')
  `;
  console.log(`  JURI (CSDDD-related votes): ${juri.count} row(s) updated`);

  // Summary
  const remaining = await sql`
    SELECT count(*) as n FROM voting_record WHERE committee = '' OR committee IS NULL
  `;
  console.log(`  Remaining unmatched votes: ${remaining[0].n}`);

  await sql.end();
  console.log("\n[fix-data] Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
