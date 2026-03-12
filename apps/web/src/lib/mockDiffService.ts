import type { CodeDiff } from "@/components/CodeDiffViewer";

export interface MockDiffOptions {
  filePath: string;
  operation: "create" | "modify" | "delete";
  language?: string;
}

export function generateMockDiff(options: MockDiffOptions): CodeDiff {
  const { filePath, operation, language } = options;
  const fileName = filePath.split("/").pop() || filePath;
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  
  // Determine language from extension if not provided
  const detectedLanguage = language || getLanguageFromExtension(extension);
  
  // Generate appropriate diff based on file type and operation
  const diff = generateDiffContent(fileName, extension, operation);
  
  return {
    filePath,
    operation,
    diff,
    language: detectedLanguage,
  };
}

function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    svg: "xml",
    xml: "xml",
    yml: "yaml",
    yaml: "yaml",
    py: "python",
    rb: "ruby",
    java: "java",
    go: "go",
    rs: "rust",
    php: "php",
    sql: "sql",
    sh: "bash",
  };
  
  return languageMap[extension] || "text";
}

function generateDiffContent(fileName: string, extension: string, operation: "create" | "modify" | "delete"): string {
  const timestamp = new Date().toISOString().split("T")[0];
  
  if (operation === "delete") {
    return `--- a/${fileName}
+++ /dev/null
@@ -1,15 +0,0 @@
-// ${fileName}
-// This file was deleted as part of the implementation
-// Date: ${timestamp}
-
-import React from "react";
-
-export function ${fileName.split(".")[0]}() {
-  return (
-    <div>
-      <h1>This file was removed</h1>
-      <p>The file was deleted during refactoring.</p>
-    </div>
-  );
-}`;
  }
  
  if (operation === "create") {
    return `--- /dev/null
+++ b/${fileName}
@@ -0,0 +1,20 @@
+// ${fileName}
+// Created as part of implementing ticket requirements
+// Date: ${timestamp}
+
+import React from "react";
+
+interface Props {
+  children?: React.ReactNode;
+}
+
+export function ${fileName.split(".")[0]}({ children }: Props) {
+  return (
+    <div className="p-4">
+      <h2 className="text-xl font-bold">New Component: ${fileName.split(".")[0]}</h2>
+      <div className="mt-4">
+        {children}
+      </div>
+    </div>
+  );
+}`;
  }
  
  // For modify operation
  return `--- a/${fileName}
+++ b/${fileName}
@@ -1,5 +1,7 @@
 // ${fileName}
-// Original implementation
+// Modified as part of implementing ticket requirements
+// Date: ${timestamp}
+// Changes: Added new features and improved functionality
 
 import React from "react";
 import { useState } from "react";
@@ -8,12 +10,19 @@
   children?: React.ReactNode;
 }
 
-export function ${fileName.split(".")[0]}({ children }: Props) {
+export function ${fileName.split(".")[0]}({ children }: Props) {
+  const [isExpanded, setIsExpanded] = useState(false);
+
+  const handleToggle = () => {
+    setIsExpanded(!isExpanded);
+  };
+
   return (
     <div className="p-4">
       <h2 className="text-xl font-bold">${fileName.split(".")[0]}</h2>
+      <button onClick={handleToggle} className="mt-2 px-3 py-1 bg-blue-600 rounded">
+        {isExpanded ? "Collapse" : "Expand"}
+      </button>
       <div className="mt-4">
         {children}
       </div>
@@ -21,3 +30,8 @@
   );
 }`;
}

export function getMockDiffForFile(filePath: string, operation: "create" | "modify" | "delete"): CodeDiff {
  return generateMockDiff({ filePath, operation });
}

export function getMockDiffsForChanges(
  changes: Array<{ filePath: string; operation: "create" | "modify" | "delete" }>
): Record<string, CodeDiff> {
  const result: Record<string, CodeDiff> = {};
  
  for (const change of changes) {
    result[change.filePath] = getMockDiffForFile(change.filePath, change.operation);
  }
  
  return result;
}