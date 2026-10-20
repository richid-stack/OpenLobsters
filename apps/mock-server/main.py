"""Mock OpenLobs API. Replays recorded runs as Server-Sent Events, validating every event against the contract."""
import asyncio, json, os, uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from openlobs_contract import dump_event, parse_event, validate_run

FIX = Path(os.environ.get("OPENLOBS_FIXTURES", Path(__file__).resolve().parents[2] / "packages/contract/fixtures"))
app = FastAPI(title="OpenLobs mock API", version="1.0.0")


def names() -> list[str]:
    return sorted(p.name[:-6] for p in FIX.glob("*.jsonl"))


def load(name: str) -> list[dict]:
    f = FIX / f"{name}.jsonl"
    if not f.is_file():
        raise HTTPException(404, f"unknown fixture {name!r}")
    evs = [json.loads(l) for l in f.read_text().splitlines() if l.strip()]
    problems = validate_run([parse_event(e) for e in evs])
    if problems:
        raise HTTPException(500, f"fixture {name} violates the contract: {problems[:3]}")
    return evs


class Msg(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    chatId: Optional[str] = None
    projectId: Optional[str] = None
    agents: Optional[list[str]] = None
    options: Optional[dict] = None
    messages: list[Msg]


class Approval(BaseModel):
    run: str
    call: str
    decision: str


def pick(req: ChatRequest, fixture: Optional[str]) -> str:
    if fixture:
        return fixture
    if req.agents:
        return "team.staged"
    if req.options and req.options.get("web") is False:
        return "approval.denied"
    return "solo.search"


@app.get("/v1/fixtures")
def fixtures():
    return {"fixtures": names()}


@app.post("/v1/chat/stream")
async def chat_stream(req: ChatRequest, fixture: Optional[str] = None, speed: float = 1.0):
    evs = load(pick(req, fixture))
    run = "run_" + uuid.uuid4().hex[:10]

    async def gen():
        prev = evs[0]["ts"]
        for e in evs:
            await asyncio.sleep(min(0.9, max(0.0, (e["ts"] - prev) / 1000 / max(speed, 0.01))))
            prev = e["ts"]
            out = dump_event(parse_event({**e, "run": run}))
            yield f"data: {json.dumps(out, separators=(',', ':'))}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.post("/v1/approvals")
def approvals(a: Approval):
    if a.decision not in ("once", "always", "deny"):
        raise HTTPException(422, "decision must be once, always or deny")
    return {"ok": True, "run": a.run, "call": a.call, "decision": a.decision}


@app.post("/v1/runs/{run}/stop")
def stop(run: str):
    return {"ok": True, "run": run}


@app.get("/v1/resources/{type}")
def resources(type: str, q: Optional[str] = None, limit: int = 25):
    sample = json.loads((FIX / "resources.sample.json").read_text())
    if type not in sample:
        raise HTTPException(404, f"unknown resource type {type!r}")
    items = [sample[type]]
    if q:
        items = [i for i in items if q.lower() in json.dumps(i).lower()]
    return {"type": type, "items": items[:limit]}
