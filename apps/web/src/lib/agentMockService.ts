import type { AgentPhase, TestResult } from "@tedu/agents";

export interface MockAgentState {
  phase: AgentPhase;
  plan: string[];
  codeChanges: Array<{ filePath: string; operation: "create" | "modify" | "delete" }>;
  prUrl: string | null;
  branchName: string | null;
  stagingUrl: string | null;
  prNumber: number | null;
  testResults: TestResult | null;
  threadId: string | null;
  interrupted: boolean;
  interruptMessage: string | null;
}

export function simulateAgentWorkflow(ticketId: string): MockAgentState[] {
  const states: MockAgentState[] = [
    {
      phase: "idle",
      plan: [],
      codeChanges: [],
      prUrl: null,
      branchName: null,
      stagingUrl: null,
      prNumber: null,
      testResults: null,
      threadId: null,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "analyzing",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
      ],
      codeChanges: [],
      prUrl: null,
      branchName: null,
      stagingUrl: null,
      prNumber: null,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "planning",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
      ],
      codeChanges: [],
      prUrl: null,
      branchName: null,
      stagingUrl: null,
      prNumber: null,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "coding",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
        "Implement mock ticket service",
        "Add ticket details display component",
        "Create workflow visualization component",
        "Implement code diff viewer",
        "Update dashboard layout",
      ],
      codeChanges: [
        { filePath: "src/lib/mockTicketService.ts", operation: "create" },
        { filePath: "src/components/TicketDetails.tsx", operation: "create" },
        { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
      ],
      prUrl: null,
      branchName: null,
      stagingUrl: null,
      prNumber: null,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "coding",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
        "Implement mock ticket service",
        "Add ticket details display component",
        "Create workflow visualization component",
        "Implement code diff viewer",
        "Update dashboard layout",
        "Add file explorer component",
      ],
      codeChanges: [
        { filePath: "src/lib/mockTicketService.ts", operation: "create" },
        { filePath: "src/components/TicketDetails.tsx", operation: "create" },
        { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
        { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
        { filePath: "src/components/FileExplorer.tsx", operation: "create" },
      ],
      prUrl: null,
      branchName: null,
      stagingUrl: null,
      prNumber: null,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "reviewing",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
        "Implement mock ticket service",
        "Add ticket details display component",
        "Create workflow visualization component",
        "Implement code diff viewer",
        "Update dashboard layout",
        "Add file explorer component",
        "Review code quality and standards",
        "Verify TypeScript types and interfaces",
        "Check for proper error handling",
      ],
      codeChanges: [
        { filePath: "src/lib/mockTicketService.ts", operation: "create" },
        { filePath: "src/components/TicketDetails.tsx", operation: "create" },
        { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
        { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
        { filePath: "src/components/FileExplorer.tsx", operation: "create" },
        { filePath: "src/components/AgentDashboard.tsx", operation: "modify" },
      ],
      prUrl: null,
      branchName: "feature/tedu-1-dashboard",
      stagingUrl: null,
      prNumber: null,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "creating_pr",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
        "Implement mock ticket service",
        "Add ticket details display component",
        "Create workflow visualization component",
        "Implement code diff viewer",
        "Update dashboard layout",
        "Add file explorer component",
        "Review code quality and standards",
        "Verify TypeScript types and interfaces",
        "Check for proper error handling",
      ],
      codeChanges: [
        { filePath: "src/lib/mockTicketService.ts", operation: "create" },
        { filePath: "src/components/TicketDetails.tsx", operation: "create" },
        { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
        { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
        { filePath: "src/components/FileExplorer.tsx", operation: "create" },
        { filePath: "src/components/AgentDashboard.tsx", operation: "modify" },
      ],
      prUrl: "https://github.com/tedu-ai/web/pull/42",
      branchName: "feature/tedu-1-dashboard",
      stagingUrl: null,
      prNumber: 42,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "deploying_staging",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
        "Implement mock ticket service",
        "Add ticket details display component",
        "Create workflow visualization component",
        "Implement code diff viewer",
        "Update dashboard layout",
        "Add file explorer component",
        "Review code quality and standards",
        "Verify TypeScript types and interfaces",
        "Check for proper error handling",
      ],
      codeChanges: [
        { filePath: "src/lib/mockTicketService.ts", operation: "create" },
        { filePath: "src/components/TicketDetails.tsx", operation: "create" },
        { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
        { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
        { filePath: "src/components/FileExplorer.tsx", operation: "create" },
        { filePath: "src/components/AgentDashboard.tsx", operation: "modify" },
      ],
      prUrl: "https://github.com/tedu-ai/web/pull/42",
      branchName: "feature/tedu-1-dashboard",
      stagingUrl: "https://staging-tedu-1-dashboard.tedu-ai.example.com",
      prNumber: 42,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "testing",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
        "Implement mock ticket service",
        "Add ticket details display component",
        "Create workflow visualization component",
        "Implement code diff viewer",
        "Update dashboard layout",
        "Add file explorer component",
        "Review code quality and standards",
        "Verify TypeScript types and interfaces",
        "Check for proper error handling",
      ],
      codeChanges: [
        { filePath: "src/lib/mockTicketService.ts", operation: "create" },
        { filePath: "src/components/TicketDetails.tsx", operation: "create" },
        { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
        { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
        { filePath: "src/components/FileExplorer.tsx", operation: "create" },
        { filePath: "src/components/AgentDashboard.tsx", operation: "modify" },
      ],
      prUrl: "https://github.com/tedu-ai/web/pull/42",
      branchName: "feature/tedu-1-dashboard",
      stagingUrl: "https://staging-tedu-1-dashboard.tedu-ai.example.com",
      prNumber: 42,
      testResults: null,
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: false,
      interruptMessage: null,
    },
    {
      phase: "test_passed",
      plan: [
        "Analyze ticket requirements and dependencies",
        "Review existing codebase structure",
        "Identify affected files and components",
        "Create implementation plan",
        "Define component interfaces and APIs",
        "Plan test strategy and coverage",
        "Implement mock ticket service",
        "Add ticket details display component",
        "Create workflow visualization component",
        "Implement code diff viewer",
        "Update dashboard layout",
        "Add file explorer component",
        "Review code quality and standards",
        "Verify TypeScript types and interfaces",
        "Check for proper error handling",
      ],
      codeChanges: [
        { filePath: "src/lib/mockTicketService.ts", operation: "create" },
        { filePath: "src/components/TicketDetails.tsx", operation: "create" },
        { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
        { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
        { filePath: "src/components/FileExplorer.tsx", operation: "create" },
        { filePath: "src/components/AgentDashboard.tsx", operation: "modify" },
      ],
      prUrl: "https://github.com/tedu-ai/web/pull/42",
      branchName: "feature/tedu-1-dashboard",
      stagingUrl: "https://staging-tedu-1-dashboard.tedu-ai.example.com",
      prNumber: 42,
      testResults: {
        passed: true,
        summary: "All 27 tests passed with 94% code coverage",
        coveragePercent: 94,
        stagingUrl: "https://staging-tedu-1-dashboard.tedu-ai.example.com",
        failedTests: [],
      },
      threadId: `thread-${ticketId}-${Date.now()}`,
      interrupted: true,
      interruptMessage: "Tests passed — awaiting human approval for production deployment",
    },
  ];

  return states;
}

export function getNextState(currentPhase: AgentPhase): Partial<MockAgentState> | null {
  const phaseOrder: AgentPhase[] = [
    "idle",
    "analyzing",
    "planning",
    "coding",
    "reviewing",
    "creating_pr",
    "deploying_staging",
    "testing",
    "test_passed",
    "awaiting_approval",
    "deploying_production",
    "done",
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
    return null;
  }

  const nextPhase = phaseOrder[currentIndex + 1];
  
  // Return mock state updates for each phase transition
  switch (nextPhase) {
    case "analyzing":
      return {
        phase: "analyzing",
        plan: ["Analyze ticket requirements and dependencies"],
      };
    case "planning":
      return {
        phase: "planning",
        plan: [
          "Analyze ticket requirements and dependencies",
          "Review existing codebase structure",
          "Create implementation plan",
        ],
      };
    case "coding":
      return {
        phase: "coding",
        plan: [
          "Analyze ticket requirements and dependencies",
          "Review existing codebase structure",
          "Create implementation plan",
          "Implement mock ticket service",
        ],
        codeChanges: [{ filePath: "src/lib/mockTicketService.ts", operation: "create" }],
      };
    case "reviewing":
      return {
        phase: "reviewing",
        branchName: "feature/tedu-1-dashboard",
      };
    case "creating_pr":
      return {
        phase: "creating_pr",
        prUrl: "https://github.com/tedu-ai/web/pull/42",
        prNumber: 42,
      };
    case "deploying_staging":
      return {
        phase: "deploying_staging",
        stagingUrl: "https://staging-tedu-1-dashboard.tedu-ai.example.com",
      };
    case "testing":
      return {
        phase: "testing",
      };
    case "test_passed":
      return {
        phase: "test_passed",
        testResults: {
          passed: true,
          summary: "All 27 tests passed with 94% code coverage",
          coveragePercent: 94,
          stagingUrl: "https://staging-tedu-1-dashboard.tedu-ai.example.com",
          failedTests: [],
        },
      };
    case "awaiting_approval":
      return {
        phase: "awaiting_approval",
        interrupted: true,
        interruptMessage: "Tests passed — awaiting human approval for production deployment",
      };
    case "deploying_production":
      return {
        phase: "deploying_production",
        interrupted: false,
      };
    case "done":
      return {
        phase: "done",
      };
    default:
      return null;
  }
}