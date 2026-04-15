import { useParams } from "wouter";
import { Loader2, Scale, FileText, ExternalLink, Calendar, User } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { COMMITTEE_BY_ABBR } from "@shared/committees";

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  ongoing: { variant: "outline", label: "Ongoing" },
  adopted: { variant: "default", label: "Adopted" },
  rejected: { variant: "destructive", label: "Rejected" },
  withdrawn: { variant: "secondary", label: "Withdrawn" },
};

export default function Legislative() {
  const { reference } = useParams<{ reference: string }>();
  const decodedRef = reference ? decodeURIComponent(reference) : "";

  const { data: procedure, isLoading } = trpc.procedures.byReference.useQuery(
    { reference: decodedRef },
    { enabled: !!decodedRef }
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !procedure ? (
          <p className="text-muted-foreground text-center py-20">Legislative procedure not found</p>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">{procedure.reference}</span>
                {procedure.type && (
                  <Badge variant="secondary" className="text-[10px]">{procedure.type}</Badge>
                )}
                {procedure.status && STATUS_STYLES[procedure.status] && (
                  <Badge variant={STATUS_STYLES[procedure.status].variant} className="text-[10px]">
                    {STATUS_STYLES[procedure.status].label}
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold">{procedure.title}</h2>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {procedure.responsibleCommittee && (() => {
                const committee = COMMITTEE_BY_ABBR[procedure.responsibleCommittee];
                return (
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Responsible committee</p>
                    <div className="flex items-center gap-2">
                      {committee && <div className={`w-3 h-3 rounded ${committee.color}`} />}
                      <span className="text-sm font-medium">{procedure.responsibleCommittee}</span>
                    </div>
                  </div>
                );
              })()}

              {procedure.rapporteur && (
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Rapporteur</p>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{procedure.rapporteur}</span>
                  </div>
                </div>
              )}

              {procedure.proposalDate && (
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Proposal date</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{procedure.proposalDate}</span>
                  </div>
                </div>
              )}

              {procedure.latestEventDate && (
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Latest event</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{procedure.latestEventDate}</span>
                  </div>
                </div>
              )}
            </div>

            {procedure.oeilUrl && (
              <a
                href={procedure.oeilUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on Legislative Observatory (OEIL)
              </a>
            )}

            {/* Related documents */}
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Related documents ({procedure.documents.length})
              </h3>
              {procedure.documents.length > 0 ? (
                <div className="space-y-2">
                  {procedure.documents.map((doc) => (
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
                        </div>
                      </div>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No related documents found.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
