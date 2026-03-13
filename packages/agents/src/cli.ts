import { resolve } from "path";
import { graph } from "./graph.js";
import { baGraph } from "./ba-graph.js";
import { saGraph } from "./sa-graph.js";
import { env, MONOREPO_ROOT } from "./env.js";
import { createMCPTools, closeMCPClient } from "./tools/mcp-client.js";
import { writeAgentStatus, clearAgentStatus } from "./status-store.js";
import { getTokens, clearTokens } from "./tools/token-tracker.js";
import type { AgentStateType } from "./state.js";

// ─── Console helpers ──────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  idle: "⏸  Idle",
  analyzing: "🔍 Analyzing ticket",
  planning: "📋 Planning tasks",
  coding: "💻 Writing code",
  reviewing: "🔎 Reviewing code",
  creating_pr: "🌿 Creating pull request",
  deploying_staging: "🚀 Deploying to staging",
  testing: "🧪 Running tests",
  test_passed: "✅ Tests passed",
  test_failed: "❌ Tests failed — queuing retry",
  awaiting_approval: "⏳ Awaiting human approval",
  deploying_production: "🚀 Deploying to production",
  done: "🎉 Done!",
  error: "💥 Error",
};

function hr() { console.log("─".repeat(52)); }

function logPhase(phase: string): void {
  console.log(`\n  [${new Date().toLocaleTimeString()}]  ${PHASE_LABELS[phase] ?? `⚙  ${phase}`}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs up to `limit` tickets concurrently.
 * As each slot frees up the next pending ticket starts immediately.
 */
async function runWithConcurrency(tickets: ReadyTicket[], limit: number): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const ticket of tickets) {
    const p: Promise<void> = runTicket(ticket.id).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

// ─── Jira: discover "Ready for Dev" tickets ───────────────────────────────────

interface ReadyTicket {
  id: string;
  summary: string;
  priority: string;
  type: string;
  assignee: string | null;
}

interface ListResult {
  total: number;
  tickets: ReadyTicket[];
}

async function fetchReadyForDevTickets(): Promise<ReadyTicket[]> {
  console.log("\n  🔎 Querying Jira for \"Ready for Dev\" tickets…\n");

  const { tools, client } = await createMCPTools({
    command: "npx",
    args: ["tsx", resolve(MONOREPO_ROOT, "packages/mcp-servers/src/jira-server.ts")],
    env: {
      JIRA_BASE_URL: env.JIRA_BASE_URL,
      JIRA_EMAIL: env.JIRA_EMAIL,
      JIRA_API_TOKEN: env.JIRA_API_TOKEN,
      JIRA_PROJECT_KEY: env.JIRA_PROJECT_KEY,
    },
  });

  try {
    const listTool = tools.find((t) => t.name === "list_ready_for_dev_tickets");
    if (!listTool) throw new Error("list_ready_for_dev_tickets tool not found");

    const raw = await listTool.invoke({});
    const rawStr = String(raw);
    if (rawStr.startsWith("[MCP Error]") || rawStr.startsWith("[Error]")) {
      throw new Error(rawStr);
    }
    const result = JSON.parse(rawStr) as ListResult;
    return result.tickets;
  } finally {
    await closeMCPClient(client);
  }
}

// ─── Run a single ticket through the full agent graph ────────────────────────

async function runTicket(ticketId: string): Promise<void> {
  const threadId = `thread-${ticketId}-${Date.now()}`;
  const startedAt = new Date().toISOString();

  console.log("");
  hr();
  console.log(`  🎫 Ticket  : ${ticketId}`);
  console.log(`  🧵 Thread  : ${threadId}`);
  console.log(`  🕐 Started : ${startedAt}`);
  hr();
  console.log("  🟢 Agent is running. Open the Next.js dashboard to follow along.");
  hr();

  const config = { configurable: { thread_id: threadId } };
  const initialState: Partial<AgentStateType> = { ticketId };
  let accumulated: Partial<AgentStateType> = {};

  try {
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

        if (state.phase) logPhase(state.phase);

        await writeAgentStatus({
          ticketId,
          threadId,
          source: "cli",
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

        if (nodeName === "__interrupt__") {
          console.log("\n  ⏸  Human review required — approve or reject via the dashboard.");
          console.log("  📌 Process paused. agent-status.json updated.\n");
          return; // stop this ticket; it will resume from the dashboard
        }
      }
    }

    console.log(`\n  ✅ ${ticketId} — workflow completed.\n`);
    await clearAgentStatus(ticketId);
    clearTokens(ticketId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n  💥 ${ticketId} — error: ${message}\n`);
    await writeAgentStatus({
      ticketId,
      threadId,
      source: "cli",
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
  }
}

// ─── BA Agent: scan TODO tickets and enrich them ─────────────────────────────

async function runBAScan(): Promise<void> {
  console.log(`\n  [${new Date().toLocaleTimeString()}]  🕵️  BA Agent scanning TODO tickets…`);
  const threadId = `ba-thread-${Date.now()}`;
  try {
    for await (const event of await baGraph.stream(
      {},
      { configurable: { thread_id: threadId }, streamMode: "updates" },
    )) {
      for (const [, nodeState] of Object.entries(event)) {
        const s = nodeState as { totalScanned?: number; processedTickets?: Array<{ id: string; status: string }> };
        if (s.totalScanned !== undefined) {
          const ok = (s.processedTickets ?? []).filter((t) => t.status === "success").length;
          console.log(`  ✅ BA scan complete — ${s.totalScanned} scanned, ${ok} moved to Ready for Dev.`);
        }
      }
    }
  } catch (err) {
    console.warn("  ⚠️  BA scan failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}

// ─── SA Agent: enrich unassigned Ready-for-Dev tickets with technical design ─

async function runSAScan(): Promise<void> {
  console.log(`\n  [${new Date().toLocaleTimeString()}]  🧠 SA Agent scanning unassigned Ready-for-Dev tickets…`);
  const threadId = `sa-thread-${Date.now()}`;
  try {
    for await (const event of await saGraph.stream(
      {},
      { configurable: { thread_id: threadId }, streamMode: "updates" },
    )) {
      for (const [, nodeState] of Object.entries(event)) {
        const s = nodeState as {
          totalScanned?: number;
          processedTickets?: Array<{ id: string; status: string }>;
        };
        if (s.totalScanned !== undefined) {
          const ok = (s.processedTickets ?? []).filter((t) => t.status === "success").length;
          const skipped = (s.processedTickets ?? []).filter((t) => t.status === "skipped").length;
          console.log(
            `  ✅ SA scan complete — ${s.totalScanned} scanned, ${ok} updated technical design, ${skipped} skipped.`,
          );
        }
      }
    }
  } catch (err) {
    console.warn("  ⚠️  SA scan failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

console.log("");
console.log("╔════════════════════════════════════════════════════╗");
console.log("║         TEDU AI Dev Team — Agent Runner            ║");
console.log("╚════════════════════════════════════════════════════╝");
console.log("  📡 Status synced to agent-statuses/ (read by Next.js dashboard)");
console.log(`  👷 Max parallel workers: ${env.N_WORKERS}`);

// Allow overriding with --ticket / -t / bare arg for ad-hoc runs
const cliArgs = process.argv.slice(2);
const flagIdx = cliArgs.findIndex((a) => a === "--ticket" || a === "-t");
const manualTicketId =
  flagIdx !== -1 ? cliArgs[flagIdx + 1] : cliArgs.find((a) => !a.startsWith("-"));
const saOnlyMode = cliArgs.includes("--sa-only") || cliArgs.includes("--sa");

if (saOnlyMode) {
  // ── SA-only mode: run only Solution Architecture scan once and exit ──────
  console.log("\n  ℹ️  SA-only mode — scanning unassigned \"Ready for Dev\" tickets once.\n");
  await runSAScan();
  console.log("\n  ✅ SA-only mode completed.\n");
  process.exit(0);
}

if (manualTicketId) {
  // ── Ad-hoc mode: one specific ticket ──────────────────────────────────────
  console.log(`\n  ℹ️  Manual mode — running ticket: ${manualTicketId}\n`);
  await runTicket(manualTicketId);
} else {
  // ── Auto mode: poll Jira until tickets appear, then process ───────────────
  console.log("\n  🔄 Auto mode: polling Jira every 30s for \"Ready for Dev\" tickets…\n");
  const MAX_NO_UNASSIGNED_POLLS = 3;
  let noUnassignedReadyForDevPolls = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // ── Step 1: BA scan — enrich TODO tickets and move them to Ready for Dev ──
    await runBAScan();

    // ── Step 2: SA scan — enrich unassigned Ready-for-Dev tickets with design ──
    await runSAScan();

    let tickets: ReadyTicket[];
    try {
      tickets = await fetchReadyForDevTickets();
    } catch (err) {
      console.error("  💥 Failed to fetch Jira tickets:", err instanceof Error ? err.message : err);
      console.log("  ⏱  Retrying in 30s…\n");
      await sleep(30_000);
      continue;
    }

    if (tickets.length === 0) {
      noUnassignedReadyForDevPolls += 1;
      if (noUnassignedReadyForDevPolls >= MAX_NO_UNASSIGNED_POLLS) {
        console.log(
          `  📴 No "Ready for Dev" unassigned tickets for ${noUnassignedReadyForDevPolls} consecutive checks. Auto-stopping agent.`,
        );
        break;
      }

      console.log(
        `  [${new Date().toLocaleTimeString()}]  ✋ No tickets in "Ready for Dev" (check ${noUnassignedReadyForDevPolls}/${MAX_NO_UNASSIGNED_POLLS}). Checking again in 30s…`,
      );
      await sleep(30_000);
      continue;
    }

    // Only process tickets that have been assigned — unassigned tickets stay
    // in "Ready for Dev" until a developer picks them up.
    const unassigned = tickets.filter((t) => !t.assignee);
    const assigned   = tickets.filter((t) => !!t.assignee);

    if (unassigned.length === 0) {
      noUnassignedReadyForDevPolls += 1;
      if (noUnassignedReadyForDevPolls >= MAX_NO_UNASSIGNED_POLLS) {
        console.log(
          `  📴 No "Ready for Dev" unassigned tickets for ${noUnassignedReadyForDevPolls} consecutive checks. Auto-stopping agent.`,
        );
        break;
      }
    } else {
      noUnassignedReadyForDevPolls = 0;
    }

    if (unassigned.length > 0) {
      console.log(`  ⏭  Skipping ${unassigned.length} unassigned ticket(s) — assign a developer first:`);
      for (const t of unassigned) {
        console.log(`    • ${t.id.padEnd(14)} [${t.priority.padEnd(8)}]  ${t.summary}`);
      }
      console.log("");
    }

    if (assigned.length === 0) {
      console.log(`  [${new Date().toLocaleTimeString()}]  ✋ All Ready-for-Dev tickets are unassigned. Checking again in 30s…`);
      await sleep(30_000);
      continue;
    }

    console.log(`  📋 Found ${assigned.length} assigned ticket(s) ready for development:\n`);
    for (const t of assigned) {
      console.log(`    • ${t.id.padEnd(14)} [${t.priority.padEnd(8)}]  👤 ${t.assignee ?? "—"}  ${t.summary}`);
    }
    console.log("");

    await runWithConcurrency(assigned, env.N_WORKERS);

    console.log("\n  ✅ Batch processed. Checking for more tickets in 30s…\n");
    await sleep(30_000);
  }
}
