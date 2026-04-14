import { Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">EUParlIQ</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">EU Parliamentary Intelligence</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="font-medium">Search</a>
            <a href="/about" className="text-muted-foreground hover:text-foreground">About</a>
          </nav>
        </div>
      </header>

      {/* Hero / Search */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-bold">EU Parliamentary Intelligence</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered search and analysis across EU Parliament select committee activity, plenary debates, voting records and MEP profiles. Ask questions in plain English, get cited answers in seconds.
          </p>
        </div>

        {/* Search bar */}
        <div className="mt-10 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ask anything about EU Parliament activity..."
            className="w-full pl-12 pr-4 py-4 text-lg border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            disabled
          />
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Search is not yet active. Data ingestion required first.
          </p>
        </div>

        {/* Scope info */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">Legislative files</p>
          </div>
          <div>
            <p className="text-3xl font-bold">6</p>
            <p className="text-sm text-muted-foreground">Committees</p>
          </div>
          <div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Hearings transcribed</p>
          </div>
          <div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">MEPs indexed</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-primary text-primary-foreground mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-xs">
          <p>EUParlIQ - EU Parliamentary Intelligence</p>
          <p>Scaffolded {new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </footer>
    </div>
  );
}
