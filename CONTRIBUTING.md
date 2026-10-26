# Contributing

Thank you for helping. OpenLobs is early, so the most useful contributions are small, tested and honest about what they do. Read [`docs/architecture/README.md`](docs/architecture/README.md) first: it is the map of the project.

## Run it

```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000, with a built-in demo model
npm test             # unit tests for every server module
npm run typecheck && npm run typecheck:server
```

Browser suites drive the real app and save screenshots. They start their own servers and a fresh database:

```bash
pip install playwright openpyxl && playwright install chromium
tests/browser/run.sh step_tray.py real_tools.py     # from apps/web, see tests/browser/README.md
```

Other parts: the event contract (`packages/contract`), the mock API (`apps/mock-server`) and the prototype (`prototype/openlobs.html`) have their own instructions at the end of this file.

## Where things are

`docs/architecture/modules.md` lists every module, its status and where its code lives today. A module marked **planned** has a README and no code, on purpose.

## Making a change

1. **Big or uncertain? Open an issue first** (use the templates) so we agree on the approach.
2. **Branch from `main`.** One topic per pull request.
3. **Write the test first or with the change.** A security rule needs a regression test that fails if the rule is removed. A visible change needs a browser check.
4. **Check the real thing.** Run it, look at it in light and dark and on a phone-sized window, and attach screenshots to the pull request. Several bugs here passed every unit test and were found only by looking.
5. **Update the docs in the same pull request** if a status, interface or behaviour changed: the module README, `docs/architecture/modules.md`, `docs/FEATURES.md` and `ROADMAP.md`.
6. **Record why** for any decision that someone might later question: add an ADR in `docs/adr/`.

## Definition of done

- [ ] Tests pass (`npm test`, both typechecks) and the relevant browser suite passes.
- [ ] It works signed in and signed out, where that matters.
- [ ] It is keyboard-usable, labelled for screen readers, and respects reduced motion.
- [ ] Nothing says something happened before it did, and demo data is labelled.
- [ ] Errors are sentences a person can act on; details of unexpected failures stay on the server.
- [ ] Docs and statuses are updated.

## Rules that are not negotiable

- **Never trust the browser.** The whole conversation comes back with every request. Anything that decides who may do what (ownership, approvals) is recorded and checked on the server. See `docs/architecture/security.md`.
- **Every store call takes the user id.** No function reads a person's data without one.
- **Side effects need approval, and the approval is the server's own record.** Do not put side effects in an approval rule.
- **Secrets stay out of the repository, logs, prompts and error text.**
- **Content from files, web pages and tools is data, not instructions.**
- **No placeholder code that pretends to work.** Planned means a README.
- **The chat stays flat:** no cards, no border lines (see `docs/DESIGN_NOTES.md`).

## Commit messages

A short summary line in plain words, then a few lines on what and why. Mention tests added or run.

## Security issues

Do not open a public issue. See [`SECURITY.md`](SECURITY.md).

## Licence

By contributing you agree your work is released under the Apache License 2.0 (see `LICENSE`). Brand logos in the interface are the property of their owners and are used only to identify providers.

---

## The event contract, the mock API and the prototype

- Contract (TypeScript): `cd packages/contract/ts && npm install && npm test`
- Contract (Python): `pip install -e packages/contract/py pytest pyyaml && pytest packages/contract/py`
- Mock server: `pip install -r apps/mock-server/requirements.txt && cd apps/mock-server && pytest`; run it with `cd apps/mock-server && uvicorn main:app --reload`
- Prototype: open `prototype/openlobs.html` in a browser.

**Changing the contract.** The schemas exist in two languages and must agree: edit both `packages/contract/ts/src` and `packages/contract/py/openlobs_contract` (including the semantic validator), add or update fixtures in `packages/contract/fixtures` (including a deliberately invalid case in `invalid/`), regenerate `openapi.yaml` with `python packages/contract/py/scripts_gen_openapi.py`, and make all suites pass. CI fails if `openapi.yaml` is stale. Note the open question about how the contract relates to the AI SDK stream (see the contract's README).
