import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from openlobs_contract import parse_event, parse_jsonl, validate_run
from openlobs_contract.resources import RESOURCES

FX = Path(__file__).resolve().parents[2] / "fixtures"
load = lambda p: json.loads((FX / p).read_text())


@pytest.mark.parametrize("f", sorted(p.name for p in FX.glob("*.jsonl")))
def test_valid_runs(f):
    assert validate_run(parse_jsonl((FX / f).read_text())) == []


@pytest.mark.parametrize("c", load("invalid/events.json"), ids=lambda c: c["name"])
def test_invalid_events(c):
    with pytest.raises(ValidationError):
        parse_event(c["event"])


@pytest.mark.parametrize("c", load("invalid/runs.json"), ids=lambda c: c["name"])
def test_invalid_runs(c):
    errs = validate_run([parse_event(e) for e in c["events"]])
    assert any(c["expect"] in m for m in errs), errs


@pytest.mark.parametrize("k", sorted(RESOURCES))
def test_valid_resources(k):
    RESOURCES[k].model_validate(load("resources.sample.json")[k])


@pytest.mark.parametrize("c", load("invalid/resources.json"), ids=lambda c: c["name"])
def test_invalid_resources(c):
    with pytest.raises(ValidationError):
        RESOURCES[c["type"]].model_validate(c["value"])


def test_openapi_is_up_to_date_and_covers_every_event_type():
    import sys, yaml
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from scripts_gen_openapi import build
    api, _, _ = build()
    on_disk = yaml.safe_load((FX.parent / "openapi" / "openapi.yaml").read_text())
    assert api == on_disk, "openapi.yaml is stale: run python scripts_gen_openapi.py"
    used = {json.loads(l)["type"] for f in FX.glob("*.jsonl") for l in f.read_text().splitlines() if l.strip()}
    declared = {s["properties"]["type"]["const"] for k, s in api["components"]["schemas"].items() if "type" in s.get("properties", {}) and "const" in s["properties"]["type"]}
    assert used <= declared
