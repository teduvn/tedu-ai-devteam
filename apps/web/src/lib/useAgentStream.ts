"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentPhase, TestResult } from "@tedu/agents";
import type { LogEntry } from "../components/LogStream";

// ─── SSE Event Shapes ─────────────────────────────────────────────────────────

interface SSEStarted {
  type: "started";
  threadId: string;
  ticketId: string;
}

interface SSENodeUpdate {
  type: "node_update";
  node: string;
  phase?: AgentPhase;
  plan?: string[];
  codeChanges?: Array<{ filePath: string; operation: string }>;
  prUrl?: string;
  branchName?: string;
  stagingUrl?: string | null;
  prNumber?: number | null;
  testResults?: TestResult | null;
  error?: string | null;
}

interface SSEInterrupt {
  type: "interrupt";
  threadId: string;
  prUrl: string;
  message: string;
  prNumber?: number | null;
  stagingUrl?: string | null;
  testResults?: TestResult | null;
}

interface SSECompleted {
  type: "completed";
  threadId: string;
}

interface SSEError {
  type: "error";
  message: string;
}

type SSEEvent = SSEStarted | SSENodeUpdate | SSEInterrupt | SSECompleted | SSEError;

// ─── Hook State ───────────────────────────────────────────────────────────────

interface AgentStreamState {
  phase: AgentPhase;
  plan: string[];
  codeChanges: Array<{ filePath: string; operation: string }>;
  prUrl: string | null;
  branchName: string | null;
  stagingUrl: string | null;
  prNumber: number | null;
  testResults: TestResult | null;
  threadId: string | null;
  interrupted: boolean;
  interruptMessage: string | null;
  isRunning: boolean;
  logs: LogEntry[];
}

export function useAgentStream(ticketId: string | null) {
  const [state, setState] = useState<AgentStreamState>({
    phase: "idle",
    plan: [],
    codeChanges: [],
    prUrl: null,
    branchName: null,
    stagingUrl: null,
    prNumber: null,
    testResults: null,
    threadId: null,
    interrupted: false,
    interruptMessage: null,
    isRunning: false,
    logs: [],
  });

  const esRef = useRef<EventSource | null>(null);
  const logIdRef = useRef(0);

  const addLog = useCallback((node: string, message: string) => {
    setState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          id: logIdRef.current++,
          node,
          message,
          timestamp: new Date().toLocaleTimeString(),
        } satisfies LogEntry,
      ],
    }));
  }, []);

  const start = useCallback(() => {
    if (!ticketId || esRef.current) return;

    setState({
      phase: "analyzing",
      plan: [],
      codeChanges: [],
      prUrl: null,
      branchName: null,
      stagingUrl: null,
      prNumber: null,
      testResults: null,
      threadId: null,
      interrupted: false,
      interruptMessage: null,
      isRunning: true,
      logs: [],
    });

    const es = new EventSource(`/api/agent?ticketId=${encodeURIComponent(ticketId)}`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as SSEEvent;

      if (data.type === "started") {
        setState((prev) => ({ ...prev, threadId: data.threadId }));
        addLog("started", `Agent started for ticket ${data.ticketId}`);
      }

      if (data.type === "node_update") {
        setState((prev) => ({
          ...prev,
          phase: data.phase ?? prev.phase,
          plan: data.plan ?? prev.plan,
          codeChanges: data.codeChanges ?? prev.codeChanges,
          prUrl: data.prUrl ?? prev.prUrl,
          branchName: data.branchName ?? prev.branchName,
          stagingUrl: data.stagingUrl !== undefined ? data.stagingUrl : prev.stagingUrl,
          prNumber: data.prNumber !== undefined ? data.prNumber : prev.prNumber,
          testResults: data.testResults !== undefined ? data.testResults : prev.testResults,
        }));
        const summary =
          data.error
            ? `Error: ${data.error}`
            : `Phase: ${data.phase ?? "—"} | Files: ${data.codeChanges?.length ?? 0}`;
        addLog(data.node, `[${data.node}] ${summary}`);
      }

      if (data.type === "interrupt") {
        setState((prev) => ({
          ...prev,
          threadId: data.threadId,
          prUrl: data.prUrl,
          prNumber: data.prNumber !== undefined ? data.prNumber : prev.prNumber,
          stagingUrl: data.stagingUrl !== undefined ? data.stagingUrl : prev.stagingUrl,
          testResults: data.testResults !== undefined ? data.testResults : prev.testResults,
          interrupted: true,
          interruptMessage: data.message,
          isRunning: false,
        }));
        addLog("__interrupt__", data.message);
        es.close();
        esRef.current = null;
      }

      if (data.type === "completed") {
        setState((prev) => ({ ...prev, phase: "done", isRunning: false }));
        addLog("completed", "Agent workflow completed successfully.");
        es.close();
        esRef.current = null;
      }

      if (data.type === "error") {
        setState((prev) => ({ ...prev, phase: "error", isRunning: false }));
        addLog("error", `Error: ${data.message}`);
        es.close();
        esRef.current = null;
      }
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, isRunning: false }));
      addLog("error", "Connection lost.");
      es.close();
      esRef.current = null;
    };
  }, [ticketId, addLog]);

  const resume = useCallback(
    async (approved: boolean) => {
      if (!state.threadId) return;
      await fetch("/api/agent/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: state.threadId, approved }),
      });
      setState((prev) => ({
        ...prev,
        interrupted: false,
        phase: approved ? "done" : "coding",
        isRunning: false,
      }));
      addLog("human_review", approved ? "Deploy to production approved ✅" : "Rejected — reworking ❌");
    },
    [state.threadId, addLog],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  return { ...state, start, resume };
}
