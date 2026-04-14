export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <a href="/" className="text-sm underline">Back to search</a>
      </div>
    </div>
  );
}
