import { createHash } from 'node:crypto'
import type { ToolSet } from 'ai'
import type { Db } from '../utils/db'

// The server's own record of approvals. The browser sends the whole conversation back with every request,
// including any approval the person gave. That is not proof of anything, because a request can be edited.
// So when a tool that changes something asks for approval, the server writes down exactly what it asked
// (user, tool call, and a fingerprint of the input). When the tool later runs, it must find that record, for the
// same user and the same input, still fresh and not yet used. Otherwise it does not run.

export class ApprovalError extends Error {
  constructor(message: string, public code: 'not_approved' | 'tampered' | 'expired' | 'used') {
    super(message)
    this.name = 'ApprovalError'
  }
}

export interface ApprovalLedger {
  request(userId: string, toolCallId: string, tool: string, input: unknown): void
  consume(userId: string, toolCallId: string, tool: string, input: unknown): void
}

export const APPROVAL_TTL_MS = 60 * 60 * 1000

export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`
}
export const fingerprint = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex')

export function migrateApprovals(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_approval (
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      tool_call_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      input_hash TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, tool_call_id)
    );
  `)
}

export function createApprovalLedger(db: Db, now: () => number = Date.now): ApprovalLedger {
  return {
    request(userId, toolCallId, tool, input) {
      const existing = db.prepare('SELECT state FROM tool_approval WHERE user_id = ? AND tool_call_id = ?').get(userId, toolCallId) as { state: string } | undefined
      if (existing?.state === 'used') throw new ApprovalError('That action was already carried out once.', 'used')
      db.prepare(`INSERT INTO tool_approval (user_id, tool_call_id, tool, input_hash, state, created_at) VALUES (?, ?, ?, ?, 'pending', ?)
        ON CONFLICT (user_id, tool_call_id) DO UPDATE SET tool = excluded.tool, input_hash = excluded.input_hash, state = 'pending', created_at = excluded.created_at`)
        .run(userId, toolCallId, tool, fingerprint(input), now())
      // Old requests that were never answered are not kept.
      db.prepare('DELETE FROM tool_approval WHERE state = \'pending\' AND created_at < ?').run(now() - 24 * APPROVAL_TTL_MS)
    },

    consume(userId, toolCallId, tool, input) {
      const run = db.transaction(() => {
        const r = db.prepare('SELECT tool, input_hash, state, created_at FROM tool_approval WHERE user_id = ? AND tool_call_id = ?').get(userId, toolCallId) as { tool: string, input_hash: string, state: string, created_at: number } | undefined
        if (!r || r.tool !== tool) throw new ApprovalError('This action was not approved, so it did not run.', 'not_approved')
        if (r.state === 'used') throw new ApprovalError('This approval was already used.', 'used')
        if (now() - r.created_at > APPROVAL_TTL_MS) throw new ApprovalError('This approval has expired. Ask again.', 'expired')
        if (r.input_hash !== fingerprint(input)) throw new ApprovalError('The request changed after it was approved, so it did not run.', 'tampered')
        db.prepare('UPDATE tool_approval SET state = \'used\' WHERE user_id = ? AND tool_call_id = ?').run(userId, toolCallId)
      })
      run()
    }
  }
}

type Chunk = { type: string, [key: string]: unknown }

/**
 * Writes down an approval request only when the server itself issues one. It watches the response stream the
 * server is sending: when a tool call's input goes by, and then an approval request for that call, it records
 * both. It never reads anything the browser sent, and it is not tied to when the SDK happens to evaluate a
 * tool's approval rule. (An earlier version recorded inside the rule itself. The SDK evaluates it again while
 * replaying a conversation, so a forged "approved" call approved itself.)
 */
export function createApprovalRecorder(ledger: ApprovalLedger, userId: string, tools: ToolSet) {
  const inputs = new Map<string, { toolName: string, input: unknown }>()
  return function observe(chunk: Chunk) {
    if (chunk.type === 'tool-input-available') {
      inputs.set(String(chunk.toolCallId), { toolName: String(chunk.toolName), input: chunk.input })
    } else if (chunk.type === 'tool-approval-request') {
      const seen = inputs.get(String(chunk.toolCallId))
      if (!seen) return
      // Fingerprint the input the way the tool will later receive it: after the schema has read it.
      const schema = (tools[seen.toolName] as { inputSchema?: { safeParse?: (v: unknown) => { success: boolean, data?: unknown } } } | undefined)?.inputSchema
      const parsed = schema?.safeParse ? schema.safeParse(seen.input) : { success: true, data: seen.input }
      if (parsed.success) ledger.request(userId, String(chunk.toolCallId), seen.toolName, parsed.data)
    }
  }
}

/** Passes every chunk through unchanged, letting the recorder see it first. */
export function approvalRecordingStream<T extends { type: string }>(observe: (chunk: Chunk) => void) {
  return new TransformStream<T, T>({
    transform(chunk, controller) {
      try { observe(chunk as unknown as Chunk) } catch (e) { console.error('Could not record an approval request:', (e as Error).message) }
      controller.enqueue(chunk)
    }
  })
}
