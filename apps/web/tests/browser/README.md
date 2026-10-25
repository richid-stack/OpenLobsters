# Browser tests

End-to-end checks that drive the real app in a real browser (Chromium through Playwright) and save screenshots.
They are not part of `npm test` because they start servers and take minutes.

| Script | What it proves |
|---|---|
| `demo_flow.py` | The whole chat flow with approvals, in light and dark, on a phone and on a desktop, including denying an action |
| `step_tray.py` | The status line and step tray: opening, jumping to steps and approvals, drag and Escape, focus, hit-testing (23 checks) |
| `models.py` | Adding a provider, fetching models, testing a connection, chatting through it, the missing-key error |
| `logos.py` | Provider and model logos in the picker and the Models screen |
| `accounts.py` | Sign-up, saved chats, reload, isolation between people, wrong password, sign-in through OpenID Connect, sign-out (10 checks) |
| `real_tools.py` | The real file flow: approval, creation, download opened by a different program (openpyxl), a forged approval refused, an altered file reported honestly, other people and signed-out visitors (26 checks) |

Run from `apps/web`: `tests/browser/run.sh step_tray.py real_tools.py`. Screenshots go to `./shots` (or `$SHOTS_OUT`).
`accounts.py` and `real_tools.py` both create the same people, so run them in separate invocations.
