import { NextRequest } from "next/server";
import { baGraph } from "@tedu/agents";
import type { BAAgentStateType, BAProcessedTicket } from "@tedu/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * GET /api/agent/ba
 *
 * Scans all Jira tickets with status "To Do", generates a structured User Story
 * for each one using the BA agent, updates the Jira description, and transitions
 * each ticket to "Ready for Dev".
 *
 * Streams Server-Sent Events (SSE) with progress updates.
 */
export async function GET(_request: NextRequest) {
  const threadId = `ba-thread-${Date.now()}`;
  const startedAt = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(encodeSSE(data)));
      };

      try {
        send({
          type: "started",
          threadId,
          agent: "ba_agent",
          message: "BA Agent started — scanning TODO tickets...",
          startedAt,
        });

        const initialState: Partial<BAAgentStateType> = {};
        const config = { configurable: { thread_id: threadId } };

        let finalState: Partial<BAAgentStateType> = {};

        for await (const event of await baGraph.stream(initialState, {
          ...config,
          streamMode: "updates",
        })) {
          for (const [nodeName, nodeState] of Object.entries(event)) {
            const state = nodeState as Partial<BAAgentStateType>;

            finalState = {
              ...finalState,
              ...state,
              processedTickets: [
                ...(finalState.processedTickets ?? []),
                ...(state.processedTickets ?? []),
              ],
            };

            send({
              type: "node_update",
              node: nodeName,
              processedTickets: state.processedTickets ?? [],
              totalScanned: state.totalScanned,
              error: state.error,
            });
          }
        }

        const succeeded = (finalState.processedTickets ?? []).filter(
          (t: BAProcessedTicket) => t.status === "success",
        ).length;
        const failed = (finalState.processedTickets ?? []).filter(
          (t: BAProcessedTicket) => t.status === "error",
        ).length;

        send({
          type: "completed",
          threadId,
          agent: "ba_agent",
          totalScanned: finalState.totalScanned ?? 0,
          succeeded,
          failed,
          processedTickets: finalState.processedTickets ?? [],
          error: finalState.error ?? null,
          finishedAt: new Date().toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({
          type: "error",
          threadId,
          agent: "ba_agent",
          error: message,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
