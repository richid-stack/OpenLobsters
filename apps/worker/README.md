# Execution workers and job runner

**Status:** 📋 Planned  ·  **Plan name:** Execution Workers  ·  **Milestone:** M3 to M6

Runs work that should not happen inside a web request: long tasks, scheduled workflows, browser automation, Python and document processing in isolated environments.

## What exists today

Nothing. Tools run inside the request that asked for them, which is fine for parsing a table and writing a small workbook, and not fine for anything long.

## Responsibilities

- Pull jobs from a queue and run them with a time and memory budget
- Isolate each job according to its risk (browser, Python, documents)
- Report progress and artifacts back through the same event stream the interface already reads
- Run scheduled workflows

## Interface (proposed, not implemented)

```ts
// Proposed.
type Job = { id: string; taskId: string; userId: string; kind: 'tool' | 'workflow' | 'schedule'; budget: { seconds: number; memoryMb: number }; input: unknown }
interface Queue { enqueue(job: Job): Promise<void>; claim(workerId: string): Promise<Job | null>; complete(id: string, result: unknown): Promise<void> }
```

## Depends on

- packages/orchestrator
- packages/tool-registry
- packages/artifacts

## Security notes

- Workers get short-lived credentials for one job only.
- No worker can reach another person's files or keys.
- Untrusted code runs without network access unless the tool needs it.

## Done when

- [ ] A job survives a server restart
- [ ] A job that exceeds its budget is stopped and reported, not left running
- [ ] Two people's jobs cannot see each other's data (tested)

## Not in scope

- Choosing a queue product before the first long task exists

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
