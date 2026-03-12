"use client";

import { useState } from "react";

interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
  path: string;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect?: (path: string) => void;
  selectedFile?: string;
}

const FileIcon = ({ type, name }: { type: "file" | "directory"; name: string }) => {
  if (type === "directory") {
    return <span className="text-blue-400">📁</span>;
  }
  
  const extension = name.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    ts: "📄",
    tsx: "⚛️",
    js: "📄",
    jsx: "⚛️",
    json: "📊",
    md: "📝",
    css: "🎨",
    html: "🌐",
    svg: "🖼️",
    png: "🖼️",
    jpg: "🖼️",
    jpeg: "🖼️",
  };
  
  return <span>{iconMap[extension || ""] || "📄"}</span>;
};

const FileTreeNode = ({ 
  node, 
  level = 0, 
  onFileSelect, 
  selectedFile 
}: { 
  node: FileNode;
  level: number;
  onFileSelect?: (path: string) => void;
  selectedFile?: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleClick = () => {
    if (node.type === "directory") {
      setIsExpanded(!isExpanded);
    } else if (onFileSelect) {
      onFileSelect(node.path);
    }
  };

  const isSelected = selectedFile === node.path;

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-800 ${
          isSelected ? "bg-blue-900/30 border-l-2 border-blue-400" : ""
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        {node.type === "directory" && (
          <span className="text-xs text-gray-500 w-4">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
        {node.type === "file" && <span className="w-4" />}
        <FileIcon type={node.type} name={node.name} />
        <span className={`text-sm truncate ${isSelected ? "text-blue-300 font-medium" : "text-gray-300"}`}>
          {node.name}
        </span>
      </div>
      {node.type === "directory" && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileExplorer({ 
  files, 
  onFileSelect, 
  selectedFile 
}: FileExplorerProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden h-full">
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          📁 Project Files
        </h3>
      </div>
      <div className="p-2 overflow-y-auto max-h-[400px]">
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="text-sm">No files to display</p>
          </div>
        ) : (
          files.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              level={0}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))
        )}
      </div>
    </div>
  );
}