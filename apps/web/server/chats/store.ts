import type { UIMessage } from 'ai'
import type { Db } from '../utils/db'

// Saved chats. Everything that reads or writes a chat goes through the ChatStore interface, and every
// call is scoped to a user id. The primary key is (user_id, id), so one person can never read, overwrite
// or delete another person's chat by guessing an id. A Postgres version can implement the same interface.

export interface ChatSummary { id: string, title: string, createdAt: number, updatedAt: number }
export interface ChatFull extends ChatSummary { messages: UIMessage[] }

export interface ChatStore {
  list(userId: string): ChatSummary[]
  get(userId: string, id: string): ChatFull | null
  /** Create or update a chat. A new chat is titled from its first user message; an existing title is kept. */
  save(userId: string, id: string, messages: UIMessage[]): ChatSummary
  rename(userId: string, id: string, title: string): boolean
  remove(userId: string, id: string): boolean
}

export const MAX_CHAT_BYTES = 2_000_000
export const MAX_CHATS_LISTED = 200
export const CHAT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export class ChatStoreError extends Error {
  constructor(message: string, public code: 'bad_id' | 'too_large' | 'bad_messages' | 'bad_title') {
    super(message)
    this.name = 'ChatStoreError'
  }
}

export function migrateChats(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat (
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS chat_user_updated ON chat (user_id, updated_at DESC);
  `)
}

export function deriveTitle(messages: UIMessage[]): string {
  const first = messages.find(m => m.role === 'user')
  const text = first?.parts.find((p): p is { type: 'text', text: string } => p.type === 'text')?.text ?? ''
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return 'New chat'
  return t.length > 60 ? `${t.slice(0, 59).trimEnd()}\u2026` : t
}

export function createSqliteChatStore(db: Db, now: () => number = Date.now): ChatStore {
  const summaryOf = (r: { id: string, title: string, created_at: number, updated_at: number }): ChatSummary =>
    ({ id: r.id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at })

  const assertId = (id: string) => { if (!CHAT_ID_PATTERN.test(id)) throw new ChatStoreError('That chat id is not valid.', 'bad_id') }

  return {
    list(userId) {
      return (db.prepare('SELECT id, title, created_at, updated_at FROM chat WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?').all(userId, MAX_CHATS_LISTED) as Parameters<typeof summaryOf>[0][]).map(summaryOf)
    },

    get(userId, id) {
      const r = db.prepare('SELECT id, title, messages, created_at, updated_at FROM chat WHERE user_id = ? AND id = ?').get(userId, id) as (Parameters<typeof summaryOf>[0] & { messages: string }) | undefined
      return r ? { ...summaryOf(r), messages: JSON.parse(r.messages) as UIMessage[] } : null
    },

    save(userId, id, messages) {
      assertId(id)
      if (!Array.isArray(messages) || messages.some(m => !m || typeof m.role !== 'string' || !Array.isArray(m.parts))) {
        throw new ChatStoreError('The messages are not in the expected shape.', 'bad_messages')
      }
      const json = JSON.stringify(messages)
      if (Buffer.byteLength(json) > MAX_CHAT_BYTES) throw new ChatStoreError('This chat is too long to save.', 'too_large')
      const t = now()
      db.prepare(`
        INSERT INTO chat (user_id, id, title, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, id) DO UPDATE SET messages = excluded.messages, updated_at = excluded.updated_at
      `).run(userId, id, deriveTitle(messages), json, t, t)
      const r = db.prepare('SELECT id, title, created_at, updated_at FROM chat WHERE user_id = ? AND id = ?').get(userId, id) as Parameters<typeof summaryOf>[0]
      return summaryOf(r)
    },

    rename(userId, id, title) {
      const t = title.replace(/\s+/g, ' ').trim()
      if (!t || t.length > 100) throw new ChatStoreError('A title must be between 1 and 100 characters.', 'bad_title')
      return db.prepare('UPDATE chat SET title = ?, updated_at = updated_at WHERE user_id = ? AND id = ?').run(t, userId, id).changes > 0
    },

    remove(userId, id) {
      return db.prepare('DELETE FROM chat WHERE user_id = ? AND id = ?').run(userId, id).changes > 0
    }
  }
}
