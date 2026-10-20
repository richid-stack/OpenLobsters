import { z } from "zod";

/** Every event carries these. `seq` is 0-based and gapless within a run. */
const base = {
  v: z.literal(1),
  seq: z.number().int().nonnegative(),
  ts: z.number().int().nonnegative(),
  run: z.string().min(1),
};
const ev = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ ...base, type: z.literal(type), ...shape }).strict();

export const ToolState = z.enum(["input-streaming", "awaiting-approval", "running", "done", "error", "denied"]);
export const AgentState = z.enum(["running", "done", "error"]);
export const Decision = z.enum(["once", "always", "deny"]);

export const Event = z.discriminatedUnion("type", [
  ev("run.start", { engine: z.enum(["live", "demo", "replay"]), model: z.string().optional() }),
  ev("text.delta", { text: z.string() }),
  ev("reasoning.delta", { block: z.string().min(1), text: z.string() }),
  ev("reasoning.end", { block: z.string().min(1), seconds: z.number().nonnegative() }),
  ev("status", { text: z.string().min(1), kind: z.enum(["info", "attention", "error"]).optional() }),
  ev("tool.call", {
    call: z.string().min(1),
    tool: z.string().min(1),
    state: ToolState,
    query: z.string().optional(),
    why: z.string().optional(),
    by: z.string().optional(),
    sources: z.array(z.number().int().positive()).optional(),
    durationMs: z.number().int().nonnegative().optional(),
    error: z.string().optional(),
  }),
  ev("source", {
    n: z.number().int().positive(),
    kind: z.enum(["web", "chat"]),
    title: z.string(),
    domain: z.string(),
    url: z.string().optional(),
    snippet: z.string().optional(),
    date: z.string().optional(),
    query: z.string().optional(),
    by: z.string().optional(),
    chatId: z.string().optional(),
  }),
  ev("team.plan", {
    agents: z.array(z.string().min(1)).min(1),
    stages: z.array(z.array(z.string().min(1)).min(1)).min(1),
    lead: z.string(),
  }),
  ev("agent.update", {
    agent: z.string().min(1),
    state: AgentState,
    task: z.string().optional(),
    message: z.string().optional(),
    findings: z.string().optional(),
    durationMs: z.number().int().nonnegative().optional(),
  }),
  ev("handoff", { from: z.string().min(1), to: z.string().min(1), note: z.string().optional() }),
  ev("approval.request", {
    call: z.string().min(1),
    tool: z.string().min(1),
    query: z.string().optional(),
    why: z.string().optional(),
  }),
  ev("approval.response", { call: z.string().min(1), decision: Decision }),
  ev("usage", {
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    calls: z.number().int().nonnegative(),
    costUsd: z.number().nonnegative().optional(),
  }),
  ev("error", { code: z.string().min(1), message: z.string(), retryable: z.boolean() }),
  ev("run.end", { reason: z.enum(["complete", "stopped", "error"]) }),
]);
export type OlEvent = z.infer<typeof Event>;
export type EventType = OlEvent["type"];

export const parseEvent = (x: unknown): OlEvent => Event.parse(x);
export const parseJsonl = (text: string): OlEvent[] =>
  text.split("\n").filter((l) => l.trim()).map((l) => Event.parse(JSON.parse(l)));

const NEXT: Record<string, string[]> = {
  "": ["input-streaming", "awaiting-approval", "running"],
  "input-streaming": ["awaiting-approval", "running", "error"],
  "awaiting-approval": ["running", "denied"],
  running: ["done", "error"],
  done: [], error: [], denied: [],
};

/** Semantic rules a run must satisfy. Returns a list of problems, empty when valid. */
export function validateRun(events: OlEvent[]): string[] {
  const errs: string[] = [];
  if (!events.length) return ["run is empty"];
  if (events[0].type !== "run.start") errs.push("first event must be run.start");
  if (events[events.length - 1].type !== "run.end") errs.push("last event must be run.end");
  const calls = new Map<string, string>(), asked = new Set<string>(), answered = new Map<string, string>();
  const ended = new Set<string>(), seen = new Set<string>();
  let plan: string[] | null = null, nSrc = 0, last = 0;
  const agentState = new Map<string, string>();
  events.forEach((e, i) => {
    if (e.seq !== i) errs.push(`seq ${e.seq} at position ${i}`);
    if (e.run !== events[0].run) errs.push(`run id changes at seq ${e.seq}`);
    if (e.ts < last) errs.push(`ts goes backwards at seq ${e.seq}`);
    last = e.ts;
    if (e.type === "tool.call") {
      const prev = calls.get(e.call) ?? "";
      if (!NEXT[prev].includes(e.state)) errs.push(`tool ${e.call}: ${prev || "start"} -> ${e.state} is not allowed`);
      if (e.state === "running" && prev === "awaiting-approval") {
        const d = answered.get(e.call);
        if (!d || d === "deny") errs.push(`tool ${e.call} runs without an allowing response`);
      }
      if (e.state === "denied" && answered.get(e.call) !== "deny") errs.push(`tool ${e.call} denied without a deny response`);
      if (e.state === "awaiting-approval" && !prev) seen.add(e.call);
      (e.sources ?? []).forEach((n) => { if (n > nSrc) errs.push(`tool ${e.call} cites source ${n} before it exists`); });
      calls.set(e.call, e.state);
    } else if (e.type === "approval.request") {
      if (calls.get(e.call) !== "awaiting-approval") errs.push(`approval.request for ${e.call} without awaiting-approval`);
      asked.add(e.call);
    } else if (e.type === "approval.response") {
      if (!asked.has(e.call)) errs.push(`approval.response for ${e.call} without a request`);
      answered.set(e.call, e.decision);
    } else if (e.type === "source") {
      if (e.n !== nSrc + 1) errs.push(`source numbering: expected ${nSrc + 1}, got ${e.n}`);
      nSrc = Math.max(nSrc, e.n);
    } else if (e.type === "team.plan") {
      if (plan) errs.push("team.plan appears twice");
      plan = e.agents;
    } else if (e.type === "agent.update") {
      if (plan && !plan.includes(e.agent)) errs.push(`agent ${e.agent} is not in the plan`);
      const p = agentState.get(e.agent);
      if (!p && e.state !== "running") errs.push(`agent ${e.agent} starts as ${e.state}`);
      if (p && p !== "running") errs.push(`agent ${e.agent} updated after ${p}`);
      agentState.set(e.agent, e.state);
    } else if (e.type === "handoff") {
      if (plan && (!plan.includes(e.from) || !plan.includes(e.to))) errs.push("handoff between agents not in the plan");
    } else if (e.type === "reasoning.end") {
      if (ended.has(e.block)) errs.push(`reasoning block ${e.block} ends twice`);
      ended.add(e.block);
    }
  });
  calls.forEach((s, id) => { if (!["done", "error", "denied"].includes(s)) errs.push(`tool ${id} never finished (${s})`); });
  return errs;
}
