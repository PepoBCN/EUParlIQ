import { useParams } from "wouter";

export default function MepProfile() {
  const { epId } = useParams<{ epId: string }>();

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
        <h2 className="text-2xl font-bold">MEP Profile: {epId}</h2>
        <p className="text-sm text-muted-foreground mt-2">MEP profiles coming soon. Data ingestion required first.</p>
      </main>
    </div>
  );
}
