import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const server = new Server(
  { name: "tedu-filesystem-connector", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

const PROJECT_ROOT = process.cwd();

// ─── Security: path traversal guard ──────────────────────────────────────────

function safePath(filePath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, filePath);
  if (!resolved.startsWith(PROJECT_ROOT + path.sep) && resolved !== PROJECT_ROOT) {
    throw new Error(
      `Path traversal detected: "${filePath}" escapes the project root.`,
    );
  }
  return resolved;
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "read_file",
      description: "Read the contents of a file (relative to project root).",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path" },
        },
        required: ["path"],
      },
    },
    {
      name: "write_file",
      description:
        "Write content to a file, creating parent directories if needed.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
    {
      name: "list_directory",
      description: "List files and directories under a path.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          recursive: { type: "boolean", description: "Recurse into sub-directories" },
        },
        required: ["path"],
      },
    },
    {
      name: "delete_file",
      description: "Delete a file.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
    },
  ],
}));

// ─── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "read_file") {
      const { path: filePath } = z.object({ path: z.string() }).parse(args);
      const content = await fs.readFile(safePath(filePath), "utf-8");
      return { content: [{ type: "text" as const, text: content }] };
    }

    if (name === "write_file") {
      const { path: filePath, content } = z
        .object({ path: z.string(), content: z.string() })
        .parse(args);
      const target = safePath(filePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf-8");
      return {
        content: [{ type: "text" as const, text: `Written: ${filePath}` }],
      };
    }

    if (name === "list_directory") {
      const { path: dirPath, recursive } = z
        .object({ path: z.string(), recursive: z.boolean().optional() })
        .parse(args);

      async function listDir(dir: string, depth: number): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const results: string[] = [];
        for (const entry of entries) {
          const rel = path.relative(PROJECT_ROOT, path.join(dir, entry.name));
          results.push(entry.isDirectory() ? `${rel}/` : rel);
          if (recursive && entry.isDirectory() && depth < 5) {
            results.push(...(await listDir(path.join(dir, entry.name), depth + 1)));
          }
        }
        return results;
      }

      const files = await listDir(safePath(dirPath), 0);
      return { content: [{ type: "text" as const, text: files.join("\n") }] };
    }

    if (name === "delete_file") {
      const { path: filePath } = z.object({ path: z.string() }).parse(args);
      await fs.unlink(safePath(filePath));
      return {
        content: [{ type: "text" as const, text: `Deleted: ${filePath}` }],
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
