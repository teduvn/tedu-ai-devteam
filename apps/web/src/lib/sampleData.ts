import type { AgentPhase, TestResult } from "@tedu/agents";

export const sampleTicketId = "TEDU-1";

export const sampleDevelopmentPlan = [
  "Explore the project structure and understand existing codebase",
  "Read relevant files to understand current implementation",
  "Implement mock ticket service for Jira ticket simulation",
  "Add ticket details display to dashboard",
  "Create workflow visualization component",
  "Implement code diff viewer for reviewing changes",
  "Update dashboard layout to accommodate new components",
  "Add file explorer component for project navigation",
  "Implement code editor for file content viewing",
  "Add ticket status tracking and updates",
  "Enhance test results display with coverage metrics",
  "Improve user experience with diff/code view toggle",
];

export const sampleCodeChanges = [
  { filePath: "src/lib/mockTicketService.ts", operation: "modify" },
  { filePath: "src/components/AgentDashboard.tsx", operation: "modify" },
  { filePath: "src/components/TicketDetails.tsx", operation: "modify" },
  { filePath: "src/components/WorkflowVisualization.tsx", operation: "create" },
  { filePath: "src/components/CodeDiffViewer.tsx", operation: "create" },
  { filePath: "src/components/CodeEditor.tsx", operation: "create" },
  { filePath: "src/components/FileExplorer.tsx", operation: "create" },
  { filePath: "src/app/page.tsx", operation: "modify" },
  { filePath: "src/lib/sampleData.ts", operation: "modify" },
  { filePath: "src/lib/useAgentStream.ts", operation: "create" },
  { filePath: "src/lib/mockDiffService.ts", operation: "create" },
];

export const sampleTestResult: TestResult = {
  passed: true,
  summary: "All 42 tests passed with 92% coverage",
  coveragePercent: 92,
  stagingUrl: "https://staging.tedu-ai.example.com/deploy-123",
  failedTests: [],
};

export const sampleFailedTestResult: TestResult = {
  passed: false,
  summary: "3 tests failed out of 42 (91% coverage)",
  coveragePercent: 91,
  stagingUrl: "https://staging.tedu-ai.example.com/deploy-123",
  failedTests: [
    "should handle file read errors gracefully",
    "should validate TypeScript types in strict mode",
    "should maintain 90% test coverage for file operations",
  ],
};

export const samplePhases: AgentPhase[] = [
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

export const sampleDiff = `--- a/src/components/AgentDashboard.tsx
+++ b/src/components/AgentDashboard.tsx
@@ -1,5 +1,7 @@
 "use client";

 import { useState } from "react";
 import StatusBadge from "./StatusBadge";
 import LogStream from "./LogStream";
+import TicketDetails from "./TicketDetails";
 import { useAgentStream } from "@/lib/useAgentStream";
+import { getMockTicket } from "@/lib/mockTicketService";
@@ -9,6 +11,7 @@
 export default function AgentDashboard() {
   const [inputTicketId, setInputTicketId] = useState("");
   const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
+  const [ticketDetails, setTicketDetails] = useState<ReturnType<typeof getMockTicket> | null>(null);

   const {
     phase,
@@ -29,7 +32,10 @@
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     const id = inputTicketId.trim();
-    if (!id) return;
+    if (!id) return;
+    
+    const ticket = getMockTicket(id);
+    setTicketDetails(ticket);
     setSubmittedTicketId(id);
     setTimeout(start, 0);
   };
@@ -58,6 +64,11 @@
         </button>
       </form>

+      {/* ── Ticket Details ── */}
+      {ticketDetails && (
+        <TicketDetails ticket={ticketDetails} />
+      )}
+
       {/* ── Status Bar ── */}
       {submittedTicketId && (
         <div className="flex items-center gap-4 flex-wrap">`;

export const sampleFileStructure = [
  {
    name: "src",
    type: "directory" as const,
    path: "src",
    children: [
      {
        name: "app",
        type: "directory" as const,
        path: "src/app",
        children: [
          { name: "page.tsx", type: "file" as const, path: "src/app/page.tsx" },
          { name: "layout.tsx", type: "file" as const, path: "src/app/layout.tsx" },
          { name: "globals.css", type: "file" as const, path: "src/app/globals.css" },
          {
            name: "api",
            type: "directory" as const,
            path: "src/app/api",
            children: [
              {
                name: "agent",
                type: "directory" as const,
                path: "src/app/api/agent",
                children: [
                  { name: "route.ts", type: "file" as const, path: "src/app/api/agent/route.ts" },
                  {
                    name: "resume",
                    type: "directory" as const,
                    path: "src/app/api/agent/resume",
                    children: [
                      { name: "route.ts", type: "file" as const, path: "src/app/api/agent/resume/route.ts" },
                    ],
                  },
                ],
              },
              {
                name: "test",
                type: "directory" as const,
                path: "src/app/api/test",
                children: [
                  { name: "route.ts", type: "file" as const, path: "src/app/api/test/route.ts" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "components",
        type: "directory" as const,
        path: "src/components",
        children: [
          { name: "AgentDashboard.tsx", type: "file" as const, path: "src/components/AgentDashboard.tsx" },
          { name: "TicketDetails.tsx", type: "file" as const, path: "src/components/TicketDetails.tsx" },
          { name: "WorkflowVisualization.tsx", type: "file" as const, path: "src/components/WorkflowVisualization.tsx" },
          { name: "CodeDiffViewer.tsx", type: "file" as const, path: "src/components/CodeDiffViewer.tsx" },
          { name: "CodeEditor.tsx", type: "file" as const, path: "src/components/CodeEditor.tsx" },
          { name: "FileExplorer.tsx", type: "file" as const, path: "src/components/FileExplorer.tsx" },
          { name: "LogStream.tsx", type: "file" as const, path: "src/components/LogStream.tsx" },
          { name: "StatusBadge.tsx", type: "file" as const, path: "src/components/StatusBadge.tsx" },
        ],
      },
      {
        name: "lib",
        type: "directory" as const,
        path: "src/lib",
        children: [
          { name: "useAgentStream.ts", type: "file" as const, path: "src/lib/useAgentStream.ts" },
          { name: "mockTicketService.ts", type: "file" as const, path: "src/lib/mockTicketService.ts" },
          { name: "mockDiffService.ts", type: "file" as const, path: "src/lib/mockDiffService.ts" },
          { name: "sampleData.ts", type: "file" as const, path: "src/lib/sampleData.ts" },
        ],
      },
    ],
  },
  {
    name: "package.json",
    type: "file" as const,
    path: "package.json",
  },
  {
    name: "tsconfig.json",
    type: "file" as const,
    path: "tsconfig.json",
  },
  {
    name: "next.config.ts",
    type: "file" as const,
    path: "next.config.ts",
  },
  {
    name: "tailwind.config.ts",
    type: "file" as const,
    path: "tailwind.config.ts",
  },
  {
    name: "postcss.config.mjs",
    type: "file" as const,
    path: "postcss.config.mjs",
  },
  {
    name: "next-env.d.ts",
    type: "file" as const,
    path: "next-env.d.ts",
  },
];