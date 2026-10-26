# Architecture decision records

Short notes on *why* we chose what we chose, so a newcomer (or we, a year from now) can tell a decision from an accident. One file per decision. When a decision changes, the old record stays, marked superseded, and a new one is added.

The earlier decision log in [`../DECISIONS.md`](../DECISIONS.md) is kept as history. Where a decision there no longer holds (the web stack and hosting), the new record says so.

| # | Decision | Status |
|---|---|---|
| 0001 | [One repository, one deployable app first](0001-one-repository-one-deployable-app-first.md) | Accepted |
| 0002 | [Vue 3, Nitro and the AI SDK](0002-vue-3-nitro-and-the-ai.md) | Accepted (replaces the web stack in D1 and D10 of `docs/DECISIONS.md`) |
| 0003 | [Accounts with Better Auth, SQLite by default](0003-accounts-with-better-auth-sqlite-by.md) | Accepted (updates D9) |
| 0004 | [Model keys live in the browser](0004-model-keys-live-in-the-browser.md) | Accepted |
| 0005 | [Approvals are recorded by the server from its own response stream](0005-approvals-are-recorded-by-the-server.md) | Accepted |
| 0006 | [The chat is flat: no cards, no border lines](0006-the-chat-is-flat-no-cards.md) | Accepted (owner's design rule) |
| 0007 | [The step tray lists actions only](0007-the-step-tray-lists-actions-only.md) | Accepted |
| 0008 | [Spreadsheets with ExcelJS, verified by opening them again](0008-spreadsheets-with-exceljs-verified-by-opening.md) | Accepted |
| 0009 | [Any OpenID Connect provider; only configured methods are shown](0009-any-openid-connect-provider-only-configured.md) | Accepted |
| 0010 | [Planned modules are documented folders, never placeholder code](0010-planned-modules-are-documented-folders-never.md) | Accepted |

## Template

`Context` (the problem and the pressure), `Decision` (what we chose, in plain words), `Consequences` (what gets better, what it costs).
