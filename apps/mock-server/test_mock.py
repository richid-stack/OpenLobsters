import json
import pytest
from fastapi.testclient import TestClient
from main import app
from openlobs_contract import parse_event, validate_run

c = TestClient(app)


def stream(body, **params):
    with c.stream("POST", "/v1/chat/stream", json=body, params={"speed": 1000, **params}) as r:
        assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
        return [json.loads(l[6:]) for l in r.iter_lines() if l.startswith("data: ")]


def test_lists_all_fixtures():
    assert {"solo.search", "team.staged", "tool.error", "approval.allowed", "approval.denied"} <= set(c.get("/v1/fixtures").json()["fixtures"])


def test_default_run_is_valid_contract_stream():
    evs = stream({"messages": [{"role": "user", "content": "hi"}]})
    assert validate_run([parse_event(e) for e in evs]) == [] and evs[-1]["type"] == "run.end"


def test_agents_select_the_team_run():
    evs = stream({"messages": [{"role": "user", "content": "hi"}], "agents": ["Planner"]})
    assert any(e["type"] == "team.plan" for e in evs)


def test_every_request_gets_a_fresh_run_id():
    a = stream({"messages": [{"role": "user", "content": "a"}]}); b = stream({"messages": [{"role": "user", "content": "b"}]})
    assert a[0]["run"] != b[0]["run"] and len({e["run"] for e in a}) == 1


def test_web_off_replays_the_denied_flow():
    evs = stream({"messages": [{"role": "user", "content": "hi"}], "options": {"web": False}})
    assert any(e["type"] == "tool.call" and e["state"] == "denied" for e in evs)


def test_unknown_fixture_is_404():
    assert c.post("/v1/chat/stream", json={"messages": []}, params={"fixture": "nope"}).status_code == 404


def test_approvals_and_stop_and_resources():
    assert c.post("/v1/approvals", json={"run": "r", "call": "c1", "decision": "once"}).json()["ok"]
    assert c.post("/v1/approvals", json={"run": "r", "call": "c1", "decision": "maybe"}).status_code == 422
    assert c.post("/v1/runs/r1/stop").json()["ok"]
    assert c.get("/v1/resources/tool", params={"q": "search"}).json()["items"]
    assert c.get("/v1/resources/skill", params={"q": "zzz-none"}).json()["items"] == []
    assert c.get("/v1/resources/nope").status_code == 404
