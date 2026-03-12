import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env } from "../env.js";
import { createMCPTools, closeMCPClient } from "../tools/mcp-client.js";
import { invokeWithTools, extractJson } from "../tools/invoke-with-tools.js";
import { createLLM } from "../tools/llm-factory.js";
import type { AgentStateType, JiraTicket } from "../state.js";

const SYSTEM_PROMPT = `You are a Senior Product Manager (PM Agent) in an AI-powered development team.

Your responsibilities:
1. Read the Jira ticket using the get_ticket_details tool.
2. Update the Jira ticket status to "In Progress" using update_ticket_status.
3. Analyze the requirements and extract key technical details.
4. Create a concrete, actionable development plan.

After completing all steps, respond ONLY with a JSON block:
\`\`\`json
{
  "analysis": "<brief technical analysis>",
  "plan": [
    "Task 1: <specific atomic implementation step>",
    "Task 2: ...",
    "Task 3: ..."
  ],
  "affectedFiles": ["src/path/to/file.ts", "..."]
}
\`\`\`

Rules:
- 3–7 tasks maximum, each independently implementable.
- Tasks must be specific enough for a developer to implement without clarification.
- No vague tasks like "write tests" — be precise.`;

export async function pmNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const { tools, client } = await createMCPTools({
    command: "npx",
    args: ["tsx", "packages/mcp-servers/src/jira-server.ts"],
    env: {
      JIRA_BASE_URL: env.JIRA_BASE_URL,
      JIRA_EMAIL: env.JIRA_EMAIL,
      JIRA_API_TOKEN: env.JIRA_API_TOKEN,
    },
  });

  try {
    const llm = createLLM();

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `Jira ticket: "${state.ticketId}". ` +
          `Fetch details, update the status to "In Progress", then produce the development plan.`,
      ),
    ];

    const response = await invokeWithTools(llm, tools, messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = extractJson<{ plan?: string[]; analysis?: string }>(text);
    const plan = parsed?.plan ?? ["Implement requirements from ticket"];

    // Build a minimal JiraTicket from state if MCP returned valid JSON
    let ticketDetails: JiraTicket | null = null;
    try {
      // The jira-server returns ticket JSON via tool message; extract from history
      const firstToolMsg = response.additional_kwargs?.["tool_results"];
      if (firstToolMsg) {
        ticketDetails = JSON.parse(String(firstToolMsg)) as JiraTicket;
      }
    } catch {
      ticketDetails = {
        id: state.ticketId,
        summary: parsed?.analysis ?? "PM analysis complete",
        description: text,
        priority: "medium",
        type: "task",
        assignee: null,
        labels: [],
      };
    }

    return {
      phase: "planning",
      ticketDetails,
      plan,
      messages: [
        new HumanMessage(
          `[PM Agent] Ticket ${state.ticketId} analyzed. ${plan.length} tasks planned.`,
        ),
      ],
    };
  } finally {
    await closeMCPClient(client);
  }
}
