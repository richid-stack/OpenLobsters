"""Typed event stream. Mirrors packages/contract/ts/src/events.ts rule for rule."""
from __future__ import annotations

import json
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


class Base(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class EventBase(Base):
    v: Literal[1]
    seq: int = Field(ge=0)
    ts: int = Field(ge=0)
    run: str = Field(min_length=1)


ToolState = Literal["input-streaming", "awaiting-approval", "running", "done", "error", "denied"]
AgentState = Literal["running", "done", "error"]
Decision = Literal["once", "always", "deny"]
NonEmpty = Annotated[str, Field(min_length=1)]


class RunStart(EventBase):
    type: Literal["run.start"]
    engine: Literal["live", "demo", "replay"]
    model: Optional[str] = None


class TextDelta(EventBase):
    type: Literal["text.delta"]
    text: str


class ReasoningDelta(EventBase):
    type: Literal["reasoning.delta"]
    block: NonEmpty
    text: str


class ReasoningEnd(EventBase):
    type: Literal["reasoning.end"]
    block: NonEmpty
    seconds: float = Field(ge=0)


class Status(EventBase):
    type: Literal["status"]
    text: NonEmpty
    kind: Optional[Literal["info", "attention", "error"]] = None


class ToolCall(EventBase):
    type: Literal["tool.call"]
    call: NonEmpty
    tool: NonEmpty
    state: ToolState
    query: Optional[str] = None
    why: Optional[str] = None
    by: Optional[str] = None
    sources: Optional[list[Annotated[int, Field(gt=0)]]] = None
    durationMs: Optional[int] = Field(default=None, ge=0)
    error: Optional[str] = None


class Source(EventBase):
    type: Literal["source"]
    n: int = Field(gt=0)
    kind: Literal["web", "chat"]
    title: str
    domain: str
    url: Optional[str] = None
    snippet: Optional[str] = None
    date: Optional[str] = None
    query: Optional[str] = None
    by: Optional[str] = None
    chatId: Optional[str] = None


class TeamPlan(EventBase):
    type: Literal["team.plan"]
    agents: list[NonEmpty] = Field(min_length=1)
    stages: list[Annotated[list[NonEmpty], Field(min_length=1)]] = Field(min_length=1)
    lead: str


class AgentUpdate(EventBase):
    type: Literal["agent.update"]
    agent: NonEmpty
    state: AgentState
    task: Optional[str] = None
    message: Optional[str] = None
    findings: Optional[str] = None
    durationMs: Optional[int] = Field(default=None, ge=0)


class Handoff(EventBase):
    type: Literal["handoff"]
    from_: NonEmpty = Field(alias="from")
    to: NonEmpty
    note: Optional[str] = None


class ApprovalRequest(EventBase):
    type: Literal["approval.request"]
    call: NonEmpty
    tool: NonEmpty
    query: Optional[str] = None
    why: Optional[str] = None


class ApprovalResponse(EventBase):
    type: Literal["approval.response"]
    call: NonEmpty
    decision: Decision


class Usage(EventBase):
    type: Literal["usage"]
    inputTokens: int = Field(ge=0)
    outputTokens: int = Field(ge=0)
    calls: int = Field(ge=0)
    costUsd: Optional[float] = Field(default=None, ge=0)


class Error(EventBase):
    type: Literal["error"]
    code: NonEmpty
    message: str
    retryable: bool


class RunEnd(EventBase):
    type: Literal["run.end"]
    reason: Literal["complete", "stopped", "error"]


Event = Annotated[
    Union[RunStart, TextDelta, ReasoningDelta, ReasoningEnd, Status, ToolCall, Source, TeamPlan,
          AgentUpdate, Handoff, ApprovalRequest, ApprovalResponse, Usage, Error, RunEnd],
    Field(discriminator="type"),
]
_adapter = TypeAdapter(Event)


def parse_event(x: dict) -> EventBase:
    return _adapter.validate_python(x)


def parse_jsonl(text: str) -> list[EventBase]:
    return [parse_event(json.loads(l)) for l in text.splitlines() if l.strip()]


def dump_event(e: EventBase) -> dict:
    return e.model_dump(by_alias=True, exclude_none=True)


_NEXT = {
    "": ["input-streaming", "awaiting-approval", "running"],
    "input-streaming": ["awaiting-approval", "running", "error"],
    "awaiting-approval": ["running", "denied"],
    "running": ["done", "error"],
    "done": [], "error": [], "denied": [],
}


def validate_run(events: list[EventBase]) -> list[str]:
    """Semantic rules a run must satisfy. Returns a list of problems, empty when valid."""
    errs: list[str] = []
    if not events:
        return ["run is empty"]
    if events[0].type != "run.start":
        errs.append("first event must be run.start")
    if events[-1].type != "run.end":
        errs.append("last event must be run.end")
    calls: dict[str, str] = {}
    asked: set[str] = set()
    answered: dict[str, str] = {}
    ended: set[str] = set()
    plan: Optional[list[str]] = None
    n_src = 0
    last = 0
    agent_state: dict[str, str] = {}
    for i, e in enumerate(events):
        if e.seq != i:
            errs.append(f"seq {e.seq} at position {i}")
        if e.run != events[0].run:
            errs.append(f"run id changes at seq {e.seq}")
        if e.ts < last:
            errs.append(f"ts goes backwards at seq {e.seq}")
        last = e.ts
        t = e.type
        if t == "tool.call":
            prev = calls.get(e.call, "")
            if e.state not in _NEXT[prev]:
                errs.append(f"tool {e.call}: {prev or 'start'} -> {e.state} is not allowed")
            if e.state == "running" and prev == "awaiting-approval":
                d = answered.get(e.call)
                if not d or d == "deny":
                    errs.append(f"tool {e.call} runs without an allowing response")
            if e.state == "denied" and answered.get(e.call) != "deny":
                errs.append(f"tool {e.call} denied without a deny response")
            for n in e.sources or []:
                if n > n_src:
                    errs.append(f"tool {e.call} cites source {n} before it exists")
            calls[e.call] = e.state
        elif t == "approval.request":
            if calls.get(e.call) != "awaiting-approval":
                errs.append(f"approval.request for {e.call} without awaiting-approval")
            asked.add(e.call)
        elif t == "approval.response":
            if e.call not in asked:
                errs.append(f"approval.response for {e.call} without a request")
            answered[e.call] = e.decision
        elif t == "source":
            if e.n != n_src + 1:
                errs.append(f"source numbering: expected {n_src + 1}, got {e.n}")
            n_src = max(n_src, e.n)
        elif t == "team.plan":
            if plan:
                errs.append("team.plan appears twice")
            plan = e.agents
        elif t == "agent.update":
            if plan and e.agent not in plan:
                errs.append(f"agent {e.agent} is not in the plan")
            p = agent_state.get(e.agent)
            if not p and e.state != "running":
                errs.append(f"agent {e.agent} starts as {e.state}")
            if p and p != "running":
                errs.append(f"agent {e.agent} updated after {p}")
            agent_state[e.agent] = e.state
        elif t == "handoff":
            if plan and (e.from_ not in plan or e.to not in plan):
                errs.append("handoff between agents not in the plan")
        elif t == "reasoning.end":
            if e.block in ended:
                errs.append(f"reasoning block {e.block} ends twice")
            ended.add(e.block)
    for cid, s in calls.items():
        if s not in ("done", "error", "denied"):
            errs.append(f"tool {cid} never finished ({s})")
    return errs
