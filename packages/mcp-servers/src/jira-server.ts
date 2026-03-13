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
    {
      name: "list_ready_for_dev_tickets",
      description:
        "Search for tickets in the project whose status is 'Ready for Dev', ordered by priority descending.",
      inputSchema: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "Maximum number of tickets to return (default 10)",
          },
        },
        required: [],
      },
    },
    {
      name: "list_todo_tickets",
      description:
        "Search for all tickets in the project with status 'To Do', ordered by priority descending.",
      inputSchema: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "Maximum number of tickets to return (default 20)",
          },
        },
        required: [],
      },
    },
    {
      name: "update_ticket_description",
      description: "Update the description field of a Jira ticket with new content.",
      inputSchema: {
        type: "object",
        properties: {
          ticketId: { type: "string", description: "Jira ticket ID, e.g. TEDU-42" },
          description: {
            type: "string",
            description: "New description content in plain Markdown text",
          },
        },
        required: ["ticketId", "description"],
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

    if (name === "list_ready_for_dev_tickets") {
      const { maxResults } = z
        .object({ maxResults: z.number().optional() })
        .parse(args ?? {});

      const jql = encodeURIComponent(
        `project = "${jiraEnv.JIRA_PROJECT_KEY}" AND status = "READY FOR DEV" ORDER BY priority DESC`,
      );
      const resp = await fetch(
        `${jiraEnv.JIRA_BASE_URL}/rest/api/3/search/jql?jql=${jql}&maxResults=${maxResults ?? 10}&fields=summary,priority,status,assignee,issuetype`,
        { headers: HEADERS },
      );
      if (!resp.ok)
        throw new Error(`Jira search ${resp.status}: ${await resp.text()}`);

      const data = (await resp.json()) as {
        total: number;
        issues: Array<{
          key: string;
          fields: {
            summary: string;
            priority?: { name: string };
            status?: { name: string };
            assignee?: { displayName: string };
            issuetype?: { name: string };
          };
        }>;
      };

      const tickets = data.issues.map((issue) => ({
        id: issue.key,
        summary: issue.fields.summary,
        priority: (issue.fields.priority?.name ?? "medium").toLowerCase(),
        type: (issue.fields.issuetype?.name ?? "task").toLowerCase(),
        assignee: issue.fields.assignee?.displayName ?? null,
        status: issue.fields.status?.name ?? "Ready for Dev",
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ total: data.total, tickets }),
          },
        ],
      };
    }

    if (name === "list_todo_tickets") {
      const { maxResults } = z
        .object({ maxResults: z.number().optional() })
        .parse(args ?? {});

      const jql = encodeURIComponent(
        `project = "${jiraEnv.JIRA_PROJECT_KEY}" AND status = "To Do" ORDER BY priority DESC`,
      );
      const resp = await fetch(
        `${jiraEnv.JIRA_BASE_URL}/rest/api/3/search/jql?jql=${jql}&maxResults=${maxResults ?? 20}&fields=summary,priority,status,assignee,issuetype`,
        { headers: HEADERS },
      );
      if (!resp.ok)
        throw new Error(`Jira search ${resp.status}: ${await resp.text()}`);

      const data = (await resp.json()) as {
        total: number;
        issues: Array<{
          key: string;
          fields: {
            summary: string;
            priority?: { name: string };
            status?: { name: string };
            assignee?: { displayName: string };
            issuetype?: { name: string };
          };
        }>;
      };

      const tickets = data.issues.map((issue) => ({
        id: issue.key,
        summary: issue.fields.summary,
        priority: (issue.fields.priority?.name ?? "medium").toLowerCase(),
        type: (issue.fields.issuetype?.name ?? "task").toLowerCase(),
        assignee: issue.fields.assignee?.displayName ?? null,
        status: issue.fields.status?.name ?? "To Do",
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ total: data.total, tickets }),
          },
        ],
      };
    }

    if (name === "update_ticket_description") {
      const { ticketId, description } = z
        .object({ ticketId: z.string(), description: z.string() })
        .parse(args);

      // Convert markdown to a minimal Atlassian Document Format (ADF)
      const adfContent = markdownToADF(description);

      const resp = await fetch(
        `${jiraEnv.JIRA_BASE_URL}/rest/api/3/issue/${ticketId}`,
        {
          method: "PUT",
          headers: HEADERS,
          body: JSON.stringify({ fields: { description: adfContent } }),
        },
      );
      if (!resp.ok && resp.status !== 204)
        throw new Error(`Jira update ${resp.status}: ${await resp.text()}`);

      return {
        content: [
          {
            type: "text" as const,
            text: `Description updated for ${ticketId}`,
          },
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

// ─── Markdown → ADF Converter ─────────────────────────────────────────────────

interface ADFNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ADFNode[];
  text?: string;
  marks?: Array<{ type: string }>;
}

function markdownToADF(markdown: string): ADFNode {
  const lines = markdown.split("\n");
  const content: ADFNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);
    const h1Match = line.match(/^# (.+)/);
    if (h1Match) {
      content.push({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: h1Match[1] }] });
      i++;
      continue;
    }
    if (h2Match) {
      content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: h2Match[1] }] });
      i++;
      continue;
    }
    if (h3Match) {
      content.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: h3Match[1] }] });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      content.push({ type: "rule" });
      i++;
      continue;
    }

    // Bullet list item
    if (line.match(/^[-*] /)) {
      const listItems: ADFNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        const itemText = lines[i].replace(/^[-*] /, "");
        listItems.push({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }],
        });
        i++;
      }
      content.push({ type: "bulletList", content: listItems });
      continue;
    }

    // Numbered list item
    if (line.match(/^\d+\. /)) {
      const listItems: ADFNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const itemText = lines[i].replace(/^\d+\. /, "");
        listItems.push({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }],
        });
        i++;
      }
      content.push({ type: "orderedList", content: listItems });
      continue;
    }

    // Blockquote (> lines)
    if (line.startsWith("> ")) {
      const quoteText = line.slice(2);
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: [{ type: "text", text: quoteText }] }],
      });
      i++;
      continue;
    }

    // Regular paragraph
    content.push({ type: "paragraph", content: [{ type: "text", text: line }] });
    i++;
  }

  return { type: "doc", version: 1 as unknown as string, content } as unknown as ADFNode;
}

// ─── Start Server ─────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
