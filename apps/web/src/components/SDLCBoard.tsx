"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BoardTicket } from "@/app/api/jira/board/route";
import type { AgentStatus } from "@tedu/agents";

// ─── SDLC stage config ────────────────────────────────────────────────────────

const SDLC_STAGES = [
  { jiraName: "To Do",               label: "To Do",               emoji: "📋" },
  { jiraName: "Ready for Dev",        label: "Ready for Dev",        emoji: "🚀" },
  { jiraName: "In Progress",          label: "In Progress",          emoji: "💻" },
  { jiraName: "Ready for Testing",    label: "Ready for Testing",    emoji: "🔎" },
  { jiraName: "Testing",              label: "Testing",              emoji: "🧪" },
  { jiraName: "Ready for Release",    label: "Ready for Release",    emoji: "🎯" },
  { jiraName: "Done",                 label: "Done",                 emoji: "✅" },
  { jiraName: "Canceled",             label: "Canceled",             emoji: "🚫" },
] as const;

// Static Tailwind safelist — keep full class strings so JIT includes them
const STAGE_STYLE: Record<string, { header: string; count: string; col: string }> = {
  "To Do":               { header: "text-slate-400",   count: "bg-slate-700 text-slate-300",         col: "border-slate-700/50" },
  "Ready for Dev":       { header: "text-sky-400",     count: "bg-sky-900/60 text-sky-300",          col: "border-sky-700/50" },
  "In Progress":         { header: "text-amber-400",   count: "bg-amber-900/60 text-amber-300",      col: "border-amber-700/50" },
  "Ready for Testing":   { header: "text-violet-400",  count: "bg-violet-900/60 text-violet-300",    col: "border-violet-700/50" },
  "Testing":             { header: "text-indigo-400",  count: "bg-indigo-900/60 text-indigo-300",    col: "border-indigo-700/50" },
  "Ready for Release":   { header: "text-emerald-400", count: "bg-emerald-900/60 text-emerald-300",  col: "border-emerald-700/50" },
  "Done":                { header: "text-green-400",   count: "bg-green-900/60 text-green-300",      col: "border-green-700/50" },
  "Canceled":            { header: "text-rose-400",    count: "bg-rose-900/60 text-rose-300",        col: "border-rose-700/50" },
};

const PRIORITY_LEFT: Record<string, string> = {
  critical: "border-l-4 border-l-red-500",
  high:     "border-l-4 border-l-orange-500",
  medium:   "border-l-4 border-l-yellow-500",
  low:      "border-l-4 border-l-sky-600",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "text-red-400 bg-red-950/80",
  high:     "text-orange-400 bg-orange-950/80",
  medium:   "text-yellow-400 bg-yellow-950/80",
  low:      "text-sky-400 bg-sky-950/80",
};

const PHASE_LABEL: Record<string, string> = {
  analyzing:           "🔍 analyzing",
  planning:            "📋 planning",
  coding:              "💻 coding",
  reviewing:           "🔎 reviewing",
  creating_pr:         "🌿 creating PR",
  deploying_staging:   "⬆️ deploying",
  testing:             "🧪 testing",
  test_passed:         "✅ tests passed",
  test_failed:         "❌ tests failed",
  awaiting_approval:   "⏳ needs review",
  deploying_production:"🚀 going live",
  done:                "🎉 done",
  error:               "💥 error",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoardData {
  columns: Record<string, BoardTicket[]>;
  total: number;
  lastUpdated: string;
}

interface StatusData {
  agents: AgentStatus[];
  totalActive: number;
}

// ─── Ticket card ──────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  agent,
}: {
  ticket: BoardTicket;
  agent?: AgentStatus;
}) {
  const isActive = !!agent;
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!agent) return;
    const tick = () => {
      const seconds = Math.floor((Date.now() - new Date(agent.startedAt).getTime()) / 1000);
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [agent]);

  return (
    <div
      className={[
        "rounded-lg p-3 text-sm transition-all",
        "bg-gray-800/70 border",
        PRIORITY_LEFT[ticket.priority] ?? "border-l-4 border-l-gray-600",
        isActive
          ? "border-green-500/60 ring-1 ring-green-500/30 shadow-lg shadow-green-900/10"
          : "border-gray-700/50",
      ].join(" ")}
    >
      {/* Active agent indicator */}
      {isActive && agent && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-green-400 bg-green-950/50 rounded px-2 py-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <span className="font-medium truncate">
            🤖 {PHASE_LABEL[agent.phase] ?? agent.phase}
          </span>
          {elapsed && <span className="text-green-600 ml-auto flex-shrink-0">{elapsed}</span>}
        </div>
      )}

      {/* Ticket ID + priority */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-xs text-gray-400 flex-shrink-0">{ticket.id}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide flex-shrink-0 ${PRIORITY_BADGE[ticket.priority] ?? "text-gray-400 bg-gray-700"}`}
        >
          {ticket.priority}
        </span>
      </div>

      {/* Summary */}
      <p className="text-gray-200 leading-snug line-clamp-2 text-[13px]">{ticket.summary}</p>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
        {ticket.type && (
          <span className="bg-gray-700/60 px-1.5 py-0.5 rounded">{ticket.type}</span>
        )}
        {ticket.assignee && (
          <span className="truncate">👤 {ticket.assignee}</span>
        )}
        {isActive && agent?.branchName && (
          <span className="truncate text-sky-500">🌿 {agent.branchName}</span>
        )}
      </div>
    </div>
  );
}

// ─── Worker slot sub-component ──────────────────────────────────────────────────

function WorkerSlot({ agent, slotIndex }: { agent: AgentStatus; slotIndex: number }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const tick = () => {
      const seconds = Math.floor((Date.now() - new Date(agent.startedAt).getTime()) / 1000);
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [agent.startedAt]);

  const tokens = (agent.tokenUsage?.input ?? 0) + (agent.tokenUsage?.output ?? 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-xs">#{slotIndex}</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-sky-400 text-xs">{agent.ticketId}</span>
        <span className="text-gray-500 text-xs ml-auto">{elapsed}</span>
      </div>
      <div className="text-xs text-green-300">{PHASE_LABEL[agent.phase] ?? agent.phase}</div>
      {agent.branchName && (
        <div className="text-[11px] text-gray-500 truncate">🌿 {agent.branchName}</div>
      )}
      {tokens > 0 && (
        <div className="text-[11px] text-gray-600">🔥 {(tokens / 1000).toFixed(1)}k tokens</div>
      )}
      {agent.error && (
        <div className="text-[11px] text-red-500 truncate">⚠️ {agent.error}</div>
      )}
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function SDLCBoard() {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [statusData, setStatusData] = useState<StatusData>({ agents: [], totalActive: 0 });
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshAge, setRefreshAge] = useState("");
  const boardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch board data ─────────────────────────────────────────────────────
  const fetchBoard = useCallback(async () => {
    try {
      const resp = await fetch("/api/jira/board");
      if (!resp.ok) {
        const body = (await resp.json()) as { error?: string };
        setBoardError(body.error ?? `HTTP ${resp.status}`);
        return;
      }
      const data = (await resp.json()) as BoardData;
      setBoard(data);
      setBoardError(null);
      setLastRefresh(new Date());
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : String(e));
    } finally {
      setBoardLoading(false);
    }
  }, []);

  // ── Fetch agent statuses ─────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch("/api/agent/status");
      if (resp.ok) {
        const data = (await resp.json()) as StatusData;
        setStatusData(data);
      }
    } catch {
      // swallow — board remains useful without live agent status
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    void fetchBoard();
    void fetchStatus();

    boardTimerRef.current = setInterval(() => void fetchBoard(), 15_000);
    agentTimerRef.current = setInterval(() => void fetchStatus(), 3_000);

    return () => {
      if (boardTimerRef.current) clearInterval(boardTimerRef.current);
      if (agentTimerRef.current) clearInterval(agentTimerRef.current);
    };
  }, [fetchBoard, fetchStatus]);

  // Refresh age display
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastRefresh) return;
      const s = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
      setRefreshAge(s < 5 ? "just now" : `${s}s ago`);
    }, 1000);
    return () => clearInterval(id);
  }, [lastRefresh]);

  // ── Derived: activeAgents keyed by ticketId ──────────────────────────────
  const activeAgentMap = new Map<string, AgentStatus>(
    statusData.agents.map((a) => [a.ticketId, a]),
  );

  const totalTickets = board?.total ?? 0;
  const N_WORKERS = parseInt(process.env.NEXT_PUBLIC_N_WORKERS ?? "3", 10);
  const totalInputTokens = statusData.agents.reduce((sum, a) => sum + (a.tokenUsage?.input ?? 0), 0);
  const totalOutputTokens = statusData.agents.reduce((sum, a) => sum + (a.tokenUsage?.output ?? 0), 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const sortedAgents = [...statusData.agents].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Stats header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-800/60 border border-gray-700/60 rounded-xl px-5 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold text-white">🏭 SDLC Pipeline</h2>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>
              <span className="text-white font-medium">{totalTickets}</span> tickets
            </span>
            {statusData.totalActive > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium">{statusData.totalActive}</span>
                <span>agent{statusData.totalActive > 1 ? "s" : ""} active</span>
              </span>
            )}
            {totalTokens > 0 && (
              <span className="text-xs text-gray-500 border-l border-gray-700 pl-3">
                🔥 {(totalTokens / 1000).toFixed(1)}k tokens
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-500">refreshed {refreshAge}</span>
          )}
          <button
            onClick={() => { void fetchBoard(); void fetchStatus(); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* ── Pipeline flow indicator ─────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max px-1 pb-1">
          {SDLC_STAGES.map((stage, i) => {
            const count = board?.columns[stage.jiraName]?.length ?? 0;
            const stageStyle = STAGE_STYLE[stage.jiraName];
            const hasActive = statusData.agents.some((a) => {
              const t = Object.values(board?.columns ?? {})
                .flat()
                .find((t) => t.id === a.ticketId);
              return t?.status === stage.jiraName;
            });

            return (
              <div key={stage.jiraName} className="flex items-center gap-1.5">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${stageStyle?.col ?? "border-gray-700"} bg-gray-900/60`}
                >
                  <span className={`text-xs font-semibold whitespace-nowrap ${stageStyle?.header ?? "text-gray-400"}`}>
                    {stage.emoji} {stage.label}
                  </span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${stageStyle?.count ?? "bg-gray-700 text-gray-300"}`}>
                    {count}
                  </span>
                  {hasActive && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  )}
                </div>
                {i < SDLC_STAGES.length - 1 && (
                  <span className="text-gray-600 text-sm flex-shrink-0">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {boardError && (
        <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-4 text-red-300 text-sm">
          <span className="font-semibold">⚠️ Jira board error:</span> {boardError}
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {boardLoading && !board && (
        <div className="flex items-center gap-3 text-gray-400 text-sm p-6">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
          Loading Jira board…
        </div>
      )}

      {/* ── Kanban columns ──────────────────────────────────────────────── */}
      {board && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max items-start">
            {SDLC_STAGES.map((stage) => {
              const tickets = board.columns[stage.jiraName] ?? [];
              const stageStyle = STAGE_STYLE[stage.jiraName];
              const activeInStage = tickets.filter((t) => activeAgentMap.has(t.id)).length;

              return (
                <div
                  key={stage.jiraName}
                  className={`w-60 flex-shrink-0 rounded-xl border ${stageStyle?.col ?? "border-gray-700"} bg-gray-900/40`}
                >
                  {/* Column header */}
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 border-b ${stageStyle?.col ?? "border-gray-700"}`}
                  >
                    <h3 className={`text-xs font-bold uppercase tracking-wide ${stageStyle?.header ?? "text-gray-400"}`}>
                      {stage.emoji} {stage.label}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {activeInStage > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                          {activeInStage}
                        </span>
                      )}
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${stageStyle?.count ?? "bg-gray-700 text-gray-300"}`}>
                        {tickets.length}
                      </span>
                    </div>
                  </div>

                  {/* Ticket cards */}
                  <div className="p-2 space-y-2 max-h-[70vh] overflow-y-auto">
                    {tickets.length === 0 ? (
                      <p className="text-gray-600 text-xs text-center py-6">empty</p>
                    ) : (
                      tickets.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          agent={activeAgentMap.get(ticket.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Worker Slots ─────────────────────────────────────────────── */}
      <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            🤖 Workers ({statusData.totalActive}/{N_WORKERS} active)
          </h3>
          {totalTokens > 0 && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="text-blue-400">↑ {(totalInputTokens / 1000).toFixed(1)}k in</span>
              <span className="text-orange-400">↓ {(totalOutputTokens / 1000).toFixed(1)}k out</span>
              <span className="text-gray-600">· {(totalTokens / 1000).toFixed(1)}k total</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: N_WORKERS }, (_, i) => {
            const agent = sortedAgents[i];
            return (
              <div
                key={i}
                className={[
                  "rounded-lg border px-3 py-2.5 text-sm",
                  agent
                    ? "bg-gray-900/60 border-green-800/50"
                    : "bg-gray-900/30 border-gray-700/30",
                ].join(" ")}
              >
                {agent ? (
                  <WorkerSlot agent={agent} slotIndex={i + 1} />
                ) : (
                  <div className="flex items-center gap-2 text-gray-600 text-xs">
                    <span className="text-gray-700">#{i + 1}</span>
                    <span>⏸ idle</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
