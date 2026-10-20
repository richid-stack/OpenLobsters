# The event contract

The frontend renders a stream of typed events. A mock, a recorded run and the real backend all produce the same events, so they all look identical.

## Events
`run.start`, `text.delta`, `reasoning.delta`, `reasoning.end`, `status`, `tool.call`, `source`, `team.plan`, `agent.update`, `handoff`, `approval.request`, `approval.response`, `usage`, `error`, `run.end`.

Every event carries `v` (always 1), `seq` (0-based, gapless), `ts` (ms) and `run`.

`tool.call` and `agent.update` are upserts: the same `call` or `agent` id appears several times as its state advances.
Tool states: `input-streaming`, `awaiting-approval`, `running`, `done`, `error`, `denied`.

## Semantic rules (both validators)
Starts with `run.start`, ends with `run.end`. `seq` equals position. `ts` never goes backwards. One run id. Tool states follow the allowed transitions. An approval request needs a prior `awaiting-approval`. A tool only runs after an allowing response, and is denied only after a deny. Sources are numbered 1, 2, 3 without gaps and a tool may only cite sources that exist. One `team.plan`. Agents start as `running` and stay in the plan. Every tool finishes.

## Recording a run
Prototype, Settings, Developer mode, **Export last run (JSONL)**. The exporter rebuilds contract events from the finished message. Drop the file in `packages/contract/fixtures/` and both test suites validate it.

## Replaying a run
Developer mode, **Replay a recorded run**. Events go through `applyEvent` into the same message model and renderer as a live reply. `tlSig` gives a timeline signature, so a replay can be compared with the run it came from.

## Phase 1 limits
The live and demo engines still build the message model directly. The adapter proves the contract by round trip (state to events to state gives an identical timeline) but the engines do not emit events yet. That is the first step of Phase 2. Demo-source flags are not part of the contract.
