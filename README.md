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
npm test             # 111 tests
```

With no setup it uses a built-in **demo model** (scripted answers, sample data, clearly labelled). Try "Summarise my sales and make me a workbook" to see reasoning, tool calls, an approval and a verification check.

## Accounts and saved chats

Anyone can try OpenLobs without an account (nothing is saved). Signing in saves your chats so you can reopen them on any device.

- **Sign-in methods:** email and password, GitHub, Google, Microsoft, and any OpenID Connect provider (Keycloak, Okta, Auth0, Entra ID, a company login). A button appears only for a method that is configured. See `apps/web/.env.example`.
- **Self-hosting:** accounts and chats live in one SQLite file (`data/openlobs.db`), no database setup needed. Set `BETTER_AUTH_SECRET` and `OPENLOBS_BASE_URL` for production. `OPENLOBS_SIGNUPS=closed` stops new registrations.
- **Email:** confirmation and password reset need an SMTP address (`OPENLOBS_SMTP_URL`). Without one, nothing is emailed, confirmation is not required and "forgot password" is hidden.
- **Privacy:** a person can only ever see their own chats (enforced on every query, tested). Model keys are still kept in the browser, not on the server.
- **First start:** you may see a harmless "schema mismatch" message from the auth library while it creates its tables.
- **Honest limits:** GitHub, Google and Microsoft are configured but have not been run against the real services (no access from the build environment). The OpenID Connect path is tested end to end against a fake provider, in tests and in a real browser. If the identity provider is down when the server starts, its button is skipped until the server restarts.

## Real tools and files

Paste a table (CSV) and ask for a workbook. OpenLobs reads it, asks your approval, builds a real Excel file, opens it again to check it, and offers it for download.

- **What is real:** reading the table and its totals, building the `.xlsx` (live `SUM` formulas, formatted headers), the approval, the verification, storage and download. A file opens in Excel and in other programs; the tests read it with a separate library (openpyxl) to prove that.
- **What is checked:** the saved file's fingerprint, sheet names and order, every value against your table, that each total is a live formula whose stored value is right, that no cell holds an error value, and that text like `=1+1` stays text. If the file was changed after saving, or anything does not match, the app says exactly which check failed and where, and does not call the file correct.
- **Safety:** saving a file needs an account and your approval. The server writes down what it asked and refuses to run anything that was not asked, was edited, was already used, or belongs to someone else. Files are private to their owner, limited in size and number, and downloaded as attachments.
- **What is still a demo:** the built-in demo model decides what to do with simple rules (the tools it calls are real). With a real model chosen in Models, the model decides. Web search returns sample results. There is no screen listing your files yet.

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

## The whole project at a glance

OpenLobs is built as one app first, with every other part documented as a module so you can see where it is going. **Planned parts are a folder with a README and no code, on purpose.** The full map, with diagrams, is in [`docs/architecture`](docs/architecture/README.md); the order of work is in [`ROADMAP.md`](ROADMAP.md).

```
apps/
  web/              ✅ the app: Vue 3 interface and Nitro server in one project
  bridge/           📋 desktop companion that works with apps on your own computer
  worker/           📋 background and isolated execution (long jobs, browser, documents)
  mock-server/      ✅ small mock of the original event contract (a test aid)
packages/
  contract/         🚧 typed event and resource contract (TypeScript and Python)
  orchestrator/     📋 stored tasks, steps, budgets, routing
  tool-registry/    🚧 what OpenLobs can do, where it runs, how risky it is
  model-connectors/ 🚧 any model, any provider, your own key
  verification/     🚧 check that a result is really right (spreadsheets today)
  artifacts/        🚧 files OpenLobs makes: storage, download, limits
  security/         🚧 approval ledger, network guard, secrets, rate limits
  connectors/       📋 GitHub, Google, Slack and more through MCP and OAuth
  mcp/              📋 MCP client and server
  skills/           📋 skills, Skills Studio, agent teams
  workflows/        📋 build, schedule and run repeatable work
  memory/           📋 optional, visible, deletable memory
  bridge-protocol/  📋 messages between the server and the Bridge
  design-system/    🚧 tokens, icons, brand marks and rules
  sdk/              📋 public API and client library
docs/               architecture, decisions, plan, feature status, design notes
prototype/          the original single-file prototype (the visual spec)
```

✅ built and tested · 🚧 partly built (the code lives inside `apps/web` today) · 📋 planned, design only

| Read this | To learn |
|---|---|
| [`docs/architecture/README.md`](docs/architecture/README.md) | The big picture and how one request flows |
| [`docs/architecture/modules.md`](docs/architecture/modules.md) | Every module and its honest status |
| [`docs/architecture/security.md`](docs/architecture/security.md) | Threats, protections and known gaps |
| [`docs/architecture/bridge.md`](docs/architecture/bridge.md) | How OpenLobs will safely work on your own computer |
| [`docs/adr`](docs/adr/README.md) | Why each big choice was made |
| [`docs/FEATURES.md`](docs/FEATURES.md) | What is real, what is demo, what is missing |
| [`ROADMAP.md`](ROADMAP.md) | The order of work |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to run it and help |

## License

Apache-2.0. See `LICENSE`.
