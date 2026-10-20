"""Generates openapi/openapi.yaml and schema/*.json from the Pydantic models. Run: python scripts_gen_openapi.py"""
import json, pathlib, sys
import yaml
from pydantic import BaseModel, TypeAdapter
from typing import Literal, Optional
from openlobs_contract.events import Event
from openlobs_contract.resources import RESOURCES

ROOT = pathlib.Path(__file__).resolve().parents[1]

class Msg(BaseModel):
    role: Literal["user", "assistant"]
    content: str
class ChatOptions(BaseModel):
    web: Optional[bool] = None
class ChatRequest(BaseModel):
    chatId: Optional[str] = None
    projectId: Optional[str] = None
    agents: Optional[list[str]] = None
    options: Optional[ChatOptions] = None
    messages: list[Msg]
class ApprovalBody(BaseModel):
    run: str
    call: str
    decision: Literal["once", "always", "deny"]

def build() -> tuple[dict, dict, dict]:
    ref = "#/components/schemas/{model}"
    ev = TypeAdapter(Event).json_schema(ref_template=ref)
    schemas = dict(ev.pop("$defs", {}))
    schemas["Event"] = ev
    for name, cls in RESOURCES.items():
        s = cls.model_json_schema(ref_template=ref, by_alias=True)
        schemas.update(s.pop("$defs", {}))
        schemas[cls.__name__] = s
    for cls in (ChatRequest, ApprovalBody, Msg, ChatOptions):
        s = cls.model_json_schema(ref_template=ref)
        schemas.update(s.pop("$defs", {}))
        schemas[cls.__name__] = s
    rtypes = sorted(RESOURCES)
    ok = {"200": {"description": "OK"}}
    api = {
        "openapi": "3.1.0",
        "info": {"title": "OpenLobs API", "version": "1.0.0", "description": "Contract between the OpenLobs frontend and backend. The chat stream is Server-Sent Events; every `data:` line is one `Event`."},
        "paths": {
            "/v1/chat/stream": {"post": {"summary": "Start a run and stream its events", "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ChatRequest"}}}},
                "responses": {"200": {"description": "text/event-stream. Each `data:` line is a JSON Event.", "content": {"text/event-stream": {"schema": {"$ref": "#/components/schemas/Event"}}}}}}},
            "/v1/approvals": {"post": {"summary": "Answer an approval request", "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ApprovalBody"}}}}, "responses": ok}},
            "/v1/runs/{run}/stop": {"post": {"summary": "Stop a running run", "parameters": [{"name": "run", "in": "path", "required": True, "schema": {"type": "string"}}], "responses": ok}},
            "/v1/resources/{type}": {"get": {"summary": "List or search resources (capability search)", "parameters": [{"name": "type", "in": "path", "required": True, "schema": {"type": "string", "enum": rtypes}}, {"name": "q", "in": "query", "schema": {"type": "string"}}, {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 25}}], "responses": ok}},
            "/v1/resources/{type}/{id}": {"get": {"summary": "Get one resource", "parameters": [{"name": "type", "in": "path", "required": True, "schema": {"type": "string", "enum": rtypes}}, {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}], "responses": ok}},
            "/v1/relationships": {"get": {"summary": "Relationships of a resource", "parameters": [{"name": "type", "in": "query", "schema": {"type": "string"}}, {"name": "id", "in": "query", "schema": {"type": "string"}}], "responses": ok}},
            "/v1/permissions": {"get": {"summary": "List permissions", "responses": ok}, "put": {"summary": "Set a permission", "requestBody": {"content": {"application/json": {"schema": {"$ref": "#/components/schemas/Permission"}}}}, "responses": ok}},
        },
        "components": {"schemas": schemas},
    }
    return api, ev, {k: v for k, v in schemas.items() if k in {c.__name__ for c in RESOURCES.values()}}

if __name__ == "__main__":
    api, ev, res = build()
    out = ROOT / "openapi" / "openapi.yaml"
    out.write_text(yaml.safe_dump(api, sort_keys=False, width=100))
    (ROOT / "schema" / "events.schema.json").write_text(json.dumps(api["components"]["schemas"]["Event"], indent=1))
    (ROOT / "schema" / "resources.schema.json").write_text(json.dumps(res, indent=1))
    print("wrote", out, "|", len(api["components"]["schemas"]), "schemas")
