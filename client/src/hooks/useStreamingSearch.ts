import { useState, useCallback, useRef } from "react";

export interface SearchSource {
  title: string;
  reference: string;
  committee: string;
  date: string;
  url: string;
  chunkType: string;
  speakerName: string | null;
  similarity: number;
  excerpt: string;
}

export interface StreamingSearchState {
  phase: "idle" | "searching" | "streaming" | "complete" | "error";
  answer: string;
  sources: SearchSource[];
  followUpQuestions: string[];
  error: string | null;
  isSearching: boolean;
}

const initialState: StreamingSearchState = {
  phase: "idle",
  answer: "",
  sources: [],
  followUpQuestions: [],
  error: null,
  isSearching: false,
};

export function useStreamingSearch() {
  const [state, setState] = useState<StreamingSearchState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string, mode: "quick" | "deep" = "quick") => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState({ ...initialState, phase: "searching", isSearching: true });

    try {
      const response = await fetch("/api/search/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode, limit: 10 }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed (HTTP ${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          // Parse SSE data line
          let eventData = "";
          for (const line of message.split("\n")) {
            if (line.startsWith("data: ")) {
              eventData += line.slice(6);
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData);

            switch (parsed.type) {
              case "sources":
                setState((prev) => ({
                  ...prev,
                  phase: "streaming",
                  sources: parsed.sources || [],
                }));
                break;

              case "text":
                setState((prev) => ({
                  ...prev,
                  answer: prev.answer + parsed.text,
                }));
                break;

              case "followups":
                setState((prev) => ({
                  ...prev,
                  followUpQuestions: parsed.questions || [],
                }));
                break;

              case "done":
                setState((prev) => ({
                  ...prev,
                  phase: "complete",
                  isSearching: false,
                }));
                break;

              case "error":
                setState((prev) => ({
                  ...prev,
                  phase: "error",
                  error: parsed.message,
                  isSearching: false,
                }));
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Safety net
      setState((prev) => {
        if (prev.isSearching) {
          return { ...prev, phase: prev.answer ? "complete" : "error", isSearching: false };
        }
        return prev;
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: err.message || "Search failed",
        isSearching: false,
      }));
    }
  }, []);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState((prev) => ({
      ...prev,
      phase: prev.phase === "idle" ? "idle" : "complete",
      isSearching: false,
    }));
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState(initialState);
  }, []);

  return { ...state, search, abort, reset };
}
