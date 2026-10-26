# ADR 0003: Accounts with Better Auth, SQLite by default

**Status:** Accepted (updates D9)

## Context

People need to sign in and keep their chats and files. We want self-hosting with no setup, many sign-in methods, and no lock-in to a hosted identity service.

## Decision

Use Better Auth for sessions and sign-in (email and password, GitHub, Google, Microsoft, any OpenID Connect provider). Store accounts, chats, files and approvals in SQLite behind store interfaces. Postgres and object storage are later second implementations.

## Consequences

Zero-setup start and full control of the data. The cost: one writer and one machine until the stores are reimplemented (see `deployment.md`).
