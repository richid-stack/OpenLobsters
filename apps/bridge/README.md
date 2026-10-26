# Bridge (desktop companion)

**Status:** 📋 Planned  ·  **Plan name:** OpenLobs Bridge  ·  **Milestone:** M5

A small app a person installs on their own computer. It connects out to OpenLobs, reports what it can do, and runs approved tasks with the applications already installed there: Excel, Word, PowerPoint, Blender, FL Studio, Git, Python, a browser.

## What exists today

Nothing. The tools that pretend to be on the Bridge (`read_file`) were removed from the real tool set. Design: `docs/architecture/bridge.md`.

## Responsibilities

- Pair the computer to one account and keep a device identity
- Open an outbound, authenticated connection (never a listening port)
- Report only the capabilities the person enabled
- Enforce local permissions before every action, whatever the server asks
- Run tasks, report progress, support cancel, pause and revoke
- Show clearly when it is working, and keep a local activity log

## Interface (proposed, not implemented)

```ts
// Proposed. See bridge.md for the full protocol.
type BridgeHello = { deviceId: string; bridgeVersion: string; os: 'windows' | 'macos' | 'linux'; capabilities: Capability[] }
type Capability = { id: string; app?: string; version?: string; operations: string[]; scope: 'workspace' | 'app' | 'desktop' }
type TaskRequest = { taskId: string; capability: string; operation: string; input: unknown; approvalId?: string; deadline: string }
type TaskEvent = { taskId: string; type: 'started' | 'progress' | 'artifact' | 'needs-approval' | 'finished' | 'failed' | 'cancelled'; data?: unknown }
```

## Depends on

- packages/bridge-protocol
- packages/tool-registry (capabilities become registry entries)

## Security notes

- The server can never push a command to run without the Bridge checking its own local policy.
- Access to one capability never grants another.
- No silent inventory of the computer.
- Revoking a device takes effect immediately and ends the connection.

## Done when

- [ ] Pairing, connect, heartbeat, reconnect and revoke work on one operating system
- [ ] One adapter (Excel or files) completes a task that the Verification Engine can check
- [ ] Stop, pause and disconnect work during a running task

## Not in scope

- Cross-platform builds before the first operating system is proven
- Remote desktop streaming

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
