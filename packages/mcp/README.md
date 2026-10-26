# MCP client and server

**Status:** 📋 Planned  ·  **Plan name:** MCP integration (blueprint 1, system 4)  ·  **Milestone:** M4

Lets OpenLobs use tools exposed by MCP servers, and expose its own tools as an MCP server.

## What exists today

Nothing in this repository.

## Responsibilities

- Connect to local and remote MCP servers
- Map their tools into the Tool Registry with risk and permission information
- Expose OpenLobs tools to other clients

## Interface today

Not implemented.

## Depends on

- packages/tool-registry
- packages/security

## Security notes

- Tool descriptions from a server are untrusted input and are shown to the person before use.
- Each server has its own credential and its own permissions.

## Done when

- [ ] One local and one remote server work through the registry

## Not in scope

- Running untrusted servers without isolation

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
