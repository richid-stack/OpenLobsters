# OpenLobsters: phased plan (draft for approval)

Status: **approved 2026-10-18. Decisions are recorded in `DECISIONS.md`. Session A (Phase 0 and Phase 1) is built.**
Source documents: `blueprint-1-platform.md` (ten systems, build order) and `blueprint-2-ecosystem.md` (Discover, Compose, Create).

## 1. North star

An open agent workspace that **knows what to do, shows what it is doing, and asks before it acts.**

1. **Ask before acting.** Permissions and approvals are enforced by the runtime, never by a prompt.
2. **Explainable work.** Every tool, skill and agent decision is visible and has a reason.
3. **Distinct resource types.** Libraries, skills, tools, MCP servers, workflows and agents are separate types that declare relationships.
4. **The UI draws events.** The frontend renders a stream of typed events, so a mock, a recorded run and the real backend all look identical.
5. **Open by design.** Open source, shareable skills, a community. Planned, not shipped.

## 2. Where we are (honest)

Real: live replies and search inside a Claude artifact, approvals, think/tool timeline, staged agent teams with a Team room sheet, sources sheet, memory, local accounts, landing page.
Stand-ins: server accounts, share links, the passcode (client-side only), the model picker, project instructions/files, scheduled prompts outside an open page, reasoning text in live mode, demo replies.
Biggest gap against the blueprint: no catalogue of libraries, skills, tools, MCP servers and workflows, and no runtime behind the UI.

## 3. Two designs to lock before building

### 3.1 Live status line and activity ticker

**Where:** the "Worked with N agents" row (and a matching "Working" row for solo runs). The row becomes two lines. Tapping still opens the sheet.

**Line 1, status.** One line of text describing what is happening right now.
- It is generated from real events using fixed templates. It is never invented narration.
- Templates:
  - plan started: `Planning the work`
  - plan ready: `Split into 2 stages across 3 agents`
  - agent started: `Researcher is finding recent launch examples` (task text comes from the plan)
  - tool running: `Researcher is searching the web for "launch announcements"`; `Writer is checking your preferences`; `Planner is checking the time`
  - tool finished: `Researcher found 4 sources`
  - waiting: `Waiting for your approval to search the web` (jumps the queue)
  - hand-off: `Planner handed over to Writer`
  - synthesis: `Putting the answer together`
  - finished: `Worked with 3 agents · 4 sources · 12s` (static)
- Cadence: at most one change per ~700 ms. If events arrive faster, show the newest important one and drop stale ones. Approvals and errors always win.

**Motion.**
- Swap: the old line moves up 6 px and fades out (120 ms). The new line rises in from 6 px below and fades in (220 ms), ease-out.
- Shimmer: a soft highlight sweeps across the text on a 1.8 s loop while work is live. It stops when finished.
- Long lines: if the text is wider than the row, pause 600 ms, then pan left at about 40 px/s to reveal the end, hold 700 ms. When the next line is shorter, the text eases back to the left edge (260 ms). A soft fade masks the right edge while it overflows.
- Reduced motion: no pan, no shimmer, no slide. The line truncates with an ellipsis and swaps instantly.
- Accessibility: one polite live region, throttled, so screen readers are not flooded.
- Implementation: transforms and opacity only, no layout thrash.

**Line 2, activity ticker.**
- Sits directly under the status line, faded to about 55%, indented to the right of the avatar stack, 12 px type.
- It is one horizontal row of small monochrome chips added in order: agent tiles, tool glyphs (search, time, memory, chats), source favicons with a count, a tick when an agent finishes, a shield pulse for an approval.
- Each chip scales in from 85% (180 ms). When the row overflows, the strip slides so the newest chip stays at the right edge and older ones leave on the left under a fade mask.
- After about 24 chips, older ones fold into `+n`. Tapping a chip opens the sheet at that item. When the run ends the ticker collapses into the summary.

**Acceptance.** A pure function from events to status lines with snapshot tests; Playwright frame-sampling tests for swap, pan and return; a reduced-motion test; a long-line test; scripting cost under 2 ms per update on a mid-range phone.

### 3.2 Knowing when to use tools, skills and agents

Four layers, cheapest first:

- **L0, rules (free, instant).** A URL in the message means fetch. Words like latest, today, news, price mean web search. "Earlier", "my chats" mean past-chat search. "Remember", "I prefer" mean memory. Time words mean the clock. A code block or data file means the code runner. Negations ("don't search") disable a tool for the turn.
- **L1, router model (cheap and fast, under about 400 ms).** Input: the message, short history, and a catalogue of tools, skills and agents (name, one line, cost, needs-approval) plus the user's policy. Output: `{use:[{kind,name,why}], skip:[...], confidence, team_suggestion}`. Cached by message hash.
- **L2, the main model's native tool calling.** It makes the final call at run time and can still use any allowed tool. The router is a hint and a guardrail, not a cage.
- **L3, policy engine (deterministic).** Permissions, approvals, per-turn budgets (max tool calls, max agents, max cost), project allow-lists, rate limits, web domain allow/deny lists.

**Skills.** Progressive disclosure. The skill index (name plus one line) is always available. The full `SKILL.md` loads only when chosen. Scripts run only through the runtime, under permissions, at a pinned version. Instructions stay separate from execution, as in blueprint 1.

**Explainability.** Each decision carries a `why`, shown in the status line and the sheet ("Searching: your question needs current information"). Users can override with "Don't search" or "Always search".

**Auto team.** For multi-part tasks the router suggests agents. Setting: Off, Ask, or Auto. Default: Ask ("Use Researcher and Writer?").

**Evaluation.** A golden set of about 150 labelled prompts (should and should not call each tool). Metrics: precision and recall of tool use, unnecessary-call rate, latency, cost. Runs in CI and gates regressions.

**Failure modes.** Over-calling (cost), under-calling (stale answers), and prompt injection from fetched pages steering tool use. Rule: tool output is data, never instructions, and cannot trigger new tool calls without the policy engine and, for sensitive tools, the user.

**Prototype scope.** L0 and L3 only, inside the single file, plus the `why` display. L1 arrives with the backend.

## 4. The contract (what the UI draws)

One typed event stream, shared by mock, recorded fixtures and the real backend. Event types:

`message.start`, `text.delta`, `reasoning.delta`, `status`, `tool.call` (id, name, streamed args, state: input-streaming / awaiting-approval / running / done / error / denied, result summary, duration), `source` (url, title, snippet, date, cited-by), `team.plan` (stages), `agent.start`, `agent.message`, `agent.done`, `handoff`, `approval.request`, `approval.response`, `usage` (tokens, cost), `error`, `message.end`.

These map onto AI SDK 6 message parts so a Next.js `useChat` frontend and a FastAPI Pydantic AI backend can speak the same protocol.

Resource schemas (Phase 1): Library, Skill, Tool, McpServer, Workflow, Agent, Project, Memory, Permission, Run.

## 5. Phases

Size: S = days, M = 1 to 2 weeks, L = several weeks, XL = ongoing.

### Phase 0, decisions and repo (S)
- Goal: lock the decisions in section 7 and set up the repo.
- Deliverables: licence, contributing guide, issue templates, CI skeleton, design tokens extracted from the prototype.
- Done when: section 7 is answered and the plan is approved.

### Phase 1, contract and mock layer (M)
- Goal: the UI stops building events inline and consumes them through an interface.
- Deliverables: event and resource schemas (TypeScript with zod, and Pydantic), OpenAPI, a mock server replaying recorded runs (solo, team, approval, error), an adapter inside the prototype.
- Done when: replaying a recorded run reproduces the same timeline, and contract tests pass.

### Phase 2, prototype v2, the UX that must feel finished (L)
- 2a Live status line and ticker (section 3.1).
- 2b Routing L0 and L3, the `why` display, user overrides, auto-team setting (section 3.2).
- 2c Tools and Connections manager: tool list with permission levels, MCP server status, skills list.
- 2d Projects: instructions, files, knowledge that actually shape replies.
- 2e Discover: capability search over the five resource types, resource pages, relationships.
- 2f Polish: accessibility pass, performance budgets, empty and error states, onboarding.
- 2g Truth pass: every stand-in is either removed or clearly labelled.
- Done when: each item meets its acceptance tests and the regression suite is green.

### Phase 3, backend core, delivered as the zip (L)
- FastAPI with Pydantic AI, Supabase auth, Postgres with pgvector, streaming endpoint that speaks the contract, model connector interface with a capability matrix, tool registry with the permission engine and approval flow, MCP client manager, memory service, projects and file storage, usage tracking, audit log.
- Done when: contract tests pass against both the mock and the real backend, and fixtures replay end to end.

### Phase 4, agent runtime and router (L)
- Staged agents with a shared board and hand-offs, background and scheduled runs through a queue, router L1, evaluation harness, observability (Langfuse or OpenTelemetry).
- Done when: the router meets precision and recall targets on the golden set, and team runs are traceable end to end.

### Phase 5, frontend migration to a maintainable codebase (L)
- Next.js, TypeScript, Tailwind, AI SDK 6 and AI Elements. Screens ported from the prototype using fixtures. Visual regression and Playwright end to end. The prototype stays as the visual spec.
- Timing is decision D1.

### Phase 6, skills and workflows (L)
- Skill importer, validator and manager; dependency graph; compatibility engine; workflow engine (sequential, branches, retries, persisted state); Compose canvas; isolated execution (E2B or Modal) with resource limits; import safety (pinned versions, provenance, change review).

### Phase 7, ecosystem (XL)
- Community publishing with automated checks and review, Lab, Forge, Benchmark, Graph, Academy, Recipes (blueprint 2).

### Phase 8, launch and operations (M)
- Self-hosting with docker compose, docs site, billing, rate limits and abuse controls, security review, service-level objectives, status page.

## 6. Cross-cutting

- **Security.** Prompt injection from web and tool output. Secrets only on the server. Permissions enforced server-side. Audit log for every tool run, with the approval state. The client-side passcode is replaced by real session locking. Skill and library imports are inspected and pinned.
- **Testing.** Unit tests for event-to-status mapping, contract tests, Playwright end to end on recorded runs, visual regression, evals for router and agents, load tests for streaming.
- **Performance budgets.** Time to first token, frame time, bundle size, DOM node cap with virtualised long chats.
- **Accessibility.** WCAG 2.2 AA, live regions for status, keyboard operation for sheets, reduced motion.
- **Cost control.** Per-turn budgets, caching, a cheap router model, and a warning before a team run ("this will make about N model calls").

## 7. Decisions needed (with my recommendation)

1. **D1, when to migrate off the single file.** Recommend: finish Phase 2 in the prototype (it is the only place the live Claude connection works as a preview), then migrate alongside the backend.
2. **D2, licence.** MIT is simplest. Apache-2.0 adds a patent grant. AGPL discourages closed hosted forks. Recommend Apache-2.0 or MIT.
3. **D3, status line for solo runs too?** Recommend yes.
4. **D4, auto-team default.** Recommend Ask.
5. **D5, approval defaults.** Recommend ask for web search, and always ask for any tool that sends, writes or deletes.
6. **D6, router in the prototype.** Recommend L0 and L3 now, L1 with the backend.
7. **D7, repo workflow.** Recommend pushing through Claude Code connected to GitHub, on a branch, with pull requests to main.
8. **D8, name and mascot distance from OpenClaw.** Decide before any public launch.
9. **D9, launch auth and billing.** Which sign-in methods, and when billing starts.
10. **D10, hosting.** Confirm Vercel (web), Railway (api), Supabase (data).

## 8. Constraints and risks

- The prototype cannot hold secrets or run a server. Real streaming, accounts, share links and server security all need Phase 3.
- A team run makes many model calls, so it is slower and costs more than a normal reply.
- In live mode there is no reasoning stream to show. A backend with reasoning parts fixes that.
- Agents currently collaborate in rounds, not by interrupting each other. True mid-task conversation needs the Phase 4 runtime.
- Similarity to OpenClaw means constant comparison. Differentiate on safety, explainability and the resource model.

## 9. Proposed first three build sessions after approval

- **Session A:** Phase 0 and Phase 1 (decisions, contract, fixtures, adapter).
- **Session B:** 2a and 2b (status line and ticker, routing with the `why` display).
- **Session C:** 2c and 2d (Tools and Connections, Projects).

## 10. Approval checklist

- [x] Section 3.1 status line and ticker approved (or edited)
- [x] Section 3.2 routing approved (or edited)
- [x] Phases and order approved (or edited)
- [x] Section 7 decisions answered
- [x] Go for Session A
