# OpenLobsters

An open agent workspace: **discover** open-source capabilities, **compose** them into working agents and workflows, and **create** new ones, with permissions and approvals built in from the start.

> **Status: early.** A working app shell with streaming chat, tool cards, approvals and a bring-your-own-model layer (`apps/web`), plus the original prototype and typed event contract. Most of the vision is not built yet: see [`docs/FEATURES.md`](docs/FEATURES.md) for an honest list of what is real, what is demo and what is missing.

## What is here

| Path | What it is |
| --- | --- |
| `apps/web/` | **The app.** Vue 3, Vite, Nitro, Nuxt UI and the AI SDK. Streaming chat, reasoning, tool cards with reasons, approvals, a live status line, and Models (bring your own key, many providers). |
| `prototype/openlobs.html` | The single-file frontend prototype (chat, agent teams, sources, approvals, memory, landing page). |
| `docs/blueprint-1-platform.md` | Platform blueprint: the ten systems (libraries, skills, tools, MCP, workflows, orchestration, models, validation, security, runtime) and the build order. |
| `docs/blueprint-2-ecosystem.md` | Ecosystem vision: Discover, Compose, Create, plus Lab, Forge, Graph, Recipes and the Compatibility Engine. |
| `packages/contract/` | The typed event stream and resource schemas in TypeScript (zod) and Python (Pydantic), shared fixtures, generated OpenAPI. |
| `apps/mock-server/` | A mock API that streams recorded runs over SSE, validated against the contract. |
| `design/` | Design tokens extracted from the prototype. |
| `docs/DECISIONS.md` | The ten decisions and why. |
| `docs/CONTRACT.md` | How the event contract works and how to record and replay runs. |
| `docs/PLAN.md` | The phased plan: status line, tool routing, the event contract, phases 0 to 8, and the decisions needed. Draft for approval. |
| `docs/FEATURES.md` | Honest feature status: what is real, partial, demo or not started, with rough percentages. |
| `docs/PROJECT_CONTEXT.md` | Handoff for a new working session: decisions, how to run, what is next. |
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

## Running the app

```
cd apps/web
npm install
npm run dev          # http://localhost:3000
npm test             # 40 tests
```

With no setup it uses a built-in **demo model** (scripted answers, sample data, clearly labelled). Try "Summarise my sales and make me a workbook" to see reasoning, tool calls, an approval and a verification check.

## Bring your own model

Open **Models** in the app. Pick a provider, paste a key, press **Get models**, choose one, press **Test**.

- **Providers:** OpenRouter, OpenAI, Anthropic, Google AI Studio, Groq, Mistral, DeepSeek, xAI, Together, Fireworks, Cerebras, DeepInfra, Ollama and LM Studio (local), and any **OpenAI-compatible** address you add yourself (vLLM, LiteLLM, a company gateway, a self-hosted model).
- **Your key stays in your browser** and is sent only with your own requests. The server does not store it. Use a key with a spending limit.
- **Self-hosting:** keep keys on the server instead with environment variables such as `OPENLOBS_OPENROUTER_API_KEY`. See `apps/web/.env.example`.
- **Capabilities are never guessed.** Where a provider says what a model supports (OpenRouter does), you see it. Otherwise it says "unknown", and **Test** checks tool calling for real. A model that cannot use tools still works as plain chat.
- **Safety:** model addresses pointing at private networks and cloud-metadata services are refused in production. Set `OPENLOBS_ALLOW_LOCAL_MODELS=1` to allow Ollama on the same machine.
- **Honest limit:** the OpenAI-compatible path is tested end to end against a local fake provider. The native OpenAI, Anthropic and Google adapters are written but have not yet been run against the real services.

## Logos

Provider and model logos come from [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT licence) and are bundled into the app, not fetched from the providers' websites, so there are no tracking requests and they work offline. The marks belong to their owners and are used only to show which provider or lab a model comes from.

## Running the prototype

Open `prototype/openlobs.html` in a browser. Replies are scripted (demo mode) unless the page is opened as a Claude artifact with the Claude and Parallel Search connectors enabled, which gives live replies and web search.

## Layout

```
apps/web      the app: Vue 3 frontend and Nitro server routes in one project (AI SDK)
apps/mock-server  mock API for the event contract (Python)
packages/     shared types and the event contract
docs/         blueprints, plan, decisions, feature status, project context
design/       design tokens
prototype/    the original single-file prototype (the visual spec)
```

The plan originally named Next.js and FastAPI. The app was built with Vue 3 and Nitro instead (see `docs/PROJECT_CONTEXT.md`). A separate Python backend may still be added for the agent runtime.

## License

Apache-2.0. See `LICENSE`.
