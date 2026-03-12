import type { AgentStateType } from "../state.js";

const MAX_RETRIES = 3;

/**
 * After coder_agent:
 * - error or max retries reached → end
 * - previous test run failed (retry loop) → devops (re-deploy staging)
 * - Otherwise → devops (first deploy)
 */
export function routeAfterCoder(
  state: AgentStateType,
): "devops_agent" | "__end__" {
  if (state.error) return "__end__";
  if (state.retryCount >= MAX_RETRIES) {
    console.warn(
      `[Router] Max retries (${MAX_RETRIES}) reached for ${state.ticketId}. Ending.`,
    );
    return "__end__";
  }
  return "devops_agent";
}

/**
 * After devops_agent:
 * - staging deploy complete → send to tester
 * - production deploy complete (phase = done) → end
 * - anything else → end
 */
export function routeAfterDevOps(
  state: AgentStateType,
): "tester_agent" | "__end__" {
  if (state.phase === "deploying_staging") return "tester_agent";
  return "__end__";
}

/**
 * After tester_agent:
 * - tests passed → human_review (approve to release)
 * - tests failed → back to coder for fix (increments retryCount)
 * - max retries → end
 */
export function routeAfterTester(
  state: AgentStateType,
): "human_review" | "coder_agent" | "__end__" {
  if (state.phase === "test_passed") return "human_review";
  if (state.retryCount >= MAX_RETRIES) {
    console.warn(
      `[Router] Max retries after test failure for ${state.ticketId}. Ending.`,
    );
    return "__end__";
  }
  return "coder_agent";
}

/**
 * After human_review:
 * - approved → devops_agent for production deploy (phase already set to deploying_production)
 * - rejected → coder_agent for rework
 */
export function routeAfterHumanReview(
  state: AgentStateType,
): "devops_agent" | "coder_agent" {
  if (state.humanApproval === true) return "devops_agent";
  return "coder_agent";
}
