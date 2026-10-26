# Bridge protocol

**Status:** 📋 Planned  ·  **Plan name:** Bridge connection architecture  ·  **Milestone:** M5

The messages between the server and the Bridge, as typed schemas shared by both: pairing, capability reports, task requests, progress, approvals, cancel and revoke.

## What exists today

Nothing. The design is in `docs/architecture/bridge.md`.

## Responsibilities

- Version the protocol
- Validate every message on both sides
- Define timeouts, heartbeats and reconnect behaviour

## Interface today

Not implemented.

## Depends on

- (none)

## Security notes

- Short-lived task credentials, device identity, replay protection.

## Done when

- [ ] Server and Bridge talk through generated types
- [ ] A malformed or replayed message is refused

## Not in scope

- A second transport before the first works

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
