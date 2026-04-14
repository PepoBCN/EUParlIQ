import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { db } from "./_core/db.js";
import { meps, votingRecord, writtenQuestions } from "../drizzle/schema.js";
import { eq, sql, and } from "drizzle-orm";

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
});
