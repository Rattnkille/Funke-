import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

function requireSecret(): string | undefined {
  const secret = process.env.BETTER_AUTH_SECRET;
  // Während `next build` gibt es keine Anfragen; zur Laufzeit ist ein Geheimnis Pflicht.
  if (!secret && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("BETTER_AUTH_SECRET fehlt. Führe `pnpm env:init` aus (siehe README).");
  }
  return secret;
}

export const auth = betterAuth({
  appName: "FUNKE",
  secret: requireSecret(),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(getDb(), { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      adultConfirmed: { type: "boolean", required: true, input: true },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: process.env.FUNKE_DISABLE_RATE_LIMIT !== "1", window: 60, max: 30 },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const body = (ctx.body ?? {}) as { adultConfirmed?: unknown; name?: unknown };
      if (body.adultConfirmed !== true) {
        throw new APIError("BAD_REQUEST", {
          message: "FUNKE ist nur für Erwachsene. Bitte bestätige, dass du volljährig bist.",
        });
      }
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 60) {
        throw new APIError("BAD_REQUEST", { message: "Bitte gib einen Namen mit 2 bis 60 Zeichen an." });
      }
    }),
  },
  plugins: [nextCookies()],
});
