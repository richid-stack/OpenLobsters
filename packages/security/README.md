# Security primitives

**Status:** 🚧 Partly built  ·  **Plan name:** Security and permissions (blueprint 1, system 9)  ·  **Milestone:** M3, M9

The shared building blocks that keep the rest honest: the approval ledger, the network guard for model addresses, secret redaction, rate limiting and the permission model.

## What exists today

Spread across `apps/web/server/`: `tools/approvals.ts` (ledger and recorder), `providers/netGuard.ts`, `providers/redact.ts`, `utils/rateLimit.ts`. Each has tests, including a regression test for a hole found in the approval ledger (a replayed, forged approval approved itself).

## Responsibilities

- Record approvals from what the server sent, and refuse any tool run that lacks a matching, unused, fresh record
- Refuse model addresses on private networks, link-local ranges and cloud metadata
- Strip keys from anything shown to a person
- Rate-limit by person or network address

## Interface today

`createApprovalRecorder`, `createApprovalLedger`, `assertSafeBaseURL`, `redactSecrets`, `createRateLimiter`.

## Depends on

- (none)

## Security notes

- See `docs/architecture/security.md` for the full model.

## Done when

- [ ] An audit log of every approval and tool run
- [ ] Roles and teams
- [ ] A shared rate-limit store for more than one server process
- [ ] Secret vault for connector credentials

## Not in scope

- Sign-in (Better Auth handles it)

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
