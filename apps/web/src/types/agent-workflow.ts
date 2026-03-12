/**
 * Agent Workflow Type Definitions
 * 
 * This file contains comprehensive TypeScript interfaces and types
 * for the AI agent workflow system, ensuring strict type safety
 * and no use of `any` types.
 */

// ─── Core Domain Types ────────────────────────────────────────────────────────

/**
 * Represents a Jira ticket in the system
 */
export interface JiraTicket {
  readonly id: string;
  readonly summary: string;
  readonly description: string;
  readonly priority: TicketPriority;
  readonly type: TicketType;
  readonly assignee: string | null;
  readonly labels: readonly string[];
  readonly status: TicketStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Ticket priority levels
 */
export type TicketPriority = "low" | "medium" | "high" | "critical";

/**
 * Ticket types
 */
export type TicketType = "bug" | "feature" | "task" | "improvement";

/**
 * Ticket status in the workflow
 */
export type TicketStatus = "todo" | "in-progress" | "review" | "done";

/**
 * Represents a code change operation
 */
export interface CodeChange {
  readonly filePath: string;
  readonly operation: FileOperation;
  readonly content?: string;
}

/**
 * File operation types
 */
export type FileOperation = "create" | "modify" | "delete";

/**
 * Test result from automated testing
 */
export interface TestResult {
  readonly passed: boolean;
  readonly summary: string;
  readonly coveragePercent: number | null;
  readonly stagingUrl: string | null;
  readonly failedTests: readonly string[];
}

// ─── Agent Workflow Types ─────────────────────────────────────────────────────

/**
 * All possible phases in the agent workflow
 */
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

/**
 * Complete state of an agent workflow
 */
export interface AgentWorkflowState {
  readonly phase: AgentPhase;
  readonly plan: readonly string[];
  readonly codeChanges: readonly CodeChange[];
  readonly prUrl: string | null;
  readonly branchName: string | null;
  readonly stagingUrl: string | null;
  readonly prNumber: number | null;
  readonly testResults: TestResult | null;
  readonly threadId: string | null;
  readonly interrupted: boolean;
  readonly interruptMessage: string | null;
  readonly isRunning: boolean;
}

/**
 * Log entry for agent activity
 */
export interface AgentLogEntry {
  readonly id: number;
  readonly node: string;
  readonly message: string;
  readonly timestamp: string;
}

/**
 * Server-Sent Event types for agent communication
 */
export type SSEEventType = 
  | "started" 
  | "node_update" 
  | "interrupt" 
  | "completed" 
  | "error";

/**
 * Base SSE event interface
 */
interface BaseSSEEvent {
  readonly type: SSEEventType;
}

/**
 * Agent started event
 */
export interface SSEStartedEvent extends BaseSSEEvent {
  readonly type: "started";
  readonly threadId: string;
  readonly ticketId: string;
}

/**
 * Node update event
 */
export interface SSENodeUpdateEvent extends BaseSSEEvent {
  readonly type: "node_update";
  readonly node: string;
  readonly phase?: AgentPhase;
  readonly plan?: readonly string[];
  readonly codeChanges?: readonly CodeChange[];
  readonly prUrl?: string;
  readonly branchName?: string;
  readonly stagingUrl?: string | null;
  readonly prNumber?: number | null;
  readonly testResults?: TestResult | null;
  readonly error?: string | null;
}

/**
 * Interrupt event for human review
 */
export interface SSEInterruptEvent extends BaseSSEEvent {
  readonly type: "interrupt";
  readonly threadId: string;
  readonly prUrl: string;
  readonly message: string;
  readonly prNumber?: number | null;
  readonly stagingUrl?: string | null;
  readonly testResults?: TestResult | null;
}

/**
 * Workflow completed event
 */
export interface SSECompletedEvent extends BaseSSEEvent {
  readonly type: "completed";
  readonly threadId: string;
}

/**
 * Error event
 */
export interface SSEErrorEvent extends BaseSSEEvent {
  readonly type: "error";
  readonly message: string;
}

/**
 * Union type of all possible SSE events
 */
export type SSEEvent = 
  | SSEStartedEvent
  | SSENodeUpdateEvent
  | SSEInterruptEvent
  | SSECompletedEvent
  | SSEErrorEvent;

// ─── File System Types ────────────────────────────────────────────────────────

/**
 * File node in the file explorer
 */
export interface FileSystemNode {
  readonly name: string;
  readonly type: "file" | "directory";
  readonly children?: readonly FileSystemNode[];
  readonly path: string;
}

/**
 * Code diff information
 */
export interface CodeDiff {
  readonly filePath: string;
  readonly operation: FileOperation;
  readonly diff: string;
  readonly language: string;
}

// ─── Component Prop Types ─────────────────────────────────────────────────────

/**
 * Props for the TicketDetails component
 */
export interface TicketDetailsProps {
  readonly ticket: JiraTicket;
  readonly className?: string;
}

/**
 * Props for the StatusBadge component
 */
export interface StatusBadgeProps {
  readonly phase: AgentPhase;
}

/**
 * Props for the WorkflowVisualization component
 */
export interface WorkflowVisualizationProps {
  readonly currentPhase: AgentPhase;
}

/**
 * Props for the CodeDiffViewer component
 */
export interface CodeDiffViewerProps {
  readonly diff: CodeDiff;
}

/**
 * Props for the CodeEditor component
 */
export interface CodeEditorProps {
  readonly initialContent?: string;
  readonly language?: string;
  readonly readOnly?: boolean;
  readonly onChange?: (content: string) => void;
}

/**
 * Props for the FileExplorer component
 */
export interface FileExplorerProps {
  readonly files: readonly FileSystemNode[];
  readonly onFileSelect?: (path: string) => void;
  readonly selectedFile?: string;
}

/**
 * Props for the LogStream component
 */
export interface LogStreamProps {
  readonly entries: readonly AgentLogEntry[];
}

/**
 * Props for the AgentDashboard component
 */
export interface AgentDashboardProps {
  readonly initialTicketId?: string;
}

// ─── Hook Return Types ────────────────────────────────────────────────────────

/**
 * Return type of the useAgentStream hook
 */
export interface UseAgentStreamReturn {
  readonly phase: AgentPhase;
  readonly plan: readonly string[];
  readonly codeChanges: readonly CodeChange[];
  readonly prUrl: string | null;
  readonly branchName: string | null;
  readonly stagingUrl: string | null;
  readonly prNumber: number | null;
  readonly testResults: TestResult | null;
  readonly threadId: string | null;
  readonly interrupted: boolean;
  readonly interruptMessage: string | null;
  readonly isRunning: boolean;
  readonly logs: readonly AgentLogEntry[];
  readonly start: () => void;
  readonly resume: (approved: boolean) => Promise<void>;
}

/**
 * Options for the useAgentStream hook
 */
export interface UseAgentStreamOptions {
  readonly useMock?: boolean;
}

// ─── Utility Types ────────────────────────────────────────────────────────────

/**
 * Make all properties of T mutable
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Make specific properties of T mutable
 */
export type MutableProps<T, K extends keyof T> = Omit<T, K> & {
  -readonly [P in K]: T[P];
};

/**
 * Make specific properties of T optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Type guard for checking if a value is a valid AgentPhase
 */
export function isAgentPhase(value: unknown): value is AgentPhase {
  return typeof value === "string" && [
    "idle",
    "analyzing",
    "planning",
    "coding",
    "reviewing",
    "creating_pr",
    "deploying_staging",
    "testing",
    "test_passed",
    "test_failed",
    "awaiting_approval",
    "deploying_production",
    "done",
    "canceled",
    "error"
  ].includes(value);
}

/**
 * Type guard for checking if a value is a valid SSEEvent
 */
export function isSSEEvent(value: unknown): value is SSEEvent {
  if (typeof value !== "object" || value === null) return false;
  
  const event = value as Record<string, unknown>;
  if (typeof event.type !== "string") return false;
  
  switch (event.type) {
    case "started":
      return typeof event.threadId === "string" && typeof event.ticketId === "string";
    case "node_update":
      return typeof event.node === "string";
    case "interrupt":
      return typeof event.threadId === "string" && 
             typeof event.prUrl === "string" && 
             typeof event.message === "string";
    case "completed":
      return typeof event.threadId === "string";
    case "error":
      return typeof event.message === "string";
    default:
      return false;
  }
}

/**
 * Creates a new CodeChange object with validation
 */
export function createCodeChange(
  filePath: string,
  operation: FileOperation,
  content?: string
): CodeChange {
  if (!filePath.trim()) {
    throw new Error("File path cannot be empty");
  }
  
  if (!["create", "modify", "delete"].includes(operation)) {
    throw new Error(`Invalid operation: ${operation}`);
  }
  
  return {
    filePath: filePath.trim(),
    operation,
    ...(content !== undefined && { content })
  };
}

/**
 * Creates a new TestResult object with validation
 */
export function createTestResult(
  passed: boolean,
  summary: string,
  coveragePercent: number | null = null,
  stagingUrl: string | null = null,
  failedTests: string[] = []
): TestResult {
  if (!summary.trim()) {
    throw new Error("Test summary cannot be empty");
  }
  
  if (coveragePercent !== null && (coveragePercent < 0 || coveragePercent > 100)) {
    throw new Error(`Coverage percentage must be between 0 and 100, got ${coveragePercent}`);
  }
  
  return {
    passed,
    summary: summary.trim(),
    coveragePercent,
    stagingUrl: stagingUrl?.trim() || null,
    failedTests: [...failedTests]
  };
}

/**
 * Creates a new JiraTicket object with validation
 */
export function createJiraTicket(
  id: string,
  summary: string,
  description: string,
  priority: TicketPriority,
  type: TicketType,
  assignee: string | null = null,
  labels: string[] = [],
  status: TicketStatus = "todo"
): JiraTicket {
  if (!id.trim()) {
    throw new Error("Ticket ID cannot be empty");
  }
  
  if (!summary.trim()) {
    throw new Error("Ticket summary cannot be empty");
  }
  
  if (!["low", "medium", "high", "critical"].includes(priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }
  
  if (!["bug", "feature", "task", "improvement"].includes(type)) {
    throw new Error(`Invalid ticket type: ${type}`);
  }
  
  if (!["todo", "in-progress", "review", "done"].includes(status)) {
    throw new Error(`Invalid ticket status: ${status}`);
  }
  
  return {
    id: id.trim(),
    summary: summary.trim(),
    description: description.trim(),
    priority,
    type,
    assignee: assignee?.trim() || null,
    labels: [...labels],
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}