import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JsonSchemaProperty {
  type: string;
  description?: string;
  items?: JsonSchemaProperty;
  enum?: string[];
}

interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// ─── JSON Schema → Zod Converter ─────────────────────────────────────────────

function propToZod(prop: JsonSchemaProperty): z.ZodTypeAny {
  switch (prop.type) {
    case "string":
      return prop.enum
        ? z.enum(prop.enum as [string, ...string[]])
        : z.string();
    case "number":
    case "integer":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(prop.items ? propToZod(prop.items) : z.unknown());
    case "object":
      return z.record(z.string(), z.unknown());
    default:
      return z.unknown();
  }
}

function jsonSchemaToZod(schema: JsonSchema): z.ZodObject<z.ZodRawShape> {
  if (!schema.properties) return z.object({});
  const required = schema.required ?? [];
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    let field = propToZod(prop);
    if (!required.includes(key)) field = field.optional();
    shape[key] = field;
  }
  return z.object(shape);
}

// ─── MCP Client Factory ───────────────────────────────────────────────────────

export async function createMCPTools(
  config: MCPServerConfig,
): Promise<{ tools: DynamicStructuredTool[]; client: Client }> {
  const client = new Client({ name: "tedu-agent-client", version: "1.0.0" });

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: config.env,
  });

  await client.connect(transport);

  const { tools } = await client.listTools();

  const langchainTools = tools.map((mcpTool) => {
    const schema = jsonSchemaToZod(mcpTool.inputSchema as JsonSchema);

    return new DynamicStructuredTool({
      name: mcpTool.name,
      description: mcpTool.description ?? mcpTool.name,
      schema,
      func: async (input: Record<string, unknown>) => {
        try {
          const result = await client.callTool({ name: mcpTool.name, arguments: input });
          if (result.isError) {
            const errorMsg = Array.isArray(result.content)
              ? result.content
                  .filter((c) => c.type === "text")
                  .map((c) => (c as { type: "text"; text: string }).text)
                  .join("\n")
              : "Tool returned an error";
            throw new Error(errorMsg);
          }
          const content = result.content;
          if (Array.isArray(content)) {
            return content
              .filter((c) => c.type === "text")
              .map((c) => (c as { type: "text"; text: string }).text)
              .join("\n");
          }
          return JSON.stringify(content);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return `[MCP Error] ${mcpTool.name}: ${msg}`;
        }
      },
    });
  });

  return { tools: langchainTools, client };
}

export async function closeMCPClient(client: Client): Promise<void> {
  await client.close();
}
