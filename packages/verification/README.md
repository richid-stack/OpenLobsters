# Verification Engine

**Status:** 🚧 Partly built  ·  **Plan name:** Verification Engine  ·  **Milestone:** M2 (spreadsheets done), M3 onward

Decides whether the requested outcome was actually achieved, using a method suited to the kind of output.

## What exists today

One real verifier: `apps/web/server/artifacts/workbook.ts`. It opens the saved workbook again and compares it with what was asked for (fingerprint, sheets, every value, live total formulas and their values, error cells, text never stored as a formula). Tested by editing a stored file and checking the report.

## Responsibilities

- Pick a verifier by output type
- Return a list of named checks, each passed or failed with a plain explanation
- Never report success without a check that could have failed

## Interface (current)

```ts
// Current shape (spreadsheets). Proposed: make this generic.
type Check = { label: string; passed: boolean; detail: string }
type VerifyResult = { status: 'passed' | 'failed'; checks: Check[] }
interface Verifier<Spec> { id: string; verify(bytes: Uint8Array, spec: Spec, expectedHash?: string): Promise<VerifyResult> }
```

## Depends on

- packages/artifacts

## Security notes

- Verifiers read the stored bytes, not what the creating tool claims.

## Done when

- [ ] Verifiers for documents, presentations, code (tests), images and browser pages
- [ ] A way to say what "done" means before the work starts (success criteria)
- [ ] An evaluation set of known-good and known-bad outputs

## Not in scope

- Judging whether the request was the right request

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
