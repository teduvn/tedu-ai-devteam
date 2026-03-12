import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { resolve } from "path";
import { MONOREPO_ROOT } from "../env.js";
import { createMCPTools, closeMCPClient } from "../tools/mcp-client.js";
import { invokeWithTools, extractJson } from "../tools/invoke-with-tools.js";
import { createLLM } from "../tools/llm-factory.js";
import type { AgentStateType, CodeChange } from "../state.js";

const SYSTEM_PROMPT = `You are a Senior TypeScript Developer (Coder Agent) in an AI-powered development team.

Your responsibilities:
1. Use list_directory to understand the existing project structure.
2. Use read_file to read relevant existing files before modifying them.
3. Implement ALL tasks in the development plan using write_file.
4. Follow ESM-only, strict TypeScript, no \`any\` types.

After all files are written, respond ONLY with:
\`\`\`json
{
  "filesModified": ["path/to/file1.ts", "path/to/file2.ts"],
  "summary": "<one-line description of what was implemented>"
}
\`\`\`

Code quality rules:
- Use \`interface\` over \`type\` for object shapes.
- Use \`import/export\`, never \`require()\`.
- Add descriptive variable names — no single letters.
- Handle errors at boundaries with try/catch.`;

export async function coderNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const { tools, client } = await createMCPTools({
    command: "npx",
    args: ["tsx", resolve(MONOREPO_ROOT, "packages/mcp-servers/src/filesystem-server.ts")],
  });

  try {
    const llm = createLLM();

    const planText = state.plan
      .map((task, i) => `${i + 1}. ${task}`)
      .join("\n");

    const ticketContext = state.ticketDetails
      ? `**Ticket:** ${state.ticketDetails.summary}\n**Description:** ${state.ticketDetails.description}`
      : `**Ticket ID:** ${state.ticketId}`;

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `${ticketContext}\n\n**Development Plan:**\n${planText}\n\nExplore the project structure, read relevant files, then implement all tasks.`,
      ),
    ];

    const response = await invokeWithTools(llm, tools, messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = extractJson<{ filesModified?: string[] }>(text);

    // Collect code changes from write_file tool call args via tool_calls history
    const codeChanges: CodeChange[] = (parsed?.filesModified ?? []).map(
      (filePath) => ({
        filePath,
        content: "",   // Actual content was written to disk via MCP
        operation: "create" as const,
      }),
    );

    return {
      phase: "reviewing",
      codeChanges,
      retryCount: state.retryCount + (state.phase === "coding" ? 1 : 0),
      messages: [
        new HumanMessage(
          `[Coder Agent] Implemented ${codeChanges.length} file(s) for "${state.ticketDetails?.summary ?? state.ticketId}".`,
        ),
      ],
    };
  } finally {
    await closeMCPClient(client);
  }
}
