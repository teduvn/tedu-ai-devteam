"use client";

import type { AgentPhase } from "@tedu/agents";

interface WorkflowVisualizationProps {
  currentPhase: AgentPhase;
}

const PHASE_ORDER: AgentPhase[] = [
  "idle",
  "analyzing",
  "planning", 
  "coding",
  "reviewing",
  "creating_pr",
  "deploying_staging",
  "testing",
  "test_passed",
  "awaiting_approval",
  "deploying_production",
  "done",
];

const PHASE_LABELS: Record<AgentPhase, string> = {
  idle: "Idle",
  analyzing: "Analyze",
  planning: "Plan",
  coding: "Code",
  reviewing: "Review",
  creating_pr: "Create PR",
  deploying_staging: "Deploy Staging",
  testing: "Test",
  test_passed: "Tests Passed",
  test_failed: "Tests Failed",
  awaiting_approval: "Await Approval",
  deploying_production: "Deploy Prod",
  done: "Done",
  canceled: "Canceled",
  error: "Error",
};

const PHASE_COLORS: Record<AgentPhase, string> = {
  idle: "bg-gray-700",
  analyzing: "bg-yellow-700",
  planning: "bg-blue-700",
  coding: "bg-purple-700",
  reviewing: "bg-indigo-700",
  creating_pr: "bg-cyan-700",
  deploying_staging: "bg-teal-700",
  testing: "bg-violet-700",
  test_passed: "bg-green-700",
  test_failed: "bg-red-700",
  awaiting_approval: "bg-orange-700",
  deploying_production: "bg-blue-700",
  done: "bg-green-700",
  canceled: "bg-gray-700",
  error: "bg-red-700",
};

export default function WorkflowVisualization({ currentPhase }: WorkflowVisualizationProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const isErrorOrCanceled = currentPhase === "error" || currentPhase === "canceled";
  
  // Filter to show only relevant phases in a logical flow
  const displayPhases: AgentPhase[] = [
    "analyzing",
    "planning",
    "coding",
    "reviewing",
    "creating_pr",
    "deploying_staging",
    "testing",
    "test_passed",
    "awaiting_approval",
    "deploying_production",
    "done",
  ];
  
  const displayIndex = displayPhases.indexOf(currentPhase);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        🔄 Workflow Progress
      </h2>
      
      {/* Progress bar */}
      <div className="relative mb-8">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700 -translate-y-1/2" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 transition-all duration-500"
          style={{ 
            width: `${displayIndex >= 0 ? ((displayIndex + 1) / displayPhases.length) * 100 : 0}%` 
          }}
        />
        
        <div className="relative flex justify-between">
          {displayPhases.map((phase, index) => {
            const isCompleted = displayIndex > index;
            const isCurrent = displayIndex === index;
            const isFuture = displayIndex < index;
            
            return (
              <div key={phase} className="relative flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCurrent
                      ? `${PHASE_COLORS[phase]} border-white scale-110`
                      : isCompleted
                      ? `${PHASE_COLORS[phase]} border-transparent`
                      : "bg-gray-800 border-gray-600"
                  }`}
                >
                  {isCompleted && (
                    <span className="text-white text-sm">✓</span>
                  )}
                  {isCurrent && !isCompleted && (
                    <span className="text-white text-sm animate-pulse">●</span>
                  )}
                  {isFuture && (
                    <span className="text-gray-500 text-sm">{index + 1}</span>
                  )}
                </div>
                <span className={`mt-2 text-xs text-center max-w-16 ${
                  isCurrent ? "text-white font-medium" : 
                  isCompleted ? "text-gray-300" : 
                  "text-gray-500"
                }`}>
                  {PHASE_LABELS[phase]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current phase details */}
      <div className={`p-3 rounded-lg ${
        currentPhase === "error" || currentPhase === "test_failed" 
          ? "bg-red-900/20 border border-red-800" 
          : "bg-gray-800/50 border border-gray-700"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-3 h-3 rounded-full ${PHASE_COLORS[currentPhase]}`} />
          <span className="text-sm font-medium text-gray-200">
            Current Phase: {PHASE_LABELS[currentPhase]}
          </span>
        </div>
        {currentPhase === "analyzing" && (
          <p className="text-xs text-gray-400">Analyzing ticket requirements and creating development plan...</p>
        )}
        {currentPhase === "planning" && (
          <p className="text-xs text-gray-400">Creating detailed implementation plan...</p>
        )}
        {currentPhase === "coding" && (
          <p className="text-xs text-gray-400">Writing and modifying code files...</p>
        )}
        {currentPhase === "reviewing" && (
          <p className="text-xs text-gray-400">Reviewing code changes for quality and standards...</p>
        )}
        {currentPhase === "creating_pr" && (
          <p className="text-xs text-gray-400">Creating pull request with changes...</p>
        )}
        {currentPhase === "deploying_staging" && (
          <p className="text-xs text-gray-400">Deploying to staging environment for testing...</p>
        )}
        {currentPhase === "testing" && (
          <p className="text-xs text-gray-400">Running automated tests on staging...</p>
        )}
        {currentPhase === "test_passed" && (
          <p className="text-xs text-gray-400">All tests passed! Ready for human review...</p>
        )}
        {currentPhase === "awaiting_approval" && (
          <p className="text-xs text-gray-400">Waiting for human approval to deploy to production...</p>
        )}
        {currentPhase === "deploying_production" && (
          <p className="text-xs text-gray-400">Deploying approved changes to production...</p>
        )}
        {currentPhase === "done" && (
          <p className="text-xs text-gray-400">Workflow completed successfully! Changes are live in production.</p>
        )}
        {currentPhase === "error" && (
          <p className="text-xs text-gray-400">An error occurred in the workflow. Check logs for details.</p>
        )}
        {currentPhase === "test_failed" && (
          <p className="text-xs text-gray-400">Tests failed. Review test results and fix issues.</p>
        )}
      </div>
    </div>
  );
}