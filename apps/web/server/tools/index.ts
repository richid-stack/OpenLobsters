import { tool } from 'ai'
import type { ToolSet } from 'ai'
import { z } from 'zod'
import { buildWorkbook, createWorkbookInputSchema, sha256, verifyWorkbook, workbookSpecSchema, XLSX_MIME } from '../artifacts/workbook'
import type { WorkbookSpec } from '../artifacts/workbook'
import { ArtifactError } from '../artifacts/store'
import type { ArtifactStore } from '../artifacts/store'
import { CsvError, parseCsv } from '../utils/csv'
import { ApprovalError } from './approvals'
import type { ApprovalLedger } from './approvals'

// Every tool takes a `why`: one short sentence the model writes about why it is calling the tool.
// The UI shows it on the tool card, so every action has a reason people can read.
const why = z.string().max(160).describe('One short sentence: why this tool is being called now.')

export interface ToolContext {
  /** The signed-in person. Without one, tools that save files are not offered at all. */
  user: { id: string } | null
  artifacts: ArtifactStore
  approvals: ApprovalLedger
  chatId?: string
}

/** A problem the model can fix by trying again. The message is written for it (and for the person reading the card). */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToolInputError'
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const round = (n: number) => Math.round(n * 1e6) / 1e6

export function analyzeTable(csv: string, groupBy?: string) {
  let table
  try { table = parseCsv(csv) } catch (e) { throw new ToolInputError(e instanceof CsvError ? e.message : 'That table could not be read.') }
  const { columns, rows } = table
  const kinds = columns.map((_, ci) => {
    const vals = rows.map(r => r[ci]).filter(v => v !== null)
    return vals.length > 0 && vals.every(v => typeof v === 'number') ? 'number' as const : 'text' as const
  })
  const totals: Record<string, number> = {}
  columns.forEach((c, ci) => { if (kinds[ci] === 'number') totals[c] = round(sum(rows.map(r => (typeof r[ci] === 'number' ? r[ci] as number : 0)))) })

  let groups: Array<{ key: string, rows: number, sums: Record<string, number> }> | undefined
  if (groupBy) {
    const gi = columns.findIndex(c => c.toLowerCase() === groupBy.toLowerCase())
    if (gi < 0) throw new ToolInputError(`There is no column "${groupBy}". The columns are: ${columns.join(', ')}.`)
    const byKey = new Map<string, Cell[][]>()
    for (const r of rows) { const k = r[gi] === null ? '(empty)' : String(r[gi]); byKey.set(k, [...(byKey.get(k) ?? []), r]) }
    groups = [...byKey.entries()].slice(0, 50).map(([key, rs]) => ({
      key, rows: rs.length,
      sums: Object.fromEntries(columns.flatMap((c, ci) => (kinds[ci] === 'number' && ci !== gi ? [[c, round(sum(rs.map(r => (typeof r[ci] === 'number' ? r[ci] as number : 0))))]] : [])))
    }))
  }
  return { rows: rows.length, columns: columns.map((name, i) => ({ name, type: kinds[i]! })), totals, ...(groups ? { groupBy, groups } : {}) }
}
type Cell = string | number | null

function friendlyIssues(error: z.ZodError): string {
  return error.issues.map(i => i.message).slice(0, 4).join(' ')
}

export function createTools(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {
    // Still a demonstration: it returns sample results and says so. Real web search comes later.
    web_search: tool({
      description: 'Search the web for current information.',
      inputSchema: z.object({ query: z.string(), why }),
      execute: async ({ query }) => ({
        demo: true,
        query,
        sources: [
          { title: 'Sample result one', url: 'https://example.org/one', snippet: 'A short sample passage the real search tool would return.' },
          { title: 'Sample result two', url: 'https://example.org/two', snippet: 'Another sample passage, with its own source and date.' },
          { title: 'Sample result three', url: 'https://example.org/three', snippet: 'A third sample result so the sources list has some shape.' }
        ]
      })
    }),

    // Real. Reads the table the person pasted and works out the totals.
    analyze_table: tool({
      description: 'Read a table given as CSV text (first line = column names) and work out the totals of its number columns, and optionally the totals for each value of one column.',
      inputSchema: z.object({ csv: z.string().min(1).max(600_000), groupBy: z.string().max(100).optional().describe('A column to group by, for example product.'), why }),
      execute: async ({ csv, groupBy }) => analyzeTable(csv, groupBy)
    })
  }

  // Tools that save something need to know whose it is, so they exist only for a signed-in person.
  if (!ctx.user) return tools
  const userId = ctx.user.id

  tools.create_spreadsheet = tool({
    description: 'Create an Excel workbook from the given sheets (column names and rows of values) and save it to the person\'s account. Use totals to add a SUM row for number columns.',
    inputSchema: createWorkbookInputSchema,
    // Writing a file waits for the person. This rule must have no side effects: the SDK evaluates it again when
    // a conversation is replayed. The server's record of what it asked is written when it sends the approval
    // request (see createApprovalRecorder), and execute() below refuses to run without that record.
    needsApproval: true,
    execute: async (input, { toolCallId }) => {
      try {
        ctx.approvals.consume(userId, toolCallId, 'create_spreadsheet', input)
      } catch (e) {
        if (e instanceof ApprovalError) throw new ToolInputError(e.message)
        throw e
      }
      const parsed = workbookSpecSchema.safeParse({ filename: input.filename, sheets: input.sheets })
      if (!parsed.success) throw new ToolInputError(friendlyIssues(parsed.error))
      const spec: WorkbookSpec = parsed.data
      const bytes = await buildWorkbook(spec)
      try {
        const meta = ctx.artifacts.save(userId, { name: spec.filename, mime: XLSX_MIME, bytes, spec, chatId: ctx.chatId })
        return { artifact: { id: meta.id, name: meta.name, sizeBytes: meta.size, sheets: spec.sheets.map(s => ({ name: s.name, rows: s.rows.length, columns: s.columns.length })) } }
      } catch (e) {
        if (e instanceof ArtifactError) throw new ToolInputError(e.message)
        throw e
      }
    }
  })

  tools.verify_artifact = tool({
    description: 'Open a saved file again and check it against what was asked for. Always do this after creating a file, and report any failed check honestly.',
    inputSchema: z.object({ artifactId: z.string().uuid(), why }),
    execute: async ({ artifactId }) => {
      const found = ctx.artifacts.get(userId, artifactId)
      if (!found) return { artifactId, status: 'failed' as const, checks: [{ label: 'File exists', passed: false, detail: 'There is no such file in this account.' }] }
      const spec = workbookSpecSchema.parse(found.spec)
      const result = await verifyWorkbook(found.bytes, spec, found.meta.sha256)
      return { artifactId, name: found.meta.name, status: result.status, checks: result.checks, fingerprint: sha256(found.bytes).slice(0, 12) }
    }
  })

  return tools
}

/**
 * The text a person sees when a tool step fails. Only messages written for people (ToolInputError) are shown.
 * Anything else, such as an unexpected crash, could carry internals, so it is replaced with a plain sentence.
 */
export function friendlyToolError(error: unknown): string {
  for (let e: unknown = error, depth = 0; e && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    if (e instanceof ToolInputError) return e.message
  }
  return 'That step did not work.'
}
