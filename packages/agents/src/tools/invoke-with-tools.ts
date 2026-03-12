import {
  AIMessage,
  BaseMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { DynamicStructuredTool } from "@langchain/core/tools";

// Use an opaque interface with `any` to avoid BaseMessage generic variance
// errors caused by @langchain/core version splits across workspace packages.
// Runtime behaviour is correct — both ChatAnthropic and ChatOpenAI satisfy this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BindableLLM {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bindTools(tools: any[]): { invoke(msgs: any[]): Promise<any> };
}

/**
 * Runs an LLM in a ReAct-style tool-calling loop until no more tool calls
 * are requested. Returns the final AIMessage with text content.
 */
export async function invokeWithTools(
  llm: BindableLLM,
  tools: DynamicStructuredTool[],
  messages: BaseMessage[],
): Promise<AIMessage> {
  const llmWithTools = llm.bindTools(tools);
  let response = await llmWithTools.invoke(messages);
  const history = [...messages];

  while (response.tool_calls && response.tool_calls.length > 0) {
    const aiMsg = new AIMessage({
      content: response.content,
      tool_calls: response.tool_calls,
    });
    history.push(aiMsg);

    for (const call of response.tool_calls) {
      const tool = tools.find((t) => t.name === call.name);
      let toolResult: string;

      if (tool) {
        toolResult = String(
          await tool.invoke(call.args as Record<string, unknown>),
        );
      } else {
        toolResult = `[Error] Tool "${call.name}" not found.`;
      }

      history.push(
        new ToolMessage({
          content: toolResult,
          tool_call_id: call.id ?? call.name,
        }),
      );
    }

    response = await llmWithTools.invoke(history);
  }

  return response as AIMessage;
}

/** Extract a JSON block from LLM text output. Returns null on failure. */
export function extractJson<T>(text: string): T | null {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const jsonStr = match[1] ?? match[0];
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}
