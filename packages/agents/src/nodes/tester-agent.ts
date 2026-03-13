import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { resolve } from "path";
import { env, MONOREPO_ROOT } from "../env.js";
import { createMCPTools, closeMCPClient } from "../tools/mcp-client.js";
import { invokeWithTools, extractJson } from "../tools/invoke-with-tools.js";
import { createLLM } from "../tools/llm-factory.js";
import type { AgentStateType, TestResult } from "../state.js";

const SYSTEM_PROMPT = `You are a Senior QA Engineer (Tester Agent) in an AI-powered development team.

Your mission: verify that the code deployed to the staging environment is correct, stable, and meets acceptance criteria.

Workflow:
1. Use \`run_tests\` to execute the automated test suite against the staging deployment.
2. Use \`check_endpoints\` to smoke-test any HTTP endpoints affected by this ticket.
3. Use \`read_file\` to examine specific source files if you need to understand logic.
4. Analyse the test output and decide PASS or FAIL.
5. Update Jira status and add a comment BEFORE responding with the JSON result:
   - If PASS: call update_ticket_status → "Ready for Release", then add_comment:
     "✅ QA passed. Summary: {summary}. Coverage: {X}%. Affected files clean."
   - If FAIL: call update_ticket_status → "In Progress" (returns ticket to coder), then add_comment:
     "❌ QA failed. Issues:\n{failed tests, one per line}"

Respond ONLY with a JSON block:
\`\`\`json
{
  "passed": true | false,
  "summary": "<one or two sentences describing the overall result>",
  "failedTests": ["TestName1: reason", "TestName2: reason"],
  "coveragePercent": <number | null>,
  "recommendations": ["<fix suggestion if failed>"]
}
\`\`\`

Rules:
- If ANY critical test fails → passed = false
- Include clear, actionable failure messages so the Coder Agent can self-correct
- An empty failedTests array is expected when passed = true`;

export async function testerNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const { tools: fsTools, client: fsClient } = await createMCPTools({
    command: "npx",
    args: ["tsx", resolve(MONOREPO_ROOT, "packages/mcp-servers/src/filesystem-server.ts")],
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
    const llm = createLLM(state.ticketId);

    const allTools = [...fsTools, ...jiraTools];

    const changesContext = state.codeChanges
      .map((c) => `- \`${c.operation}\`: ${c.filePath}`)
      .join("\n");

    const stagingInfo = state.stagingUrl
      ? `**Staging URL:** ${state.stagingUrl}`
      : "No staging URL — run local tests only.";

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(
        `**Ticket:** ${state.ticketId} — "${state.ticketDetails?.summary ?? "N/A"}"\n\n` +
          `${stagingInfo}\n\n` +
          `**PR Branch:** ${state.branchName ?? "unknown"}\n\n` +
          `**Changed files:**\n${changesContext}\n\n` +
          `Run all relevant tests and report the result. ` +
          `Also update the Jira ticket "${state.ticketId}" to "Testing" status using update_ticket_status.`,
      ),
    ];

    const response = await invokeWithTools(llm, allTools, messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = extractJson<{
      passed?: boolean;
      summary?: string;
      failedTests?: string[];
      coveragePercent?: number | null;
      recommendations?: string[];
    }>(text);

    const testResults: TestResult = {
      passed: parsed?.passed ?? false,
      summary: parsed?.summary ?? "Test run completed.",
      failedTests: parsed?.failedTests ?? [],
      coveragePercent: parsed?.coveragePercent ?? null,
      stagingUrl: state.stagingUrl,
    };

    const nextPhase = testResults.passed ? "test_passed" : "test_failed";

    return {
      phase: nextPhase,
      testResults,
      messages: [
        new HumanMessage(
          `[Tester Agent] ${testResults.passed ? "✅ PASSED" : "❌ FAILED"} — ${testResults.summary}` +
            (testResults.failedTests.length > 0
              ? `\nFailed: ${testResults.failedTests.join("; ")}`
              : ""),
        ),
      ],
    };
  } finally {
    await closeMCPClient(fsClient);
    await closeMCPClient(jiraClient);
  }
}
