declare const __BUILD_TIME__: string;

const buildTime = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();
const buildLabel = new Date(buildTime).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function SiteFooter() {
  return (
    <footer className="border-t border-border mt-16 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs">
            <p className="font-sans opacity-90">EUParlIQ - EU Parliamentary Intelligence</p>
            <p className="font-sans opacity-60 mt-1">
              &copy; {new Date().getFullYear()} F. Galiano Consulting Ltd. All rights reserved.
            </p>
          </div>
          <div className="text-xs text-right">
            <p className="font-sans opacity-60">Last deployed {buildLabel}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
