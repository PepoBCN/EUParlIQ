import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy-load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Committee = lazy(() => import("./pages/Committee"));
const MepProfile = lazy(() => import("./pages/MepProfile"));
const LegislativeIndex = lazy(() => import("./pages/LegislativeIndex"));
const Legislative = lazy(() => import("./pages/Legislative"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/committee/:slug" component={Committee} />
        <Route path="/mep/:epId" component={MepProfile} />
        <Route path="/legislation" component={LegislativeIndex} />
        <Route path="/legislation/:reference" component={Legislative} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}
