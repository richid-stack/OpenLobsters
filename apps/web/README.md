# Web application and API gateway

**Status:** 🚧 Partly built  ·  **Plan name:** Web Application, API Gateway  ·  **Milestone:** M1 (growing)

The one deployable app today: a Vue 3 interface and Nitro server routes in a single project. It serves the interface, handles sign-in, streams chat, runs tools and stores chats and files.

## What exists today

All of it. `src/` is the interface, `server/` is the API, `shared/` holds code used by both, `tests/` holds unit and browser tests. See `docs/architecture/frontend.md` and `backend.md` for the map of what is inside.

## Responsibilities

- Chat with streaming text, reasoning, tool steps, approvals, a step tray
- Accounts, saved chats, model choice (bring your own key)
- Real tools for tables and workbooks, file download
- Rate limiting and request validation at the edge of every route

## Interface today

HTTP routes under `/api` (see `docs/architecture/api.md`).

## Depends on

- Everything below. Today the other modules are folders inside this app; they move out when they have a second user.

## Security notes

- Never trusts the browser: the browser sends the whole conversation, so approvals and tool runs are recorded by the server (see `docs/architecture/security.md`).

## Done when

- [ ] Every route validates its input and checks the signed-in person
- [ ] Browser suites in `apps/web/tests/browser` pass

## Not in scope

- Heavy or long-running work: that belongs in `apps/worker`

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
