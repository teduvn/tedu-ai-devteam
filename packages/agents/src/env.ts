import { z } from "zod";
import { resolve } from "path";

// Unified monorepo root resolution:
//   - Next.js/webpack: TEDU_MONOREPO_ROOT is injected by next.config.ts (env option).
//   - agent:start (tsx): import.meta.dirname = packages/agents/src → up 3 = monorepo root.
// import.meta.dirname is a plain property access — webpack does NOT intercept it.
export const MONOREPO_ROOT: string =
  process.env.TEDU_MONOREPO_ROOT ??
  resolve(import.meta.dirname, "../../..");

// Load .env when running via Node.js (tsx / agent:start).
// Skipped in Next.js — next.config.ts already called process.loadEnvFile.
try {
  if (!process.env.TEDU_MONOREPO_ROOT) {
    process.loadEnvFile(resolve(MONOREPO_ROOT, ".env"));
  }
} catch {
  // .env not found — assume env vars are injected by host.
}

const envSchema = z.object({
  // ─── LLM Provider ────────────────────────────────────────────────────────
  // Set LLM_PROVIDER to "anthropic" (default) or "deepseek".
  // Set LLM_MODEL to override the default model for the chosen provider.
  LLM_PROVIDER: z.enum(["anthropic", "deepseek"]).default("anthropic"),
  LLM_MODEL: z.string().optional(),

  // ─── Anthropic ───────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),

  // ─── DeepSeek ────────────────────────────────────────────────────────────
  DEEPSEEK_API_KEY: z.string().optional(),

  // ─── Jira ────────────────────────────────────────────────────────────────
  JIRA_BASE_URL: z.string().url("JIRA_BASE_URL must be a valid URL"),
  JIRA_EMAIL: z.string().email("JIRA_EMAIL must be a valid email"),
  JIRA_API_TOKEN: z.string().min(1, "JIRA_API_TOKEN is required"),

  // ─── GitHub ──────────────────────────────────────────────────────────────
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  GITHUB_OWNER: z.string().min(1, "GITHUB_OWNER is required"),
  GITHUB_REPO: z.string().min(1, "GITHUB_REPO is required"),
  GITHUB_BASE_BRANCH: z.string().default("main"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
