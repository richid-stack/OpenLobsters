# Model connectors

**Status:** 🚧 Partly built  ·  **Plan name:** Model connectors (blueprint 1, system 7)  ·  **Milestone:** M1 (done), M3 (usage and routing)

Lets people use any model from any provider with their own key: OpenAI, Anthropic, Google, OpenRouter, Groq, Mistral, DeepSeek, xAI, Together, Fireworks, Cerebras, DeepInfra, Ollama, LM Studio and any OpenAI-compatible address.

## What exists today

`apps/web/shared/providers.ts` (the catalog), `apps/web/server/providers/` (resolve a model, list models, network guard, key redaction), routes `/api/providers`, `/api/providers/models`, `/api/providers/test`. Keys stay in the browser. Tested end to end against a fake provider; the native OpenAI, Anthropic and Google adapters have not been run against the real services.

## Responsibilities

- Build a model from a selection and a key
- List models from the provider and read their capabilities (tools, reasoning, context) where the provider says
- Test a connection, including a real tool-call probe
- Refuse dangerous addresses (private networks, cloud metadata)

## Interface today

`resolveModel(selection, env)` returns a model, whether it supports tools, a label, and the secrets to redact.

## Depends on

- packages/security

## Security notes

- A key is used for one request and never stored by the server unless the operator sets it in the environment.
- Errors are stripped of keys before they reach the browser.

## Done when

- [ ] Each native adapter run once against the real service
- [ ] Usage and cost recorded per request
- [ ] Fallback between models when one fails

## Not in scope

- Hosting models

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
