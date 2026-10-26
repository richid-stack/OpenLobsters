# Workflow engine and scheduler

**Status:** 📋 Planned  ·  **Plan name:** Workflow engine (blueprint 1, system 5), Cron blueprint  ·  **Milestone:** M6

Lets a person build, schedule and monitor repeatable work: nodes for tools, approvals, conditions, loops and verification, run on a schedule with notifications.

## What exists today

Nothing. The cron blueprint in the owner's notes lists the first jobs (daily ad audit, weekly report, morning inbox briefing, nightly backlog triage).

## Responsibilities

- Store workflows as data, with versions
- Run them through the Orchestrator and workers
- Schedule with a calendar and time zones
- Notify on success, failure and waiting for approval

## Interface today

Not implemented.

## Depends on

- apps/worker
- packages/orchestrator

## Security notes

- Scheduled runs use the permissions the person had when they scheduled it, and ask again if those change.
- Write actions in a scheduled run need pre-approval of their limits.

## Done when

- [ ] A read-only schedule runs reliably for a week
- [ ] A failed run notifies and can be retried

## Not in scope

- Visual canvas before the data model is stable

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
