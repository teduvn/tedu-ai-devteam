import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { pmNode } from "./nodes/pm-agent.js";
import { coderNode } from "./nodes/coder-agent.js";
import { devopsNode } from "./nodes/devops-agent.js";
import { testerNode } from "./nodes/tester-agent.js";
import { humanReviewNode } from "./nodes/human-review.js";
import {
  routeAfterCoder,
  routeAfterDevOps,
  routeAfterTester,
  routeAfterHumanReview,
} from "./edges/routing.js";

// ─── Checkpointer (MemorySaver for dev; swap for Redis/DB in production) ──────
const checkpointer = new MemorySaver();

// ─── Graph Definition ─────────────────────────────────────────────────────────
//
//  START → pm_agent → coder_agent ──→ devops_agent (staging)
//               ↑                          ↓
//               │                     tester_agent
//               │                    ↙           ↘
//               │           (fail/retry)       human_review
//               └──────────────────┘               ↓ (approved)
//                                           devops_agent (production)
//                                                   ↓
//                                                  END
//
const workflow = new StateGraph(AgentState)
  // Nodes
  .addNode("pm_agent", pmNode)
  .addNode("coder_agent", coderNode)
  .addNode("devops_agent", devopsNode)
  .addNode("tester_agent", testerNode)
  .addNode("human_review", humanReviewNode)

  // Entry
  .addEdge("__start__", "pm_agent")
  .addEdge("pm_agent", "coder_agent")

  // Coder → DevOps | end
  .addConditionalEdges("coder_agent", routeAfterCoder, {
    devops_agent: "devops_agent",
    __end__: "__end__",
  })

  // DevOps → Tester (staging) | end (production done)
  .addConditionalEdges("devops_agent", routeAfterDevOps, {
    tester_agent: "tester_agent",
    __end__: "__end__",
  })

  // Tester → HumanReview (pass) | Coder (fail/retry) | end (max retries)
  .addConditionalEdges("tester_agent", routeAfterTester, {
    human_review: "human_review",
    coder_agent: "coder_agent",
    __end__: "__end__",
  })

  // HumanReview → DevOps (approved → prod deploy) | Coder (rejected → rework)
  .addConditionalEdges("human_review", routeAfterHumanReview, {
    devops_agent: "devops_agent",
    coder_agent: "coder_agent",
  });

// ─── Compiled Graph ───────────────────────────────────────────────────────────
export const graph = workflow.compile({ checkpointer });
