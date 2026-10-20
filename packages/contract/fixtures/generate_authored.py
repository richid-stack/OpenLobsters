"""Generates the hand-authored fixtures. Captured runs come from the prototype (see docs/CONTRACT.md)."""
import json, pathlib
HERE = pathlib.Path(__file__).parent
T0 = 1760000000000

class Run:
    def __init__(self, run): self.run, self.t, self.ev = run, T0, []
    def add(self, type, dt=120, **kw):
        self.t += dt
        self.ev.append({"v": 1, "seq": len(self.ev), "ts": self.t, "run": self.run, "type": type, **kw})
        return self
    def save(self, name):
        (HERE / name).write_text("\n".join(json.dumps(e, separators=(",", ":")) for e in self.ev) + "\n")

Q = "ghana mobile money news"
SRC = [("Example result one", "example.com", "https://www.example.com/a/one", "2026-10-08"),
       ("Example result two", "docs.example.org", "https://docs.example.org/two", None),
       ("Example repo", "github.com", "https://github.com/example/repo", None)]

def sources(r):
    for i, (t, d, u, dt) in enumerate(SRC, 1):
        kw = dict(n=i, kind="web", title=t, domain=d, url=u, snippet="Sample excerpt text for " + t + ".", query=Q)
        if dt: kw["date"] = dt
        r.add("source", dt=200, **kw)

r = Run("run_approval_allowed")
r.add("run.start", engine="live", model="claude")
r.add("reasoning.delta", block="t1", text="The user wants current news, so I should search the web.")
r.add("reasoning.end", dt=400, block="t1", seconds=2)
r.add("tool.call", call="c1", tool="search_web", state="awaiting-approval", query=Q, why="Your question needs current information")
r.add("approval.request", call="c1", tool="search_web", query=Q, why="Your question needs current information")
r.add("approval.response", dt=2500, call="c1", decision="once")
r.add("tool.call", dt=50, call="c1", tool="search_web", state="running", query=Q)
sources(r)
r.add("tool.call", dt=100, call="c1", tool="search_web", state="done", query=Q, sources=[1, 2, 3], durationMs=900)
r.add("text.delta", text="Here is a summary drawn from the results [1]. ")
r.add("text.delta", text="A second point is backed by two more sources [2][3].")
r.add("usage", inputTokens=812, outputTokens=64, calls=2)
r.add("run.end", reason="complete")
r.save("approval.allowed.jsonl")

r = Run("run_approval_denied")
r.add("run.start", engine="live", model="claude")
r.add("tool.call", call="c1", tool="search_web", state="awaiting-approval", query=Q, why="Your question needs current information")
r.add("approval.request", call="c1", tool="search_web", query=Q)
r.add("approval.response", dt=1800, call="c1", decision="deny")
r.add("tool.call", dt=50, call="c1", tool="search_web", state="denied", query=Q)
r.add("text.delta", text="I was not allowed to search the web, so this comes from what I already know and may be out of date.")
r.add("usage", inputTokens=640, outputTokens=40, calls=2)
r.add("run.end", reason="complete")
r.save("approval.denied.jsonl")

# ---- deliberately invalid single events
def ok(**kw): return {"v": 1, "seq": 0, "ts": 1, "run": "r", **kw}
bad_events = [
    ("missing run", {k: v for k, v in ok(type="text.delta", text="x").items() if k != "run"}),
    ("unknown type", ok(type="text.chunk", text="x")),
    ("bad tool state", ok(type="tool.call", call="c", tool="t", state="finished")),
    ("source n is zero", ok(type="source", n=0, kind="web", title="t", domain="d")),
    ("extra field", ok(type="text.delta", text="x", extra=1)),
    ("wrong version", {**ok(type="text.delta", text="x"), "v": 2}),
    ("text.delta without text", ok(type="text.delta")),
    ("empty plan", ok(type="team.plan", agents=[], stages=[["a"]], lead="x")),
    ("bad decision", ok(type="approval.response", call="c", decision="maybe")),
    ("negative duration", ok(type="tool.call", call="c", tool="t", state="done", durationMs=-5)),
]
(HERE / "invalid").mkdir(exist_ok=True)
(HERE / "invalid" / "events.json").write_text(json.dumps([{"name": n, "event": e} for n, e in bad_events], indent=1))

def run_of(*specs, run="r"):
    evs = []
    for i, (typ, kw) in enumerate(specs):
        evs.append({"v": 1, "seq": i, "ts": 1000 + i, "run": run, "type": typ, **kw})
    return evs
start, end = ("run.start", {"engine": "live"}), ("run.end", {"reason": "complete"})
def tc(state, **kw): return ("tool.call", {"call": "c1", "tool": "search_web", "state": state, **kw})
bad_runs = [
    ("seq gap", [e if i < 2 else {**e, "seq": e["seq"] + 1} for i, e in enumerate(run_of(start, ("text.delta", {"text": "a"}), ("text.delta", {"text": "b"}), end))], "seq 3 at position 2"),
    ("tool done before running", run_of(start, tc("done"), end), "start -> done is not allowed"),
    ("response without request", run_of(start, ("approval.response", {"call": "c1", "decision": "once"}), end), "without a request"),
    ("source numbering gap", run_of(start, ("source", {"n": 2, "kind": "web", "title": "t", "domain": "d"}), end), "expected 1, got 2"),
    ("missing run.end", run_of(start, ("text.delta", {"text": "a"})), "last event must be run.end"),
    ("runs after deny", run_of(start, tc("awaiting-approval"), ("approval.request", {"call": "c1", "tool": "search_web"}), ("approval.response", {"call": "c1", "decision": "deny"}), tc("running"), tc("done"), end), "without an allowing response"),
    ("tool never finishes", run_of(start, tc("running"), end), "never finished"),
    ("cites missing source", run_of(start, tc("running"), tc("done", sources=[1]), end), "before it exists"),
]
(HERE / "invalid" / "runs.json").write_text(json.dumps([{"name": n, "events": e, "expect": x} for n, e, x in bad_runs], indent=1))

# ---- one valid and a few invalid resources
res = {
 "tool": {"id": "search_web", "name": "Search the web", "description": "Search the public web", "inputSchema": {"type": "object"}, "permissions": ["web:read"], "risk": "read", "requiresApproval": True, "executionType": "mcp", "provider": "parallel"},
 "skill": {"id": "pdf-reader", "name": "PDF reader", "description": "Reads PDFs", "version": "1.0.0", "source": {"repo": "example/skills", "commit": "abc1234", "path": "pdf"}, "tools": ["read_file"], "permissions": ["files:read"], "files": ["SKILL.md"]},
 "library": {"id": "playwright", "name": "Playwright", "description": "Browser automation", "language": "ts", "package": {"registry": "npm", "name": "playwright", "version": "1.50.0"}, "dependencies": [], "compat": {"status": "untested"}},
 "mcp": {"id": "parallel-search", "name": "Parallel Search", "url": "https://search.parallel.ai/mcp", "transport": "http", "auth": "none", "status": "connected", "tools": ["web_search", "web_fetch"]},
 "workflow": {"id": "company-research", "name": "Company research", "version": "1", "steps": [{"id": "s1", "kind": "tool", "ref": "search_web", "inputs": {}, "dependsOn": []}, {"id": "s2", "kind": "approval", "ref": "user", "inputs": {}, "dependsOn": ["s1"], "retry": {"max": 1}}]},
 "agent": {"id": "researcher", "name": "Researcher", "role": "Finds and checks sources", "instructions": "Verify facts and cite them.", "tools": ["search_web"]},
 "project": {"id": "p1", "name": "Launch plan", "instructions": "Keep answers short.", "files": [{"id": "f1", "name": "brief.md", "bytes": 1200}], "chatIds": ["c1"]},
 "memory": {"id": "m1", "text": "Prefers short answers", "scope": "user", "createdAt": "2026-10-01T00:00:00Z"},
 "permission": {"subject": "researcher", "tool": "search_web", "mode": "ask", "scope": "global"},
 "run": {"id": "run_1", "chatId": "c1", "messageId": "m1", "engine": "live", "startedAt": "2026-10-18T00:00:00Z", "usage": {"inputTokens": 10, "outputTokens": 5, "calls": 1}},
 "relationship": {"from": {"type": "skill", "id": "pdf-reader"}, "to": {"type": "tool", "id": "read_file"}, "kind": "uses"},
}
(HERE / "resources.sample.json").write_text(json.dumps(res, indent=1))
bad_res = [
 ("tool with unknown field", "tool", {**res["tool"], "colour": "red"}),
 ("tool with bad risk", "tool", {**res["tool"], "risk": "dangerous"}),
 ("skill missing source", "skill", {k: v for k, v in res["skill"].items() if k != "source"}),
 ("workflow with no steps", "workflow", {**res["workflow"], "steps": []}),
 ("mcp with bad transport", "mcp", {**res["mcp"], "transport": "carrier-pigeon"}),
 ("relationship with bad kind", "relationship", {**res["relationship"], "kind": "likes"}),
]
(HERE / "invalid" / "resources.json").write_text(json.dumps([{"name": n, "type": t, "value": v} for n, t, v in bad_res], indent=1))
print("fixtures written:", sorted(p.name for p in HERE.glob("*.jsonl")), "+ invalid/{events,runs,resources}.json + resources.sample.json")
