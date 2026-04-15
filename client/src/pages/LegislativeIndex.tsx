import { Link } from "wouter";
import { Loader2, Scale, ExternalLink } from "lucide-react";
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

export default function LegislativeIndex() {
  const { data, isLoading } = trpc.procedures.list.useQuery({ limit: 50, offset: 0 });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5" />
              <h2 className="text-2xl font-bold">Legislative Files</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Track EU legislative procedures through the Parliament
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="space-y-2">
              {data.items.map((proc) => {
                const statusStyle = STATUS_STYLES[proc.status || "ongoing"];
                const committee = proc.responsibleCommittee ? COMMITTEE_BY_ABBR[proc.responsibleCommittee] : null;

                return (
                  <Link key={proc.id} href={`/legislation/${encodeURIComponent(proc.reference)}`}>
                    <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{proc.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground">{proc.reference}</span>
                            {proc.type && (
                              <Badge variant="secondary" className="text-[10px]">{proc.type}</Badge>
                            )}
                            {statusStyle && (
                              <Badge variant={statusStyle.variant} className="text-[10px]">{statusStyle.label}</Badge>
                            )}
                            {committee && (
                              <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${committee.color}`} />
                                <span className="text-[10px] text-muted-foreground">{committee.abbreviation}</span>
                              </span>
                            )}
                            {proc.rapporteur && (
                              <span className="text-[10px] text-muted-foreground">Rapporteur: {proc.rapporteur}</span>
                            )}
                          </div>
                        </div>
                        {proc.latestEventDate && (
                          <span className="text-xs text-muted-foreground shrink-0">{proc.latestEventDate}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {data.total > data.items.length && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing {data.items.length} of {data.total} procedures
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">No legislative procedures found.</p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
