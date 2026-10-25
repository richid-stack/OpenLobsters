import { createHash } from 'node:crypto'
import ExcelJS from 'exceljs'
import { z } from 'zod'

// Building an Excel file, and then checking it by opening it again. The check reads the bytes that were
// actually saved and compares them with what was asked for, so it can catch a file that is wrong, not just one
// that fails to open.

const SHEET_NAME_BAD = /[\\/?*[\]:]/
const cell = z.union([z.string().max(2000), z.number().finite(), z.null()])

export const sheetSchema = z.object({
  name: z.string().min(1).max(31).refine(n => !SHEET_NAME_BAD.test(n) && !/^'|'$/.test(n), 'A sheet name cannot contain \\ / ? * [ ] : or start or end with an apostrophe.'),
  columns: z.array(z.string().min(1).max(100)).min(1).max(50),
  rows: z.array(z.array(cell)).max(5000),
  /** Columns to add a SUM total for, under the data. Numeric columns only, and not the first column. */
  totals: z.array(z.string()).max(50).optional()
})

const specObject = z.object({
  filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,76}\.xlsx$/, 'Use a plain file name ending in .xlsx (letters, numbers, spaces, dots, dashes and underscores).'),
  sheets: z.array(sheetSchema).min(1).max(8)
})

// Checks that look across fields (matching row widths, sensible totals). They run on the tool's input too, so a
// bad request is refused before the person is asked to approve it.
function refineSpec(spec: z.infer<typeof specObject>, ctx: z.RefinementCtx) {
  const seen = new Set<string>()
  spec.sheets.forEach((s, si) => {
    const key = s.name.toLowerCase()
    if (seen.has(key)) ctx.addIssue({ code: 'custom', message: `Two sheets are called "${s.name}".`, path: ['sheets', si, 'name'] })
    seen.add(key)
    s.rows.forEach((r, ri) => {
      if (r.length !== s.columns.length) ctx.addIssue({ code: 'custom', message: `Sheet "${s.name}" row ${ri + 1} has ${r.length} values but there are ${s.columns.length} columns.`, path: ['sheets', si, 'rows', ri] })
    })
    if (s.rows.length * s.columns.length > 100_000) ctx.addIssue({ code: 'custom', message: `Sheet "${s.name}" is too large.`, path: ['sheets', si] })
    for (const t of s.totals ?? []) {
      const ci = s.columns.indexOf(t)
      if (ci < 0) ctx.addIssue({ code: 'custom', message: `Sheet "${s.name}": there is no column "${t}" to total.`, path: ['sheets', si, 'totals'] })
      else if (ci === 0) ctx.addIssue({ code: 'custom', message: `Sheet "${s.name}": the first column holds the "Total" label, so it cannot be totalled.`, path: ['sheets', si, 'totals'] })
      else if (s.rows.some(r => r[ci] !== null && typeof r[ci] !== 'number')) ctx.addIssue({ code: 'custom', message: `Sheet "${s.name}": column "${t}" is not all numbers, so it cannot be totalled.`, path: ['sheets', si, 'totals'] })
    }
  })
}

export const workbookSpecSchema = specObject.superRefine(refineSpec)
/** What the create-a-workbook tool accepts: the spec plus a one-line reason for the person to read. */
export const createWorkbookInputSchema = specObject.extend({ why: z.string().max(160).describe('One short sentence: why this tool is being called now.') }).superRefine(refineSpec)

export type WorkbookSpec = z.infer<typeof workbookSpecSchema>

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

const colLetter = (index0: number) => { let n = index0 + 1; let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }
const sumOf = (rows: Array<Array<string | number | null>>, ci: number) => rows.reduce((a, r) => a + (typeof r[ci] === 'number' ? (r[ci] as number) : 0), 0)

export async function buildWorkbook(spec: WorkbookSpec): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'OpenLobs'
  wb.created = new Date()
  for (const s of spec.sheets) {
    const ws = wb.addWorksheet(s.name, { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.addRow(s.columns)
    for (const r of s.rows) ws.addRow(r)
    const header = ws.getRow(1)
    header.font = { bold: true }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }

    if (s.totals?.length) {
      const last = s.rows.length + 1
      const total = ws.addRow(s.columns.map((_, ci) => (ci === 0 ? 'Total' : null)))
      for (const name of s.totals) {
        const ci = s.columns.indexOf(name)
        // A real formula, with its value stored too so viewers that do not recalculate still show it.
        total.getCell(ci + 1).value = { formula: `SUM(${colLetter(ci)}2:${colLetter(ci)}${last})`, result: sumOf(s.rows, ci) }
      }
      total.font = { bold: true }
    }

    s.columns.forEach((name, ci) => {
      const values = s.rows.map(r => r[ci])
      const numbers = values.filter((v): v is number => typeof v === 'number')
      const col = ws.getColumn(ci + 1)
      const longest = Math.max(name.length, ...values.map(v => String(v ?? '').length))
      col.width = Math.min(50, Math.max(10, longest + 2))
      if (numbers.length && numbers.length === values.filter(v => v !== null).length) {
        col.numFmt = numbers.every(Number.isInteger) ? '#,##0' : '#,##0.00'
      }
    })
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

export interface Check { label: string, passed: boolean, detail: string }
export interface VerifyResult { status: 'passed' | 'failed', checks: Check[] }

const ERROR_VALUES = new Set(['#REF!', '#DIV/0!', '#NAME?', '#VALUE!', '#N/A', '#NUM!', '#NULL!'])
const plain = (v: ExcelJS.CellValue): string | number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'string' || typeof v === 'number') return v
  if (typeof v === 'object' && 'richText' in v) return v.richText.map(t => t.text).join('')
  return JSON.stringify(v)
}

/** Open the file again and compare it with what was asked for. `expectedHash` catches a file changed after it was saved. */
export async function verifyWorkbook(bytes: Uint8Array, spec: WorkbookSpec, expectedHash?: string): Promise<VerifyResult> {
  const checks: Check[] = []
  const add = (label: string, passed: boolean, detail: string) => checks.push({ label, passed, detail })

  if (expectedHash) {
    const now = sha256(bytes)
    add('File is unchanged since it was saved', now === expectedHash, now === expectedHash ? 'Fingerprint matches' : 'The file no longer matches what was saved')
  }

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(bytes as unknown as ExcelJS.Buffer)
    add('Workbook opens', true, 'Opened without errors')
  } catch (e) {
    add('Workbook opens', false, `Could not open it: ${(e as Error).message.slice(0, 120)}`)
    return { status: 'failed', checks }
  }

  const names = wb.worksheets.map(w => w.name)
  const wanted = spec.sheets.map(s => s.name)
  add('Expected sheets exist, in order', JSON.stringify(names) === JSON.stringify(wanted), JSON.stringify(names) === JSON.stringify(wanted) ? wanted.join(', ') : `Expected ${wanted.join(', ')} but found ${names.join(', ') || 'none'}`)

  const problems: string[] = []
  let errorCells = 0
  let textAsFormula = 0
  for (const s of spec.sheets) {
    const ws = wb.getWorksheet(s.name)
    if (!ws) continue
    const header = s.columns.map((_, ci) => plain(ws.getRow(1).getCell(ci + 1).value))
    if (JSON.stringify(header) !== JSON.stringify(s.columns)) problems.push(`${s.name}: the header row differs`)
    const dataRows = s.rows.length
    const hasTotals = !!s.totals?.length
    const expectedRowCount = 1 + dataRows + (hasTotals ? 1 : 0)
    if (ws.actualRowCount < expectedRowCount || ws.rowCount !== expectedRowCount) problems.push(`${s.name}: expected ${expectedRowCount} rows including the header but found ${ws.rowCount}`)

    for (let r = 0; r < dataRows && problems.length < 5; r++) {
      for (let c = 0; c < s.columns.length; c++) {
        const want = s.rows[r]![c]!
        const got = ws.getRow(r + 2).getCell(c + 1)
        const v = got.value
        if (typeof v === 'object' && v !== null && 'formula' in v) { textAsFormula++; problems.push(`${s.name}!${colLetter(c)}${r + 2}: a formula was stored where plain data was expected`); break }
        const g = plain(v)
        const same = typeof want === 'number' && typeof g === 'number' ? Math.abs(want - g) < 1e-9 : want === g
        if (!same) { problems.push(`${s.name}!${colLetter(c)}${r + 2}: expected ${JSON.stringify(want)} but found ${JSON.stringify(g)}`); break }
        if (typeof g === 'string' && ERROR_VALUES.has(g)) errorCells++
      }
    }

    if (hasTotals) {
      const totalRow = ws.getRow(dataRows + 2)
      for (const name of s.totals!) {
        const ci = s.columns.indexOf(name)
        const v = totalRow.getCell(ci + 1).value as { formula?: string, result?: number } | null
        const expectFormula = `SUM(${colLetter(ci)}2:${colLetter(ci)}${dataRows + 1})`
        const expectSum = sumOf(s.rows, ci)
        const okFormula = !!v && typeof v === 'object' && v.formula === expectFormula
        const okValue = !!v && typeof v === 'object' && typeof v.result === 'number' && Math.abs(v.result - expectSum) < 1e-6
        if (!okFormula || !okValue) problems.push(`${s.name}!${colLetter(ci)}${dataRows + 2}: the total should be ${expectSum} using ${expectFormula}`)
      }
    }
  }
  const cellsChecked = spec.sheets.reduce((a, s) => a + s.rows.length * s.columns.length, 0)
  add('Every value matches what was asked for', problems.length === 0, problems.length === 0 ? `${cellsChecked.toLocaleString('en')} values compared` : problems.slice(0, 3).join('; '))
  const totalsAsked = spec.sheets.reduce((a, s) => a + (s.totals?.length ?? 0), 0)
  if (totalsAsked) add('Totals are live formulas and add up', !problems.some(p => p.includes('the total should be')), !problems.some(p => p.includes('the total should be')) ? `${totalsAsked} total${totalsAsked === 1 ? '' : 's'} recomputed from the source data` : 'A total is missing, wrong or not a formula')
  add('No error values', errorCells === 0, errorCells === 0 ? 'No #REF!, #DIV/0! or similar' : `${errorCells} error value${errorCells === 1 ? '' : 's'} found`)
  add('Text is stored as text, never as a formula', textAsFormula === 0, textAsFormula === 0 ? 'Values that start with = + - or @ stay plain text' : `${textAsFormula} cell(s) became formulas`)
  return { status: checks.every(c => c.passed) ? 'passed' : 'failed', checks }
}
