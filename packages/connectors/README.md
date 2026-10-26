# Remote Connector Gateway

**Status:** 📋 Planned  ·  **Plan name:** Remote Connector Gateway  ·  **Milestone:** M4

Connects OpenLobs to other services (GitHub, Google Workspace, Slack, Notion, Linear and many more) through their official integrations, MCP servers or a connector platform such as Composio, with one permission model.

## What exists today

Nothing. The registry of candidate servers and the build order are in the owner's notes (`docs/blueprint-*`), including which are covered by Composio and which are gaps.

## Responsibilities

- Manage connections and authorisation per person and per workspace
- Validate tool inputs, apply rate limits, normalise errors
- Record execution metadata
- Keep credentials in a vault, never in prompts or the browser

## Interface (proposed, not implemented)

```ts
// Proposed.
interface Connector { id: string; kind: 'mcp' | 'api' | 'platform'; connect(userId: string): Promise<AuthStart>; tools(userId: string): Promise<ToolEntry[]>; call(userId: string, tool: string, input: unknown): Promise<unknown> }
```

## Depends on

- packages/mcp
- packages/security
- packages/tool-registry

## Security notes

- Two-tier credentials: a stored token record per person and provider, and short-lived sessions that never expose the raw provider token.
- Per-tenant isolation at the gateway.
- Envelope encryption for stored tokens.

## Done when

- [ ] GitHub, Google Workspace and Slack work end to end for one person
- [ ] Revoking a connection removes access immediately
- [ ] A read-only scheduled job runs through the gateway

## Not in scope

- Building every integration ourselves

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
