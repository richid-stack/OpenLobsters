# ADR 0005: Approvals are recorded by the server from its own response stream

**Status:** Accepted

## Context

The browser sends the whole conversation back, including any approval. An early version recorded the approval inside the tool's approval rule; the SDK evaluates that rule again when replaying a conversation, so a forged "approved" call approved itself and created a file. Unit tests missed it; a browser test caught it.

## Decision

The server writes down an approval request only when it sends one: it watches its own stream for the tool input and the approval request. A tool with side effects runs only if it finds a matching, unused, fresh record for the same person, tool and input fingerprint. The approval rule itself has no side effects.

## Consequences

Forged, edited, replayed and borrowed approvals do not run. The cost: a small amount of state, and every new risky tool must go through the same path.
