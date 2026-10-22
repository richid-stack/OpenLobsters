import assert from 'node:assert/strict'
import { statusFromParts } from '../src/lib/status.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }

test('nothing yet while submitted says getting started', () => {
  assert.equal(statusFromParts([], 'submitted').line, 'Getting started')
})

test('reasoning in progress reads as thinking', () => {
  const s = statusFromParts([{ type: 'reasoning', state: 'streaming' }], 'streaming')
  assert.equal(s.line, 'Thinking it through')
  assert.equal(s.live, true)
})

test('a running tool uses its own words', () => {
  const s = statusFromParts([{ type: 'tool-read_file', state: 'input-available' }], 'streaming')
  assert.equal(s.line, 'Reading a file on your computer')
})

test('an approval request beats everything else and stops the motion', () => {
  const s = statusFromParts([
    { type: 'tool-analyze_table', state: 'output-available' },
    { type: 'tool-create_spreadsheet', state: 'approval-requested' }
  ], 'streaming')
  assert.equal(s.line, 'Waiting for your approval to create the workbook')
  assert.equal(s.waiting, true)
  assert.equal(s.live, false)
})

test('a passed verification adds a verified chip', () => {
  const s = statusFromParts([{ type: 'tool-verify_artifact', state: 'output-available', output: { status: 'passed' } }], 'streaming')
  assert.ok(s.chips.some(c => c.kind === 'verified'))
})

test('a finished run is summarised and static', () => {
  const s = statusFromParts([
    { type: 'tool-read_file', state: 'output-available' },
    { type: 'tool-analyze_table', state: 'output-available' },
    { type: 'text', state: 'done' }
  ], 'ready')
  assert.equal(s.line, 'Worked with 2 tools')
  assert.equal(s.live, false)
})

test('an unknown tool still gets readable words', () => {
  const s = statusFromParts([{ type: 'tool-do_the_thing', state: 'input-available' }], 'streaming')
  assert.equal(s.line, 'Running do the thing')
})

test('a chip never claims an action happened before it did', () => {
  const waiting = statusFromParts([{ type: 'tool-create_spreadsheet', state: 'approval-requested' }], 'streaming').chips[0]!
  assert.equal(waiting.label, 'Needs approval')
  const running = statusFromParts([{ type: 'tool-create_spreadsheet', state: 'input-available' }], 'streaming').chips[0]!
  assert.equal(running.label, 'Creating the workbook')
  const done = statusFromParts([{ type: 'tool-create_spreadsheet', state: 'output-available' }], 'streaming').chips[0]!
  assert.equal(done.label, 'Created the workbook')
  const denied = statusFromParts([{ type: 'tool-create_spreadsheet', state: 'output-denied' }], 'streaming').chips[0]!
  assert.equal(denied.label, 'Workbook not created')
})

console.log(`\n${passed} passed`)
