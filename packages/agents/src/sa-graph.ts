import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";
import { saNode } from "./nodes/sa-agent.js";

export interface SAProcessedTicket {
  id: string;
  summary: string;
  technicalDesign: string;
  status: "success" | "skipped" | "error";
  error?: string;
}

export const SAAgentState = Annotation.Root({
  processedTickets: Annotation<SAProcessedTicket[]>({
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

export type SAAgentStateType = typeof SAAgentState.State;

const checkpointer = new MemorySaver();

const workflow = new StateGraph(SAAgentState)
  .addNode("sa_agent", saNode)
  .addEdge("__start__", "sa_agent")
  .addEdge("sa_agent", "__end__");

export const saGraph = workflow.compile({ checkpointer });
