import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue;
}

export const env = {
  NODE_ENV: optionalEnv("NODE_ENV", "development") as "development" | "production",
  PORT: parseInt(optionalEnv("PORT", "3000")!, 10),
  DATABASE_URL: requireEnv("DATABASE_URL"),
  OPENAI_API_KEY: requireEnv("OPENAI_API_KEY"),
  ANTHROPIC_API_KEY: requireEnv("ANTHROPIC_API_KEY"),
  JWT_SECRET: optionalEnv("JWT_SECRET", "dev-secret-change-in-production"),
} as const;
