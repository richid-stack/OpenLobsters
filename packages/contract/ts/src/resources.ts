import { z } from "zod";
const o = <S extends z.ZodRawShape>(s: S) => z.object(s).strict();
const id = z.string().min(1);

export const Risk = z.enum(["read", "write", "send", "delete"]);
export const Tool = o({
  id, name: z.string(), description: z.string(), inputSchema: z.record(z.unknown()),
  permissions: z.array(z.string()), risk: Risk, requiresApproval: z.boolean(),
  executionType: z.enum(["external_api", "mcp", "sandbox", "local"]),
  provider: z.string().optional(), version: z.string().optional(),
});
export const Skill = o({
  id, name: z.string(), description: z.string(), version: z.string(),
  source: o({ repo: z.string(), commit: z.string(), path: z.string() }),
  tools: z.array(z.string()), permissions: z.array(z.string()), files: z.array(z.string()),
  license: z.string().optional(),
});
export const Library = o({
  id, name: z.string(), description: z.string(), language: z.enum(["js", "ts", "python", "other"]),
  package: o({ registry: z.enum(["npm", "pypi"]), name: z.string(), version: z.string() }).optional(),
  repo: z.string().optional(), license: z.string().optional(), dependencies: z.array(z.string()),
  minRuntime: z.string().optional(),
  compat: o({ status: z.enum(["untested", "passing", "failing"]), checkedAt: z.string().optional() }),
});
export const McpServer = o({
  id, name: z.string(), url: z.string(), transport: z.enum(["http", "sse", "stdio"]),
  auth: z.enum(["none", "oauth", "key"]), status: z.enum(["connected", "disconnected", "error"]),
  tools: z.array(z.string()),
});
export const WorkflowStep = o({
  id, kind: z.enum(["tool", "skill", "agent", "approval"]), ref: z.string(),
  inputs: z.record(z.unknown()), dependsOn: z.array(z.string()),
  retry: o({ max: z.number().int().nonnegative() }).optional(), timeoutMs: z.number().int().positive().optional(),
});
export const Workflow = o({ id, name: z.string(), version: z.string(), steps: z.array(WorkflowStep).min(1) });
export const Agent = o({ id, name: z.string(), role: z.string(), instructions: z.string(), tools: z.array(z.string()), icon: z.string().optional() });
export const Project = o({
  id, name: z.string(), instructions: z.string().optional(),
  files: z.array(o({ id, name: z.string(), bytes: z.number().int().nonnegative() })), chatIds: z.array(z.string()),
});
export const Memory = o({ id, text: z.string(), scope: z.enum(["user", "project"]), createdAt: z.string() });
export const Permission = o({
  subject: z.string(), tool: z.string(), mode: z.enum(["ask", "allow", "deny"]),
  scope: z.enum(["global", "project", "chat"]),
});
export const Run = o({
  id, chatId: z.string(), messageId: z.string(), engine: z.enum(["live", "demo", "replay"]),
  startedAt: z.string(), endedAt: z.string().optional(),
  usage: o({ inputTokens: z.number().int(), outputTokens: z.number().int(), calls: z.number().int() }).optional(),
});
const Ref = o({ type: z.enum(["library", "skill", "tool", "mcp", "workflow", "agent"]), id });
export const Relationship = o({ from: Ref, to: Ref, kind: z.enum(["depends_on", "uses", "exposes", "requires"]) });

export const resourceSchemas = { tool: Tool, skill: Skill, library: Library, mcp: McpServer, workflow: Workflow, agent: Agent, project: Project, memory: Memory, permission: Permission, run: Run, relationship: Relationship } as const;
