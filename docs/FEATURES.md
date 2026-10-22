# Feature status (honest)

Last updated: 22 Oct 2026, branch `feat/vue-shell`.

**Short answer:** OpenLobs is early. A small, real foundation exists; most of the vision does not.

The percentages below are my rough judgement, not a measurement:

- **The full vision** (the 10 systems in blueprint 1 plus the 15 products in blueprint 2): about **3 to 5%**.
- **A first usable version** (sign in, saved chats, a real model of your choice, two or three real tools, approvals, and one real output that is checked): about **25 to 30%**.

Status words: **Real** = works and is tested. **Partial** = real but limited, limits listed. **Demo** = the screen exists, the behaviour is simulated. **Not started**.

## Blueprint 1: the ten systems

| # | System | Status | What exists, and what does not |
|---|---|---|---|
| 1 | Libraries | Not started | |
| 2 | Skills | Not started | |
| 3 | Tools | Partial (demo tools) | Tool metadata for the UI (icon, words, where it runs, read or write), a `why` field on every call, five demo tools. **No** tool registry (schemas, permissions, health), and no real tool. |
| 4 | MCP integration | Not started | |
| 5 | Workflow engine | Not started | |
| 6 | Agent orchestration | Not started | One run loop with a step limit. No teams, hand-offs, router or scheduling. |
| 7 | **Model connectors** | **Partial, real** | See below. The most complete system so far. |
| 8 | Validation and evaluation | Demo | Verification checks show on screen, but the checks are simulated and always pass. No evaluation harness. |
| 9 | Security and permissions | Partial | Approvals enforced by the runtime, a guard against dangerous model addresses, keys removed from errors. **No** accounts, audit log, execution isolation or secret vault. |
| 10 | Runtime management | Not started | |

### System 7 in detail (model connectors)

Real and tested:

- A catalog of 14 providers plus any custom OpenAI-compatible endpoint: OpenRouter, OpenAI, Anthropic, Google AI Studio, Groq, Mistral, DeepSeek, xAI, Together, Fireworks, Cerebras, DeepInfra, Ollama and LM Studio (local).
- Bring your own key. Keys live in the browser and travel with each request. The server does not store them. Self-hosters can keep keys in server environment variables instead.
- Live model lists from the provider. OpenRouter lists include real capability data (tools, reasoning, context size). Others say "unknown" instead of guessing.
- A connection test that makes a real call and a real tool-call probe, and records the result in the model's capabilities.
- A model marked as unable to use tools still works as plain chat.
- Streaming, reasoning and tool calls through a generic OpenAI-compatible endpoint, verified against a local fake provider.
- Protection against model addresses pointing at internal services (private networks, cloud metadata, IPv6-mapped tricks), found and fixed during testing.

Not done:

- **The native OpenAI, Anthropic and Google adapters are written but have never been run against the real services.** Only the OpenAI-compatible path has been exercised, and only against a fake server. Treat the rest as untested until someone runs them with a real key.
- No usage or cost tracking, no provider fallback or routing, no encrypted server-side key storage, no per-model capability data beyond OpenRouter and the test.

## Blueprint 2: the fifteen products

Discover, Build, Lab, Compose, Skills Studio, Forge, Intelligence, Benchmark, Graph, Workspace, Academy, Community, Studio, Recipes, Compatibility Engine: **all not started.** The old single-file prototype has mock screens for some of these ideas. The new app has none of them yet.

## The application itself

| Area | Status | Notes |
|---|---|---|
| Chat with streaming text | Real | |
| Reasoning shown and collapsible | Real | Shown when the model sends it. |
| Tool cards with reasons, location and risk | Real UI, demo tools | |
| Approvals (allow once, always allow, deny) | Real | Enforced by the runtime. "Always allow" lasts one page session. |
| Live status line and activity ticker | Real | Built from real events, with tests. |
| Errors shown with Try again | Real | |
| Light and dark, mobile first | Real | |
| Custom icons and brand mark | Real | |
| Accounts and sign-in | Not started | |
| Saved chats and projects | Not started | Reloading loses the conversation. |
| Memory | Not started | |
| File uploads | Not started | |
| The Bridge (work on your own computer) | Not started | `read_file` and `create_spreadsheet` are pretend. |
| Real verification of outputs | Not started | |
| Artifact storage | Not started | |
| Billing, teams, sharing | Not started | |
| Tests | 40 passing | Demo model, status line, providers, the network guard and brand icons. |

## What the first usable version still needs, in order

1. Test the native providers with a real key, and fix whatever breaks.
2. Saved chats and sign-in.
3. One real tool end to end, with a real file output that is verified by opening it again.
4. A task model and a tool registry (permissions per tool, not per prompt).
5. Artifact storage.
6. Then the Bridge.
