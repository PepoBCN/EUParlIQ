/**
 * Search router (tRPC).
 * The primary search endpoint is the SSE stream at /api/search/stream
 * (registered in streamingSearch.ts). This tRPC router provides a
 * non-streaming fallback for simpler clients.
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { generateEmbedding } from "./_core/embeddings.js";
import { sql } from "drizzle-orm";
import { db } from "./_core/db.js";
import { documentChunks, documents } from "../drizzle/schema.js";

export const searchRouter = router({
  /** Non-streaming search - returns sources without AI answer */
  query: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        mode: z.enum(["quick", "deep"]).default("quick"),
        committees: z.array(z.string()).optional(),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      const embedding = await generateEmbedding(input.query);
      const embeddingStr = `[${embedding.join(",")}]`;

      const results = await db.execute(sql`
        SELECT
          dc.id,
          dc.content,
          dc.section_heading,
          dc.chunk_type,
          dc.speaker_name,
          1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity,
          d.title as doc_title,
          d.url as doc_url,
          d.reference as doc_reference,
          d.committee as doc_committee,
          d.publication_date as doc_date
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE 1 - (dc.embedding <=> ${embeddingStr}::vector) > 0.25
        ORDER BY dc.embedding <=> ${embeddingStr}::vector
        LIMIT ${input.limit}
      `);

      return {
        query: input.query,
        mode: input.mode,
        sources: results.map((r: Record<string, unknown>) => ({
          title: r.doc_title as string,
          reference: r.doc_reference as string,
          committee: r.doc_committee as string,
          date: r.doc_date as string,
          url: r.doc_url as string,
          chunkType: r.chunk_type as string,
          speakerName: r.speaker_name as string | null,
          similarity: parseFloat(r.similarity as string),
          excerpt: (r.content as string).substring(0, 200),
        })),
      };
    }),
});
