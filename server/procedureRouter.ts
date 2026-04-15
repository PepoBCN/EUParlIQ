import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { db } from "./_core/db.js";
import { procedures, documents } from "../drizzle/schema.js";
import { eq, sql, desc } from "drizzle-orm";

export const procedureRouter = router({
  /** List all legislative procedures */
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["ongoing", "adopted", "rejected", "withdrawn"]).optional(),
        committee: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions: ReturnType<typeof eq>[] = [];

      if (input.status) {
        conditions.push(eq(procedures.status, input.status));
      }
      if (input.committee) {
        conditions.push(eq(procedures.responsibleCommittee, input.committee));
      }

      const whereClause = conditions.length > 0
        ? sql`${sql.join(conditions, sql` AND `)}`
        : undefined;

      const [countResult, items] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(procedures).where(whereClause),
        db
          .select()
          .from(procedures)
          .where(whereClause)
          .orderBy(desc(procedures.latestEventDate))
          .limit(input.limit)
          .offset(input.offset),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  /** Get procedure by reference with related documents */
  byReference: publicProcedure
    .input(z.object({ reference: z.string() }))
    .query(async ({ input }) => {
      const [procedure] = await db
        .select()
        .from(procedures)
        .where(eq(procedures.reference, input.reference));

      if (!procedure) return null;

      const relatedDocs = await db
        .select({
          id: documents.id,
          title: documents.title,
          publicationDate: documents.publicationDate,
          reference: documents.reference,
          url: documents.url,
          documentType: documents.documentType,
          committee: documents.committee,
        })
        .from(documents)
        .where(eq(documents.procedureReference, procedure.reference))
        .orderBy(desc(documents.publicationDate));

      return {
        ...procedure,
        documents: relatedDocs,
      };
    }),
});
