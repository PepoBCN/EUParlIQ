import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { db } from "./_core/db.js";
import { meps, votingRecord, writtenQuestions, documentChunks } from "../drizzle/schema.js";
import { eq, sql, and, desc } from "drizzle-orm";

export const mepRouter = router({
  /** List all active MEPs with basic info */
  list: publicProcedure
    .input(
      z.object({
        committee: z.string().optional(),
        politicalGroup: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [eq(meps.isActive, true)];

      if (input.politicalGroup) {
        conditions.push(eq(meps.politicalGroup, input.politicalGroup));
      }
      if (input.country) {
        conditions.push(eq(meps.country, input.country));
      }

      const results = await db
        .select()
        .from(meps)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  /** Get MEP by EP ID */
  byId: publicProcedure
    .input(z.object({ epId: z.string() }))
    .query(async ({ input }) => {
      const [mep] = await db.select().from(meps).where(eq(meps.epId, input.epId));
      if (!mep) return null;

      const voteCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(votingRecord)
        .where(eq(votingRecord.mepId, input.epId));

      const questionCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(writtenQuestions)
        .where(eq(writtenQuestions.mepId, input.epId));

      return {
        ...mep,
        voteCount: Number(voteCount[0]?.count ?? 0),
        questionCount: Number(questionCount[0]?.count ?? 0),
      };
    }),

  /** Get speeches (plenary debate chunks) for an MEP */
  speeches: publicProcedure
    .input(z.object({ epId: z.string(), limit: z.number().min(1).max(100).default(30), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const [mep] = await db.select({ name: meps.name }).from(meps).where(eq(meps.epId, input.epId));
      if (!mep) return { items: [], total: 0 };

      const [countResult, items] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(documentChunks)
          .where(and(eq(documentChunks.speakerName, mep.name), eq(documentChunks.chunkType, "plenary_debate"))),
        db
          .select({
            id: documentChunks.id,
            content: documentChunks.content,
            sectionHeading: documentChunks.sectionHeading,
            createdAt: documentChunks.createdAt,
          })
          .from(documentChunks)
          .where(and(eq(documentChunks.speakerName, mep.name), eq(documentChunks.chunkType, "plenary_debate")))
          .orderBy(desc(documentChunks.createdAt))
          .limit(input.limit)
          .offset(input.offset),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  /** Get voting record for an MEP */
  votes: publicProcedure
    .input(z.object({ epId: z.string(), rebellionsOnly: z.boolean().default(false), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const conditions = [eq(votingRecord.mepId, input.epId)];
      if (input.rebellionsOnly) {
        conditions.push(eq(votingRecord.votedAgainstGroup, true));
      }

      const [countResult, items] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(votingRecord)
          .where(and(...conditions)),
        db
          .select({
            id: votingRecord.id,
            divisionId: votingRecord.divisionId,
            date: votingRecord.date,
            title: votingRecord.title,
            memberVotedFor: votingRecord.memberVotedFor,
            votedAgainstGroup: votingRecord.votedAgainstGroup,
            totalFor: votingRecord.totalFor,
            totalAgainst: votingRecord.totalAgainst,
            totalAbstain: votingRecord.totalAbstain,
            url: votingRecord.url,
          })
          .from(votingRecord)
          .where(and(...conditions))
          .orderBy(desc(votingRecord.date))
          .limit(input.limit)
          .offset(input.offset),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),
});
