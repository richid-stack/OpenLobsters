# HTTP API

Today's routes serve the OpenLobs interface and **may change without notice**. A stable public API is planned for M9 (`packages/sdk`). Status: 🚧.

Authentication is a session cookie set by sign-in. "Rate limited" means a per-person (or per-address) limit per minute.

## Routes that exist

| Method and path | Who | What | Notes |
|---|---|---|---|
| `POST /api/chat` | Anyone (signed-in people get saved chats, file tools and their own files) | Streams a conversation: reasoning, tool steps, approvals, text | Rate limited (30 a minute). Body: `messages`, optional `model` selection and `id` |
| `GET /api/chats` | Signed in | The person's chats, newest first (up to 200) | |
| `GET /api/chats/:id` | Signed in, owner | One chat with its messages | Someone else's chat is a 404 |
| `PATCH /api/chats/:id` | Signed in, owner | Rename | Interface for this is not built |
| `DELETE /api/chats/:id` | Signed in, owner | Delete | |
| `GET /api/artifacts` | Signed in | The person's files (name, size, date) | |
| `GET /api/artifacts/:id` | Signed in, owner | Download | Attachment, no caching, no content sniffing |
| `DELETE /api/artifacts/:id` | Signed in, owner | Delete the file and its record | |
| `GET /api/providers` | Anyone | The provider catalog and which providers have a server key | Never returns a key |
| `POST /api/providers/models` | Anyone | List a provider's models | Rate limited (20 a minute). Refuses dangerous addresses |
| `POST /api/providers/test` | Anyone | Test a connection, including a real tool-call probe | Rate limited |
| `GET /api/auth-config` | Anyone | Which sign-in methods are on | Never contains a secret |
| `* /api/auth/*` | Anyone | Sign-in, sign-up, sessions, password reset, OAuth callbacks | Handled by the sign-in library |

## Conventions

- Input is validated with a schema; a bad request gets a plain sentence.
- Errors are `{ statusCode, statusMessage }` with a message written for people. Details of unexpected failures stay on the server.
- A person asking for something that is not theirs gets the same answer as for something that does not exist.
- The conversation sent to `/api/chat` is **untrusted input**, including tool results and approvals inside it. See `security.md`.

## Planned (not built)

| Area | Routes | Milestone |
|---|---|---|
| Tasks | `POST /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks/:id/cancel`, events stream | M3 |
| Account | profile, sessions, delete account, export data | M3 |
| Usage | `GET /api/usage` | M3 |
| Connections | list, connect, revoke | M4 |
| Devices | pair, list, revoke; the Bridge socket | M5 |
| Workflows | CRUD, run, schedule, runs | M6 |
| Skills | list, install, test | M7 |
| Public API | versioned, API keys, webhooks | M9 |
