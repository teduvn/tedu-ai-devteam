interface LogEntry {
  id: number;
  node: string;
  message: string;
  timestamp: string;
}

interface Props {
  entries: LogEntry[];
}

const NODE_ICON: Record<string, string> = {
  pm_agent: "📋",
  coder_agent: "💻",
  devops_agent: "🚀",
  human_review: "👤",
  __interrupt__: "⏸",
  started: "▶",
  completed: "✅",
  error: "❌",
};

export default function LogStream({ entries }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse inline-block" />
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Live Agent Log
        </span>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
        {entries.length === 0 && (
          <p className="text-gray-600 italic">Waiting for agent to start…</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-3 items-start">
            <span className="text-gray-500 text-xs shrink-0 pt-0.5">
              {entry.timestamp}
            </span>
            <span className="text-base">{NODE_ICON[entry.node] ?? "•"}</span>
            <span className="text-gray-200 break-words">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { LogEntry };
