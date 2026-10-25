import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { buildWorkbook, sha256, verifyWorkbook, workbookSpecSchema } from '../server/artifacts/workbook.ts'
import type { WorkbookSpec } from '../server/artifacts/workbook.ts'

let passed = 0
const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`) }

const spec: WorkbookSpec = workbookSpecSchema.parse({
  filename: 'sales-summary.xlsx',
  sheets: [
    { name: 'Data', columns: ['Month', 'Units', 'Revenue'], rows: [['Jul', 10, 1840.5], ['Aug', 12, 2115], ['Sep', 9, 1972.25]], totals: ['Units', 'Revenue'] },
    { name: 'Notes', columns: ['Note'], rows: [['=1+1'], ['+cmd|calc'], ['@SUM(A1)'], ['plain']] }
  ]
})

await test('a valid spec builds a file that verifies', async () => {
  const bytes = await buildWorkbook(spec)
  const r = await verifyWorkbook(bytes, spec, sha256(bytes))
  assert.equal(r.status, 'passed', JSON.stringify(r.checks.filter(c => !c.passed)))
  assert.ok(r.checks.length >= 6)
})

await test('text that looks like a formula is stored as text', async () => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildWorkbook(spec) as never)
  const v = wb.getWorksheet('Notes')!.getRow(2).getCell(1).value
  assert.equal(v, '=1+1')
  assert.equal(typeof v, 'string')
})

await test('totals are real formulas with the right stored value', async () => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildWorkbook(spec) as never)
  const total = wb.getWorksheet('Data')!.getRow(5).getCell(3).value as { formula: string, result: number }
  assert.equal(total.formula, 'SUM(C2:C4)')
  assert.ok(Math.abs(total.result - 5927.75) < 1e-9)
})

await test('a changed value is caught, with exactly where', async () => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildWorkbook(spec) as never)
  wb.getWorksheet('Data')!.getRow(3).getCell(2).value = 13 // was 12
  const bad = Buffer.from(await wb.xlsx.writeBuffer())
  const r = await verifyWorkbook(bad, spec)
  assert.equal(r.status, 'failed')
  const check = r.checks.find(c => c.label.startsWith('Every value'))!
  assert.equal(check.passed, false)
  assert.match(check.detail, /Data!B3: expected 12 but found 13/)
})

await test('a wrong total, a missing sheet and a changed file are each caught', async () => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildWorkbook(spec) as never)
  wb.getWorksheet('Data')!.getRow(5).getCell(2).value = { formula: 'SUM(B2:B4)', result: 999 }
  const wrongTotal = await verifyWorkbook(Buffer.from(await wb.xlsx.writeBuffer()), spec)
  assert.equal(wrongTotal.checks.find(c => c.label.startsWith('Totals'))!.passed, false)

  wb.removeWorksheet(wb.getWorksheet('Notes')!.id)
  const missing = await verifyWorkbook(Buffer.from(await wb.xlsx.writeBuffer()), spec)
  assert.equal(missing.checks.find(c => c.label.startsWith('Expected sheets'))!.passed, false)

  const original = await buildWorkbook(spec)
  const changed = await verifyWorkbook(Buffer.concat([original, Buffer.from([0])]), spec, sha256(original))
  assert.equal(changed.checks.find(c => c.label.startsWith('File is unchanged'))!.passed, false)
})

await test('something that is not a workbook fails to open, and says so', async () => {
  const r = await verifyWorkbook(Buffer.from('this is not a spreadsheet'), spec)
  assert.equal(r.status, 'failed')
  assert.equal(r.checks.find(c => c.label === 'Workbook opens')!.passed, false)
})

await test('a file can be written by someone else\'s reader: openpyxl sees the same data and formulas', () => {
  const py = spawnSync('python3', ['-c', 'import openpyxl'])
  if (py.status !== 0) { console.log('  (skipped: openpyxl is not installed)'); return }
  return buildWorkbook(spec).then((bytes) => {
    const dir = mkdtempSync(join(tmpdir(), 'wb-'))
    const file = join(dir, 'a.xlsx')
    writeFileSync(file, bytes)
    const out = spawnSync('python3', ['-c', `
import openpyxl, json
wb = openpyxl.load_workbook(${JSON.stringify(file)})
ws = wb['Data']
print(json.dumps({'sheets': wb.sheetnames, 'b3': ws['B3'].value, 'total': ws['C5'].value, 'note': wb['Notes']['A2'].value, 'note_type': wb['Notes']['A2'].data_type}))
`])
    const r = JSON.parse(out.stdout.toString())
    assert.deepEqual(r.sheets, ['Data', 'Notes'])
    assert.equal(r.b3, 12)
    assert.equal(r.total, '=SUM(C2:C4)')
    assert.equal(r.note, '=1+1')
    assert.equal(r.note_type, 's') // a string, not a formula
  })
})

await test('bad specs are refused with a clear reason', () => {
  const bad = (s: unknown, re: RegExp) => { const r = workbookSpecSchema.safeParse(s); assert.equal(r.success, false); assert.match(JSON.stringify(r.error!.issues), re) }
  const ok = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A', 'B'], rows: [[1, 2]] }] }
  assert.equal(workbookSpecSchema.safeParse(ok).success, true)
  bad({ ...ok, filename: '../evil.xlsx' }, /plain file name/)
  bad({ ...ok, filename: 'a.exe' }, /plain file name/)
  bad({ ...ok, sheets: [{ ...ok.sheets[0], name: 'a/b' }] }, /cannot contain/)
  bad({ ...ok, sheets: [ok.sheets[0], { ...ok.sheets[0], name: 's' }] }, /Two sheets/)
  bad({ ...ok, sheets: [{ ...ok.sheets[0], rows: [[1]] }] }, /1 values but there are 2 columns/)
  bad({ ...ok, sheets: [{ ...ok.sheets[0], rows: [['x', 1]], totals: ['A'] }] }, /cannot be totalled/)
  bad({ ...ok, sheets: [{ ...ok.sheets[0], rows: [[1, 'x']], totals: ['B'] }] }, /not all numbers/)
  bad({ ...ok, sheets: [{ ...ok.sheets[0], totals: ['Nope'] }] }, /no column/)
})

console.log(`\n${passed} passed`)
