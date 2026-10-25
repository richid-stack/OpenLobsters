// A small, strict CSV reader (RFC 4180 style: quoted fields, doubled quotes, commas and line breaks inside quotes).
// Numbers are recognised; everything else stays text, so nothing is silently changed.

export type Cell = string | number | null
export interface Table { columns: string[], rows: Cell[][] }

export class CsvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvError'
  }
}

export const CSV_LIMITS = { rows: 5000, columns: 50, cellChars: 2000 }

function inferCell(raw: string): Cell {
  const t = raw.trim()
  if (t === '') return null
  // Plain numbers. Leading zeros ("007", "0123") mean an identifier, so they stay text.
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(t)) return Number(t)
  // Numbers written with thousands separators, such as "1,234.50".
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''))
  return t
}

export function parseCsv(input: string): Table {
  const text = input.replace(/^\uFEFF/, '')
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let quoted = false
  let touched = false

  const endField = () => { record.push(field); field = ''; touched = true }
  const endRecord = () => {
    endField()
    if (record.some(v => v.trim() !== '')) records.push(record)
    record = []
    touched = false
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += ch
    } else if (ch === '"' && field === '') quoted = true
    else if (ch === ',') endField()
    else if (ch === '\n') endRecord()
    else if (ch === '\r') { if (text[i + 1] !== '\n') endRecord() }
    else field += ch
    if (records.length > CSV_LIMITS.rows + 1) throw new CsvError(`That is more than ${CSV_LIMITS.rows} rows. Send a smaller table.`)
  }
  if (quoted) throw new CsvError('A quoted value is never closed. Check for a missing quote mark.')
  if (touched || field !== '') endRecord()

  if (records.length === 0) throw new CsvError('There is no data to read.')
  const columns = records[0]!.map(c => c.trim())
  if (columns.some(c => c === '')) throw new CsvError('Every column needs a name in the first line.')
  if (new Set(columns.map(c => c.toLowerCase())).size !== columns.length) throw new CsvError('Two columns have the same name. Column names must be different.')
  if (columns.length > CSV_LIMITS.columns) throw new CsvError(`That is more than ${CSV_LIMITS.columns} columns.`)

  const rows = records.slice(1).map((r, i) => {
    if (r.length > columns.length) throw new CsvError(`Row ${i + 2} has more values than there are columns.`)
    return columns.map((_, c) => {
      const v = r[c] ?? ''
      if (v.length > CSV_LIMITS.cellChars) throw new CsvError(`A value in row ${i + 2} is too long.`)
      return inferCell(v)
    })
  })
  return { columns, rows }
}

/** Find a table of comma-separated lines inside a chat message: a fenced block, or the longest steady run of lines. */
export function extractCsvBlock(message: string): string | undefined {
  const fenced = message.match(/```(?:csv|text)?\s*\n([\s\S]*?)```/i)
  if (fenced && fenced[1]!.includes(',')) return fenced[1]!.trim()
  const lines = message.split(/\r?\n/)
  let best: string[] = []
  let run: string[] = []
  let width = 0
  for (const line of lines) {
    const n = line.split(',').length
    if (n >= 2 && (run.length === 0 || n === width)) { run.push(line); width = n } else { if (run.length > best.length) best = run; run = n >= 2 ? [line] : []; width = n }
  }
  if (run.length > best.length) best = run
  return best.length >= 3 ? best.join('\n').trim() : undefined
}
