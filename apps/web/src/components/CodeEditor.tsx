"use client";

import { useState, useEffect, useRef } from "react";

interface CodeEditorProps {
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (content: string) => void;
}

export default function CodeEditor({
  initialContent = "",
  language = "typescript",
  readOnly = false,
  onChange
}: CodeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  };

  const handleCopy = async () => {
    if (!content.trim()) return;
    
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text to clipboard:", error);
    }
  };

  const lines = content.split("\n").length;
  const lineNumbers = Array.from({ length: lines }, (_, index) => index + 1);

  const isCopyDisabled = readOnly && !content.trim();

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={isCopyDisabled}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            isCopied
              ? "bg-green-700 text-green-100"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          } ${isCopyDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isCopied ? "Copied! ✓" : "Copy"}
        </button>
      </div>
      
      <div className="flex font-mono text-sm">
        {/* Line numbers */}
        <div className="bg-gray-800 text-gray-500 text-right py-2 select-none overflow-hidden">
          {lineNumbers.map((lineNumber) => (
            <div
              key={lineNumber}
              className="px-3 min-h-[1.5em] leading-6"
              style={{ lineHeight: "1.5em" }}
            >
              {lineNumber}
            </div>
          ))}
        </div>
        
        {/* Code content */}
        <div className="flex-1 overflow-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            readOnly={readOnly}
            spellCheck="false"
            className="w-full h-full bg-transparent text-gray-100 px-4 py-2 outline-none resize-none min-h-[300px] font-mono whitespace-pre overflow-auto"
            style={{ 
              fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
              lineHeight: "1.5em",
              tabSize: 2
            }}
            wrap="off"
          />
        </div>
      </div>
      
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-500">
        {content.length} characters • {lines} lines
      </div>
    </div>
  );
}