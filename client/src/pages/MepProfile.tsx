import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import { GROUP_COLORS } from "@shared/committees";

export default function MepProfile() {
  const { epId } = useParams<{ epId: string }>();
  const { data: mep, isLoading } = trpc.meps.byId.useQuery(
    { epId: epId || "" },
    { enabled: !!epId }
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !mep ? (
          <p className="text-muted-foreground text-center py-20">MEP not found</p>
        ) : (
          <div className="space-y-8">
            {/* Hero */}
            <div className="flex items-start gap-6">
              {mep.photoUrl && (
                <img
                  src={mep.photoUrl}
                  alt={mep.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div>
                <h2 className="text-3xl font-bold">{mep.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2.5 h-2.5 rounded-sm ${GROUP_COLORS[mep.politicalGroup] || "bg-gray-400"}`} />
                  <span className="text-sm">{mep.politicalGroup}</span>
                  <span className="text-sm text-muted-foreground">· {mep.country}</span>
                </div>
                {mep.committees && mep.committees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(mep.committees as Array<{ abbreviation: string; role: string }>).map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted">
                        {c.abbreviation} ({c.role})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card text-center">
                <p className="text-2xl font-bold">{mep.voteCount}</p>
                <p className="text-xs text-muted-foreground">Votes recorded</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card text-center">
                <p className="text-2xl font-bold">{mep.questionCount}</p>
                <p className="text-xs text-muted-foreground">Questions tabled</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Full MEP profiles with AI-generated summaries, speech history, voting analysis and committee activity coming soon.
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
