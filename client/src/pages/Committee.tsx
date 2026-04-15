import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import { COMMITTEE_BY_SLUG } from "@shared/committees";

export default function Committee() {
  const { slug } = useParams<{ slug: string }>();
  const committee = slug ? COMMITTEE_BY_SLUG[slug] : null;
  const { data, isLoading } = trpc.committees.bySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      {/* Colour bar */}
      <div className={`h-1.5 ${committee.color}`} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded ${committee.color}`} />
              <h2 className="text-2xl font-bold">{committee.abbreviation}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{committee.name}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg border border-border bg-card text-center">
                <p className="text-3xl font-bold">{data.memberCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Members</p>
              </div>
              <div className="p-5 rounded-lg border border-border bg-card text-center">
                <p className="text-3xl font-bold">{data.documentCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Documents</p>
              </div>
              <div className="p-5 rounded-lg border border-border bg-card text-center">
                <p className="text-3xl font-bold">{data.hearingCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Hearings</p>
              </div>
            </div>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Full committee pages with member lists, documents, hearings and voting tabs coming soon.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
