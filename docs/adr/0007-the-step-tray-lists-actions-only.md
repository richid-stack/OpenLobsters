# ADR 0007: The step tray lists actions only

**Status:** Accepted

## Context

Counting reasoning as a step made a plain reply look like it had something to open, and the tray list became noisy.

## Decision

The status line is one line; tapping it opens a tray of the actions taken (tool calls). Reasoning keeps its own collapsed row above the answer. The count shows only while a run is live.

## Consequences

A shorter, more useful list. The cost: reasoning is not reachable from the tray.
