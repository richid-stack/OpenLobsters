# Task Orchestrator

**Status:** 📋 Planned  ·  **Plan name:** OpenLobs Orchestrator  ·  **Milestone:** M3

Turns a request into a task with steps, runs them, tracks state, handles errors, asks for approval, and decides when the task is done. It chooses models, skills and tools, and chooses where each runs (server, connector, worker, Bridge).

## What exists today

A thin version: the AI SDK's tool loop with a limit of 8 steps, inside `apps/web/server/routes/api/chat.post.ts`. There is no task record, plan, budget, retry policy, cancellation or router.

## Responsibilities

- Create a task with a goal, success criteria and a budget (time, steps, cost)
- Plan steps and keep state: queued, running, waiting for approval, verifying, done, failed, cancelled
- Route each step to the right place (server, connector, worker, Bridge) using the Tool Registry
- Retry with limits, stop on budget, and always allow cancel
- Never treat a tool call that returned as proof of success: ask the Verification Engine

## Interface (proposed, not implemented)

```ts
// Proposed.
type Task = { id: string; userId: string; chatId?: string; goal: string; success: Criterion[]; budget: Budget; state: TaskState; createdAt: number }
type TaskState = 'queued' | 'planning' | 'running' | 'waiting-approval' | 'verifying' | 'succeeded' | 'failed' | 'cancelled'
type Budget = { maxSteps: number; maxSeconds: number; maxCostUsd?: number }
interface Orchestrator { start(input: StartTask): Promise<Task>; cancel(id: string): Promise<void>; events(id: string): AsyncIterable<TaskEvent> }
```

## Depends on

- packages/tool-registry
- packages/model-connectors
- packages/verification
- packages/security

## Security notes

- Approvals are recorded from what the server sent, never from what the browser returns.
- Budgets are enforced by the server, not requested of the model.
- Content from tools, files and web pages is data. It never becomes instructions.

## Done when

- [ ] Every run is a stored task with a state history
- [ ] Cancel works at every state
- [ ] A run that exceeds its budget stops and says so

## Not in scope

- Agent teams and skills (`packages/skills`, M7)

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
