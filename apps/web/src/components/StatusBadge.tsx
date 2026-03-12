import type { AgentPhase } from "@tedu/agents";

interface Props {
  phase: AgentPhase;
}

const PHASE_CONFIG: Record<AgentPhase, { label: string; color: string }> = {
  idle: { label: "Idle", color: "bg-gray-700 text-gray-300" },
  analyzing: { label: "Analyzing", color: "bg-yellow-900 text-yellow-300 animate-pulse" },
  planning: { label: "Planning", color: "bg-blue-900 text-blue-300 animate-pulse" },
  coding: { label: "Coding", color: "bg-purple-900 text-purple-300 animate-pulse" },
  reviewing: { label: "Reviewing", color: "bg-indigo-900 text-indigo-300 animate-pulse" },
  creating_pr: { label: "Creating PR", color: "bg-cyan-900 text-cyan-300 animate-pulse" },
  deploying_staging: {
    label: "Deploying to Staging",
    color: "bg-teal-900 text-teal-300 animate-pulse",
  },
  testing: { label: "Testing", color: "bg-violet-900 text-violet-300 animate-pulse" },
  test_passed: { label: "Tests Passed ✓", color: "bg-green-900 text-green-300" },
  test_failed: { label: "Tests Failed ✗", color: "bg-red-900 text-red-300" },
  awaiting_approval: {
    label: "Awaiting Approval",
    color: "bg-orange-900 text-orange-300 animate-pulse",
  },
  deploying_production: {
    label: "Deploying to Production 🚀",
    color: "bg-blue-900 text-blue-300 animate-pulse",
  },
  done: { label: "Done ✓", color: "bg-green-900 text-green-300" },
  canceled: { label: "Canceled", color: "bg-gray-700 text-gray-500" },
  error: { label: "Error ✗", color: "bg-red-900 text-red-300" },
};

export default function StatusBadge({ phase }: Props) {
  const config = PHASE_CONFIG[phase];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}
    >
      {config.label}
    </span>
  );
}
