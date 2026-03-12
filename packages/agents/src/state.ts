import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

// ─── Domain Interfaces ────────────────────────────────────────────────────────

export interface JiraTicket {
  id: string;
  summary: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  type: "bug" | "feature" | "task" | "improvement";
  assignee: string | null;
  labels: string[];
}

export interface CodeChange {
  filePath: string;
  content: string;
  operation: "create" | "modify" | "delete";
}

export interface TestResult {
  passed: boolean;
  summary: string;
  failedTests: string[];
  coveragePercent: number | null;
  stagingUrl: string | null;
}

// ─── Jira ticket status lifecycle ────────────────────────────────────────────

export type JiraTicketStatus =
  | "todo"
  | "ready_for_dev"
  | "in_progress"
  | "ready_for_testing"
  | "testing"
  | "ready_for_release"
  | "done"
  | "canceled";

/** Maps our internal status to the exact Jira transition name */
export const JIRA_STATUS_LABELS: Record<JiraTicketStatus, string> = {
  todo: "To Do",
  ready_for_dev: "Ready for Dev",
  in_progress: "In Progress",
  ready_for_testing: "Ready for Testing",
  testing: "Testing",
  ready_for_release: "Ready for Release",
  done: "Done",
  canceled: "Canceled",
};

// ─── Discriminated Union for Agent Phase ─────────────────────────────────────

export type AgentPhase =
  | "idle"
  | "analyzing"
  | "planning"
  | "coding"
  | "reviewing"
  | "creating_pr"
  | "deploying_staging"
  | "testing"
  | "test_passed"
  | "test_failed"
  | "awaiting_approval"
  | "deploying_production"
  | "done"
  | "canceled"
  | "error";

// ─── LangGraph State ─────────────────────────────────────────────────────────

export const AgentState = Annotation.Root({
  ticketId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  ticketDetails: Annotation<JiraTicket | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  phase: Annotation<AgentPhase>({
    reducer: (_, next) => next,
    default: () => "idle",
  }),
  plan: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  codeChanges: Annotation<CodeChange[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
  testResults: Annotation<TestResult | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  branchName: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  prUrl: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  prNumber: Annotation<number | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  stagingUrl: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  retryCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  humanApproval: Annotation<boolean | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  messages: MessagesAnnotation.spec.messages,
});

export type AgentStateType = typeof AgentState.State;