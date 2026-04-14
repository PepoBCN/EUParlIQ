import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { db } from "./_core/db.js";
import { meps, documents, hearings, votingRecord } from "../drizzle/schema.js";
import { eq, sql } from "drizzle-orm";
import { COMMITTEES } from "../shared/committees.js";

export const committeeRouter = router({
  /** List all active committees with basic stats */
  list: publicProcedure.query(async () => {
    return COMMITTEES.map((c) => ({
      abbreviation: c.abbreviation,
      slug: c.slug,
      name: c.name,
      shortName: c.shortName,
      color: c.color,
    }));
  }),

  /** Get committee detail by slug */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const committee = COMMITTEES.find((c) => c.slug === input.slug);
      if (!committee) return null;

      // Get member count
      const memberResults = await db
        .select({ count: sql<number>`count(*)` })
        .from(meps)
        .where(sql`${meps.committees}::text LIKE ${"%" + committee.abbreviation + "%"}`);

      // Get document count
      const docResults = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.committee, committee.name));

      // Get hearing count
      const hearingResults = await db
        .select({ count: sql<number>`count(*)` })
        .from(hearings)
        .where(eq(hearings.committeeAbbreviation, committee.abbreviation));

      return {
        ...committee,
        memberCount: Number(memberResults[0]?.count ?? 0),
        documentCount: Number(docResults[0]?.count ?? 0),
        hearingCount: Number(hearingResults[0]?.count ?? 0),
      };
    }),

  /** Get aggregate stats across all committees */
  stats: publicProcedure.query(async () => {
    const totalDocs = await db.select({ count: sql<number>`count(*)` }).from(documents);
    const totalMeps = await db.select({ count: sql<number>`count(*)` }).from(meps).where(eq(meps.isActive, true));
    const totalHearings = await db.select({ count: sql<number>`count(*)` }).from(hearings);

    return {
      totalDocuments: Number(totalDocs[0]?.count ?? 0),
      totalMeps: Number(totalMeps[0]?.count ?? 0),
      totalHearings: Number(totalHearings[0]?.count ?? 0),
      committees: COMMITTEES.length,
    };
  }),
});
