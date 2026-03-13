import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getGithubEnv } from "./env.js";

const ghEnv = getGithubEnv();

const server = new Server(
  { name: "tedu-github-connector", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

const GH_API = "https://api.github.com";

// ─── Git CLI helper ────────────────────────────────────────────────────────────────

const execFileAsync = promisify(execFile);

async function execGit(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

// ─── Worktree helpers ─────────────────────────────────────────────────────────

/** Maps a branch name to an isolated worktree directory. */
function resolveWorktreeDir(branchName: string): string {
  const sanitized = branchName.replace(/[/\\:*?"<>|]/g, "-");
  return path.join(ghEnv.WORKSPACE_DIR, "worktrees", sanitized);
}

/**
 * Ensures the main bare clone exists at {WORKSPACE_DIR}/{GITHUB_REPO}.
 * Race-safe: a `.cloning` sentinel file prevents two parallel agents from
 * both attempting the initial clone simultaneously.
 */
async function ensureMainClone(base: string): Promise<string> {
  const repoDir = path.join(ghEnv.WORKSPACE_DIR, ghEnv.GITHUB_REPO);
  const repoUrl = `https://x-access-token:${ghEnv.GITHUB_TOKEN}@github.com/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}.git`;
  const sentinelPath = path.join(ghEnv.WORKSPACE_DIR, ".cloning");

  const isCloned = await fs.access(path.join(repoDir, ".git")).then(() => true).catch(() => false);
  if (isCloned) {
    // Fetch latest remote state (git fetch is safe to run concurrently)
    await execGit(["fetch", "origin", base], repoDir);
    return repoDir;
  }

  // Wait if another parallel process is currently cloning (up to 30 s)
  for (let i = 0; i < 15; i++) {
    const cloning = await fs.access(sentinelPath).then(() => true).catch(() => false);
    if (!cloning) break;
    await new Promise<void>((r) => setTimeout(r, 2000));
  }

  // Re-check after waiting
  const nowCloned = await fs.access(path.join(repoDir, ".git")).then(() => true).catch(() => false);
  if (nowCloned) {
    await execGit(["fetch", "origin", base], repoDir);
    return repoDir;
  }

  // We are the first — perform the clone
  await fs.mkdir(ghEnv.WORKSPACE_DIR, { recursive: true });
  await fs.writeFile(sentinelPath, Date.now().toString(), "utf-8");
  try {
    await execGit(["clone", "--branch", base, repoUrl, repoDir]);
  } finally {
    await fs.unlink(sentinelPath).catch(() => {});
  }
  return repoDir;
}

const HEADERS = {
  Authorization: `Bearer ${ghEnv.GITHUB_TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

// ─── Tool Definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_branch",
      description: "Create a new Git branch in the repository.",
      inputSchema: {
        type: "object",
        properties: {
          branchName: { type: "string", description: "New branch name" },
          baseBranch: {
            type: "string",
            description: "Branch to base from (optional, defaults to main)",
          },
        },
        required: ["branchName"],
      },
    },
    {
      name: "commit_files",
      description: "Commit one or more files to a branch using the Git Data API.",
      inputSchema: {
        type: "object",
        properties: {
          branchName: { type: "string" },
          message: { type: "string", description: "Conventional commit message" },
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" },
              },
            },
          },
        },
        required: ["branchName", "message", "files"],
      },
    },
    {
      name: "create_pull_request",
      description: "Open a GitHub Pull Request.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string", description: "PR description in Markdown" },
          headBranch: { type: "string" },
          baseBranch: { type: "string", description: "Target branch (optional)" },
          draft: { type: "boolean" },
        },
        required: ["title", "body", "headBranch"],
      },
    },
    {
      name: "get_pull_request_status",
      description: "Get the current status of a Pull Request.",
      inputSchema: {
        type: "object",
        properties: {
          prNumber: { type: "number" },
        },
        required: ["prNumber"],
      },
    },
    {
      name: "merge_pull_request",
      description: "Merge an approved Pull Request into the base branch.",
      inputSchema: {
        type: "object",
        properties: {
          prNumber: { type: "number" },
          commitTitle: { type: "string", description: "Merge commit title (optional)" },
          mergeMethod: {
            type: "string",
            enum: ["merge", "squash", "rebase"],
            description: "Merge strategy (default: squash)",
          },
        },
        required: ["prNumber"],
      },
    },
    {
      name: "deploy_to_staging",
      description:
        "Trigger a staging deployment by dispatching a repository_dispatch event. The CI pipeline must handle the 'deploy-staging' event type.",
      inputSchema: {
        type: "object",
        properties: {
          branchName: { type: "string", description: "Branch to deploy" },
          ticketId: { type: "string" },
        },
        required: ["branchName", "ticketId"],
      },
    },
    {
      name: "run_tests",
      description:
        "Trigger the test suite via a repository_dispatch event and poll for the workflow result.",
      inputSchema: {
        type: "object",
        properties: {
          branchName: { type: "string" },
          testCommand: {
            type: "string",
            description: "Test command to run (e.g. 'pnpm test')",
          },
        },
        required: ["branchName"],
      },
    },
    {
      name: "check_endpoints",
      description: "Smoke-test HTTP endpoints on the staging URL.",
      inputSchema: {
        type: "object",
        properties: {
          stagingUrl: { type: "string", description: "Base URL of the staging environment" },
          paths: {
            type: "array",
            items: { type: "string" },
            description: "URL paths to check, e.g. [\"/health\", \"/api/status\"]",
          },
        },
        required: ["stagingUrl", "paths"],
      },
    },
    {
      name: "inspect_repository_structure",
      description:
        "Inspect repository directory structure from the configured base branch. Useful for architecture analysis before implementation.",
      inputSchema: {
        type: "object",
        properties: {
          maxDepth: {
            type: "number",
            description: "Maximum directory depth to scan (default 3)",
          },
          maxEntries: {
            type: "number",
            description: "Maximum number of paths to return (default 200)",
          },
          baseBranch: {
            type: "string",
            description: "Branch to inspect (optional, defaults to GITHUB_BASE_BRANCH)",
          },
        },
        required: [],
      },
    },
    {
      name: "read_repository_file",
      description:
        "Read a text file from the repository at the configured base branch. Useful for architectural context and design proposals.",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Repository-relative path to read, e.g. packages/agents/src/graph.ts",
          },
          baseBranch: {
            type: "string",
            description: "Branch to inspect (optional, defaults to GITHUB_BASE_BRANCH)",
          },
          maxChars: {
            type: "number",
            description: "Maximum characters to return (default 12000)",
          },
        },
        required: ["filePath"],
      },
    },
  ],
}));

// ─── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "create_branch") {
      const { branchName, baseBranch } = z
        .object({ branchName: z.string(), baseBranch: z.string().optional() })
        .parse(args);

      const base = baseBranch ?? ghEnv.GITHUB_BASE_BRANCH;
      const repoDir = await ensureMainClone(base);
      const wtDir = resolveWorktreeDir(branchName);

      // Remove stale worktree from a previous run (safe on retries)
      const staleWt = await fs.access(wtDir).then(() => true).catch(() => false);
      if (staleWt) {
        await execGit(["worktree", "remove", "--force", wtDir], repoDir).catch(() => {});
        await fs.rm(wtDir, { recursive: true, force: true }).catch(() => {});
      }

      // Create an isolated working tree for this branch
      // -B creates the branch if it doesn't exist, or resets it if it does
      await execGit(["worktree", "add", "-B", branchName, wtDir, `origin/${base}`], repoDir);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ branchName, worktreeDir: wtDir }),
          },
        ],
      };
    }

    if (name === "commit_files") {
      const { branchName, message, files } = z
        .object({
          branchName: z.string(),
          message: z.string(),
          files: z.array(z.object({ path: z.string(), content: z.string() })),
        })
        .parse(args);

      // Use this branch's isolated worktree; fall back to main clone if worktree
      // was never created (e.g. branch already existed before this agent run).
      const wtDir = resolveWorktreeDir(branchName);
      const repoDir = path.join(ghEnv.WORKSPACE_DIR, ghEnv.GITHUB_REPO);
      const targetDir = await fs.access(wtDir).then(() => wtDir).catch(() => repoDir);

      // Write files to the isolated working tree
      for (const file of files) {
        const target = path.join(targetDir, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, file.content, "utf-8");
      }

      // Stage all changes, commit, and push
      await execGit(["add", "-A"], targetDir);
      await execGit(
        ["-c", "user.name=TEDU Agent", "-c", "user.email=agent@tedu.dev", "commit", "-m", message],
        targetDir,
      );
      await execGit(["push", "origin", branchName], targetDir);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ filesCommitted: files.length, branchName }),
          },
        ],
      };
    }

    if (name === "create_pull_request") {
      const { title, body, headBranch, baseBranch, draft } = z
        .object({
          title: z.string(),
          body: z.string(),
          headBranch: z.string(),
          baseBranch: z.string().optional(),
          draft: z.boolean().optional(),
        })
        .parse(args);

      const resp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/pulls`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            title,
            body,
            head: headBranch,
            base: baseBranch ?? ghEnv.GITHUB_BASE_BRANCH,
            draft: draft ?? false,
          }),
        },
      );
      if (!resp.ok) {
        const err = (await resp.json()) as { message: string };
        throw new Error(err.message);
      }
      const pr = (await resp.json()) as { number: number; html_url: string };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ number: pr.number, html_url: pr.html_url }),
          },
        ],
      };
    }

    if (name === "get_pull_request_status") {
      const { prNumber } = z.object({ prNumber: z.number() }).parse(args);
      const resp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/pulls/${prNumber}`,
        { headers: HEADERS },
      );
      const pr = (await resp.json()) as {
        number: number;
        html_url: string;
        state: string;
        merged: boolean;
        title: string;
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              number: pr.number,
              url: pr.html_url,
              state: pr.state,
              merged: pr.merged,
              title: pr.title,
            }),
          },
        ],
      };
    }

    if (name === "merge_pull_request") {
      const { prNumber, commitTitle, mergeMethod } = z
        .object({
          prNumber: z.number(),
          commitTitle: z.string().optional(),
          mergeMethod: z.enum(["merge", "squash", "rebase"]).optional(),
        })
        .parse(args);

      // Fetch PR info first so we can clean up the worktree after merge
      let headBranch: string | null = null;
      try {
        const prInfoResp = await fetch(
          `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/pulls/${prNumber}`,
          { headers: HEADERS },
        );
        if (prInfoResp.ok) {
          const prInfo = (await prInfoResp.json()) as { head: { ref: string } };
          headBranch = prInfo.head.ref;
        }
      } catch { /* best-effort */ }

      const resp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/pulls/${prNumber}/merge`,
        {
          method: "PUT",
          headers: HEADERS,
          body: JSON.stringify({
            commit_title: commitTitle,
            merge_method: mergeMethod ?? "squash",
          }),
        },
      );
      if (!resp.ok) {
        const err = (await resp.json()) as { message: string };
        throw new Error(err.message);
      }
      const result = (await resp.json()) as { sha: string; merged: boolean; message: string };

      // Clean up isolated worktree (best-effort — don't fail the merge if this errors)
      if (headBranch) {
        try {
          const repoDir = path.join(ghEnv.WORKSPACE_DIR, ghEnv.GITHUB_REPO);
          const wtDir = resolveWorktreeDir(headBranch);
          const wtExists = await fs.access(wtDir).then(() => true).catch(() => false);
          if (wtExists) {
            await execGit(["worktree", "remove", "--force", wtDir], repoDir).catch(() => {});
            await fs.rm(wtDir, { recursive: true, force: true }).catch(() => {});
          }
        } catch { /* best-effort */ }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              merged: result.merged,
              mergeCommitSha: result.sha,
              releasedAt: new Date().toISOString(),
            }),
          },
        ],
      };
    }

    if (name === "deploy_to_staging") {
      const { branchName, ticketId } = z
        .object({ branchName: z.string(), ticketId: z.string() })
        .parse(args);

      // Dispatch a repository_dispatch event; CI must handle 'deploy-staging'
      const resp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/dispatches`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            event_type: "deploy-staging",
            client_payload: { branch: branchName, ticketId },
          }),
        },
      );
      // GitHub returns 204 No Content on success
      if (resp.status !== 204 && !resp.ok) {
        throw new Error(`Dispatch failed with ${resp.status}`);
      }
      const stagingUrl =
        process.env["STAGING_BASE_URL"] ??
        `https://staging-${branchName.replace(/[^a-z0-9]/gi, "-")}.example.com`;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ dispatched: true, stagingUrl }),
          },
        ],
      };
    }

    if (name === "run_tests") {
      const { branchName, testCommand } = z
        .object({ branchName: z.string(), testCommand: z.string().optional() })
        .parse(args);

      // Dispatch test workflow; real CI integration runs actual tests
      const resp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/dispatches`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            event_type: "run-tests",
            client_payload: { branch: branchName, testCommand: testCommand ?? "pnpm test" },
          }),
        },
      );
      if (resp.status !== 204 && !resp.ok) {
        throw new Error(`Test dispatch failed with ${resp.status}`);
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              dispatched: true,
              branch: branchName,
              testCommand: testCommand ?? "pnpm test",
              note: "Test workflow dispatched. Check GitHub Actions for results.",
            }),
          },
        ],
      };
    }

    if (name === "check_endpoints") {
      const { stagingUrl, paths } = z
        .object({ stagingUrl: z.string().url(), paths: z.array(z.string()) })
        .parse(args);

      const results = await Promise.all(
        paths.map(async (path) => {
          const url = `${stagingUrl.replace(/\/$/, "")}${path}`;
          try {
            const resp = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
            return { path, status: resp.status, ok: resp.ok };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { path, status: 0, ok: false, error: msg };
          }
        }),
      );

      const allOk = results.every((r) => r.ok);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ allOk, results }),
          },
        ],
      };
    }

    if (name === "inspect_repository_structure") {
      const { maxDepth, maxEntries, baseBranch } = z
        .object({
          maxDepth: z.number().int().min(1).max(10).optional(),
          maxEntries: z.number().int().min(10).max(1000).optional(),
          baseBranch: z.string().optional(),
        })
        .parse(args ?? {});

      const base = baseBranch ?? ghEnv.GITHUB_BASE_BRANCH;
      const repoDir = await ensureMainClone(base);
      const depthLimit = maxDepth ?? 3;
      const entryLimit = maxEntries ?? 200;
      const entries: string[] = [];

      async function walk(currentDir: string, relativeDir: string, depth: number): Promise<void> {
        if (depth > depthLimit || entries.length >= entryLimit) return;

        const items = await fs.readdir(currentDir, { withFileTypes: true });
        for (const item of items) {
          if (entries.length >= entryLimit) break;
          if (item.name === ".git" || item.name === "node_modules" || item.name === ".next") continue;

          const rel = relativeDir ? `${relativeDir}/${item.name}` : item.name;
          if (item.isDirectory()) {
            entries.push(`${rel}/`);
            await walk(path.join(currentDir, item.name), rel, depth + 1);
          } else {
            entries.push(rel);
          }
        }
      }

      await walk(repoDir, "", 1);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              repository: `${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}`,
              baseBranch: base,
              maxDepth: depthLimit,
              totalEntries: entries.length,
              entries,
            }),
          },
        ],
      };
    }

    if (name === "read_repository_file") {
      const { filePath, baseBranch, maxChars } = z
        .object({
          filePath: z.string().min(1),
          baseBranch: z.string().optional(),
          maxChars: z.number().int().min(500).max(200000).optional(),
        })
        .parse(args);

      const base = baseBranch ?? ghEnv.GITHUB_BASE_BRANCH;
      const repoDir = await ensureMainClone(base);
      const normalized = path.normalize(filePath).replace(/^([.][\/])+/, "");
      const target = path.resolve(repoDir, normalized);

      if (!target.startsWith(path.resolve(repoDir))) {
        throw new Error("Invalid filePath: path traversal is not allowed");
      }

      const stat = await fs.stat(target).catch(() => null);
      if (!stat || !stat.isFile()) {
        throw new Error(`File not found: ${filePath}`);
      }

      const limit = maxChars ?? 12_000;
      const raw = await fs.readFile(target, "utf-8");
      const truncated = raw.length > limit;
      const content = truncated ? `${raw.slice(0, limit)}\n\n...[truncated]` : raw;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              filePath: normalized.replace(/\\/g, "/"),
              baseBranch: base,
              truncated,
              content,
            }),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `[Error] ${name}: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
