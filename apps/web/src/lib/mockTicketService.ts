import type { TicketPriority, TicketType, TicketStatus } from "@/types/agent-workflow";

export interface Ticket {
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
}

const mockTickets: Record<string, Ticket> = {
  "TEDU-1": {
    id: "TEDU-1",
    summary: "Implement AI agent dashboard for SDLC automation",
    description: `Create a comprehensive dashboard that visualizes the AI agent workflow from Jira ticket intake to production deployment.

## Requirements:
- Real-time visualization of agent phases (analyzing, coding, testing, etc.)
- Display development plan and code changes
- Show test results with coverage metrics
- Human-in-the-loop approval panel
- Live log stream of agent activities

## Acceptance Criteria:
- All agent phases are clearly displayed with status badges
- Code changes are listed with operation types (create, modify, delete)
- Test results show pass/fail status with coverage percentages
- Human review panel appears after tests pass
- Responsive design with dark theme`,
    priority: "high",
    type: "feature",
    assignee: "ai-agent-team",
    labels: ["dashboard", "ui", "monitoring", "workflow"],
    status: "in-progress",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
  },
  "TEDU-2": {
    id: "TEDU-2",
    summary: "Fix TypeScript compilation errors in agent library",
    description: `There are TypeScript compilation errors in the @tedu/agents package when building in strict mode. Need to fix type definitions and add proper error handling.

## Root Cause:
- Missing type definitions for file operations
- Incorrect return types in async functions
- Missing null checks in strict mode

## Changes Needed:
1. Add proper TypeScript interfaces for all exported functions
2. Implement error handling with try/catch blocks
3. Add unit tests for edge cases
4. Update documentation with type examples`,
    priority: "critical",
    type: "bug",
    assignee: "coder-agent",
    labels: ["typescript", "build", "fix", "quality"],
    status: "todo",
    createdAt: "2024-01-14T09:15:00Z",
    updatedAt: "2024-01-14T09:15:00Z",
  },
  "TEDU-3": {
    id: "TEDU-3",
    summary: "Add unit tests for file system operations",
    description: `Increase test coverage for file read/write operations in the coder agent. Should reach at least 90% coverage.

## Areas to Cover:
- File reading with various encodings
- File writing with error handling
- Directory operations (create, list, delete)
- Permission-related scenarios
- Concurrent file access edge cases

## Success Metrics:
- 90% code coverage for file system module
- All edge cases covered (permissions, disk full, etc.)
- Mock file system for isolated testing`,
    priority: "medium",
    type: "improvement",
    assignee: "tester-agent",
    labels: ["testing", "coverage", "quality", "security"],
    status: "todo",
    createdAt: "2024-01-13T14:20:00Z",
    updatedAt: "2024-01-13T14:20:00Z",
  },
  "TEDU-4": {
    id: "TEDU-4",
    summary: "Add file explorer component to dashboard",
    description: `Enhance the dashboard with a file explorer component that shows the project structure and allows users to navigate and select files.

## Requirements:
- Tree view of directories and files
- Expand/collapse folders
- File type icons
- File selection highlighting
- Integration with code diff viewer

## Acceptance Criteria:
- Users can browse project files
- Clicking files shows their diffs
- Responsive design works on all screen sizes
- Performance with large file structures`,
    priority: "high",
    type: "feature",
    assignee: "ui-agent",
    labels: ["dashboard", "ui", "filesystem", "navigation"],
    status: "in-progress",
    createdAt: "2024-01-12T11:30:00Z",
    updatedAt: "2024-01-15T10:45:00Z",
  },
  "TEDU-42": {
    id: "TEDU-42",
    summary: "Implement real-time collaboration features",
    description: `Add WebSocket support for real-time collaboration between multiple agents and human reviewers.

## Features:
- Live updates when agents make changes
- Collaborative code review annotations
- Real-time chat between team members
- Presence indicators showing who's online
- Conflict resolution for simultaneous edits

## Technical Requirements:
- WebSocket server integration
- Conflict detection and resolution
- Offline support with sync
- Secure authentication and authorization`,
    priority: "high",
    type: "feature",
    assignee: "devops-agent",
    labels: ["websocket", "realtime", "collaboration", "infrastructure"],
    status: "in-progress",
    createdAt: "2024-01-12T11:45:00Z",
    updatedAt: "2024-01-15T16:20:00Z",
  },
};

export function getMockTicket(ticketId: string): Ticket | null {
  const normalizedId = ticketId.toUpperCase();
  return mockTickets[normalizedId] || null;
}

export function getAllMockTickets(): Ticket[] {
  return Object.values(mockTickets);
}

export function updateTicketStatus(ticketId: string, status: TicketStatus): boolean {
  const normalizedId = ticketId.toUpperCase();
  if (mockTickets[normalizedId]) {
    mockTickets[normalizedId].status = status;
    mockTickets[normalizedId].updatedAt = new Date().toISOString();
    return true;
  }
  return false;
}

export function createMockTicket(ticketData: Omit<Ticket, "createdAt" | "updatedAt" | "id">): Ticket {
  const newId = `TEDU-${Object.keys(mockTickets).length + 100}`;
  const newTicket: Ticket = {
    ...ticketData,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockTickets[newId] = newTicket;
  return newTicket;
}