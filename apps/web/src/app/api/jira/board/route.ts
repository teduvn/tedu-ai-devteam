import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoardTicket {
  id: string;
  summary: string;
  priority: "low" | "medium" | "high" | "critical";
  type: string;
  assignee: string | null;
  status: string;
}

export interface BoardResponse {
  columns: Record<string, BoardTicket[]>; // keyed by Jira status name
  total: number;
  lastUpdated: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePriority(name?: string): BoardTicket["priority"] {
  switch ((name ?? "").toLowerCase()) {
    case "highest":
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "low":
    case "lowest":
      return "low";
    default:
      return "medium";
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY ?? "TEDU";

  if (!baseUrl || !email || !token) {
    return NextResponse.json(
      { error: "Jira credentials not configured (JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN)" },
      { status: 503 },
    );
  }

  const auth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
  const jql = encodeURIComponent(
    `project = "${projectKey}" AND statusCategory != Done ORDER BY priority DESC, updated DESC`,
  );
  const doneJql = encodeURIComponent(
    `project = "${projectKey}" AND status in ("Done","Canceled") ORDER BY updated DESC`,
  );

  try {
    const [activeResp, doneResp] = await Promise.all([
      fetch(
        `${baseUrl}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,status,priority,issuetype,assignee`,
        { headers: { Authorization: auth, Accept: "application/json" } },
      ),
      fetch(
        `${baseUrl}/rest/api/3/search?jql=${doneJql}&maxResults=20&fields=summary,status,priority,issuetype,assignee`,
        { headers: { Authorization: auth, Accept: "application/json" } },
      ),
    ]);

    if (!activeResp.ok) {
      const text = await activeResp.text();
      return NextResponse.json({ error: `Jira API ${activeResp.status}: ${text}` }, { status: 502 });
    }

    const active = (await activeResp.json()) as { total: number; issues: JiraIssue[] };
    const done = doneResp.ok ? (await doneResp.json()) as { total: number; issues: JiraIssue[] } : { total: 0, issues: [] };

    const columns: Record<string, BoardTicket[]> = {};
    for (const issue of [...active.issues, ...done.issues]) {
      const statusName = issue.fields.status.name;
      if (!columns[statusName]) columns[statusName] = [];
      columns[statusName].push({
        id: issue.key,
        summary: issue.fields.summary,
        priority: normalizePriority(issue.fields.priority?.name),
        type: (issue.fields.issuetype?.name ?? "task").toLowerCase(),
        assignee: issue.fields.assignee?.displayName ?? null,
        status: statusName,
      });
    }

    const body: BoardResponse = {
      columns,
      total: active.total + done.total,
      lastUpdated: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    priority?: { name: string };
    issuetype?: { name: string };
    assignee?: { displayName: string };
  };
}
