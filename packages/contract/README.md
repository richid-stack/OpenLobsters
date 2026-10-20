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
