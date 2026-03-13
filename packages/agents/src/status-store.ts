import fs from "node:fs/promises";
import path from "node:path";
import { MONOREPO_ROOT } from "./env.js";
import type { AgentPhase, CodeChange, TestResult } from "./state.js";

// ─── Shared status directory ────────────────────────────────────────────────
// Each running CLI instance writes its own file: agent-statuses/TEDU-42.json
// This avoids concurrent write conflicts when multiple agents run in parallel.

const STATUS_DIR = path.join(MONOREPO_ROOT, "agent-statuses");

export interface AgentStatus {
  ticketId: string;
  threadId: string;
  /** "cli" when started via `pnpm agent:start`; "web" when triggered via SSE */
  source: "cli" | "web";
  phase: AgentPhase;
  plan: string[];
  codeChanges: CodeChange[];
  branchName: string | null;
  prUrl: string | null;
  prNumber: number | null;
  stagingUrl: string | null;
  testResults: TestResult | null;
  interrupted: boolean;
  error: string | null;
  tokenUsage: { input: number; output: number };
  startedAt: string;
  updatedAt: string;
}

export async function writeAgentStatus(status: AgentStatus): Promise<void> {
  await fs.mkdir(STATUS_DIR, { recursive: true });
  const file = path.join(STATUS_DIR, `${status.ticketId}.json`);
  await fs.writeFile(file, JSON.stringify(status, null, 2), "utf-8");
}

export async function readAllAgentStatuses(): Promise<AgentStatus[]> {
  try {
    const entries = await fs.readdir(STATUS_DIR);
    const results: AgentStatus[] = [];
    for (const entry of entries.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(STATUS_DIR, entry), "utf-8");
        results.push(JSON.parse(raw) as AgentStatus);
      } catch {
        // Skip corrupted status file
      }
    }
    return results;
  } catch {
    return []; // Directory does not exist yet
  }
}

/** @deprecated use readAllAgentStatuses — kept for backwards compat */
export async function readAgentStatus(): Promise<AgentStatus | null> {
  const all = await readAllAgentStatuses();
  return all.length > 0 ? (all[0] ?? null) : null;
}

export async function clearAgentStatus(ticketId: string): Promise<void> {
  const file = path.join(STATUS_DIR, `${ticketId}.json`);
  await fs.unlink(file).catch(() => {});
}
