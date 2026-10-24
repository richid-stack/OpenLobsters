import assert from 'node:assert/strict'
import { statusFromParts, stepAnchor } from '../src/lib/status.ts'

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

test('a passed check is marked verified, and a failed one is not', () => {
  const ok = statusFromParts([{ type: 'tool-verify_artifact', state: 'output-available', output: { status: 'passed' } }], 'streaming')
  assert.equal(ok.steps[0]!.verified, true)
  const bad = statusFromParts([{ type: 'tool-verify_artifact', state: 'output-available', output: { status: 'failed' } }], 'streaming')
  assert.equal(bad.steps[0]!.verified, undefined)
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

test('a step never claims an action happened before it did', () => {
  const step = (state: string) => statusFromParts([{ type: 'tool-create_spreadsheet', state }], 'streaming').steps[0]!
  assert.equal(step('approval-requested').label, 'Ready to create the workbook')
  assert.equal(step('approval-requested').detail, 'Needs your approval')
  assert.equal(step('input-available').label, 'Creating the workbook')
  assert.equal(step('output-available').label, 'Created the workbook')
  assert.equal(step('output-denied').label, 'Workbook not created')
  assert.equal(step('output-error').label, 'Creating the workbook failed')
})

test('a failed request does not stay on getting started', () => {
  const s = statusFromParts([], 'error')
  assert.equal(s.line, 'The request failed')
  assert.equal(s.live, false)
})

test('a reply that used no tools still says it is done', () => {
  const s = statusFromParts([{ type: 'reasoning', state: 'done' }, { type: 'text', state: 'done' }], 'ready')
  assert.equal(s.line, 'Done')
})

test('steps keep their order and point at the part they came from', () => {
  const s = statusFromParts([
    { type: 'reasoning', state: 'done' },
    { type: 'tool-read_file', state: 'output-available', input: { path: 'Documents/sales_2026.csv' } },
    { type: 'reasoning', state: 'done' },
    { type: 'tool-analyze_table', state: 'input-available' },
    { type: 'text', state: 'streaming' }
  ], 'streaming')
  assert.deepEqual(s.steps.map(x => x.partIndex), [1, 3])
  assert.equal(s.steps[0]!.detail, 'Documents/sales_2026.csv')
  assert.deepEqual(s.steps.map(x => x.state), ['done', 'live'])
})

test('the status line knows which part is waiting, so it can jump straight there', () => {
  const s = statusFromParts([
    { type: 'tool-read_file', state: 'output-available' },
    { type: 'tool-create_spreadsheet', state: 'approval-requested' }
  ], 'ready')
  assert.equal(s.waiting, true)
  assert.equal(s.pendingPartIndex, 1)
  assert.equal(statusFromParts([{ type: 'tool-read_file', state: 'output-available' }], 'ready').pendingPartIndex, undefined)
})

test('a plain answer has no steps, so there is nothing to open', () => {
  const s = statusFromParts([{ type: 'text', state: 'done' }], 'ready')
  assert.equal(s.steps.length, 0)
  assert.equal(s.line, 'Done')
})

test('reasoning alone is not a step: it already has its own row above the answer', () => {
  const s = statusFromParts([{ type: 'reasoning', state: 'done' }, { type: 'text', state: 'done' }], 'ready')
  assert.equal(s.steps.length, 0)
  assert.equal(statusFromParts([{ type: 'reasoning', state: 'streaming' }], 'streaming').steps.length, 0)
})

test('anchors are stable and safe to use as element ids', () => {
  assert.equal(stepAnchor('abc123', 2), 'step-abc123-2')
  assert.equal(stepAnchor('a b/c<d>', 0), 'step-abcd-0')
})

console.log(`\n${passed} passed`)
