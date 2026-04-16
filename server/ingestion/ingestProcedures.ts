/**
 * Legislative Procedure Ingestion
 * Source: Parltrack dossier dump (https://parltrack.org/dumps/ep_dossiers.json.lz)
 * Ingests procedure metadata for target legislative files.
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { procedures, documents } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const CACHE_DIR = path.join(import.meta.dirname, "../../.cache");
const COMPRESSED_PATH = path.join(CACHE_DIR, "ep_dossiers.json.lz");
const TARGET_JSON_PATH = path.join(CACHE_DIR, "target_dossiers.json");

// Our 3 target legislative files
const TARGET_REFS = [
  "2021/0106(COD)",  // AI Act
  "2020/0374(COD)",  // Digital Markets Act
  "2022/0051(COD)",  // CSDDD
];

interface ParltrackDossier {
  procedure: {
    reference: string;
    title: string;
    type: string;
    stage_reached: string;
    dossier_of_the_committee: string;
    committee: Array<{
      committee_full: string;
      committee: string;
      rapporteur: Array<{ name: string; mepref: number }>;
      responsible: boolean;
    }>;
  };
  events: Array<{
    type: string;
    date: string;
    body: string;
    docs?: Array<{ url: string; title: string; type: string }>;
  }>;
  docs: Array<{
    title: string;
    type: string;
    url: string;
    date?: string;
  }>;
}

async function loadDossiers(): Promise<ParltrackDossier[]> {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Check if we already have the extracted target dossiers
  if (fs.existsSync(TARGET_JSON_PATH)) {
    console.log("[procedures] Using cached target dossiers");
    const raw = fs.readFileSync(TARGET_JSON_PATH, "utf-8");
    return JSON.parse(raw);
  }

  // Download and extract target dossiers using Python (Node can't handle the full 500MB+ JSON)
  const needsDownload = !fs.existsSync(COMPRESSED_PATH);
  if (needsDownload) {
    console.log("[procedures] Downloading Parltrack dossier dump...");
    execSync(`curl -s --max-time 120 "https://parltrack.org/dumps/ep_dossiers.json.lz" -o "${COMPRESSED_PATH}"`);
  }

  console.log("[procedures] Extracting target dossiers with Python...");
  const targetRefsJson = JSON.stringify(TARGET_REFS);
  execSync(`python3 -c "
import lzma, json
with open('${COMPRESSED_PATH}','rb') as f:
    data = lzma.decompress(f.read())
dossiers = json.loads(data)
targets = ${targetRefsJson}
result = [d for d in dossiers if d.get('procedure',{}).get('reference','') in targets]
with open('${TARGET_JSON_PATH}', 'w') as f:
    json.dump(result, f, indent=2)
print(f'Extracted {len(result)} target dossiers')
"`);

  const raw = fs.readFileSync(TARGET_JSON_PATH, "utf-8");
  return JSON.parse(raw);
}

type ProcedureType = "COD" | "CNS" | "APP" | "NLE" | "INI" | "RSP" | "BUD" | "DEC";

function mapProcedureType(ref: string): ProcedureType {
  const match = ref.match(/\((\w+)\)/);
  const type = match?.[1] || "COD";
  const valid: ProcedureType[] = ["COD", "CNS", "APP", "NLE", "INI", "RSP", "BUD", "DEC"];
  return valid.includes(type as ProcedureType) ? (type as ProcedureType) : "COD";
}

function mapStatus(stage: string): "ongoing" | "adopted" | "rejected" | "withdrawn" {
  const lower = stage.toLowerCase();
  if (lower.includes("adopted") || lower.includes("signed") || lower.includes("published")) return "adopted";
  if (lower.includes("rejected")) return "rejected";
  if (lower.includes("withdrawn")) return "withdrawn";
  return "ongoing";
}

/** Known final statuses that Parltrack data may not reflect correctly */
const STATUS_OVERRIDES: Record<string, "ongoing" | "adopted" | "rejected" | "withdrawn"> = {
  "2021/0106(COD)": "adopted",  // AI Act - signed into law 13 June 2024
  "2020/0374(COD)": "adopted",  // DMA - entered into force 1 November 2022
};

async function ingestDossier(dossier: ParltrackDossier): Promise<void> {
  const proc = dossier.procedure;
  const ref = proc.reference;
  console.log(`[procedures] Processing: ${ref} - ${proc.title}`);

  // Find responsible committee and rapporteur
  const responsibleComm = proc.committee?.find((c) => c.responsible);
  const rapporteur = responsibleComm?.rapporteur?.[0];

  // Find latest event date
  const events = dossier.events || [];
  const latestEvent = events.length > 0
    ? events.sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  // Upsert procedure
  const existing = await db.select().from(procedures).where(eq(procedures.reference, ref));

  if (existing.length > 0) {
    await db.update(procedures)
      .set({
        title: proc.title,
        type: mapProcedureType(ref),
        status: STATUS_OVERRIDES[ref] ?? mapStatus(proc.stage_reached || ""),
        responsibleCommittee: responsibleComm?.committee || null,
        rapporteur: rapporteur?.name || null,
        rapporteurMepId: rapporteur?.mepref ? String(rapporteur.mepref) : null,
        latestEventDate: latestEvent?.date?.substring(0, 10) || null,
        oeilUrl: `https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=${ref}&l=en`,
        updatedAt: new Date(),
      })
      .where(eq(procedures.reference, ref));
    console.log(`[procedures]   Updated existing procedure`);
  } else {
    await db.insert(procedures).values({
      reference: ref,
      title: proc.title,
      type: mapProcedureType(ref),
      status: mapStatus(proc.stage_reached || ""),
      responsibleCommittee: responsibleComm?.committee || null,
      rapporteur: rapporteur?.name || null,
      rapporteurMepId: rapporteur?.mepref ? String(rapporteur.mepref) : null,
      proposalDate: events.find((e) => e.type === "Commission/Presidency/Initiator")?.date?.substring(0, 10) || null,
      latestEventDate: latestEvent?.date?.substring(0, 10) || null,
      oeilUrl: `https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=${ref}&l=en`,
    });
    console.log(`[procedures]   Inserted new procedure`);
  }

  // Insert related documents
  const docs = dossier.docs || [];
  for (const doc of docs) {
    if (!doc.url || !doc.title) continue;

    const docExternalId = `proc-${ref.replace(/[\/\(\)]/g, "-")}-${Buffer.from(doc.url).toString("base64").substring(0, 20)}`;

    const existingDoc = await db.select().from(documents).where(eq(documents.externalId, docExternalId));
    if (existingDoc.length > 0) continue;

    await db.insert(documents).values({
      externalId: docExternalId,
      title: doc.title || "Untitled document",
      committee: responsibleComm?.committee || proc.title,
      publicationDate: doc.date?.substring(0, 10) || latestEvent?.date?.substring(0, 10) || "2024-01-01",
      reference: ref,
      url: doc.url,
      documentType: doc.type || "legislative_document",
      procedureReference: ref,
      language: "EN",
    });
  }
  console.log(`[procedures]   Inserted ${docs.filter((d) => d.url && d.title).length} documents`);

  // Log key events
  console.log(`[procedures]   Events:`);
  for (const event of events.slice(0, 5)) {
    console.log(`    ${event.date?.substring(0, 10)} - ${event.type} (${event.body})`);
  }
}

async function main() {
  console.log("[procedures] Starting procedure ingestion...");

  const allDossiers = await loadDossiers();
  console.log(`[procedures] Total dossiers in dump: ${allDossiers.length}`);

  const targets = allDossiers.filter((d) =>
    TARGET_REFS.includes(d.procedure?.reference)
  );
  console.log(`[procedures] Found ${targets.length} target dossiers`);

  for (const dossier of targets) {
    try {
      await ingestDossier(dossier);
    } catch (err) {
      console.error(`[procedures] Error:`, err);
    }
  }

  // Summary
  const procCount = await client`SELECT COUNT(*) as c FROM procedures`;
  const docCount = await client`SELECT COUNT(*) as c FROM documents`;
  console.log(`\n[procedures] Done!`);
  console.log(`[procedures] Procedures in DB: ${procCount[0].c}`);
  console.log(`[procedures] Documents in DB: ${docCount[0].c}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
