"use client";

import type { CodeDiff as CodeDiffType, FileOperation } from "@/types/agent-workflow";

interface CodeDiffViewerProps {
  diff: CodeDiffType;
}

export default function CodeDiffViewer({ diff }: CodeDiffViewerProps) {
  const lines = diff.diff.split("\n");
  
  const getLineType = (line: string): "added" | "removed" | "context" => {
    if (line.startsWith("+") && !line.startsWith("+++")) return "added";
    if (line.startsWith("-") && !line.startsWith("---")) return "removed";
    return "context";
  };

  const getLineContent = (line: string): string => {
    if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
      return line.substring(1);
    }
    return line;
  };

  const getLineNumber = (index: number, lines: string[]): number => {
    let lineNumber = 1;
    for (let i = 0; i <= index; i++) {
      const line = lines[i];
      if (line.startsWith("@@")) {
        // Parse the hunk header: @@ -start,count +start,count @@
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          const [, oldStart, , newStart] = match;
          lineNumber = parseInt(newStart, 10) - 1;
        }
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        // Added line - increment new line number
        lineNumber++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        // Removed line - don't increment new line number
        continue;
      } else if (line.startsWith(" ") || !line.startsWith("@")) {
        // Context line - increment both
        lineNumber++;
      }
    }
    return lineNumber;
  };

  const getOperationColor = (operation: FileOperation): string => {
    switch (operation) {
      case "create":
        return "bg-green-900 text-green-300";
      case "modify":
        return "bg-yellow-900 text-yellow-300";
      case "delete":
        return "bg-red-900 text-red-300";
      default:
        return "bg-gray-700 text-gray-300";
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${getOperationColor(diff.operation)}`}>
              {diff.operation}
            </span>
            <span className="text-xs text-gray-400 font-mono truncate max-w-md">
              {diff.filePath}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {diff.language}
        </span>
      </div>
      
      <div className="flex font-mono text-sm overflow-auto max-h-[500px]">
        {/* Line numbers */}
        <div className="bg-gray-800 text-gray-500 text-right py-2 select-none sticky left-0">
          {lines.map((line, index) => {
            if (line.startsWith("@") || line.startsWith("---") || line.startsWith("+++")) {
              return (
                <div
                  key={index}
                  className="px-3 min-h-[1.5em] leading-6 text-gray-600"
                  style={{ lineHeight: "1.5em" }}
                >
                  ·
                </div>
              );
            }
            const lineNumber = getLineNumber(index, lines);
            return (
              <div
                key={index}
                className="px-3 min-h-[1.5em] leading-6"
                style={{ lineHeight: "1.5em" }}
              >
                {lineNumber}
              </div>
            );
          })}
        </div>
        
        {/* Diff content */}
        <div className="flex-1">
          {lines.map((line, index) => {
            const type = getLineType(line);
            const content = getLineContent(line);
            
            return (
              <div
                key={index}
                className={`flex min-h-[1.5em] leading-6 px-4 ${
                  type === "added" ? "bg-green-950/30" :
                  type === "removed" ? "bg-red-950/30" :
                  "bg-transparent"
                }`}
                style={{ lineHeight: "1.5em" }}
              >
                <span className={`mr-2 ${
                  type === "added" ? "text-green-400" :
                  type === "removed" ? "text-red-400" :
                  "text-gray-400"
                }`}>
                  {type === "added" ? "+" : type === "removed" ? "-" : " "}
                </span>
                <span className={`${
                  type === "added" ? "text-green-200" :
                  type === "removed" ? "text-red-200" :
                  "text-gray-100"
                } whitespace-pre`}>
                  {content}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500" />
            <span>Added</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500" />
            <span>Removed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-gray-500" />
            <span>Context</span>
          </div>
          <div className="ml-auto">
            {lines.length} lines
          </div>
        </div>
      </div>
    </div>
  );
}