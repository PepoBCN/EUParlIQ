import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";

// ---------------------------------------------------------------------------
// Models - single source of truth
// ---------------------------------------------------------------------------

export const MODELS = {
  /** Quick mode - fast, cheap answers */
  quick: "claude-haiku-4-5-20251001",
  /** Deep mode - detailed, thorough answers */
  deep: "claude-sonnet-4-5-20241022",
} as const;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Streaming helper
// ---------------------------------------------------------------------------

export async function* streamChat(
  systemPrompt: string,
  userMessage: string,
  mode: "quick" | "deep" = "quick"
): AsyncGenerator<string> {
  const client = getAnthropicClient();
  const stream = client.messages.stream({
    model: MODELS[mode],
    max_tokens: mode === "quick" ? 1024 : 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}
