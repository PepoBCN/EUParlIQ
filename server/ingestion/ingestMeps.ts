/**
 * MEP Data Ingestion
 * Source: Parltrack JSON dump (https://parltrack.org/dumps/ep_meps.json.lz)
 * Ingests all active MEPs from the current (10th) parliamentary term.
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { meps } from "../../drizzle/schema.js";
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

const DUMP_URL = "https://parltrack.org/dumps/ep_meps.json.lz";
const CACHE_DIR = path.join(import.meta.dirname, "../../.cache");
const COMPRESSED_PATH = path.join(CACHE_DIR, "ep_meps.json.lz");
const JSON_PATH = path.join(CACHE_DIR, "ep_meps.json");

// EU committee abbreviation mapping
const COMMITTEE_ABBRS: Record<string, string> = {
  "Committee on Industry, Research and Energy": "ITRE",
  "Committee on the Internal Market and Consumer Protection": "IMCO",
  "Committee on Legal Affairs": "JURI",
  "Committee on Civil Liberties, Justice and Home Affairs": "LIBE",
  "Committee on Economic and Monetary Affairs": "ECON",
  "Committee on the Environment, Public Health and Food Safety": "ENVI",
  "Committee on Foreign Affairs": "AFET",
  "Committee on Development": "DEVE",
  "Committee on International Trade": "INTA",
  "Committee on Budgets": "BUDG",
  "Committee on Budgetary Control": "CONT",
  "Committee on Employment and Social Affairs": "EMPL",
  "Committee on Transport and Tourism": "TRAN",
  "Committee on Regional Development": "REGI",
  "Committee on Agriculture and Rural Development": "AGRI",
  "Committee on Fisheries": "PECH",
  "Committee on Culture and Education": "CULT",
  "Committee on Constitutional Affairs": "AFCO",
  "Committee on Women's Rights and Gender Equality": "FEMM",
  "Committee on Petitions": "PETI",
};

interface ParltrackMep {
  UserID: number;
  Name: { full: string; sur: string; family: string };
  Photo?: string;
  active: boolean;
  Groups?: Array<{
    Organization: string;
    groupid: string;
    role: string;
    start: string;
    end: string;
  }>;
  Constituencies?: Array<{
    party: string;
    country: string;
    term: number;
    start: string;
    end: string;
  }>;
  Committees?: Array<{
    Organization: string;
    role: string;
    start: string;
    end: string;
  }>;
  Addresses?: Array<{
    Email?: string;
  }>;
}

async function downloadDump(): Promise<ParltrackMep[]> {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Download if not cached (or older than 24h)
  const needsDownload = !fs.existsSync(COMPRESSED_PATH) ||
    Date.now() - fs.statSync(COMPRESSED_PATH).mtimeMs > 24 * 60 * 60 * 1000;

  if (needsDownload) {
    console.log("[meps] Downloading Parltrack MEP dump...");
    execSync(`curl -s --max-time 120 "${DUMP_URL}" -o "${COMPRESSED_PATH}"`);
    console.log("[meps] Download complete");

    // Decompress (LZMA format)
    console.log("[meps] Decompressing...");
    execSync(`python3 -c "
import lzma
with open('${COMPRESSED_PATH}','rb') as f:
    data = lzma.decompress(f.read())
with open('${JSON_PATH}','wb') as f:
    f.write(data)
print('Decompressed:', len(data), 'bytes')
"`);
  } else {
    console.log("[meps] Using cached Parltrack dump");
  }

  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  return JSON.parse(raw);
}

function extractCurrentGroup(mep: ParltrackMep): { name: string; abbr: string } | null {
  if (!mep.Groups?.length) return null;
  // Get the latest group (end date is 9999-12-31 for current)
  const current = mep.Groups[mep.Groups.length - 1];
  return { name: current.Organization, abbr: current.groupid || "NI" };
}

function extractCountry(mep: ParltrackMep): string {
  if (!mep.Constituencies?.length) return "Unknown";
  const current = mep.Constituencies[mep.Constituencies.length - 1];
  return current.country || "Unknown";
}

function extractActiveCommittees(mep: ParltrackMep): Array<{ abbreviation: string; name: string; role: string }> {
  if (!mep.Committees?.length) return [];
  return mep.Committees
    .filter((c) => c.end === "9999-12-31T00:00:00" || new Date(c.end) > new Date())
    .map((c) => ({
      abbreviation: COMMITTEE_ABBRS[c.Organization] || c.Organization.substring(0, 8),
      name: c.Organization,
      role: c.role || "Member",
    }));
}

function extractEmail(mep: ParltrackMep): string | null {
  if (!mep.Addresses?.length) return null;
  for (const addr of mep.Addresses) {
    if (addr.Email) return addr.Email;
  }
  return null;
}

async function main() {
  console.log("[meps] Starting MEP ingestion...");

  const allMeps = await downloadDump();
  console.log(`[meps] Total MEPs in dump: ${allMeps.length}`);

  // Filter to active MEPs only
  const activeMeps = allMeps.filter((m) => m.active);
  console.log(`[meps] Active MEPs: ${activeMeps.length}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const mep of activeMeps) {
    const group = extractCurrentGroup(mep);
    const country = extractCountry(mep);
    const committees = extractActiveCommittees(mep);
    const email = extractEmail(mep);

    const epId = String(mep.UserID);
    const name = mep.Name.full;
    const politicalGroup = group?.abbr || "NI";
    const photoUrl = mep.Photo || `https://www.europarl.europa.eu/mepphoto/${mep.UserID}.jpg`;

    try {
      // Upsert: insert or update on conflict
      const existing = await db.select().from(meps).where(eq(meps.epId, epId));

      if (existing.length > 0) {
        await db.update(meps)
          .set({
            name,
            country,
            politicalGroup,
            photoUrl,
            email,
            committees,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(meps.epId, epId));
        updated++;
      } else {
        await db.insert(meps).values({
          epId,
          name,
          country,
          politicalGroup,
          photoUrl,
          email,
          committees,
          isActive: true,
        });
        inserted++;
      }
    } catch (err) {
      console.error(`[meps] Error processing ${name} (${epId}):`, err);
      skipped++;
    }
  }

  console.log(`[meps] Done! Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

  // Summary stats
  const countResult = await client`SELECT COUNT(*) as count FROM meps WHERE is_active = true`;
  console.log(`[meps] Total active MEPs in DB: ${countResult[0].count}`);

  // Political group breakdown
  const groupStats = await client`
    SELECT political_group, COUNT(*) as count
    FROM meps WHERE is_active = true
    GROUP BY political_group ORDER BY count DESC
  `;
  console.log("[meps] Political groups:");
  for (const g of groupStats) {
    console.log(`  ${g.political_group}: ${g.count}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
