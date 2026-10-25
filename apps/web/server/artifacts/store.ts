import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Db } from '../utils/db'

// Files that OpenLobs makes for a person. The bytes live on disk and the details in SQLite. Every call is scoped
// to a user id, and file paths are built only from generated ids, never from anything a person typed.

export interface ArtifactMeta { id: string, name: string, mime: string, size: number, sha256: string, createdAt: number, chatId?: string | null }

export interface ArtifactStore {
  save(userId: string, input: { name: string, mime: string, bytes: Buffer, spec: unknown, chatId?: string }): ArtifactMeta
  get(userId: string, id: string): { meta: ArtifactMeta, bytes: Buffer, spec: unknown } | null
  list(userId: string): ArtifactMeta[]
  remove(userId: string, id: string): boolean
}

export class ArtifactError extends Error {
  constructor(message: string, public code: 'too_large' | 'quota_files' | 'quota_bytes') {
    super(message)
    this.name = 'ArtifactError'
  }
}

export interface ArtifactLimits { maxFileBytes: number, maxFiles: number, maxTotalBytes: number }
export const DEFAULT_LIMITS: ArtifactLimits = { maxFileBytes: 8_000_000, maxFiles: 100, maxTotalBytes: 200_000_000 }

export function migrateArtifacts(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS artifact (
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      spec TEXT NOT NULL,
      chat_id TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS artifact_user_created ON artifact (user_id, created_at DESC);
  `)
}

type Row = { id: string, name: string, mime: string, size: number, sha256: string, created_at: number, chat_id: string | null }
const metaOf = (r: Row): ArtifactMeta => ({ id: r.id, name: r.name, mime: r.mime, size: r.size, sha256: r.sha256, createdAt: r.created_at, chatId: r.chat_id })

export function createFsArtifactStore(db: Db, dir: string, limits: ArtifactLimits = DEFAULT_LIMITS, now: () => number = Date.now): ArtifactStore {
  // The folder name comes from a hash of the user id, so an odd id can never point outside the storage folder.
  const userDir = (userId: string) => join(dir, createHash('sha256').update(userId).digest('hex').slice(0, 32))
  const fileOf = (userId: string, id: string) => join(userDir(userId), id)

  return {
    save(userId, { name, mime, bytes, spec, chatId }) {
      if (bytes.length > limits.maxFileBytes) throw new ArtifactError('That file is too large to save.', 'too_large')
      const usage = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM artifact WHERE user_id = ?').get(userId) as { n: number, bytes: number }
      if (usage.n >= limits.maxFiles) throw new ArtifactError(`You have reached the limit of ${limits.maxFiles} files. Delete some to make room.`, 'quota_files')
      if (usage.bytes + bytes.length > limits.maxTotalBytes) throw new ArtifactError('You have reached your storage limit. Delete some files to make room.', 'quota_bytes')
      const id = randomUUID()
      mkdirSync(userDir(userId), { recursive: true })
      writeFileSync(fileOf(userId, id), bytes, { mode: 0o600 })
      const sha = createHash('sha256').update(bytes).digest('hex')
      db.prepare('INSERT INTO artifact (user_id, id, name, mime, size, sha256, spec, chat_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(userId, id, name, mime, bytes.length, sha, JSON.stringify(spec), chatId ?? null, now())
      return { id, name, mime, size: bytes.length, sha256: sha, createdAt: now(), chatId: chatId ?? null }
    },

    get(userId, id) {
      const r = db.prepare('SELECT id, name, mime, size, sha256, created_at, chat_id, spec FROM artifact WHERE user_id = ? AND id = ?').get(userId, id) as (Row & { spec: string }) | undefined
      if (!r) return null
      try {
        return { meta: metaOf(r), bytes: readFileSync(fileOf(userId, id)), spec: JSON.parse(r.spec) }
      } catch {
        return null // the record exists but the file is gone
      }
    },

    list(userId) {
      return (db.prepare('SELECT id, name, mime, size, sha256, created_at, chat_id FROM artifact WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').all(userId) as Row[]).map(metaOf)
    },

    remove(userId, id) {
      const changes = db.prepare('DELETE FROM artifact WHERE user_id = ? AND id = ?').run(userId, id).changes
      if (changes > 0) rmSync(fileOf(userId, id), { force: true })
      return changes > 0
    }
  }
}
