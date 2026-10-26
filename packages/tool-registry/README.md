# Tool Registry

**Status:** 🚧 Partly built  ·  **Plan name:** OpenLobs Tool Registry  ·  **Milestone:** M3

The catalogue of what OpenLobs can do. Each tool declares what it is, what it needs, where it runs, how risky it is, and how to check its result.

## What exists today

Two pieces that should become one: `apps/web/shared/toolMeta.ts` (icons, words, where it runs, risk, what to tell the person before approving) and `apps/web/server/tools/` (the actual tools, which exist only for signed-in people when they save files).

## Responsibilities

- Describe every tool: name, schemas, location, authentication, permissions, risk, cost, timeout, platforms, verification, health
- Offer tools to the Orchestrator only when the person is allowed to use them and they are healthy
- Store per-person permissions (allow once, always allow, per tool or per scope)

## Interface (proposed, not implemented)

```ts
// Proposed. Today's ToolMeta is the interface-facing half of this.
type ToolEntry = {
  id: string; description: string; inputSchema: Schema; outputSchema?: Schema
  location: 'server' | 'connector' | 'worker' | 'bridge'; risk: 'read' | 'write' | 'destructive'
  needs: { auth?: string[]; permissions: string[]; platform?: string[] }
  timeoutMs: number; retry?: { max: number }; verify?: VerifierId; health: 'ok' | 'degraded' | 'down'
}
```

## Depends on

- packages/security

## Security notes

- A tool with side effects must never run from a client-supplied approval.
- Permissions are per capability, not global.

## Done when

- [ ] One registry feeds both the server and the interface
- [ ] Permissions are stored and enforced per person
- [ ] A down tool is not offered

## Not in scope

- The tools themselves (they live with their connector or adapter)

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
