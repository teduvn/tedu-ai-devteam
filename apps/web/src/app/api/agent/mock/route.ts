import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MockSSEEvent {
  type: "started" | "node_update" | "interrupt" | "completed" | "error";
  threadId?: string;
  ticketId?: string;
  node?: string;
  phase?: string;
  plan?: string[];
  codeChanges?: Array<{ filePath: string; operation: string }>;
  prUrl?: string;
  branchName?: string;
  stagingUrl?: string | null;
  prNumber?: number | null;
  testResults?: {
    passed: boolean;
    summary: string;
    coveragePercent: number;
    stagingUrl: string;
    failedTests: string[];
  } | null;
  error?: string | null;
  message?: string;
  interruptPayload?: Record<string, unknown>;
}

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const ticketId = request.nextUrl.searchParams.get("ticketId");

  if (!ticketId) {
    return new Response("ticketId query param is required", { status: 400 });
  }

  const threadId = `mock-thread-${ticketId}-${Date.now()}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: MockSSEEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(data)));
      };

      try {
        // Initial started event
        send({ type: "started", threadId, ticketId });

        // Simulate analyzing phase
        await delay(800);
        send({
          type: "node_update",
          node: "pm_agent",
          phase: "analyzing",
          plan: [
            "Analyze ticket requirements and dependencies",
            "Review existing codebase structure",
            "Identify affected files and components",
          ],
        });

        // Simulate planning phase
        await delay(1200);
        send({
          type: "node_update",
          node: "pm_agent",
          phase: "planning",
          plan: [
            "Analyze ticket requirements and dependencies",
            "Review existing codebase structure",
            "Identify affected files and components",
            "Create implementation plan",
            "Define component interfaces and APIs",
            "Plan test strategy and coverage",
          ],
        });

        // Simulate coding phase - part 1
        await delay(1500);
        send({
          type: "node_update",
          node: "coder_agent",
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
          ],
          codeChanges: [
            { filePath: "src/lib/mockTicketService.ts", operation: "create" },
            { filePath: "src/components/TicketDetails.tsx", operation: "create" },
            { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
          ],
        });

        // Simulate coding phase - part 2
        await delay(1800);
        send({
          type: "node_update",
          node: "coder_agent",
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
            "Add file explorer component",
            "Update dashboard layout",
          ],
          codeChanges: [
            { filePath: "src/lib/mockTicketService.ts", operation: "create" },
            { filePath: "src/components/TicketDetails.tsx", operation: "create" },
            { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
            { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
            { filePath: "src/components/FileExplorer.tsx", operation: "create" },
          ],
        });

        // Simulate reviewing phase
        await delay(1000);
        send({
          type: "node_update",
          node: "coder_agent",
          phase: "reviewing",
          codeChanges: [
            { filePath: "src/lib/mockTicketService.ts", operation: "create" },
            { filePath: "src/components/TicketDetails.tsx", operation: "create" },
            { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
            { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
            { filePath: "src/components/FileExplorer.tsx", operation: "create" },
            { filePath: "src/components/AgentDashboard.tsx", operation: "modify" },
          ],
          branchName: `feature/${ticketId.toLowerCase()}-dashboard`,
        });

        // Simulate creating PR
        await delay(800);
        send({
          type: "node_update",
          node: "devops_agent",
          phase: "creating_pr",
          prUrl: `https://github.com/tedu-ai/web/pull/42`,
          prNumber: 42,
        });

        // Simulate deploying to staging
        await delay(1200);
        send({
          type: "node_update",
          node: "devops_agent",
          phase: "deploying_staging",
          stagingUrl: `https://staging-${ticketId.toLowerCase()}.tedu-ai.example.com`,
        });

        // Simulate testing
        await delay(1600);
        send({
          type: "node_update",
          node: "devops_agent",
          phase: "testing",
        });

        // Simulate tests passed
        await delay(1400);
        send({
          type: "node_update",
          node: "devops_agent",
          phase: "test_passed",
          testResults: {
            passed: true,
            summary: "All 27 tests passed with 94% code coverage",
            coveragePercent: 94,
            stagingUrl: `https://staging-${ticketId.toLowerCase()}.tedu-ai.example.com`,
            failedTests: [],
          },
        });

        // Simulate interrupt for human review
        await delay(500);
        send({
          type: "interrupt",
          threadId,
          prUrl: `https://github.com/tedu-ai/web/pull/42`,
          prNumber: 42,
          stagingUrl: `https://staging-${ticketId.toLowerCase()}.tedu-ai.example.com`,
          testResults: {
            passed: true,
            summary: "All 27 tests passed with 94% code coverage",
            coveragePercent: 94,
            stagingUrl: `https://staging-${ticketId.toLowerCase()}.tedu-ai.example.com`,
            failedTests: [],
          },
          message: "Tests passed — Human review required: approve production deploy or reject for rework.",
        });

        // The stream ends here, waiting for human review
        // The frontend will call /api/agent/resume to continue

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        send({ type: "error", message });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Thread-Id": threadId,
    },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}