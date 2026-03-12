import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getJiraEnv } from "./env.js";

const jiraEnv = getJiraEnv();

const server = new Server(
  { name: "tedu-jira-connector", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// ─── Auth Header ──────────────────────────────────────────────────────────────

const AUTH = `Basic ${Buffer.from(
  `${jiraEnv.JIRA_EMAIL}:${jiraEnv.JIRA_API_TOKEN}`,
).toString("base64")}`;

const HEADERS = {
  Authorization: AUTH,
  "Content-Type": "application/json",
  Accept: "application/json",
};

// ─── Tool Definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_ticket_details",
      description: "Fetch full details of a Jira ticket by its ID.",
      inputSchema: {
        type: "object",
        properties: {
          ticketId: { type: "string", description: "Jira ticket ID, e.g. TEDU-42" },
        },
        required: ["ticketId"],
      },
    },
    {
      name: "update_ticket_status",
      description: "Transition a Jira ticket to a new status.",
      inputSchema: {
        type: "object",
        properties: {
          ticketId: { type: "string" },
          statusName: {
            type: "string",
            description: "Target status name, e.g. 'In Progress', 'Done'",
          },
        },
        required: ["ticketId", "statusName"],
      },
    },
    {
      name: "add_comment",
      description: "Add a comment to a Jira ticket.",
      inputSchema: {
        type: "object",
        properties: {
          ticketId: { type: "string" },
          comment: { type: "string", description: "Plain-text comment body" },
        },
        required: ["ticketId", "comment"],
      },
    },
  ],
}));

// ─── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_ticket_details") {
      const { ticketId } = z
        .object({ ticketId: z.string() })
        .parse(args);

      const resp = await fetch(
        `${jiraEnv.JIRA_BASE_URL}/rest/api/3/issue/${ticketId}`,
        { headers: HEADERS },
      );
      if (!resp.ok)
        throw new Error(`Jira ${resp.status}: ${await resp.text()}`);

      const issue = (await resp.json()) as {
        key: string;
        fields: {
          summary: string;
          description?: {
            content: Array<{ content: Array<{ text?: string }> }>;
          };
          priority?: { name: string };
          issuetype?: { name: string };
          assignee?: { displayName: string };
          labels?: string[];
        };
      };

      const description =
        issue.fields.description?.content
          .flatMap((block) => block.content.map((c) => c.text ?? ""))
          .join(" ") ?? "";

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: issue.key,
              summary: issue.fields.summary,
              description,
              priority: (issue.fields.priority?.name ?? "medium").toLowerCase(),
              type: (issue.fields.issuetype?.name ?? "task").toLowerCase(),
              assignee: issue.fields.assignee?.displayName ?? null,
              labels: issue.fields.labels ?? [],
            }),
          },
        ],
      };
    }

    if (name === "update_ticket_status") {
      const { ticketId, statusName } = z
        .object({ ticketId: z.string(), statusName: z.string() })
        .parse(args);

      const transResp = await fetch(
        `${jiraEnv.JIRA_BASE_URL}/rest/api/3/issue/${ticketId}/transitions`,
        { headers: HEADERS },
      );
      const { transitions } = (await transResp.json()) as {
        transitions: Array<{ id: string; name: string }>;
      };
      const transition = transitions.find(
        (t) => t.name.toLowerCase() === statusName.toLowerCase(),
      );
      if (!transition)
        throw new Error(
          `Status "${statusName}" not found. Available: ${transitions.map((t) => t.name).join(", ")}`,
        );

      await fetch(
        `${jiraEnv.JIRA_BASE_URL}/rest/api/3/issue/${ticketId}/transitions`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({ transition: { id: transition.id } }),
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Transitioned ${ticketId} to "${statusName}"`,
          },
        ],
      };
    }

    if (name === "add_comment") {
      const { ticketId, comment } = z
        .object({ ticketId: z.string(), comment: z.string() })
        .parse(args);

      await fetch(
        `${jiraEnv.JIRA_BASE_URL}/rest/api/3/issue/${ticketId}/comment`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            body: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: comment }],
                },
              ],
            },
          }),
        },
      );
      return {
        content: [
          { type: "text" as const, text: `Comment added to ${ticketId}` },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `[Error] ${name}: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
