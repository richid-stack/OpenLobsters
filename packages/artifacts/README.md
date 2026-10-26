# Artifact management

**Status:** 🚧 Partly built  ·  **Plan name:** Artifact Management  ·  **Milestone:** M2 (files), M6 (retention)

Stores the files OpenLobs makes: ownership, size limits, integrity fingerprints, download, deletion and retention.

## What exists today

`apps/web/server/artifacts/store.ts` (files on disk, details in SQLite), routes `/api/artifacts`. Per-person limits, owner-only download, hardened download headers. Not built: a screen listing your files, clean-up when an account is deleted, object storage, retention rules, previews.

## Responsibilities

- Save and read files for an owner
- Enforce size, count and total limits
- Provide a fingerprint so a changed file is detected
- Delete a file and its record together

## Interface (current)

```ts
// Current.
interface ArtifactStore {
  save(userId: string, input: { name: string; mime: string; bytes: Buffer; spec: unknown; chatId?: string }): ArtifactMeta
  get(userId: string, id: string): { meta: ArtifactMeta; bytes: Buffer; spec: unknown } | null
  list(userId: string): ArtifactMeta[]
  remove(userId: string, id: string): boolean
}
```

## Depends on

- apps/web data layer

## Security notes

- Paths are built from generated ids only.
- A person can never read or delete another person's file.

## Done when

- [ ] Object storage implementation behind the same interface
- [ ] Files removed when an account is deleted
- [ ] Retention settings and previews

## Not in scope

- Editing files (that is a tool)

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
