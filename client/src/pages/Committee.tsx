import { useParams } from "wouter";

export default function Committee() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <a href="/">
            <h1 className="text-xl font-bold uppercase tracking-wide">EUParlIQ</h1>
          </a>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold">Committee: {slug?.toUpperCase()}</h2>
        <p className="text-sm text-muted-foreground mt-2">Committee pages coming soon. Data ingestion required first.</p>
      </main>
    </div>
  );
}
