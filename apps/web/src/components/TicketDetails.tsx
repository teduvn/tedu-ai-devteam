"use client";

import type { TicketPriority, TicketType, TicketStatus } from "@/types/agent-workflow";

interface TicketDetailsProps {
  ticket: {
    id: string;
    summary: string;
    description: string;
    priority: TicketPriority;
    type: TicketType;
    assignee: string | null;
    labels: string[];
    status: TicketStatus;
    createdAt: string;
    updatedAt: string;
  };
  className?: string;
}

interface BadgeConfig {
  color: string;
  icon: string;
}

const PriorityBadge = ({ priority }: { priority: TicketPriority }) => {
  const priorityConfig: Record<TicketPriority, BadgeConfig> = {
    critical: { color: "bg-red-900 text-red-300", icon: "🔥" },
    high: { color: "bg-orange-900 text-orange-300", icon: "⚠️" },
    medium: { color: "bg-yellow-900 text-yellow-300", icon: "📋" },
    low: { color: "bg-blue-900 text-blue-300", icon: "📄" },
  };

  const config = priorityConfig[priority];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span className="capitalize">{priority}</span>
    </span>
  );
};

const TypeBadge = ({ type }: { type: TicketType }) => {
  const typeConfig: Record<TicketType, BadgeConfig> = {
    bug: { color: "bg-red-800 text-red-200", icon: "🐛" },
    feature: { color: "bg-green-800 text-green-200", icon: "✨" },
    task: { color: "bg-blue-800 text-blue-200", icon: "📋" },
    improvement: { color: "bg-purple-800 text-purple-200", icon: "⚡" },
  };

  const config = typeConfig[type];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span className="capitalize">{type}</span>
    </span>
  );
};

const StatusBadgeComponent = ({ status }: { status: TicketStatus }) => {
  const statusConfig: Record<TicketStatus, BadgeConfig> = {
    todo: { color: "bg-gray-700 text-gray-300", icon: "⏳" },
    "in-progress": { color: "bg-blue-700 text-blue-300", icon: "⚙️" },
    review: { color: "bg-yellow-700 text-yellow-300", icon: "👁️" },
    done: { color: "bg-green-700 text-green-300", icon: "✅" },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span className="capitalize">{status.replace("-", " ")}</span>
    </span>
  );
};

export default function TicketDetails({ ticket, className = "" }: TicketDetailsProps) {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Failed to format date:", error);
      return "Invalid date";
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{ticket.summary}</h2>
          <p className="text-sm text-gray-400 mt-1">Ticket ID: {ticket.id}</p>
        </div>
        <div className="flex gap-2">
          <PriorityBadge priority={ticket.priority} />
          <TypeBadge type={ticket.type} />
          <StatusBadgeComponent status={ticket.status} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Description
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded">
            {ticket.description || "No description provided."}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Assignee
            </h3>
            <div className="text-sm text-gray-300">
              {ticket.assignee || "Unassigned"}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Created
            </h3>
            <div className="text-sm text-gray-300">
              {formatDate(ticket.createdAt)}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Updated
            </h3>
            <div className="text-sm text-gray-300">
              {formatDate(ticket.updatedAt)}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Labels
            </h3>
            <div className="flex flex-wrap gap-1">
              {ticket.labels.length > 0 ? (
                ticket.labels.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                  >
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No labels</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}