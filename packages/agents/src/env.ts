import { z } from "zod";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env from monorepo root regardless of working directory.
// import.meta.url gives us the absolute location of this file, so the
// relative path is always correct even when pnpm changes cwd per package.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
try {
  process.loadEnvFile(resolve(__dirname, "../../../.env"));
} catch {
  // No .env file found — assume env vars are provided by the host (CI/production).
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
