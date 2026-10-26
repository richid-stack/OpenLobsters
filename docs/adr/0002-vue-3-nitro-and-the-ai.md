# ADR 0002: Vue 3, Nitro and the AI SDK

**Status:** Accepted (replaces the web stack in D1 and D10 of `docs/DECISIONS.md`)

## Context

The original plan named Next.js and FastAPI with Vercel, Railway and Supabase. We already knew the Vue and Nitro design language well, and the AI SDK handles streaming, reasoning, tool calls and approvals with the same message format on both sides.

## Decision

Use Vue 3 with Vite, Nuxt UI and Tailwind for the interface, Nitro routes for the server in the same project, and the AI SDK for the model loop. Hosting is open (any Node host), not tied to a vendor.

## Consequences

One language, one project, one dev command. The cost: a Python-based agent runtime would be a separate service if we ever need one. The event contract in `packages/contract` has to be reconciled with the AI SDK stream (open question in its README).
