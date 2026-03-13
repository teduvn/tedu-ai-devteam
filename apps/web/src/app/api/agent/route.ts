import { NextRequest } from "next/server";
import { graph, writeAgentStatus, clearAgentStatus, getTokens, clearTokens } from "@tedu/agents";
import type { AgentStateType } from "@tedu/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const ticketId = request.nextUrl.searchParams.get("ticketId");

  if (!ticketId) {
    return new Response("ticketId query param is required", { status: 400 });
  }

  const threadId = `thread-${ticketId}-${Date.now()}`;
  const startedAt = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(encodeSSE(data)));
      };

      let accumulated: Partial<AgentStateType> = {};

      try {
        send({ type: "started", threadId, ticketId });

        await writeAgentStatus({
          ticketId,
          threadId,
          source: "web",
          phase: "analyzing",
          plan: [],
          codeChanges: [],
          branchName: null,
          prUrl: null,
          prNumber: null,
          stagingUrl: null,
          testResults: null,
          interrupted: false,
          error: null,
          tokenUsage: { input: 0, output: 0 },
          startedAt,
          updatedAt: new Date().toISOString(),
        });

        const initialState: Partial<AgentStateType> = { ticketId };
        const config = { configurable: { thread_id: threadId } };

        for await (const event of await graph.stream(initialState, {
          ...config,
          streamMode: "updates",
        })) {
          for (const [nodeName, nodeState] of Object.entries(event)) {
            const state = nodeState as Partial<AgentStateType>;

            accumulated = {
              ...accumulated,
              ...state,
              codeChanges: [
                ...(accumulated.codeChanges ?? []),
                ...(state.codeChanges ?? []),
              ],
            };

            send({
              type: "node_update",
              node: nodeName,
              phase: state.phase,
              plan: state.plan,
              codeChanges: state.codeChanges,
              prUrl: state.prUrl,
              prNumber: state.prNumber,
              branchName: state.branchName,
              stagingUrl: state.stagingUrl,
              testResults: state.testResults,
              error: state.error,
            });

            await writeAgentStatus({
              ticketId,
              threadId,
              source: "web",
              phase: accumulated.phase ?? "idle",
              plan: accumulated.plan ?? [],
              codeChanges: accumulated.codeChanges ?? [],
              branchName: accumulated.branchName ?? null,
              prUrl: accumulated.prUrl ?? null,
              prNumber: accumulated.prNumber ?? null,
              stagingUrl: accumulated.stagingUrl ?? null,
              testResults: accumulated.testResults ?? null,
              interrupted: nodeName === "__interrupt__",
              error: accumulated.error ?? null,
              tokenUsage: getTokens(ticketId),
              startedAt,
              updatedAt: new Date().toISOString(),
            });

            // Human-in-the-loop interrupt
            if (nodeName === "__interrupt__") {
              const interruptData = nodeState as Record<string, unknown>;
              send({
                type: "interrupt",
                threadId,
                prUrl: state.prUrl,
                prNumber: state.prNumber,
                stagingUrl: state.stagingUrl,
                testResults: state.testResults,
                message:
                  "Tester passed — Human review required: approve production deploy or reject for rework.",
                interruptPayload: interruptData,
              });
              controller.close();
              return;
            }
          }
        }

        send({ type: "completed", threadId });
        await clearAgentStatus(ticketId);
        clearTokens(ticketId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        send({ type: "error", message });
        await writeAgentStatus({
          ticketId,
          threadId,
          source: "web",
          phase: "error",
          plan: accumulated.plan ?? [],
          codeChanges: accumulated.codeChanges ?? [],
          branchName: accumulated.branchName ?? null,
          prUrl: accumulated.prUrl ?? null,
          prNumber: accumulated.prNumber ?? null,
          stagingUrl: accumulated.stagingUrl ?? null,
          testResults: accumulated.testResults ?? null,
          interrupted: false,
          error: message,
          tokenUsage: getTokens(ticketId),
          startedAt,
          updatedAt: new Date().toISOString(),
        });
      } finally {
        controller.close();
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const ticketId = request.nextUrl.searchParams.get("ticketId");

  if (!ticketId) {
    return new Response("ticketId query param is required", { status: 400 });
  }

  const threadId = `thread-${ticketId}-${Date.now()}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(encodeSSE(data)));
      };

      try {
        send({ type: "started", threadId, ticketId });

        const initialState: Partial<AgentStateType> = { ticketId };
        const config = { configurable: { thread_id: threadId } };

        for await (const event of await graph.stream(initialState, {
          ...config,
          streamMode: "updates",
        })) {
          for (const [nodeName, nodeState] of Object.entries(event)) {
            const state = nodeState as Partial<AgentStateType>;
            send({
              type: "node_update",
              node: nodeName,
              phase: state.phase,
              plan: state.plan,
              codeChanges: state.codeChanges,
              prUrl: state.prUrl,
              prNumber: state.prNumber,
              branchName: state.branchName,
              stagingUrl: state.stagingUrl,
              testResults: state.testResults,
              error: state.error,
            });

            // Human-in-the-loop interrupt
            if (nodeName === "__interrupt__") {
              const interruptData = nodeState as Record<string, unknown>;
              send({
                type: "interrupt",
                threadId,
                prUrl: state.prUrl,
                prNumber: state.prNumber,
                stagingUrl: state.stagingUrl,
                testResults: state.testResults,
                message:
                  "Tester passed — Human review required: approve production deploy or reject for rework.",
                interruptPayload: interruptData,
              });
              controller.close();
              return;
            }
          }
        }

        send({ type: "completed", threadId });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        send({ type: "error", message });
      } finally {
        controller.close();
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
