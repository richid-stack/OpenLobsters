# OpenLobs architecture

This is the map of the whole project: what every part is for, how the parts fit together, what already exists, and what does not. It is written for three readers: people deciding whether to trust and use OpenLobs, people who want to contribute, and us, so we build the same thing.

**Honesty rule.** Every part has a status. A part marked *planned* is a design and a folder with a README, nothing more. We do not add placeholder code that looks finished. The current state of each feature is in [`../FEATURES.md`](../FEATURES.md).

Legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code)

## What OpenLobs is

An open agent workspace. A person describes a job. OpenLobs plans it, uses tools to do it (on the server, through connected services, in isolated workers, or on the person's own computer through the Bridge), shows what it is doing and why, asks before it changes anything, checks the result, and hands over the output.

## The principles everything follows

1. **Never trust the browser.** It sends the whole conversation back with every request. Anything that matters (an approval, who owns a file) is recorded and checked on the server.
2. **Show the work.** Every step says what it did, why, and where it ran.
3. **Ask before changing anything.** Anything that writes, sends or deletes waits for the person, and the question says exactly what will happen.
4. **Verify, do not assume.** A tool that returned is not proof of success. A result is "done" only after a check that could have failed.
5. **Least privilege.** Access to one capability never grants another. Permissions are per tool, per person, and can be revoked.
6. **Open by default.** Any model, any provider, any OpenAI-compatible address, self-hostable, no required cloud account.
7. **Replaceable parts.** Each module has an interface. Storage, queue, model provider and sign-in method can change without touching the rest.
8. **Honest status.** What is real, what is a demo and what is missing is always written down.

## The big picture

```mermaid
flowchart TB
  subgraph Clients
    WEB["Web app (Vue 3)"]:::built
    PWA["Mobile app"]:::planned
    SDK["Public API and SDK"]:::planned
  end
  subgraph Server["Server (one deployable today: Nitro)"]
    GW["API gateway: sign-in, limits, validation"]:::partial
    ORCH["Task Orchestrator"]:::partial
    REG["Tool Registry"]:::partial
    MOD["Model connectors"]:::built
    VER["Verification Engine"]:::partial
    ART["Artifact management"]:::partial
    SEC["Security: approvals, network guard"]:::partial
    WF["Workflows and scheduler"]:::planned
    MEM["Memory"]:::planned
  end
  subgraph Run["Where tools run"]
    LOCAL["On the server: tables, workbooks"]:::built
    CON["Remote Connector Gateway: MCP, OAuth vault"]:::planned
    WRK["Execution workers: browser, Python, documents"]:::planned
    BR["Bridge on the person's computer"]:::planned
    APPS["Excel, Word, PowerPoint, Blender, files"]:::planned
  end
  subgraph Data
    DB[("SQLite today, Postgres planned")]:::partial
    FILES[("Files on disk today, object storage planned")]:::partial
    Q[("Job queue")]:::planned
  end
  subgraph External
    LLM["Model providers"]:::built
    IDP["Sign-in providers"]:::partial
    SAAS["GitHub, Google, Slack and other services"]:::planned
  end
  WEB --> GW
  PWA -.-> GW
  SDK -.-> GW
  GW --> ORCH
  ORCH --> MOD
  MOD --> LLM
  ORCH --> REG
  ORCH --> VER
  ORCH --> SEC
  VER --> ART
  REG --> LOCAL
  REG -.-> CON
  CON -.-> SAAS
  REG -.-> WRK
  REG -.-> BR
  BR -.-> APPS
  ORCH -.-> WF
  ORCH -.-> MEM
  GW --> DB
  ART --> FILES
  WRK -.-> Q
  GW --> IDP
  classDef built fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef partial fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef planned fill:#f1f5f9,stroke:#94a3b8,color:#475569,stroke-dasharray: 4 3
```

Solid boxes with a green fill exist and are tested. Yellow ones exist in part. Grey dashed ones are designs only.

## One request, end to end (what really happens today)

Turning a pasted table into a checked Excel file:

```mermaid
sequenceDiagram
  actor P as Person
  participant W as Web app
  participant S as Server
  participant M as Model
  participant T as Tools
  participant F as File store
  P->>W: pastes a table, asks for a workbook
  W->>S: messages, chosen model and key, chat id
  S->>S: sign-in check, rate limit, choose tools for this person
  S->>M: conversation and tool list (key used once, never stored)
  M-->>S: reasoning, then call analyze_table
  S->>T: read the table, work out totals
  T-->>S: real totals
  M-->>S: call create_spreadsheet
  S-->>W: tool input and an approval request
  Note over S: the server writes down exactly what it asked
  W->>P: "Save data-summary.xlsx, 2 sheets, 12 rows, to your account?"
  P->>W: Allow once
  W->>S: resend with the approval
  S->>S: refuse unless the server's own record matches
  S->>T: build the workbook
  T->>F: save bytes, fingerprint and spec
  M-->>S: call verify_artifact
  S->>F: read the saved bytes
  S->>S: compare with what was asked, check each total
  S-->>W: answer, download link, saved chat
```

## Where to read next

| Topic | Document |
|---|---|
| Every module and its status | [`modules.md`](modules.md) |
| Task lifecycle, orchestrator, routing | [`runtime.md`](runtime.md) |
| The interface: routes, components, state, rules | [`frontend.md`](frontend.md) |
| The server: modules, requests, errors | [`backend.md`](backend.md) |
| Tables and how they relate | [`data-model.md`](data-model.md) |
| Threats, trust boundaries, what is protected | [`security.md`](security.md) |
| The desktop Bridge | [`bridge.md`](bridge.md) |
| HTTP API today and planned | [`api.md`](api.md) |
| Running it for real: deploy, scale, observe | [`deployment.md`](deployment.md) |
| The 15 ecosystem products and how they map to modules | [`products.md`](products.md) |
| Why we chose what we chose | [`../adr/`](../adr/README.md) |
| Where we are going and in what order | [`../../ROADMAP.md`](../../ROADMAP.md) |
