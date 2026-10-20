"""Resource schemas. Mirrors packages/contract/ts/src/resources.ts."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class R(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


Id = str


class Tool(R):
    id: str = Field(min_length=1)
    name: str
    description: str
    inputSchema: dict[str, Any]
    permissions: list[str]
    risk: Literal["read", "write", "send", "delete"]
    requiresApproval: bool
    executionType: Literal["external_api", "mcp", "sandbox", "local"]
    provider: Optional[str] = None
    version: Optional[str] = None


class SkillSource(R):
    repo: str
    commit: str
    path: str


class Skill(R):
    id: str = Field(min_length=1)
    name: str
    description: str
    version: str
    source: SkillSource
    tools: list[str]
    permissions: list[str]
    files: list[str]
    license: Optional[str] = None


class Package(R):
    registry: Literal["npm", "pypi"]
    name: str
    version: str


class Compat(R):
    status: Literal["untested", "passing", "failing"]
    checkedAt: Optional[str] = None


class Library(R):
    id: str = Field(min_length=1)
    name: str
    description: str
    language: Literal["js", "ts", "python", "other"]
    package: Optional[Package] = None
    repo: Optional[str] = None
    license: Optional[str] = None
    dependencies: list[str]
    minRuntime: Optional[str] = None
    compat: Compat


class McpServer(R):
    id: str = Field(min_length=1)
    name: str
    url: str
    transport: Literal["http", "sse", "stdio"]
    auth: Literal["none", "oauth", "key"]
    status: Literal["connected", "disconnected", "error"]
    tools: list[str]


class Retry(R):
    max: int = Field(ge=0)


class WorkflowStep(R):
    id: str = Field(min_length=1)
    kind: Literal["tool", "skill", "agent", "approval"]
    ref: str
    inputs: dict[str, Any]
    dependsOn: list[str]
    retry: Optional[Retry] = None
    timeoutMs: Optional[int] = Field(default=None, gt=0)


class Workflow(R):
    id: str = Field(min_length=1)
    name: str
    version: str
    steps: list[WorkflowStep] = Field(min_length=1)


class Agent(R):
    id: str = Field(min_length=1)
    name: str
    role: str
    instructions: str
    tools: list[str]
    icon: Optional[str] = None


class ProjectFile(R):
    id: str = Field(min_length=1)
    name: str
    bytes: int = Field(ge=0)


class Project(R):
    id: str = Field(min_length=1)
    name: str
    instructions: Optional[str] = None
    files: list[ProjectFile]
    chatIds: list[str]


class Memory(R):
    id: str = Field(min_length=1)
    text: str
    scope: Literal["user", "project"]
    createdAt: str


class Permission(R):
    subject: str
    tool: str
    mode: Literal["ask", "allow", "deny"]
    scope: Literal["global", "project", "chat"]


class RunUsage(R):
    inputTokens: int
    outputTokens: int
    calls: int


class Run(R):
    id: str = Field(min_length=1)
    chatId: str
    messageId: str
    engine: Literal["live", "demo", "replay"]
    startedAt: str
    endedAt: Optional[str] = None
    usage: Optional[RunUsage] = None


class Ref(R):
    type: Literal["library", "skill", "tool", "mcp", "workflow", "agent"]
    id: str = Field(min_length=1)


class Relationship(R):
    from_: Ref = Field(alias="from")
    to: Ref
    kind: Literal["depends_on", "uses", "exposes", "requires"]


RESOURCES = {
    "tool": Tool, "skill": Skill, "library": Library, "mcp": McpServer, "workflow": Workflow,
    "agent": Agent, "project": Project, "memory": Memory, "permission": Permission,
    "run": Run, "relationship": Relationship,
}
