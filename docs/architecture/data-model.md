# Data model

Today everything lives in one SQLite file (`data/openlobs.db`, set by `OPENLOBS_DB_PATH`) plus a folder of files (`data/artifacts`, set by `OPENLOBS_ARTIFACTS_DIR`). Back up both together. Status: 🚧.

## Tables that exist

```mermaid
erDiagram
  USER ||--o{ SESSION : "has"
  USER ||--o{ ACCOUNT : "signs in with"
  USER ||--o{ CHAT : "owns"
  USER ||--o{ ARTIFACT : "owns"
  USER ||--o{ TOOL_APPROVAL : "was asked"
  CHAT ||--o{ ARTIFACT : "made in"
  USER {
    text id PK
    text name
    text email
    int emailVerified
    text image
  }
  SESSION {
    text id PK
    text userId FK
    text token
    int expiresAt
  }
  ACCOUNT {
    text id PK
    text userId FK
    text providerId
    text accountId
  }
  CHAT {
    text user_id PK
    text id PK
    text title
    text messages
    int created_at
    int updated_at
  }
  ARTIFACT {
    text user_id PK
    text id PK
    text name
    text mime
    int size
    text sha256
    text spec
    text chat_id
    int created_at
  }
  TOOL_APPROVAL {
    text user_id PK
    text tool_call_id PK
    text tool
    text input_hash
    text state
    int created_at
  }
```

`USER`, `SESSION`, `ACCOUNT` (and a `verification` table for email links) belong to the sign-in library. The other three are ours. Rows that belong to a person are deleted with that person (`ON DELETE CASCADE`); the files on disk are not yet (a known gap).

**Why composite keys.** `chat`, `artifact` and `tool_approval` use `(user_id, id)` as their key. Another person guessing or reusing an id reaches nothing, because every query includes the user id.

**Why a chat is one record.** A whole conversation is one JSON value. It matches how the AI SDK holds messages and is simple. It stops being fine when chats get long or need search; the planned move is one row per message.

**What is deliberately not stored.** Model API keys. They live in the browser and travel with each request. (An operator may put provider keys in the server environment instead.)

## Planned additions

```mermaid
erDiagram
  USER ||--o{ TASK : "starts"
  TASK ||--o{ STEP : "has"
  TASK ||--o{ ARTIFACT : "produces"
  USER ||--o{ DEVICE : "pairs"
  USER ||--o{ CONNECTION : "authorises"
  USER ||--o{ WORKFLOW : "builds"
  WORKFLOW ||--o{ WORKFLOW_RUN : "runs as"
  USER ||--o{ MEMORY_ITEM : "keeps"
  ORG ||--o{ ORG_MEMBER : "has"
  USER ||--o{ ORG_MEMBER : "is"
  USER ||--o{ API_KEY : "creates"
  USER ||--o{ USAGE_EVENT : "causes"
  USER ||--o{ AUDIT_EVENT : "appears in"
  TASK {
    text id PK
    text goal
    text state
    text success
    text budget
  }
  STEP {
    text id PK
    text task_id FK
    text tool
    text input_hash
    text place
    text outcome
  }
  DEVICE {
    text id PK
    text user_id FK
    text capabilities
    int revoked_at
  }
  CONNECTION {
    text id PK
    text user_id FK
    text provider
    text secret_ref
  }
```

| Table | Purpose | Module | Milestone |
|---|---|---|---|
| `task`, `step` | Stored runs with state and budget | Orchestrator | M3 |
| `usage_event` | Tokens and cost per request, per model and tool | Model connectors | M3 |
| `audit_event` | Who approved and ran what, when, where | Security | M3 |
| `connection` | A person's connected services (credentials in a vault, only a reference here) | Connectors | M4 |
| `device` | Paired computers and what each may do | Bridge | M5 |
| `workflow`, `workflow_run`, `schedule` | Repeatable work | Workflows | M6 |
| `skill`, `skill_version` | Skills and their versions | Skills | M7 |
| `memory_item` | What a person chose to keep | Memory | M7 |
| `org`, `org_member`, `role` | Teams and permissions | Security | M9 |
| `api_key` | Scoped keys for the public API | SDK | M9 |

## Rules for any new table

1. It has an owner (a user or an organisation) in its key, and every query uses it.
2. It deletes with its owner, and anything stored outside the database is deleted too.
3. Secrets are stored encrypted or as a reference to a vault, never as plain text.
4. It has a migration that can run twice safely, and a test that proves one person cannot reach another's rows.

## Moving to a hosted database

The stores are interfaces, so Postgres is a second implementation of each. What changes: connection settings, migrations, and the rate limiter and approval ledger moving to a store every server process shares. Files move to object storage behind `ArtifactStore`. See `deployment.md`.
