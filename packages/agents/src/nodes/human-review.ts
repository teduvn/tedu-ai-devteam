import { interrupt } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import type { AgentStateType } from "../state.js";

/**
 * Human-in-the-loop node — triggered AFTER the Tester Agent passes.
 *
 * Presents the test results, staging URL, and PR to a human reviewer.
 * The human approves to trigger production deploy, or rejects to send back for rework.
 *
 * Resume:
 *   graph.invoke(new Command({ resume: true }), config)  // approve → production deploy
 *   graph.invoke(new Command({ resume: false }), config) // reject  → back to coder
 */
export async function humanReviewNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const testSummary = state.testResults
    ? `Tests: ${state.testResults.passed ? "✅ PASSED" : "❌ FAILED"} — ${state.testResults.summary}`
    : "No test results available.";

  const approval = interrupt({
    type: "human_review",
    ticketId: state.ticketId,
    ticketSummary: state.ticketDetails?.summary ?? null,
    prUrl: state.prUrl,
    prNumber: state.prNumber,
    branch: state.branchName,
    stagingUrl: state.stagingUrl,
    testResults: state.testResults,
    changedFiles: state.codeChanges.map((c) => c.filePath),
    message:
      `${testSummary}\n` +
      `PR: ${state.prUrl}\n` +
      `Staging: ${state.stagingUrl ?? "N/A"}\n` +
      `Approve to deploy to production, or reject to send back for rework.`,
  }) as boolean;

  return {
    humanApproval: approval,
    // Approved → queue production deployment; rejected → back to coding
    phase: approval ? "deploying_production" : "coding",
    messages: [
      new HumanMessage(
        `[Human Review] ${approval ? "APPROVED ✅ — proceeding to production deploy" : "REJECTED ❌ — sending back to coder for rework"}`,
      ),
    ],
  };
}

