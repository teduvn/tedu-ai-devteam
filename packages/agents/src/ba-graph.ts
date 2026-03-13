import { Annotation, MessagesAnnotation, StateGraph, MemorySaver } from "@langchain/langgraph";
import { baNode } from "./nodes/ba-agent.js";

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface BAProcessedTicket {
  id: string;
  summary: string;
  userStory: string;
  status: "success" | "error";
  error?: string;
}

// ─── BA Agent State ───────────────────────────────────────────────────────────

export const BAAgentState = Annotation.Root({
  processedTickets: Annotation<BAProcessedTicket[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
  totalScanned: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  messages: MessagesAnnotation.spec.messages,
});

export type BAAgentStateType = typeof BAAgentState.State;

// ─── Graph Definition ─────────────────────────────────────────────────────────
//
//  START → ba_agent → END
//
//  The BA agent scans all TODO tickets, enriches each one with a full
//  user story generated from the ticket title, updates the Jira description,
//  and transitions the ticket to "Ready for Dev".
//
const checkpointer = new MemorySaver();

const workflow = new StateGraph(BAAgentState)
  .addNode("ba_agent", baNode)
  .addEdge("__start__", "ba_agent")
  .addEdge("ba_agent", "__end__");

export const baGraph = workflow.compile({ checkpointer });
