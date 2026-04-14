import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";

export const searchRouter = router({
  /** Placeholder - will be replaced with full semantic search pipeline */
  query: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        mode: z.enum(["quick", "deep"]).default("quick"),
        committees: z.array(z.string()).optional(),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      // TODO: Implement full search pipeline
      // 1. Query expansion for EU terminology
      // 2. Generate embedding for query
      // 3. pgvector cosine similarity search
      // 4. Build XML context for Claude
      // 5. Stream AI answer with citations
      return {
        query: input.query,
        mode: input.mode,
        answer: "Search pipeline not yet implemented. Data ingestion required first.",
        sources: [],
        followUpQuestions: [],
      };
    }),
});
