# Mock API for the event contract

**Status:** ✅ Built  ·  **Plan name:** (supporting)  ·  **Milestone:** M0

A small Python server that replays recorded runs in the original event format. It was used to build the first prototype and to test the contract.

## What exists today

Complete as a test aid. The real app (`apps/web`) does not use it.

## Responsibilities

- Replay recorded runs over server-sent events
- Check that the contract schemas accept real-looking runs

## Interface today

See its own `main.py` and tests.

## Depends on

- packages/contract

## Security notes

- Not for production. It has no sign-in.

## Done when

- [ ] Kept only while the contract still has a second implementation to compare against

## Not in scope

- Becoming the real backend

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
