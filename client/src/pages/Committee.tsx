import { useState } from "react";
import { useParams, Link } from "wouter";
import { Loader2, FileText, Users, Vote, ExternalLink } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MepCard from "@/components/committee/MepCard";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { COMMITTEE_BY_SLUG } from "@shared/committees";

type Tab = "members" | "documents" | "votes";

export default function Committee() {
  const { slug } = useParams<{ slug: string }>();
  const committee = slug ? COMMITTEE_BY_SLUG[slug] : null;
  const [activeTab, setActiveTab] = useState<Tab>("members");

  const { data, isLoading } = trpc.committees.bySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: members, isLoading: membersLoading } = trpc.committees.members.useQuery(
    { slug: slug || "" },
    { enabled: !!slug && activeTab === "members" }
  );

  const { data: docs, isLoading: docsLoading } = trpc.committees.documents.useQuery(
    { slug: slug || "", limit: 50, offset: 0 },
    { enabled: !!slug && activeTab === "documents" }
  );

  const { data: votes, isLoading: votesLoading } = trpc.committees.votes.useQuery(
    { slug: slug || "", limit: 50, offset: 0 },
    { enabled: !!slug && activeTab === "votes" }
  );

  if (!committee) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Committee not found</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "members", label: "Members", icon: <Users className="h-4 w-4" />, count: data?.memberCount },
    { key: "documents", label: "Documents", icon: <FileText className="h-4 w-4" />, count: data?.documentCount },
    { key: "votes", label: "Votes", icon: <Vote className="h-4 w-4" />, count: undefined },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      {/* Colour bar */}
      <div className={`h-1.5 ${committee.color}`} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded ${committee.color}`} />
              <h2 className="text-2xl font-bold">{committee.abbreviation}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{committee.name}</p>
          </div>

          {/* Stats row */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card text-center">
                <p className="text-2xl font-bold">{data.memberCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Members</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card text-center">
                <p className="text-2xl font-bold">{data.documentCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Documents</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card text-center">
                <p className="text-2xl font-bold">{data.hearingCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Hearings</p>
              </div>
            </div>
          ) : null}

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
            {activeTab === "members" && (
              membersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : members && members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {members.map((mep) => (
                    <MepCard
                      key={mep.epId}
                      epId={mep.epId}
                      name={mep.name}
                      country={mep.country}
                      politicalGroup={mep.politicalGroup}
                      photoUrl={mep.photoUrl}
                      role={mep.role}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">No members found for this committee.</p>
              )
            )}

            {activeTab === "documents" && (
              docsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : docs && docs.items.length > 0 ? (
                <div className="space-y-2">
                  {docs.items.map((doc) => (
                    <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                      <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{doc.reference}</span>
                          <span className="text-xs text-muted-foreground">{doc.publicationDate}</span>
                          {doc.documentType && (
                            <Badge variant="secondary" className="text-[10px]">{doc.documentType}</Badge>
                          )}
                          {doc.procedureReference && (
                            <span className="text-[10px] font-mono text-muted-foreground">{doc.procedureReference}</span>
                          )}
                        </div>
                      </div>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                  {docs.total > docs.items.length && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing {docs.items.length} of {docs.total} documents
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">No documents found for this committee.</p>
              )
            )}

            {activeTab === "votes" && (
              votesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : votes && votes.items.length > 0 ? (
                <div className="space-y-2">
                  {votes.items.map((vote) => (
                    <div key={vote.divisionId} className="p-3 rounded-lg border border-border bg-card">
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
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs"><span className="font-medium text-green-600">{vote.totalFor}</span> for</span>
                        <span className="text-xs"><span className="font-medium text-red-600">{vote.totalAgainst}</span> against</span>
                        <span className="text-xs"><span className="font-medium text-muted-foreground">{vote.totalAbstain}</span> abstain</span>
                      </div>
                    </div>
                  ))}
                  {votes.total > votes.items.length && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing {votes.items.length} of {votes.total} votes
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">No votes found for this committee.</p>
              )
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
