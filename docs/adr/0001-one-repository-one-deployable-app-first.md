# ADR 0001: One repository, one deployable app first

**Status:** Accepted

## Context

We have many planned modules (Orchestrator, Bridge, connectors, workflows) and a small team. Splitting everything into separate services now would multiply setup, deployment and coordination cost before any module has a second user.

## Decision

Keep a single repository. Build `apps/web` as the one deployable (interface plus server). Each planned module has a folder with a README that defines its purpose, interface and status. Code is extracted into `packages/*` only when a second consumer needs it (for example the Bridge needing the protocol types).

## Consequences

Fast to change and to run. The cost: modules are folders inside the app for now, so boundaries rely on discipline and interfaces until extraction. The module index says where each module's code lives today.
