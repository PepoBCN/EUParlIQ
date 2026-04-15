import { Search, Sparkles, Users, Vote, Shield, Code } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const features = [
  {
    icon: Search,
    title: "Semantic search",
    description: "Understands what you mean, not just the words you use. 'MEP positions on AI regulation' finds content about 'artificial intelligence governance' and 'high-risk AI systems'.",
  },
  {
    icon: Sparkles,
    title: "Cited AI answers",
    description: "Clear answers that cite specific plenary speeches, committee reports and voting records. Every claim links back to its source.",
  },
  {
    icon: Users,
    title: "MEP intelligence",
    description: "Profiles for every MEP in the tracked committees, built from their plenary speeches, voting record and parliamentary questions. Political group, country, focus areas at a glance.",
  },
  {
    icon: Vote,
    title: "Voting analysis",
    description: "Roll-call vote records across key legislative files. Political group breakdowns, rebellion flags and the ability to see how MEPs voted on specific provisions.",
  },
  {
    icon: Shield,
    title: "Legislative tracking",
    description: "Follow the AI Act, Digital Markets Act and CSDDD through the full legislative process. Current stage, rapporteur, key events and linked documents.",
  },
  {
    icon: Code,
    title: "Open data",
    description: "Built on publicly available EU Parliament data. CRE plenary transcripts, HowTheyVote.eu roll-call data, Parltrack MEP profiles and EUR-Lex legislation.",
  },
];

const audiences = [
  {
    title: "Policy and public affairs",
    description: "Track EU legislative scrutiny in your sector. Find plenary speeches, voting patterns and emerging positions before they become regulation.",
  },
  {
    title: "Journalists and researchers",
    description: "Find quotes, voting patterns and contradictions quickly. Spot what MEPs said in plenary vs how they voted.",
  },
  {
    title: "Law firms and regulatory teams",
    description: "Monitor legislative developments that could affect your clients. Track procedure stages, amendments and political group positions.",
  },
  {
    title: "NGOs and advocacy",
    description: "Understand which MEPs champion your issues and which push back. Find allies, track opposition and prepare for committee engagement.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold">About EUParlIQ</h2>
          <p className="text-base text-muted-foreground">AI-powered intelligence for EU parliamentary activity</p>
        </div>

        {/* Problem */}
        <section className="space-y-4">
          <h3 className="text-2xl font-bold">The problem</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            EU parliamentary data is scattered across OEIL, EUR-Lex, the EP website, Council press releases and committee agendas. CRE plenary transcripts exist but nobody has made them properly searchable. Voting records are published but disconnected from what MEPs actually said.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            None of this is structured, searchable or connected. Policy professionals spend hours every day manually cross-referencing these sources to answer questions that should take seconds.
          </p>
        </section>

        {/* Features */}
        <section className="space-y-6">
          <h3 className="text-2xl font-bold">What EUParlIQ does</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-5 rounded-lg border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">{f.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Who it's for */}
        <section className="space-y-6">
          <h3 className="text-2xl font-bold">Who it's for</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {audiences.map((a) => (
              <div key={a.title} className="p-5 rounded-lg border border-border bg-card space-y-2">
                <h4 className="font-semibold text-sm">{a.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Scope */}
        <section className="space-y-4">
          <h3 className="text-2xl font-bold">Current scope</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MVP covering three legislative files: the AI Act, the Corporate Sustainability Due Diligence Directive (CSDDD), and the Digital Markets Act (DMA). Six committees: ITRE, IMCO, JURI, LIBE, ECON, ENVI. Data from the 9th and 10th parliamentary terms.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
