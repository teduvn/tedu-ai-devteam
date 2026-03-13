"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { 
  AgentPhase, 
  TestResult, 
  CodeChange,
  AgentLogEntry,
  UseAgentStreamReturn,
  UseAgentStreamOptions,
  SSEEvent,
  SSENodeUpdateEvent,
  SSEInterruptEvent
} from "@/types/agent-workflow";

// ─── Hook State Interface ─────────────────────────────────────────────────────

interface AgentStreamState {
  phase: AgentPhase;
  plan: string[];
  codeChanges: CodeChange[];
  prUrl: string | null;
  branchName: string | null;
  stagingUrl: string | null;
  prNumber: number | null;
  testResults: TestResult | null;
  threadId: string | null;
  interrupted: boolean;
  interruptMessage: string | null;
  isRunning: boolean;
  logs: AgentLogEntry[];
}

export function useAgentStream(
  ticketId: string | null, 
  options?: UseAgentStreamOptions
): UseAgentStreamReturn {
  const { useMock = true } = options || {};
  
  const [agentStreamState, setAgentStreamState] = useState<AgentStreamState>({
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

  const eventSourceRef = useRef<EventSource | null>(null);
  const logIdCounterRef = useRef(0);

  const addLogEntry = useCallback((node: string, message: string) => {
    setAgentStreamState((previousState) => ({
      ...previousState,
      logs: [
        ...previousState.logs,
        {
          id: logIdCounterRef.current++,
          node,
          message,
          timestamp: new Date().toLocaleTimeString(),
        } satisfies AgentLogEntry,
      ],
    }));
  }, []);

  const startAgentWorkflow = useCallback(() => {
    if (!ticketId || eventSourceRef.current) return;

    setAgentStreamState({
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

    const endpoint = useMock 
      ? `/api/agent/mock?ticketId=${encodeURIComponent(ticketId)}`
      : `/api/agent?ticketId=${encodeURIComponent(ticketId)}`;
    
    const eventSource = new EventSource(endpoint);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (messageEvent: MessageEvent<string>) => {
      try {
        const eventData = JSON.parse(messageEvent.data) as SSEEvent;

        if (eventData.type === "started") {
          setAgentStreamState((previousState) => ({ 
            ...previousState, 
            threadId: eventData.threadId 
          }));
          addLogEntry("started", `Agent started for ticket ${eventData.ticketId}`);
        }

        if (eventData.type === "node_update") {
          const nodeUpdate = eventData as SSENodeUpdateEvent;
          setAgentStreamState((previousState) => ({
            ...previousState,
            phase: nodeUpdate.phase ?? previousState.phase,
            plan: nodeUpdate.plan ? [...nodeUpdate.plan] : previousState.plan,
            codeChanges: nodeUpdate.codeChanges ? [...nodeUpdate.codeChanges] : previousState.codeChanges,
            prUrl: nodeUpdate.prUrl ?? previousState.prUrl,
            branchName: nodeUpdate.branchName ?? previousState.branchName,
            stagingUrl: nodeUpdate.stagingUrl !== undefined ? nodeUpdate.stagingUrl : previousState.stagingUrl,
            prNumber: nodeUpdate.prNumber !== undefined ? nodeUpdate.prNumber : previousState.prNumber,
            testResults: nodeUpdate.testResults !== undefined ? nodeUpdate.testResults : previousState.testResults,
          }));
          const logSummary =
            nodeUpdate.error
              ? `Error: ${nodeUpdate.error}`
              : `Phase: ${nodeUpdate.phase ?? "—"} | Files: ${nodeUpdate.codeChanges?.length ?? 0}`;
          addLogEntry(nodeUpdate.node, `[${nodeUpdate.node}] ${logSummary}`);
        }

        if (eventData.type === "interrupt") {
          const interruptEvent = eventData as SSEInterruptEvent;
          setAgentStreamState((previousState) => ({
            ...previousState,
            threadId: interruptEvent.threadId,
            prUrl: interruptEvent.prUrl,
            prNumber: interruptEvent.prNumber !== undefined ? interruptEvent.prNumber : previousState.prNumber,
            stagingUrl: interruptEvent.stagingUrl !== undefined ? interruptEvent.stagingUrl : previousState.stagingUrl,
            testResults: interruptEvent.testResults !== undefined ? interruptEvent.testResults : previousState.testResults,
            interrupted: true,
            interruptMessage: interruptEvent.message,
            isRunning: false,
          }));
          addLogEntry("__interrupt__", interruptEvent.message);
          eventSource.close();
          eventSourceRef.current = null;
        }

        if (eventData.type === "completed") {
          setAgentStreamState((previousState) => ({ 
            ...previousState, 
            phase: "done", 
            isRunning: false 
          }));
          addLogEntry("completed", "Agent workflow completed successfully.");
          eventSource.close();
          eventSourceRef.current = null;
        }

        if (eventData.type === "error") {
          setAgentStreamState((previousState) => ({ 
            ...previousState, 
            phase: "error", 
            isRunning: false 
          }));
          addLogEntry("error", `Error: ${eventData.message}`);
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        addLogEntry("parse_error", `Failed to parse SSE event: ${errorMessage}`);
      }
    };

    eventSource.onerror = () => {
      setAgentStreamState((previousState) => ({ 
        ...previousState, 
        isRunning: false 
      }));
      addLogEntry("connection_error", "Connection to agent stream lost.");
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [ticketId, addLogEntry, useMock]);

  const resumeWorkflow = useCallback(
    async (approved: boolean) => {
      if (!agentStreamState.threadId) return;
      
      // For mock mode, we simulate the resume action
      if (useMock) {
        setAgentStreamState((previousState) => ({
          ...previousState,
          interrupted: false,
          phase: approved ? "deploying_production" : "coding",
          isRunning: false,
        }));
        
        addLogEntry("human_review", approved 
          ? "Deploy to production approved ✅" 
          : "Rejected — reworking ❌");
        
        // Simulate deployment delay
        if (approved) {
          setTimeout(() => {
            setAgentStreamState(previousState => ({
              ...previousState,
              phase: "done",
            }));
            addLogEntry("deploying_production", "Deployed to production successfully 🚀");
          }, 1500);
        }
      } else {
        // Real API call
        try {
          const response = await fetch("/api/agent/resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              threadId: agentStreamState.threadId, 
              approved 
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          setAgentStreamState((previousState) => ({
            ...previousState,
            interrupted: false,
            phase: approved ? "done" : "coding",
            isRunning: false,
          }));
          addLogEntry("human_review", approved 
            ? "Deploy to production approved ✅" 
            : "Rejected — reworking ❌");
        } catch (fetchError) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
          addLogEntry("resume_error", `Failed to resume workflow: ${errorMessage}`);
          setAgentStreamState((previousState) => ({
            ...previousState,
            phase: "error",
            isRunning: false,
          }));
        }
      }
    },
    [agentStreamState.threadId, addLogEntry, useMock],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return { 
    phase: agentStreamState.phase,
    plan: agentStreamState.plan,
    codeChanges: agentStreamState.codeChanges,
    prUrl: agentStreamState.prUrl,
    branchName: agentStreamState.branchName,
    stagingUrl: agentStreamState.stagingUrl,
    prNumber: agentStreamState.prNumber,
    testResults: agentStreamState.testResults,
    threadId: agentStreamState.threadId,
    interrupted: agentStreamState.interrupted,
    interruptMessage: agentStreamState.interruptMessage,
    isRunning: agentStreamState.isRunning,
    logs: agentStreamState.logs,
    start: startAgentWorkflow, 
    resume: resumeWorkflow 
  };
}