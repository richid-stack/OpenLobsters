import { MockLanguageModelV4 } from 'ai/test'
import { extractCsvBlock, parseCsv } from './csv'

// A stand-in model that behaves like a real one: it streams reasoning, calls tools one step at a time, waits
// when a tool needs approval, and finishes with text. It lets the whole interface be built and reviewed without
// a provider key. Its decisions are simple rules, but the tools it calls are the real ones, with real data taken
// from what the person wrote, and its closing message is built from what the tools actually returned.
// When a provider is chosen, the route uses the real model and nothing else changes.

type Part = Record<string, unknown>
export type Step =
  | { reasoning: string, call: { name: string, input: Record<string, unknown> } }
  | { reasoning: string, text: string }

export interface DemoOptions { canCreateFiles: boolean }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const n = (v: number) => v.toLocaleString('en', { maximumFractionDigits: 2 })

/** Everything the demo needs to know, read from the conversation so far. */
export interface Facts {
  userText: string
  denied: boolean
  /** The search tool has already answered in this turn. */
  searched?: boolean
  /** A tool that failed, with the message the person can read. */
  failure?: { tool: string, message: string }
  analysis?: { rows: number, columns: Array<{ name: string, type: 'number' | 'text' }>, totals: Record<string, number>, groupBy?: string, groups?: Array<{ key: string, rows: number, sums: Record<string, number> }> }
  created?: { id: string, name: string }
  verify?: { status: 'passed' | 'failed', checks: Array<{ label: string, passed: boolean, detail: string }> }
}

type PromptMessage = { role: string, content: unknown }
type ResultPart = { type?: string, toolName?: string, output?: { type?: string, value?: unknown, reason?: unknown } }

export function readPrompt(prompt: PromptMessage[]): Facts {
  let lastUser = -1
  prompt.forEach((m, i) => { if (m.role === 'user') lastUser = i })
  const userContent = lastUser >= 0 ? prompt[lastUser]!.content : []
  const userText = Array.isArray(userContent)
    ? userContent.map((c: { type?: string, text?: string }) => (c.type === 'text' ? c.text ?? '' : '')).join(' ')
    : String(userContent ?? '')

  const facts: Facts = { userText, denied: false }
  for (const m of prompt.slice(lastUser + 1)) {
    if (m.role !== 'tool' || !Array.isArray(m.content)) continue
    for (const part of m.content as ResultPart[]) {
      if (part.type !== 'tool-result' || !part.output) continue
      const { type, value } = part.output
      const name = part.toolName ?? ''
      if (name === 'web_search') facts.searched = true
      if (type === 'execution-denied') facts.denied = true
      else if (type === 'error-text' || type === 'error-json') facts.failure = { tool: name, message: typeof value === 'string' ? value : JSON.stringify(value) }
      else if (type === 'json' && value && typeof value === 'object') {
        const v = value as Record<string, any>
        if (name === 'analyze_table') facts.analysis = v as Facts['analysis']
        if (name === 'create_spreadsheet' && v.artifact?.id) facts.created = { id: v.artifact.id, name: v.artifact.name }
        if (name === 'verify_artifact' && v.status) facts.verify = { status: v.status, checks: v.checks ?? [] }
      }
    }
  }
  return facts
}

const ASK_FOR_DATA: Step = {
  reasoning: 'You want a workbook, but I do not have any data yet. I should ask for it rather than make something up.',
  text: 'I can build that, but I need your data first. Paste it here as lines separated by commas, with the column names on the first line. For example:\n\n```\nmonth,product,units,revenue\nJan,Rice,10,250\nJan,Oil,4,90\nFeb,Rice,12,300\n```\n\nThen ask again and I will analyse it, build the workbook, and check the file.'
}

const RESEARCH: Step[] = [
  {
    reasoning: 'This needs current information, which I do not have on my own. I will search instead of guessing.',
    call: { name: 'web_search', input: { query: 'latest developments', why: 'Your question depends on recent information.' } }
  },
  {
    reasoning: 'Three sources came back. I will summarise what they agree on and say where they are thin.',
    text: 'Here is what the search turned up.\n\n- All three sources agree on the broad picture.\n- None of them gives hard numbers, so I would treat the details as unconfirmed.\n\nThis was a demo run with sample sources. A real run would cite them and flag anything it could not verify.'
  }
]

const CHAT: Step = {
  reasoning: 'A simple message. No tools needed, so I will just answer.',
  text: 'Hello. I am OpenLobs. I can analyse a table you paste, build an Excel workbook from it and check the file, search the web, and I ask before I do anything that changes something.\n\nTry the sample sales data below, or paste your own table.'
}

function describeTotals(a: NonNullable<Facts['analysis']>): string {
  const parts = Object.entries(a.totals).map(([k, v]) => `**${k}** ${n(v)}`)
  return parts.length ? `Totals: ${parts.join(', ')}.` : 'There are no number columns to total.'
}

function leader(a: NonNullable<Facts['analysis']>): string {
  const col = a.columns.find(c => c.type === 'number' && c.name !== a.groupBy)?.name
  if (!a.groups || !col) return ''
  const best = [...a.groups].sort((x, y) => (y.sums[col] ?? 0) - (x.sums[col] ?? 0))[0]
  return best ? `\n- The biggest **${a.groupBy}** by ${col} is **${best.key}** (${n(best.sums[col] ?? 0)}).` : ''
}

function buildSpec(csv: string, a: NonNullable<Facts['analysis']>) {
  const table = parseCsv(csv)
  const numeric = (name: string) => a.columns.find(c => c.name === name)?.type === 'number'
  const sheets: Array<Record<string, unknown>> = [{
    name: 'Data',
    columns: table.columns,
    rows: table.rows,
    // The first column holds the "Total" label, so it is never totalled.
    totals: table.columns.filter((c, i) => i > 0 && numeric(c))
  }]
  if (a.groups && a.groupBy) {
    const cols = a.columns.filter(c => c.type === 'number' && c.name !== a.groupBy).map(c => c.name)
    sheets.push({
      name: 'Summary',
      columns: [a.groupBy, 'Rows', ...cols],
      rows: a.groups.map(g => [g.key, g.rows, ...cols.map(c => g.sums[c] ?? 0)]),
      totals: ['Rows', ...cols]
    })
  }
  return { filename: 'data-summary.xlsx', sheets }
}

/** Decide the next step from what has happened so far. Pure, so it can be tested without any model. */
export function planStep(facts: Facts, opts: DemoOptions): Step {
  const t = facts.userText.toLowerCase()
  const csv = extractCsvBlock(facts.userText)

  if (csv || /(sales|spreadsheet|excel|workbook|revenue|csv|table)/.test(t)) {
    if (!csv) return ASK_FOR_DATA

    if (facts.failure) {
      return {
        reasoning: `A step did not work, so I should stop and tell you plainly instead of pretending it did.`,
        text: `I could not finish: ${facts.failure.message}\n\nNothing was saved. If you fix that, or paste the data again, I will try once more.`
      }
    }
    if (facts.denied) {
      return {
        reasoning: 'You chose not to let me create the file, so I will not write anything.',
        text: `Understood. I have not created the workbook, and nothing was saved.${facts.analysis ? `\n\nThe analysis is still here: ${facts.analysis.rows} rows. ${describeTotals(facts.analysis)}` : ''}\n\nSay the word and I will create the file after all.`
      }
    }
    if (!facts.analysis) {
      let groupBy: string | undefined
      try { const tb = parseCsv(csv); groupBy = tb.columns.find((c, i) => tb.rows.some(r => typeof r[i] === 'string')) } catch { /* the tool will explain what is wrong */ }
      return {
        reasoning: 'You gave me a table. First I will read it and work out the totals, so I know what is in it before I make anything.',
        call: { name: 'analyze_table', input: { csv, ...(groupBy ? { groupBy } : {}), why: 'I need the totals before I can summarise the table.' } }
      }
    }
    if (!opts.canCreateFiles) {
      return {
        reasoning: 'Saving a file needs an account, because files are kept for the person who made them. I can still tell you what I found.',
        text: `Here is what is in your table: **${facts.analysis.rows} rows**. ${describeTotals(facts.analysis)}${leader(facts.analysis)}\n\nTo save this as an Excel workbook, sign in first. Files are kept in your account, and I check every file after I make it.`
      }
    }
    if (!facts.created) {
      return {
        reasoning: 'Now I know what is in the table. Making the workbook means saving a file to your account, so I will ask you first.',
        call: { name: 'create_spreadsheet', input: { ...buildSpec(csv, facts.analysis), why: 'You asked for a workbook you can open and share.' } }
      }
    }
    if (!facts.verify) {
      return {
        reasoning: 'The file is saved, but that does not prove it is right. I will open it again and check it against what you gave me.',
        call: { name: 'verify_artifact', input: { artifactId: facts.created.id, why: 'A saved file is not a correct file until it has been checked.' } }
      }
    }
    const a = facts.analysis
    if (facts.verify.status === 'passed') {
      return {
        reasoning: 'Every check passed, so I can say so with evidence.',
        text: `Your workbook is ready, and I checked it after saving it.\n\n**What is in your data:**\n- **${a.rows} rows.** ${describeTotals(a)}${leader(a)}\n\n**What I checked:** I opened the saved file again and ${facts.verify.checks.length} checks passed, including that every value matches your table and that the totals are live formulas that add up.\n\nUse the download button on the card above. The replies here are scripted for this demo, but the file and the checks are real.`
      }
    }
    const bad = facts.verify.checks.filter(c => !c.passed)
    return {
      reasoning: 'A check failed. I should say so, not call the file done.',
      text: `I saved the workbook, but my check found a problem, so I would not rely on it yet:\n\n${bad.map(c => `- **${c.label}:** ${c.detail}`).join('\n')}\n\nI have not changed anything. Tell me how you would like to proceed.`
    }
  }

  if (/(search|latest|news|research|find out|current)/.test(t)) {
    // The search is the only tool here: once it has answered, finish.
    return facts.searched ? RESEARCH[1]! : RESEARCH[0]!
  }
  return CHAT
}

function words(text: string, size: number): string[] {
  const parts = text.split(/(\s+)/)
  const out: string[] = []
  let buf = ''
  let count = 0
  for (const p of parts) {
    buf += p
    if (p.trim()) count++
    if (count >= size) { out.push(buf); buf = ''; count = 0 }
  }
  if (buf) out.push(buf)
  return out
}

function stream(parts: Array<{ part: Part, delay: number }>) {
  return new ReadableStream<Part>({
    async start(controller) {
      for (const { part, delay } of parts) {
        if (delay) await sleep(delay)
        controller.enqueue(part)
      }
      controller.close()
    }
  })
}

const usage = {
  inputTokens: { total: 240, noCache: 240, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 120, text: 90, reasoning: 30 }
}

export function createDemoModel(opts: DemoOptions = { canCreateFiles: false }) {
  return new MockLanguageModelV4({
    provider: 'openlobs-demo',
    modelId: 'demo',
    doStream: async (options: { prompt: PromptMessage[] }) => {
      const facts = readPrompt(options.prompt)
      const step = planStep(facts, opts)
      const parts: Array<{ part: Part, delay: number }> = [{ part: { type: 'stream-start', warnings: [] }, delay: 0 }]

      parts.push({ part: { type: 'reasoning-start', id: 'r' }, delay: 380 })
      for (const chunk of words(step.reasoning, 3)) parts.push({ part: { type: 'reasoning-delta', id: 'r', delta: chunk }, delay: 55 })
      parts.push({ part: { type: 'reasoning-end', id: 'r' }, delay: 40 })

      if ('call' in step) {
        const id = `call_${Math.random().toString(36).slice(2, 10)}`
        const json = JSON.stringify(step.call.input)
        parts.push({ part: { type: 'tool-input-start', id, toolName: step.call.name }, delay: 120 })
        const cut = Math.ceil(json.length / 3)
        for (let i = 0; i < json.length; i += cut) parts.push({ part: { type: 'tool-input-delta', id, delta: json.slice(i, i + cut) }, delay: 90 })
        parts.push({ part: { type: 'tool-input-end', id }, delay: 30 })
        parts.push({ part: { type: 'tool-call', toolCallId: id, toolName: step.call.name, input: json }, delay: 20 })
        parts.push({ part: { type: 'finish', usage, finishReason: { unified: 'tool-calls', raw: undefined } }, delay: 10 })
      } else {
        parts.push({ part: { type: 'text-start', id: 't' }, delay: 60 })
        for (const chunk of words(step.text, 2)) parts.push({ part: { type: 'text-delta', id: 't', delta: chunk }, delay: 28 })
        parts.push({ part: { type: 'text-end', id: 't' }, delay: 20 })
        parts.push({ part: { type: 'finish', usage, finishReason: { unified: 'stop', raw: undefined } }, delay: 10 })
      }
      return { stream: stream(parts) as never }
    }
  })
}
