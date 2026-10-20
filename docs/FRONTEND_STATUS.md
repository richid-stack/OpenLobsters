# Frontend status

## Real in the prototype
- Live replies and web search when opened as a Claude artifact (Claude and Parallel Search connectors).
- Tool approvals (allow once, always allow, deny), per-tool setting, reset.
- Timeline: thinking rows, tool rows, sources, all collapsed when the reply ends.
- Agent teams: staged plan, per-agent tools, hand-offs, Team room sheet, final synthesis.
- Sources: stacked row, bottom sheet with searches, cited vs found, copy as Markdown.
- Memory, projects (names only), settings, export, landing and sign-up (local only).

- Contract adapter: `applyEvent`, `exportRun`, `tlSig` and a replay player. Five recorded runs can be replayed from Developer mode.

## Stand-ins (need the backend)
- Accounts and sign-in are local to the browser. No Google or Apple sign-in.
- Share links and QR codes do not point at a hosted page.
- The passcode lock is client-side only and is not security.
- The model picker does not switch the live model.
- Projects do not yet carry instructions or files.
- Scheduled prompts only run while the page is open.
- Reasoning text is only shown in demo mode; live mode has no reasoning stream.
- Demo replies are scripted.
