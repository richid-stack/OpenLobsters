# Roadmap

The order we intend to build things, with the honest state of each step. It follows [`docs/PLAN.md`](docs/PLAN.md) and the two blueprints, updated for what was learned by building. For what is real today, see [`docs/FEATURES.md`](docs/FEATURES.md). For every module, see [`docs/architecture/modules.md`](docs/architecture/modules.md).

Legend: ✅ done · 🚧 in progress or partly done · 📋 not started

## Milestones

| | Milestone | What it delivers | State |
|---|---|---|---|
| M0 | Foundations | Event contract, prototype, design tokens, decisions | ✅ |
| M1 | Chat platform | Streaming chat with reasoning, tool steps and approvals; step tray; many models with your own key; accounts and saved chats; flat, accessible, light and dark interface | ✅ (native model adapters and GitHub/Google sign-in still untested against the real services) |
| M2 | First real tools | A pasted table becomes a checked Excel file you can download | 🚧 done for tables and workbooks. Left: files screen, uploads, real web search |
| M3 | Orchestrator and registry | Stored tasks with budgets and cancel; Tool Registry with per-person permissions; usage and cost; audit log; account settings; observability; smaller first load; reconcile the event contract | 📋 |
| M4 | Connectors | Remote Connector Gateway, MCP, credential vault; GitHub, Google Workspace, Slack first | 📋 |
| M5 | Bridge | Pairing, outbound connection, permissions, Files and Excel adapters on one operating system | 📋 |
| M6 | Workflows and scheduling | Build, run and schedule repeatable work; notifications; Word, PowerPoint and browser adapters | 📋 |
| M7 | Skills and agents | Skills with tests, Skills Studio, agent teams, memory; Blender, FL Studio, Git and Python adapters | 📋 |
| M8 | Ecosystem | Discover, Recipes, Compose, Compatibility Engine | 📋 |
| M9 | Teams, public API, billing | Organisations and roles, API keys and SDK, usage-based billing, admin | 📋 |
| M10 | Hardening and launch | Security review, load tests, backups and restore drills, hosted deployment, documentation | 📋 |

## Now, next, later

**Now** (finish M2 and prove M1): run the native model adapters and GitHub/Google sign-in against the real services; a screen listing your files with delete; clean up files when an account is deleted; one-line status for errors and notes above the message box.

**Next** (M3): the task model and Orchestrator, the Tool Registry with permissions, the audit log, usage tracking, a content security policy, versioned migrations, shared rate limiting, and the first-load size work.

**Later:** connectors, the Bridge, workflows, skills, the ecosystem products, teams.

## Rules for moving a milestone forward

1. Each item has a test that fails if it is removed, and a browser check where it is visible.
2. A security-relevant item names the threat it addresses and adds a regression test.
3. Status is changed in the module's README, in the module index and here, in the same pull request.
4. A milestone is done when its items are done, not when they are started.

## Open decisions (they block or shape the work)

| Decision | Needed by | Notes |
|---|---|---|
| Which operating system the Bridge supports first | M5 | Windows is likely (Excel, FL Studio). Not confirmed |
| Event contract versus the AI SDK stream | M3 | Recommended: make the contract a typed layer over the AI SDK parts |
| Queue and worker technology | M3 to M6 | Decide when the first long task exists |
| Hosted offering, pricing and plans | M9 | Open source and self-hosting stay first-class either way |
| How to automate Excel (files or the application) | M5 | See `docs/architecture/bridge.md` |
| Mobile: installable web app or native | M8 | |
| Moving from SQLite to Postgres | M9 or earlier if hosted | Behind the store interfaces |
