# ADR 0004: Model keys live in the browser

**Status:** Accepted

## Context

OpenLobs is model-agnostic and open. Holding every person's provider keys on a server makes the server a bigger target and makes us responsible for them.

## Decision

By default a person's key stays in their browser and travels with each request; the server uses it once and never stores it. An operator may instead set keys in the server environment. Keys are removed from all error text.

## Consequences

Smaller blast radius and nothing to leak from the database. The cost: a script running in the page could read the key, so a content security policy and limited keys matter (listed in `security.md`).
