import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { resolve } from "path";
import { env, MONOREPO_ROOT } from "../env.js";
import { createMCPTools, closeMCPClient } from "../tools/mcp-client.js";
import { invokeWithTools, extractJson } from "../tools/invoke-with-tools.js";
import { createLLM } from "../tools/llm-factory.js";
import type { AgentStateType } from "../state.js";

// ─── Staging Deploy Node ──────────────────────────────────────────────────────

const STAGING_PROMPT = `You are a Senior DevOps Engineer (DevOps Agent) in an AI-powered development team.

**Phase: Staging Deployment**

Your workflow for this phase:
1. create_branch — naming convention: feature/TICKET-ID-brief-description or fix/TICKET-ID-brief-description
2. commit_files — commit all changed files with a conventional commit message
3. create_pull_request — write a detailed PR body; mark it as draft=true for now
4. deploy_to_staging — trigger a staging deployment of the branch so the Tester can verify

After completing all steps respond ONLY with:
\`\`\`json
{
  "branchName": "<branch-name>",
  "prUrl": "<https://github.com/...>",
  "prNumber": <number>,
  "stagingUrl": "<https://staging.example.com or null>"
}
\`\`\`

Commit message format: feat(TICKET-ID): <title>`;

const PRODUCTION_PROMPT = `You are a Senior DevOps Engineer (DevOps Agent) in an AI-powered development team.

**Phase: Production Deployment (Merge & Release)**

The Tester has verified the code and a human has approved the release.

Your workflow:
1. merge_pull_request — merge the approved PR into the base branch
2. update_ticket_status — set the Jira ticket status to "Done"
3. add_comment — post a release comment with the PR URL and branch name

Respond ONLY with:
\`\`\`json
{
  "merged": true,
  "mergeCommitSha": "<sha>",
  "releasedAt": "<ISO timestamp>"
}
\`\`\``;

export async function devopsNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const { tools: ghTools, client: ghClient } = await createMCPTools({
    command: "npx",
    args: ["tsx", resolve(MONOREPO_ROOT, "packages/mcp-servers/src/github-server.ts")],
    env: {
      GITHUB_TOKEN: env.GITHUB_TOKEN,
      GITHUB_OWNER: env.GITHUB_OWNER,
      GITHUB_REPO: env.GITHUB_REPO,
      GITHUB_BASE_BRANCH: env.GITHUB_BASE_BRANCH,
    },
  });

  const { tools: jiraTools, client: jiraClient } = await createMCPTools({
    command: "npx",
    args: ["tsx", resolve(MONOREPO_ROOT, "packages/mcp-servers/src/jira-server.ts")],
    env: {
      JIRA_BASE_URL: env.JIRA_BASE_URL,
      JIRA_EMAIL: env.JIRA_EMAIL,
      JIRA_API_TOKEN: env.JIRA_API_TOKEN,
    },
  });

  try {
    const llm = createLLM();

    const allTools = [...ghTools, ...jiraTools];

    // ── Production deploy (called after human approval) ───────────────────────
    if (state.phase === "deploying_production") {
      const messages = [
        new SystemMessage(PRODUCTION_PROMPT),
        new HumanMessage(
          `Merge PR **#${state.prNumber}** (${state.prUrl}) for ticket **${state.ticketId}**: ` +
            `"${state.ticketDetails?.summary ?? ""}"\n\n` +
            `Branch: \`${state.branchName}\`\n\n` +
            `Merge the PR, mark the Jira ticket as "Done", and add a release comment.`,
        ),
      ];

      const response = await invokeWithTools(llm, allTools, messages);
      const text =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      const parsed = extractJson<{ merged?: boolean; releasedAt?: string }>(text);

      return {
        phase: parsed?.merged ? "done" : "error",
        messages: [
          new HumanMessage(
            `[DevOps Agent] 🚀 Production deploy ${parsed?.merged ? "succeeded" : "failed"} at ${parsed?.releasedAt ?? "N/A"}`,
          ),
        ],
      };
    }

    // ── Staging deploy (default path after coder) ─────────────────────────────
    const changesContext = state.codeChanges
      .map((c) => `- \`${c.operation}\`: ${c.filePath}`)
      .join("\n");

    const ticketSummary = state.ticketDetails?.summary ?? state.ticketId;
    const ticketType = state.ticketDetails?.type ?? "feature";
    const branchPrefix = ticketType === "bug" ? "fix" : "feature";
    const suggestedBranch = `${branchPrefix}/${state.ticketId.toLowerCase()}-${ticketSummary
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)}`;

    const messages = [
      new SystemMessage(STAGING_PROMPT),
      new HumanMessage(
        `Deploy to staging for ticket **${state.ticketId}**: "${ticketSummary}"\n\n` +
          `**Suggested branch:** \`${suggestedBranch}\`\n\n` +
          `**Changed files:**\n${changesContext}\n\n` +
          `Create the branch, commit files, open a draft PR, deploy to staging, ` +
          `and update the Jira ticket "${state.ticketId}" to "Ready for Testing" status.`,
      ),
    ];

    const response = await invokeWithTools(llm, allTools, messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = extractJson<{
      branchName?: string;
      prUrl?: string;
      prNumber?: number;
      stagingUrl?: string | null;
    }>(text);

    return {
      phase: "deploying_staging",
      branchName: parsed?.branchName ?? suggestedBranch,
      prUrl: parsed?.prUrl ?? null,
      prNumber: parsed?.prNumber ?? null,
      stagingUrl: parsed?.stagingUrl ?? null,
      messages: [
        new HumanMessage(
          `[DevOps Agent] Staging deploy done — PR: ${parsed?.prUrl ?? "N/A"} | Staging: ${parsed?.stagingUrl ?? "local"}`,
        ),
      ],
    };
  } finally {
    await closeMCPClient(ghClient);
    await closeMCPClient(jiraClient);
  }
}

