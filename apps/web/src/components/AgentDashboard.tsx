"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import LogStream from "./LogStream";
import { useAgentStream } from "@/lib/useAgentStream";

export default function AgentDashboard() {
  const [inputTicketId, setInputTicketId] = useState("");
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const {
    phase,
    plan,
    codeChanges,
    prUrl,
    branchName,
    stagingUrl,
    prNumber,
    testResults,
    interrupted,
    interruptMessage,
    isRunning,
    logs,
    start,
    resume,
  } = useAgentStream(submittedTicketId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = inputTicketId.trim();
    if (!id) return;
    setSubmittedTicketId(id);
    setTimeout(start, 0);
  };

  return (
    <div className="space-y-6">
      {/* ── Input Form ── */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-3 items-center bg-gray-900 border border-gray-700 rounded-lg p-4"
      >
        <input
          type="text"
          placeholder="Jira Ticket ID (e.g. TEDU-42)"
          value={inputTicketId}
          onChange={(e) => setInputTicketId(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isRunning}
        />
        <button
          type="submit"
          disabled={isRunning || !inputTicketId.trim()}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-md transition-colors"
        >
          {isRunning ? "Running…" : "Run Agent"}
        </button>
      </form>

      {/* ── Status Bar ── */}
      {submittedTicketId && (
        <div className="flex items-center gap-4 flex-wrap">
          <StatusBadge phase={phase} />
          {branchName && (
            <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono">
              branch: {branchName}
            </span>
          )}
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              Open PR ↗
            </a>
          )}
        </div>
      )}

      {/* ── Development Plan ── */}
      {plan.length > 0 && (
        <section className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            📋 Development Plan
          </h2>
          <ol className="space-y-1.5 list-decimal list-inside">
            {plan.map((task, i) => (
              <li key={i} className="text-sm text-gray-200">
                {task}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Code Changes ── */}
      {codeChanges.length > 0 && (
        <section className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            💻 Code Changes ({codeChanges.length} files)
          </h2>
          <ul className="space-y-1">
            {codeChanges.map((change, i) => (
              <li key={i} className="flex items-center gap-2 text-sm font-mono">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    change.operation === "create"
                      ? "bg-green-900 text-green-300"
                      : change.operation === "delete"
                        ? "bg-red-900 text-red-300"
                        : "bg-yellow-900 text-yellow-300"
                  }`}
                >
                  {change.operation}
                </span>
                <span className="text-gray-300">{change.filePath}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Test Results ── */}
      {testResults && (
        <section
          className={`border rounded-lg p-4 ${
            testResults.passed
              ? "bg-green-950 border-green-700"
              : "bg-red-950 border-red-700"
          }`}
        >
          <h2
            className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              testResults.passed ? "text-green-400" : "text-red-400"
            }`}
          >
            {testResults.passed ? "✅ Tests Passed" : "❌ Tests Failed"}
          </h2>
          <p
            className={`text-sm mb-3 ${
              testResults.passed ? "text-green-200" : "text-red-200"
            }`}
          >
            {testResults.summary}
          </p>
          <div className="flex flex-wrap gap-4 text-xs mb-3">
            {testResults.coveragePercent !== null && (
              <span
                className={`px-2 py-1 rounded font-mono ${
                  testResults.coveragePercent >= 80
                    ? "bg-green-900 text-green-300"
                    : "bg-yellow-900 text-yellow-300"
                }`}
              >
                Coverage: {testResults.coveragePercent}%
              </span>
            )}
            {(testResults.stagingUrl ?? stagingUrl) && (
              <a
                href={(testResults.stagingUrl ?? stagingUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded bg-blue-900 text-blue-300 hover:underline font-mono"
              >
                Staging ↗
              </a>
            )}
          </div>
          {testResults.failedTests.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-semibold mb-1">Failed tests:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {testResults.failedTests.map((t, i) => (
                  <li key={i} className="text-xs text-red-300 font-mono">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Human Review Panel ── */}
      {interrupted && (
        <section className="bg-orange-950 border border-orange-700 rounded-lg p-5">
          <h2 className="text-sm font-bold text-orange-300 mb-1">
            ⏸ Approve Production Deploy
          </h2>
          <p className="text-xs text-orange-400 mb-3">
            Tests passed. Approve to merge the PR and deploy to production.
          </p>
          <p className="text-sm text-orange-200 mb-4">{interruptMessage}</p>
          <div className="flex flex-wrap gap-3 mb-4">
            {prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 underline"
              >
                View PR {prNumber ? `#${prNumber}` : ""} ↗
              </a>
            )}
            {(testResults?.stagingUrl ?? stagingUrl) && (
              <a
                href={(testResults?.stagingUrl ?? stagingUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-400 underline"
              >
                View Staging ↗
              </a>
            )}
          </div>
          {testResults && (
            <p className="text-xs text-green-300 mb-4">
              ✓ {testResults.summary}
              {testResults.coveragePercent !== null &&
                ` — Coverage: ${testResults.coveragePercent}%`}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => resume(true)}
              className="px-5 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-md transition-colors"
            >
              ✅ Approve & Deploy to Production
            </button>
            <button
              onClick={() => resume(false)}
              className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-md transition-colors"
            >
              ❌ Reject (Rework)
            </button>
          </div>
        </section>
      )}

      {/* ── Live Log Stream ── */}
      {logs.length > 0 && <LogStream entries={logs} />}
    </div>
  );
}
