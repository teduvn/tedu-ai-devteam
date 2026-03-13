import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { LLMResult } from "@langchain/core/outputs";
import { env } from "../env.js";
import { addTokens } from "./token-tracker.js";

export type SupportedLLM = ChatAnthropic | ChatOpenAI;

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5",
  deepseek: "deepseek-chat", // DeepSeek V3 — supports tool calls natively
};

/**
 * Custom fetch wrapper for the DeepSeek API.
 *
 * DeepSeek requires `reasoning_content` to be present in every assistant
 * message in history when the model generates it (even for deepseek-chat V3
 * which sometimes activates thinking mode). LangChain serialises AIMessage
 * back to OpenAI API format but silently drops `additional_kwargs`, so the
 * field is lost. This wrapper injects `reasoning_content: ""` into any
 * assistant message that is missing it before the request leaves the process.
 */
function deepseekAwareFetch(
  input: Parameters<typeof globalThis.fetch>[0],
  init?: Parameters<typeof globalThis.fetch>[1],
): ReturnType<typeof globalThis.fetch> {
  if (init?.body && typeof init.body === "string") {
    try {
      const body = JSON.parse(init.body) as {
        messages?: Array<Record<string, unknown>>;
      };
      if (Array.isArray(body.messages)) {
        let patched = false;
        body.messages = body.messages.map((msg) => {
          if (msg.role === "assistant" && msg.reasoning_content === undefined) {
            patched = true;
            return { ...msg, reasoning_content: "" };
          }
          return msg;
        });
        if (patched) {
          return globalThis.fetch(input, {
            ...init,
            body: JSON.stringify(body),
          });
        }
      }
    } catch {
      // Non-JSON body — pass through unmodified.
    }
  }
  return globalThis.fetch(input, init);
}

/**
 * Accumulates LLM token usage per ticket using the LangChain callback system.
 * Works for both ChatAnthropic and ChatOpenAI (DeepSeek).
 */
class TokenTrackingCallback extends BaseCallbackHandler {
  readonly name = "TokenTrackingCallback";

  constructor(private readonly ticketId: string) {
    super();
  }

  override handleChatModelEnd(output: LLMResult): void {
    for (const genGroup of output.generations) {
      for (const gen of genGroup) {
        // `message` exists on ChatGeneration — grab usage_metadata (LangChain v0.2+)
        const message = (gen as { message?: { usage_metadata?: { input_tokens?: number; output_tokens?: number } } }).message;
        if (message?.usage_metadata) {
          addTokens(
            this.ticketId,
            message.usage_metadata.input_tokens ?? 0,
            message.usage_metadata.output_tokens ?? 0,
          );
          return;
        }
      }
    }
    // Fallback: OpenAI-style tokenUsage (DeepSeek)
    const tu = (output.llmOutput as { tokenUsage?: { promptTokens?: number; completionTokens?: number } } | undefined)?.tokenUsage;
    if (tu) {
      addTokens(this.ticketId, tu.promptTokens ?? 0, tu.completionTokens ?? 0);
    }
  }
}

/**
 * Returns the configured LLM instance based on LLM_PROVIDER env var.
 * Supported providers:
 *   - "anthropic" (default) — Claude via Anthropic API
 *   - "deepseek"            — DeepSeek via OpenAI-compatible API
 *
 * Control via .env:
 *   LLM_PROVIDER=deepseek
 *   LLM_MODEL=deepseek-chat        # V3 — recommended for tool use
 *   DEEPSEEK_API_KEY=sk-...
 *
 * Pass ticketId to enable per-ticket token usage tracking on the dashboard.
 */
export function createLLM(ticketId?: string): SupportedLLM {
  const provider = env.LLM_PROVIDER;
  const model = env.LLM_MODEL ?? DEFAULT_MODELS[provider] ?? DEFAULT_MODELS["anthropic"];
  const callbacks = ticketId ? [new TokenTrackingCallback(ticketId)] : undefined;

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
        // Inject missing reasoning_content fields before every API call.
        fetch: deepseekAwareFetch as typeof globalThis.fetch,
      },
      callbacks,
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
    callbacks,
  });
}

