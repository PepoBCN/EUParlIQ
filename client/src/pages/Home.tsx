import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Sparkles, ExternalLink } from "lucide-react";
import DOMPurify from "dompurify";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useStreamingSearch, type SearchSource } from "@/hooks/useStreamingSearch";
import { trpc } from "@/lib/trpc";
import { COMMITTEES, COMMITTEE_BY_ABBR, normaliseCommittee } from "@shared/committees";

function getCommitteeColor(committee: string): string {
  const abbr = normaliseCommittee(committee);
  return COMMITTEE_BY_ABBR[abbr]?.color || "bg-gray-400";
}

function SourceCard({ source, index }: { source: SearchSource; index: number }) {
  const color = getCommitteeColor(source.committee) || "bg-gray-400";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`} />
      <div className="pl-5 pr-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">
              [{index + 1}] {source.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-muted-foreground">{source.reference}</span>
              <span className="text-[10px] text-muted-foreground">{source.date}</span>
              {source.speakerName && (
                <span className="text-[10px] font-medium text-foreground">{source.speakerName}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {source.chunkType?.replace("_", " ")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {(source.similarity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{source.excerpt}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"quick" | "deep">("quick");
  const inputRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const { phase, answer, sources, followUpQuestions, error, isSearching, search, reset } =
    useStreamingSearch();

  const { data: stats } = trpc.committees.stats.useQuery();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    search(query.trim(), mode);
  };

  const handleFollowUp = (q: string) => {
    setQuery(q);
    search(q, mode);
  };

  // Auto-scroll answer as it streams
  useEffect(() => {
    if (phase === "streaming" && answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [answer, phase]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Hero - only show when idle */}
        {phase === "idle" && (
          <div className="text-center py-12 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">EU Parliamentary Intelligence</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              AI-powered search across EU Parliament plenary debates, voting records and MEP profiles.
              Ask questions in plain English, get cited answers in seconds.
            </p>
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about EU Parliament activity..."
            className="w-full pl-12 pr-32 py-3.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Mode toggle */}
            <div className="flex border border-border rounded-md overflow-hidden text-[11px]">
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={`px-2.5 py-1.5 transition-colors ${
                  mode === "quick" ? "bg-foreground text-background font-medium" : "bg-card text-muted-foreground"
                }`}
              >
                Quick
              </button>
              <button
                type="button"
                onClick={() => setMode("deep")}
                className={`px-2.5 py-1.5 transition-colors ${
                  mode === "deep" ? "bg-foreground text-background font-medium" : "bg-card text-muted-foreground"
                }`}
              >
                Deep
              </button>
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-3 py-1.5 text-[11px] font-medium bg-foreground text-background rounded-md disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
            </button>
          </div>
        </form>

        {/* Results */}
        {phase !== "idle" && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {/* Answer */}
            <div className="lg:col-span-3 space-y-4">
              {(phase === "searching") && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching EU Parliament data...
                </div>
              )}

              {answer && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="uppercase tracking-wide font-semibold">AI Answer</span>
                    <span className="ml-auto text-[10px]">{mode === "quick" ? "Quick" : "Deep"} mode</span>
                  </div>
                  <div
                    ref={answerRef}
                    className="prose prose-sm max-w-none text-foreground [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:text-sm [&_li]:text-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatMarkdown(answer)) }}
                  />
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 py-4">{error}</div>
              )}

              {/* Follow-ups */}
              {followUpQuestions.length > 0 && phase === "complete" && (
                <div className="pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Follow-up questions</p>
                  <div className="flex flex-wrap gap-2">
                    {followUpQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleFollowUp(q)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sources */}
            <div className="lg:col-span-2 space-y-3">
              {sources.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    Sources ({sources.length})
                  </p>
                  <div className="space-y-2">
                    {sources.map((source, i) => (
                      <SourceCard key={i} source={source} index={i} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stats - only show when idle */}
        {phase === "idle" && stats && (
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-3xl mx-auto">
            <div>
              <p className="text-3xl font-bold">{stats.totalProcedures.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Legislative files</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.committees}</p>
              <p className="text-xs text-muted-foreground">Committees</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalSpeeches.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Debate speeches</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.totalMeps.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">MEPs indexed</p>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

// Simple markdown to HTML (bold, headers, links)
function formatMarkdown(text: string): string {
  return text
    .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
    .replace(/## (.*?)(\n|$)/g, '<h2>$1</h2>')
    .replace(/# (.*?)(\n|$)/g, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[Source (\d+)\]/g, '<span class="text-blue-600 font-medium">[Source $1]</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
