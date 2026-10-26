# Running it for real

Status: 🚧 it runs on one machine. Anything beyond that is planned.

## Three ways to run it

| Mode | What it is | Status |
|---|---|---|
| **Development** | `npm install`, `npm run dev`. Local SQLite, a built-in demo model, no accounts needed | ✅ |
| **Single machine (self-hosted)** | One process, one SQLite file, one folder of files, behind a reverse proxy that does HTTPS | 🚧 works; no Docker image, no backup tooling yet |
| **Hosted, several machines** | Postgres, object storage, a shared rate-limit store, a job queue and worker processes, proper monitoring | 📋 |

## Single machine: what you need

1. Build: `npm run build`, run the output (`.output/server/index.mjs`).
2. Set `BETTER_AUTH_SECRET` (32+ random characters) and `OPENLOBS_BASE_URL` (your `https` address). The server refuses to start without them in production.
3. Put it behind a reverse proxy that terminates HTTPS. Set `OPENLOBS_TRUST_PROXY=1` only when that proxy sets the forwarded address.
4. Set up email (`OPENLOBS_SMTP_URL`, `OPENLOBS_MAIL_FROM`) if people will create accounts, so addresses are confirmed and password reset works.
5. Back up `data/openlobs.db` and `data/artifacts` together, on a schedule you have tested restoring from.
6. Decide on model keys: let each person bring their own (default) or set `OPENLOBS_<PROVIDER>_API_KEY` on the server.
7. Decide whether models on private networks (for example Ollama on the same machine) are allowed: `OPENLOBS_ALLOW_LOCAL_MODELS`.

Full list of settings: `apps/web/.env.example`.

## What limits it to one machine today

| Piece | Why | Fix |
|---|---|---|
| SQLite | One writer, one file | Postgres behind the same store interfaces |
| Files on local disk | Not shared between machines | Object storage behind `ArtifactStore` |
| Rate limiting and the approval ledger in memory or SQLite | Not shared | A shared store such as Redis, or Postgres |
| Everything runs in the web process | No long jobs, no isolation | Workers and a queue (`apps/worker`) |
| Sign-in provider discovery at start | A provider that is down is skipped until restart | Retry discovery in the background |

## Observability (planned, M3)

Today there are console logs. Needed before anyone depends on this: a request id on every log line, structured logs, counters (requests, errors, tool runs, verification failures, model errors, cost), error reporting, and a health endpoint that checks the database and file store.

## Releases and change

- Versioned migrations (see `backend.md`), tested by upgrading a copy of a real database.
- A changelog people can read.
- A staging environment that runs the browser suites before a release.

## Cost awareness

The app itself is light. Costs come from the model provider (the person's own key by default) and storage. Usage and cost per request are planned (`usage_event`) so a person and an operator can see them.
