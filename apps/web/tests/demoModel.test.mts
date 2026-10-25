import assert from 'node:assert/strict'
import { planStep, readPrompt } from '../server/utils/demoModel.ts'
import type { Facts } from '../server/utils/demoModel.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }

const CSV = 'month,product,units,revenue\nJan,Rice,10,250\nJan,Oil,4,90\nFeb,Rice,12,300'
const ask = `Summarise this and make a workbook\n${CSV}`
const base = (over: Partial<Facts> = {}): Facts => ({ userText: ask, denied: false, ...over })
const signedIn = { canCreateFiles: true }

test('with a table pasted, the first step reads it with the real analysis tool', () => {
  const s = planStep(base(), signedIn)
  assert.ok('call' in s && s.call.name === 'analyze_table')
  assert.equal((s.call.input as { csv: string }).csv, CSV)
  assert.equal((s.call.input as { groupBy?: string }).groupBy, 'month')
})

test('asking for a workbook with no data asks for the data instead of inventing some', () => {
  const s = planStep({ userText: 'make me a workbook of my sales', denied: false }, signedIn)
  assert.ok('text' in s && /paste/i.test(s.text))
})

test('the steps go analyse, create, then verify with the id that was returned', () => {
  const analysis = { rows: 3, columns: [{ name: 'month', type: 'text' as const }, { name: 'product', type: 'text' as const }, { name: 'units', type: 'number' as const }, { name: 'revenue', type: 'number' as const }], totals: { units: 26, revenue: 640 }, groupBy: 'month', groups: [{ key: 'Jan', rows: 2, sums: { units: 14, revenue: 340 } }, { key: 'Feb', rows: 1, sums: { units: 12, revenue: 300 } }] }
  const create = planStep(base({ analysis }), signedIn)
  assert.ok('call' in create && create.call.name === 'create_spreadsheet')
  const input = create.call.input as { sheets: Array<{ name: string, totals: string[], rows: unknown[][] }> }
  assert.deepEqual(input.sheets.map(s => s.name), ['Data', 'Summary'])
  assert.deepEqual(input.sheets[0]!.totals, ['units', 'revenue']) // never the first column
  assert.equal(input.sheets[0]!.rows.length, 3)
  const verify = planStep(base({ analysis, created: { id: 'file-123', name: 'data-summary.xlsx' } }), signedIn)
  assert.ok('call' in verify && verify.call.name === 'verify_artifact')
  assert.equal((verify.call.input as { artifactId: string }).artifactId, 'file-123')
})

test('a passed check is reported as checked; a failed check is reported as a problem, not as done', () => {
  const analysis = { rows: 3, columns: [], totals: { revenue: 640 } }
  const created = { id: 'f', name: 'data-summary.xlsx' }
  const ok = planStep(base({ analysis, created, verify: { status: 'passed', checks: [{ label: 'a', passed: true, detail: '' }] } }), signedIn)
  assert.ok('text' in ok && ok.text.startsWith('Your workbook is ready'))
  const bad = planStep(base({ analysis, created, verify: { status: 'failed', checks: [{ label: 'Every value matches', passed: false, detail: 'Data!B3: expected 12 but found 13' }] } }), signedIn)
  assert.ok('text' in bad && !bad.text.includes('Your workbook is ready') && bad.text.includes('Data!B3: expected 12 but found 13') && /would not rely/.test(bad.text))
})

test('without an account it still analyses, then says saving a file needs one', () => {
  const analysis = { rows: 3, columns: [], totals: { revenue: 640 } }
  const s = planStep(base({ analysis }), { canCreateFiles: false })
  assert.ok('text' in s && /sign in/i.test(s.text) && s.text.includes('3 rows'))
})

test('a denied approval ends the run honestly, and a failed tool is reported plainly', () => {
  const analysis = { rows: 3, columns: [], totals: { revenue: 640 } }
  const denied = planStep(base({ analysis, denied: true }), signedIn)
  assert.ok('text' in denied && /not created the workbook/.test(denied.text))
  const failed = planStep(base({ failure: { tool: 'analyze_table', message: 'Row 2 has more values than there are columns.' } }), signedIn)
  assert.ok('text' in failed && failed.text.includes('Row 2 has more values') && /Nothing was saved/.test(failed.text))
})

test('plain chat uses no tools, and a search ends after it has answered', () => {
  assert.ok('text' in planStep({ userText: 'hello there', denied: false }, signedIn))
  const first = planStep({ userText: 'search the latest news', denied: false }, signedIn)
  assert.ok('call' in first && first.call.name === 'web_search')
  assert.ok('text' in planStep({ userText: 'search the latest news', denied: false, searched: true }, signedIn))
})

test('facts are read from the conversation: the table, tool results, errors and denials', () => {
  const f = readPrompt([
    { role: 'user', content: [{ type: 'text', text: ask }] },
    { role: 'assistant', content: [] },
    { role: 'tool', content: [
      { type: 'tool-result', toolName: 'analyze_table', output: { type: 'json', value: { rows: 3, columns: [], totals: {} } } },
      { type: 'tool-result', toolName: 'create_spreadsheet', output: { type: 'json', value: { artifact: { id: 'abc', name: 'x.xlsx' } } } }
    ] }
  ])
  assert.equal(f.userText, ask)
  assert.equal(f.analysis!.rows, 3)
  assert.deepEqual(f.created, { id: 'abc', name: 'x.xlsx' })
  const g = readPrompt([
    { role: 'user', content: [{ type: 'text', text: 'x' }] },
    { role: 'tool', content: [{ type: 'tool-result', toolName: 'create_spreadsheet', output: { type: 'error-text', value: 'Too big' } }, { type: 'tool-result', toolName: 'create_spreadsheet', output: { type: 'execution-denied', reason: 'no' } }] }
  ])
  assert.equal(g.failure!.message, 'Too big')
  assert.equal(g.denied, true)
})

console.log(`\n${passed} passed`)
