import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { env } from "./env.js";
import { appRouter } from "../routers.js";
import type { Context } from "./trpc.js";

const app = express();

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://www.europarl.europa.eu", "https://multimedia.europarl.europa.eu"],
        connectSrc: ["'self'", "https://data.europarl.europa.eu"],
        frameSrc: ["'self'", "https://multimedia.europarl.europa.eu"],
      },
    },
  })
);

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many search requests. Please try again in a minute." },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});

app.use("/api/search", searchLimiter);
app.use("/api", generalLimiter);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------

app.use(express.json({ limit: "1mb" }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), product: "EUParlIQ" });
});

// ---------------------------------------------------------------------------
// tRPC
// ---------------------------------------------------------------------------

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }): Context => ({ req, res }),
  })
);

// ---------------------------------------------------------------------------
// Static files (production)
// ---------------------------------------------------------------------------

if (env.NODE_ENV === "production") {
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicPath = path.join(__dirname, "public");

  app.use(express.static(publicPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
} else {
  // Development: Vite dev server handles frontend
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(env.PORT, () => {
  console.log(`[EUParlIQ] Server running on port ${env.PORT} (${env.NODE_ENV})`);
});

export { app };
