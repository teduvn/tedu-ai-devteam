import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { env } from "../env.js";

export type SupportedLLM = ChatAnthropic | ChatOpenAI;

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5",
  deepseek: "deepseek-reasoner", // DeepSeek R1 (reasoning model)
};

/**
 * Returns the configured LLM instance based on LLM_PROVIDER env var.
 * Supported providers:
 *   - "anthropic" (default) — Claude via Anthropic API
 *   - "deepseek"            — DeepSeek via OpenAI-compatible API
 *
 * Control via .env:
 *   LLM_PROVIDER=deepseek
 *   LLM_MODEL=deepseek-reasoner      # or deepseek-chat for V3
 *   DEEPSEEK_API_KEY=sk-...
 */
export function createLLM(): SupportedLLM {
  const provider = env.LLM_PROVIDER;
  const model = env.LLM_MODEL ?? DEFAULT_MODELS[provider] ?? DEFAULT_MODELS["anthropic"];

  if (provider === "deepseek") {
    if (!env.DEEPSEEK_API_KEY) {
      throw new Error(
        "DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek. Add it to your .env file.",
      );
    }
    return new ChatOpenAI({
      model,
      apiKey: env.DEEPSEEK_API_KEY,
      configuration: {
        baseURL: DEEPSEEK_BASE_URL,
      },
    });
  }

  // Default: Anthropic
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic. Add it to your .env file.",
    );
  }
  return new ChatAnthropic({
    model,
    apiKey: env.ANTHROPIC_API_KEY,
  });
}
