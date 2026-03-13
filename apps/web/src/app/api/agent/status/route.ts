import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentStatus } from "@tedu/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEDU_MONOREPO_ROOT is injected by next.config.ts
const STATUS_DIR = path.join(
  process.env.TEDU_MONOREPO_ROOT ?? process.cwd(),
  "agent-statuses",
);

/**
 * GET /api/agent/status
 * Returns all currently-active agent runs (one per ticket).
 * Returns { agents: [], totalActive: 0 } when nothing is running.
 */
export async function GET() {
  try {
    const entries = await fs.readdir(STATUS_DIR);
    const agents: AgentStatus[] = [];
    for (const entry of entries.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(STATUS_DIR, entry), "utf-8");
        agents.push(JSON.parse(raw) as AgentStatus);
      } catch {
        // Skip corrupted file
      }
    }
    return NextResponse.json({ agents, totalActive: agents.length });
  } catch {
    return NextResponse.json({ agents: [], totalActive: 0 });
  }
}
