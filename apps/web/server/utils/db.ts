import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

// One SQLite file holds accounts and saved chats. It needs no setup, which suits self-hosting and local use.
// Anything that reads or writes chats goes through the ChatStore interface (server/chats/store.ts), so a
// Postgres version can replace this for a hosted deployment without touching the routes.

export type Db = Database.Database

let shared: Db | undefined

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function getDb(env: Record<string, string | undefined> = process.env): Db {
  return (shared ??= openDb(env.OPENLOBS_DB_PATH || 'data/openlobs.db'))
}
