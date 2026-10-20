# Decisions

Accepted on 2026-10-18. Each decision uses the recommendation from `PLAN.md` section 7. Change one by adding a new entry that supersedes it.

| ID | Decision | Why |
| --- | --- | --- |
| D1 | Finish Phase 2 in the single-file prototype. Migrate to Next.js alongside the backend (Phase 5). | The prototype is the only place the live Claude connection previews. |
| D2 | **Apache-2.0.** See `LICENSE`. | Permissive, with an explicit patent grant. Switching to MIT later is easy before outside contributions arrive. |
| D3 | The live status line and ticker also cover solo runs. | One consistent "what is it doing" surface. |
| D4 | Auto-team default is **Ask** ("Use Researcher and Writer?"). | Team runs cost several model calls, so the user opts in. |
| D5 | Ask before web search. Always ask for any tool that sends, writes or deletes. | Matches the security-first principle. |
| D6 | The prototype gets routing layers L0 (rules) and L3 (policy) now. L1 (router model) arrives with the backend. | Keeps the prototype light and avoids an extra model call per message. |
| D7 | Push through Claude Code connected to GitHub, on a branch, with pull requests into `main`. | The chat sandbox has no GitHub credentials. |
| D8 | Name and mascot distance from OpenClaw: decide before any public launch. | No action needed in Phases 0 to 4. |
| D9 | Launch sign-in: email plus Google. Billing is decided in Phase 8. | Deferred. These are defaults, not commitments. |
| D10 | Hosting: Vercel (web), Railway (api), Supabase (data). | The existing stack. |
