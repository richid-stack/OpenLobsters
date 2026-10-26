# Skills and agents

**Status:** 📋 Planned  ·  **Plan name:** Skills (blueprint 1, system 2), Skills Studio, agent teams  ·  **Milestone:** M7

A skill is a package of instructions, examples and tool needs that teaches OpenLobs how to do one kind of job well. Agent teams combine skills and tools with a clear hand-off.

## What exists today

Nothing here. (An earlier, separate app has 24 text-only skills that can inform the format.)

## Responsibilities

- Define a skill format with tests that show it works
- Load skills on demand rather than all at once
- Let people create, test and share skills
- Run agent teams with clear roles and budgets

## Interface today

Not implemented.

## Depends on

- packages/orchestrator
- packages/tool-registry

## Security notes

- A skill can only use tools the person has allowed.
- Shared skills are reviewed before they can ask for risky tools.

## Done when

- [ ] A skill with a test runs and passes in CI
- [ ] A skill can be installed and removed

## Not in scope

- A marketplace before skills have tests

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
