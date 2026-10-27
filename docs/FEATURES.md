# Feature status (honest)

Last updated: 22 Oct 2026, branch `feat/vue-shell`.

**Short answer:** OpenLobs is early. A small, real foundation exists; most of the vision does not.

The percentages below are my rough judgement, not a measurement:

- **The full vision** (the 10 systems in blueprint 1 plus the 15 products in blueprint 2): about **5 to 7%**.
- **A first usable version** (sign in, saved chats, a real model of your choice, two or three real tools, approvals, and one real output that is checked): about **45 to 50%**. Sign-in, saved chats, model choice, approvals and one fully real, checked file flow now exist. Still missing: proof against real model providers, a files screen, more real tools, and uploads.

Status words: **Real** = works and is tested. **Partial** = real but limited, limits listed. **Demo** = the screen exists, the behaviour is simulated. **Not started**.

## Blueprint 1: the ten systems

| # | System | Status | What exists, and what does not |
|---|---|---|---|
| 1 | Libraries | Not started | |
| 2 | Skills | Not started | |
| 3 | Tools | Partial | **Real:** `analyze_table` (reads a pasted table, real totals), `create_spreadsheet` (builds a real Excel file after approval), `verify_artifact`. Demo: `web_search`. Not built: a Tool Registry (schemas, permissions, health), file upload, the Bridge. |
| 4 | MCP integration | Not started | |
| 5 | Workflow engine | Not started | |
| 6 | Agent orchestration | Not started | One run loop with a step limit. No teams, hand-offs, router or scheduling. |
| 7 | **Model connectors** | **Partial, real** | See below. The most complete system so far. |
| 8 | Validation and evaluation | Partial | **Real verification for spreadsheets:** the saved file is opened again and compared with what was asked for (fingerprint, sheet names, every value, live total formulas and their values, error values, text never stored as a formula). Tested by changing a stored file and checking the app reports exactly where. No evaluation harness; no other file types yet. |
| 9 | Security and permissions | Partial | Approvals enforced by the runtime **and recorded by the server** (an edited, replayed, invented or someone else's approval does not run), accounts and per-person data and files, rate limiting, a guard against dangerous model addresses, keys removed from errors, file storage limits, hardened downloads. **No** audit log, execution isolation, secret vault, two-factor or roles. |
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
| Tool cards with reasons, location and risk | Real | Real tools for tables and workbooks; web search is still a demo. |
| Approvals (allow once, always allow, deny) | Real | Enforced by the runtime and recorded by the server. The card says exactly what will be saved and where. "Always allow" lasts one page session. |
| Live status line and step tray | **Real** | One line while working; tap to open a list of the actions taken; tap a step to jump to it in the chat; a waiting approval jumps straight to the approval. Drag, Escape and close button to put away. Built from real events, with tests and a 23-check browser suite. See `docs/DESIGN_NOTES.md`. |
| Back to the latest button | Real | Appears when scrolled up; attached above the message box. |
| Errors and notes in the one status line | **Real** | An error or a "this model only chats" note takes the place of the status line, with plain text actions (Try again, Models, Dismiss). 14-check browser suite. |
| Light and dark, mobile first | Real | |
| Custom icons and brand mark | Real | |
| Accounts and sign-in | **Partial, real** | Email and password, GitHub, Google, Microsoft and any OpenID Connect provider. Sessions, sign-out, password reset and email confirmation (when email is configured), closed sign-ups. Tested: email flows and the OpenID Connect path (fake provider, in a browser). **Not run against real GitHub, Google or Microsoft.** No two-factor, passkeys, account deletion or profile page yet. |
| Saved chats | **Real** | Per-person, tested for isolation. History in the sidebar, rename and delete (rename is in the API, not yet in the UI). Whole chat is stored as one record; fine for now, will need per-message storage later. |
| Projects, folders, sharing | Not started | |
| Memory | Not started | |
| File uploads | Not started | |
| The Bridge (work on your own computer) | Not started | `read_file` and `create_spreadsheet` are pretend. |
| Real verification of outputs | **Real (spreadsheets)** | See system 8. |
| Files the app makes: storage and download | **Real** | Per-person, size and count limits, owner-only download, delete (API). Not built: a screen listing your files, clean-up of files when an account is deleted. |
| Billing, teams, sharing | Not started | |
| Tests | 111 passing | Unit tests for every server module, plus seven browser suites (`apps/web/tests/browser`) that drive the real app: tray, notices, accounts, models, logos, demo flow and the real file flow. |

## What the first usable version still needs, in order

1. Test the native providers with a real key, and fix whatever breaks. Test GitHub and Google sign-in with real app credentials.
2. (Done) Saved chats and sign-in.
3. (Done) One real tool end to end with a verified file.
4. A screen listing your files, with delete. Clean up files when an account is deleted.
5. Uploads (so tools can read a person's own file) and real web search.
6. A task model and a Tool Registry (permissions per tool, not per prompt).
7. Then the Bridge.
