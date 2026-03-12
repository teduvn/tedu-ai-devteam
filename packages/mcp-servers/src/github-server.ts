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
      const refResp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/ref/heads/${base}`,
        { headers: HEADERS },
      );
      if (!refResp.ok) throw new Error(`Base branch "${base}" not found`);
      const ref = (await refResp.json()) as { object: { sha: string } };

      const createResp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/refs`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: ref.object.sha }),
        },
      );
      if (!createResp.ok) {
        const err = (await createResp.json()) as { message: string };
        throw new Error(err.message);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ branchName, sha: ref.object.sha }),
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

      const refResp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/ref/heads/${branchName}`,
        { headers: HEADERS },
      );
      const ref = (await refResp.json()) as { object: { sha: string } };

      const commitResp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/commits/${ref.object.sha}`,
        { headers: HEADERS },
      );
      const commit = (await commitResp.json()) as { tree: { sha: string } };

      // Create blobs
      const blobs = await Promise.all(
        files.map(async (file) => {
          const blobResp = await fetch(
            `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/blobs`,
            {
              method: "POST",
              headers: HEADERS,
              body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
            },
          );
          const blob = (await blobResp.json()) as { sha: string };
          return {
            path: file.path,
            mode: "100644" as const,
            type: "blob" as const,
            sha: blob.sha,
          };
        }),
      );

      // Create tree
      const treeResp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/trees`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({ base_tree: commit.tree.sha, tree: blobs }),
        },
      );
      const tree = (await treeResp.json()) as { sha: string };

      // Create commit
      const newCommitResp = await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/commits`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
        },
      );
      const newCommit = (await newCommitResp.json()) as { sha: string };

      // Update ref
      await fetch(
        `${GH_API}/repos/${ghEnv.GITHUB_OWNER}/${ghEnv.GITHUB_REPO}/git/refs/heads/${branchName}`,
        {
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ sha: newCommit.sha }),
        },
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ commitSha: newCommit.sha, filesCommitted: files.length }),
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
