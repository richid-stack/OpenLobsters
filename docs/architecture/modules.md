# Module index

Every part of OpenLobs, with an honest status. Click a module for what it does, its interface, its security notes and what "done" means for it.

Legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code)

| Module | What it is | Status | Where the code is today | Milestone |
|---|---|---|---|---|
| [`apps/web`](../../apps/web/README.md) | Web Application, API Gateway | 🚧 Partly built | All of it | M1 (growing) |
| [`apps/bridge`](../../apps/bridge/README.md) | OpenLobs Bridge | 📋 Planned | Nothing | M5 |
| [`apps/worker`](../../apps/worker/README.md) | Execution Workers | 📋 Planned | Nothing | M3 to M6 |
| [`apps/mock-server`](../../apps/mock-server/README.md) | (supporting) | ✅ Built | Complete as a test aid | M0 |
| [`packages/contract`](../../packages/contract/README.md) | (supporting) | 🚧 Partly built | Exists and is tested | M0, then reconcile in M3 |
| [`packages/orchestrator`](../../packages/orchestrator/README.md) | OpenLobs Orchestrator | 📋 Planned | A thin version: the AI SDK's tool loop with a limit of 8 steps, inside `apps/web/server/routes/api/chat.post.ts` | M3 |
| [`packages/tool-registry`](../../packages/tool-registry/README.md) | OpenLobs Tool Registry | 🚧 Partly built | Two pieces that should become one: `apps/web/shared/toolMeta.ts` (icons, words, where it runs, risk, what to tell the person before approving) and… | M3 |
| [`packages/model-connectors`](../../packages/model-connectors/README.md) | Model connectors (blueprint 1, system 7) | 🚧 Partly built | `apps/web/shared/providers.ts` (the catalog), `apps/web/server/providers/` (resolve a model, list models, network guard, key redaction), routes… | M1 (done), M3 (usage and routing) |
| [`packages/verification`](../../packages/verification/README.md) | Verification Engine | 🚧 Partly built | One real verifier: `apps/web/server/artifacts/workbook.ts` | M2 (spreadsheets done), M3 onward |
| [`packages/artifacts`](../../packages/artifacts/README.md) | Artifact Management | 🚧 Partly built | `apps/web/server/artifacts/store.ts` (files on disk, details in SQLite), routes `/api/artifacts` | M2 (files), M6 (retention) |
| [`packages/security`](../../packages/security/README.md) | Security and permissions (blueprint 1, system 9) | 🚧 Partly built | Spread across `apps/web/server/`: `tools/approvals.ts` (ledger and recorder), `providers/netGuard.ts`, `providers/redact.ts`, `utils/rateLimit.ts` | M3, M9 |
| [`packages/connectors`](../../packages/connectors/README.md) | Remote Connector Gateway | 📋 Planned | Nothing | M4 |
| [`packages/mcp`](../../packages/mcp/README.md) | MCP integration (blueprint 1, system 4) | 📋 Planned | Nothing in this repository | M4 |
| [`packages/skills`](../../packages/skills/README.md) | Skills (blueprint 1, system 2), Skills Studio, agent teams | 📋 Planned | Nothing here | M7 |
| [`packages/workflows`](../../packages/workflows/README.md) | Workflow engine (blueprint 1, system 5), Cron blueprint | 📋 Planned | Nothing | M6 |
| [`packages/memory`](../../packages/memory/README.md) | Memory | 📋 Planned | Nothing | M7 |
| [`packages/bridge-protocol`](../../packages/bridge-protocol/README.md) | Bridge connection architecture | 📋 Planned | Nothing | M5 |
| [`packages/design-system`](../../packages/design-system/README.md) | Web Application (premium, clean interface) | 🚧 Partly built | Spread across `design/` (tokens), `apps/web/src/icons/openlobs.ts` (custom icons), `apps/web/shared/brands.ts` (provider and lab logos from Lobe… | M1 (core done) |
| [`packages/sdk`](../../packages/sdk/README.md) | (future) | 📋 Planned | Nothing public | M9 |

**Reading the table:** a *planned* module has a folder with a README and nothing else. We do not add placeholder code. When a piece is built, its status changes here and in its README in the same pull request.
