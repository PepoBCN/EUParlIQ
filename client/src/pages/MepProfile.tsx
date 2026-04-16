import { useState } from "react";
import { useParams, Link } from "wouter";
import { Loader2, MessageSquare, Vote, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { GROUP_COLORS, COMMITTEE_BY_ABBR } from "@shared/committees";

type Tab = "speeches" | "votes";

export default function MepProfile() {
  const { epId } = useParams<{ epId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("speeches");
  const [rebellionsOnly, setRebellionsOnly] = useState(false);
  const [expandedSpeech, setExpandedSpeech] = useState<number | null>(null);

  const { data: mep, isLoading } = trpc.meps.byId.useQuery(
    { epId: epId || "" },
    { enabled: !!epId }
  );

  const { data: speeches, isLoading: speechesLoading } = trpc.meps.speeches.useQuery(
    { epId: epId || "", limit: 30, offset: 0 },
    { enabled: !!epId && activeTab === "speeches" }
  );

  const { data: votes, isLoading: votesLoading } = trpc.meps.votes.useQuery(
    { epId: epId || "", rebellionsOnly, limit: 50, offset: 0 },
    { enabled: !!epId && activeTab === "votes" }
  );

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "speeches", label: "Speeches", icon: <MessageSquare className="h-4 w-4" />, count: speeches?.total },
    { key: "votes", label: "Votes", icon: <Vote className="h-4 w-4" />, count: mep?.voteCount },
  ];

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
          <div className="space-y-6">
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
                    {(mep.committees as Array<{ abbreviation: string; role: string }>)
                      .filter((c) => c.abbreviation && c.abbreviation.length <= 10 && /^[A-Z]/.test(c.abbreviation))
                      .map((c, i) => {
                      const committeeConfig = COMMITTEE_BY_ABBR[c.abbreviation];
                      return committeeConfig ? (
                        <Link key={i} href={`/committee/${committeeConfig.slug}`}>
                          <span className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted hover:bg-accent cursor-pointer">
                            {c.abbreviation} ({c.role})
                          </span>
                        </Link>
                      ) : (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted">
                          {c.abbreviation} ({c.role})
                        </span>
                      );
                    })}
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

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="text-xs text-muted-foreground">({tab.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-[300px]">
              {activeTab === "speeches" && (
                speechesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : speeches && speeches.items.length > 0 ? (
                  <div className="space-y-2">
                    {speeches.items.map((speech) => {
                      const isExpanded = expandedSpeech === speech.id;
                      const preview = speech.content.slice(0, 200);
                      const needsExpand = speech.content.length > 200;

                      return (
                        <div key={speech.id} className="p-3 rounded-lg border border-border bg-card">
                          {speech.sectionHeading && (
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                              {speech.sectionHeading}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">
                            {isExpanded ? speech.content : preview}{!isExpanded && needsExpand ? "..." : ""}
                          </p>
                          {needsExpand && (
                            <button
                              onClick={() => setExpandedSpeech(isExpanded ? null : speech.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {speeches.total > speeches.items.length && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Showing {speeches.items.length} of {speeches.total} speeches
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-10 text-center">No speeches found for this MEP.</p>
                )
              )}

              {activeTab === "votes" && (
                <div className="space-y-3">
                  {/* Rebellions toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRebellionsOnly(!rebellionsOnly)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                        rebellionsOnly
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Rebellions only
                    </button>
                  </div>

                  {votesLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : votes && votes.items.length > 0 ? (
                    <>
                      {votes.items.map((vote) => (
                        <div key={vote.id} className="p-3 rounded-lg border border-border bg-card">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{vote.title}</p>
                              <span className="text-xs text-muted-foreground">{vote.date}</span>
                            </div>
                            {vote.url && (
                              <a href={vote.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant={vote.memberVotedFor ? "default" : "destructive"} className="text-[10px]">
                              {vote.memberVotedFor ? "For" : "Against"}
                            </Badge>
                            {vote.votedAgainstGroup && (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                Rebellion
                              </Badge>
                            )}
                            {((vote.totalFor ?? 0) > 0 || (vote.totalAgainst ?? 0) > 0 || (vote.totalAbstain ?? 0) > 0) && (
                              <span className="text-xs text-muted-foreground">
                                {vote.totalFor ?? 0} for · {vote.totalAgainst ?? 0} against · {vote.totalAbstain ?? 0} abstain
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {votes.total > votes.items.length && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Showing {votes.items.length} of {votes.total} votes
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-10 text-center">
                      {rebellionsOnly ? "No rebellions found for this MEP." : "No votes found for this MEP."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
