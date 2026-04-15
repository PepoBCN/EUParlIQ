import { Link, useLocation } from "wouter";
import { COMMITTEES } from "@shared/committees";

const committeeNav = COMMITTEES.map((c) => ({
  name: c.shortName,
  slug: c.slug,
  color: c.color,
  abbreviation: c.abbreviation,
}));

export default function SiteHeader() {
  const [location] = useLocation();

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="block hover:opacity-80 transition-opacity no-underline">
            <h1 className="text-xl font-bold text-foreground uppercase tracking-wide">
              EUParlIQ
            </h1>
            <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">
              EU Parliamentary Intelligence
            </p>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/"
              className={`no-underline transition-colors ${location === "/" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Search
            </Link>
            <Link
              href="/about"
              className={`no-underline transition-colors ${location === "/about" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              About
            </Link>
          </nav>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1 py-2 overflow-x-auto">
            {committeeNav.map((c) => {
              const isActive = location === `/committee/${c.slug}`;
              return (
                <Link
                  key={c.slug}
                  href={`/committee/${c.slug}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans no-underline transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${c.color}`} />
                  {c.abbreviation}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
