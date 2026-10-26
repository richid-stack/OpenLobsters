# @openlobs/contract

The typed event stream and resource schemas the UI draws. One definition per language, kept in agreement by shared fixtures.

| Path | Purpose |
| --- | --- |
| `ts/src/events.ts`, `resources.ts` | zod schemas and the semantic run validator |
| `py/openlobs_contract/` | Pydantic twin, same rules |
| `fixtures/*.jsonl` | Recorded and authored runs. Every one must validate in both languages |
| `fixtures/invalid/` | Cases that must be rejected, with the error each run must produce |
| `openapi/openapi.yaml`, `schema/` | Generated from the Pydantic models |

See `docs/CONTRACT.md`.


---
**Architecture status:** 🚧 Partly built. Typed definitions, in TypeScript and Python, of the events a run produces and the resources around it (tasks, tools, artifacts), with fixtures and a generated API description. See [`docs/architecture/modules.md`](../../docs/architecture/modules.md).
