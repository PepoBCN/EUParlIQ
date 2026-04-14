export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <a href="/">
              <h1 className="text-xl font-bold uppercase tracking-wide">EUParlIQ</h1>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">EU Parliamentary Intelligence</p>
            </a>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-muted-foreground hover:text-foreground">Search</a>
            <a href="/about" className="font-medium">About</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold">About EUParlIQ</h2>
          <p className="text-lg text-muted-foreground">AI-powered intelligence for EU parliamentary activity</p>
        </div>

        <section className="space-y-4">
          <h3 className="text-2xl font-bold">The problem</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            EU parliamentary data is scattered across OEIL, EUR-Lex, the EP Legislative Observatory, Council press releases, committee agendas, and hours of unindexed committee hearing video. None of this is structured, searchable or connected.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Policy professionals spend hours every day manually cross-referencing these sources. Committee hearings - often the richest source of policy intent - are effectively invisible because nobody transcribes them.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-2xl font-bold">What EUParlIQ does</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            EUParlIQ ingests EU legislative text, plenary debate transcripts, committee hearing transcripts, roll-call votes, parliamentary questions and MEP profiles into a single AI-searchable database. Ask a question in plain English, get a cited answer in seconds.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-2xl font-bold">MVP scope</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Currently covering three legislative files: the AI Act, the Corporate Sustainability Due Diligence Directive (CSDDD), and the Digital Markets Act (DMA). Six committees: ITRE, IMCO, JURI, LIBE, ECON, ENVI.
          </p>
        </section>
      </main>
    </div>
  );
}
