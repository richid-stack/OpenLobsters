# ADR 0010: Planned modules are documented folders, never placeholder code

**Status:** Accepted

## Context

People should be able to see the whole project, but empty stubs make a project look further along than it is and go stale.

## Decision

Every planned module has a README stating its purpose, proposed interface, security notes, done-when and the word "Planned". It has no code. A module's status changes in the same pull request that changes its code.

## Consequences

An honest map. The cost: the map needs maintenance (the module index is the checklist).
