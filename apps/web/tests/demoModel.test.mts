import assert from 'node:assert/strict'
import { planStep, readPrompt } from '../server/utils/demoModel.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }

test('a sales request starts by reading the file on the computer', () => {
  const step = planStep('Summarise my sales and make me a workbook', 0, false)
  assert.ok('call' in step && step.call.name === 'read_file')
})

test('the workbook step is the one that writes, and it comes after the analysis', () => {
  const names = [0, 1, 2, 3].map(i => planStep('sales workbook', i, false)).map(s => ('call' in s ? s.call.name : 'text'))
  assert.deepEqual(names, ['read_file', 'analyze_table', 'create_spreadsheet', 'verify_artifact'])
})

test('after the check passes the run ends with text', () => {
  assert.ok('text' in planStep('sales workbook', 4, false))
})

test('a denied approval ends the run without creating anything', () => {
  const step = planStep('sales workbook', 3, true)
  assert.ok('text' in step && /not created|have not created/i.test(step.text))
})

test('plain chat uses no tools', () => {
  assert.ok('text' in planStep('hello there', 0, false))
})

test('the step is counted from assistant turns since the last user message', () => {
  const p = readPrompt([
    { role: 'user', content: [{ type: 'text', text: 'old' }] },
    { role: 'assistant', content: [] },
    { role: 'user', content: [{ type: 'text', text: 'sales please' }] },
    { role: 'assistant', content: [] },
    { role: 'tool', content: [{ type: 'tool-result', output: { type: 'json', value: {} } }] }
  ])
  assert.equal(p.stepIndex, 1)
  assert.equal(p.userText, 'sales please')
  assert.equal(p.denied, false)
})

test('a denied tool result is noticed', () => {
  const p = readPrompt([
    { role: 'user', content: [{ type: 'text', text: 'x' }] },
    { role: 'assistant', content: [] },
    { role: 'tool', content: [{ type: 'tool-result', output: { type: 'execution-denied', reason: 'no' } }] }
  ])
  assert.equal(p.denied, true)
})

console.log(`\n${passed} passed`)
