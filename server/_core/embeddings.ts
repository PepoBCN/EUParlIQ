import OpenAI from "openai";
import { env } from "./env.js";

let _client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}

/**
 * Generate a single embedding vector using OpenAI text-embedding-3-small.
 * Returns a 1536-dimensional float array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for a batch of texts.
 * OpenAI accepts up to 2048 inputs per request.
 */
export async function generateEmbeddingBatch(
  texts: string[],
  batchSize = 100
): Promise<number[][]> {
  const client = getOpenAIClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
    if (i + batchSize < texts.length) {
      console.log(`[embeddings] Processed ${i + batchSize}/${texts.length}`);
    }
  }

  return allEmbeddings;
}

/**
 * Cosine similarity between two vectors.
 * Used as fallback when not using pgvector's built-in operator.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
