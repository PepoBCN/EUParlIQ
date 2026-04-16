import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { db } from "./_core/db.js";
import { meps, documents, hearings, votingRecord, procedures, documentChunks } from "../drizzle/schema.js";
import { eq, sql, and, desc } from "drizzle-orm";
import { COMMITTEES, COMMITTEE_BY_SLUG } from "../shared/committees.js";

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

      // Get document count - match by abbreviation, full name, or target file
      const docMatchValues = [committee.abbreviation, committee.name];
      if (committee.targetFile) {
        docMatchValues.push(committee.targetFile.replace(/\s*\(.*\)$/, ""));
      }
      const docResults = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(sql`${documents.committee} IN (${sql.join(docMatchValues.map(v => sql`${v}`), sql`, `)})`);

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
    const [totalDocs, totalMepsResult, totalHearingsResult, totalProcs, totalSpeeches] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(documents),
      db.select({ count: sql<number>`count(*)` }).from(meps).where(eq(meps.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(hearings),
      db.select({ count: sql<number>`count(*)` }).from(procedures),
      db.select({ count: sql<number>`count(*)` }).from(documentChunks).where(eq(documentChunks.chunkType, "plenary_debate")),
    ]);

    return {
      totalDocuments: Number(totalDocs[0]?.count ?? 0),
      totalMeps: Number(totalMepsResult[0]?.count ?? 0),
      totalHearings: Number(totalHearingsResult[0]?.count ?? 0),
      totalProcedures: Number(totalProcs[0]?.count ?? 0),
      totalSpeeches: Number(totalSpeeches[0]?.count ?? 0),
      committees: COMMITTEES.length,
    };
  }),

  /** Get members of a committee by slug */
  members: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const committee = COMMITTEE_BY_SLUG[input.slug];
      if (!committee) return [];

      const results = await db
        .select({
          epId: meps.epId,
          name: meps.name,
          country: meps.country,
          politicalGroup: meps.politicalGroup,
          photoUrl: meps.photoUrl,
          committees: meps.committees,
        })
        .from(meps)
        .where(
          and(
            eq(meps.isActive, true),
            sql`${meps.committees}::text LIKE ${"%" + committee.abbreviation + "%"}`
          )
        )
        .orderBy(meps.name);

      // Extract the role for this specific committee
      return results.map((mep) => {
        const committeeEntry = (mep.committees as Array<{ abbreviation: string; role: string }> | null)
          ?.find((c) => c.abbreviation === committee.abbreviation);
        return {
          ...mep,
          role: committeeEntry?.role ?? "Member",
        };
      });
    }),

  /** Get documents for a committee by slug */
  documents: publicProcedure
    .input(z.object({ slug: z.string(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const committee = COMMITTEE_BY_SLUG[input.slug];
      if (!committee) return { items: [], total: 0 };

      // Match documents by abbreviation, full name, or target file name
      const matchValues = [committee.abbreviation, committee.name];
      if (committee.targetFile) {
        matchValues.push(committee.targetFile.replace(/\s*\(.*\)$/, ""));
      }
      const docWhere = sql`${documents.committee} IN (${sql.join(matchValues.map(v => sql`${v}`), sql`, `)})`;

      const [countResult, items] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(documents).where(docWhere),
        db
          .select({
            id: documents.id,
            title: documents.title,
            publicationDate: documents.publicationDate,
            reference: documents.reference,
            url: documents.url,
            documentType: documents.documentType,
            procedureReference: documents.procedureReference,
          })
          .from(documents)
          .where(docWhere)
          .orderBy(desc(documents.publicationDate))
          .limit(input.limit)
          .offset(input.offset),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  /** Get plenary votes relevant to a committee by slug */
  votes: publicProcedure
    .input(z.object({ slug: z.string(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const committee = COMMITTEE_BY_SLUG[input.slug];
      if (!committee) return { items: [], total: 0 };

      // Match by committee field (abbreviation) or title keywords from shared config
      const keywordConditions = committee.keywords
        .filter((kw: string) => kw.length > 3)
        .map((kw: string) => sql`${votingRecord.title} ILIKE ${"%" + kw + "%"}`);
      const titleFallback = keywordConditions.length > 0
        ? sql`(${votingRecord.committee} = '' AND (${sql.join(keywordConditions, sql` OR `)}))`
        : sql`FALSE`;
      const whereClause = sql`${votingRecord.committee} = ${committee.abbreviation} OR ${titleFallback}`;

      const [countResult, items] = await Promise.all([
        db
          .select({ count: sql<number>`count(DISTINCT ${votingRecord.divisionId})` })
          .from(votingRecord)
          .where(whereClause),
        db
          .select({
            divisionId: votingRecord.divisionId,
            date: sql<string>`MIN(${votingRecord.date})`.as("date"),
            title: sql<string>`MIN(${votingRecord.title})`.as("title"),
            totalFor: sql<number>`MAX(${votingRecord.totalFor})`.as("total_for"),
            totalAgainst: sql<number>`MAX(${votingRecord.totalAgainst})`.as("total_against"),
            totalAbstain: sql<number>`MAX(${votingRecord.totalAbstain})`.as("total_abstain"),
            url: sql<string>`MIN(${votingRecord.url})`.as("url"),
          })
          .from(votingRecord)
          .where(whereClause)
          .groupBy(votingRecord.divisionId)
          .orderBy(desc(sql`MIN(${votingRecord.date})`))
          .limit(input.limit)
          .offset(input.offset),
      ]);

      return {
        items: items.map((v) => ({
          divisionId: v.divisionId,
          date: v.date,
          title: v.title,
          totalFor: Number(v.totalFor ?? 0),
          totalAgainst: Number(v.totalAgainst ?? 0),
          totalAbstain: Number(v.totalAbstain ?? 0),
          url: v.url,
        })),
        total: Number(countResult[0]?.count ?? 0),
      };
    }),
});
