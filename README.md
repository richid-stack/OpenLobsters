# OpenLobsters

An open agent workspace: **discover** open-source capabilities, **compose** them into working agents and workflows, and **create** new ones, with permissions and approvals built in from the start.

> Status: frontend prototype plus the typed event contract (Phase 0 and 1 of `docs/PLAN.md`). The backend is not built yet.

## What is here

| Path | What it is |
| --- | --- |
| `prototype/openlobs.html` | The single-file frontend prototype (chat, agent teams, sources, approvals, memory, landing page). |
| `docs/blueprint-1-platform.md` | Platform blueprint: the ten systems (libraries, skills, tools, MCP, workflows, orchestration, models, validation, security, runtime) and the build order. |
| `docs/blueprint-2-ecosystem.md` | Ecosystem vision: Discover, Compose, Create, plus Lab, Forge, Graph, Recipes and the Compatibility Engine. |
| `packages/contract/` | The typed event stream and resource schemas in TypeScript (zod) and Python (Pydantic), shared fixtures, generated OpenAPI. |
| `apps/mock-server/` | A mock API that streams recorded runs over SSE, validated against the contract. |
| `design/` | Design tokens extracted from the prototype. |
| `docs/DECISIONS.md` | The ten decisions and why. |
| `docs/CONTRACT.md` | How the event contract works and how to record and replay runs. |
| `docs/PLAN.md` | The phased plan: status line, tool routing, the event contract, phases 0 to 8, and the decisions needed. Draft for approval. |
| `docs/FRONTEND_STATUS.md` | What is real in the prototype and what is still a stand-in. |

## Principles

1. **Ask before acting.** Tools run behind explicit approval (allow once, always allow, deny). Permissions are enforced by the execution layer, never by a skill's own instructions.
2. **Distinct resource types.** Libraries, skills, tools, MCP servers and workflows stay separate types that declare relationships to each other.
3. **Open by design.** Open source, a shareable skills library and a community are planned, not shipped.

## Tests

```
cd packages/contract/ts && npm install && npm test
pip install -e packages/contract/py pytest pyyaml && pytest packages/contract/py
cd apps/mock-server && pip install -r requirements.txt && pytest
```

## Running the prototype

Open `prototype/openlobs.html` in a browser. Replies are scripted (demo mode) unless the page is opened as a Claude artifact with the Claude and Parallel Search connectors enabled, which gives live replies and web search.

## Planned layout

```
apps/web      Next.js frontend (AI SDK, streaming UI)
apps/api      FastAPI backend (agent runtime, tools, MCP, auth)
packages/     shared types and the API contract
docs/         blueprints and decisions
prototype/    the current single-file frontend
```

## License

Apache-2.0. See `LICENSE`.
