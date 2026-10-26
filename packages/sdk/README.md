# Public API and SDK

**Status:** 📋 Planned  ·  **Plan name:** (future)  ·  **Milestone:** M9

A stable, documented API and a small client library so other software can start tasks, read results and manage files on a person's behalf.

## What exists today

Nothing public. Today's routes under `/api` are for the app itself and can change.

## Responsibilities

- Versioned endpoints with API keys scoped to a person or workspace
- A typed client
- Webhooks for task events

## Interface today

Not implemented.

## Depends on

- packages/orchestrator
- packages/security

## Security notes

- Keys are hashed, scoped, rotatable and shown once.
- Rate limits and quotas per key.

## Done when

- [ ] A third party completes a task using only the documentation

## Not in scope

- Opening internal routes as a public API without a version

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
