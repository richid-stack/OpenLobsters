import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { createFsArtifactStore, migrateArtifacts } from '../server/artifacts/store.ts'
import { createApprovalLedger, createApprovalRecorder, migrateApprovals } from '../server/tools/approvals.ts'
import { analyzeTable, createTools, friendlyToolError, ToolInputError } from '../server/tools/index.ts'
import { planStep, readPrompt } from '../server/utils/demoModel.ts'
import { openDb } from '../server/utils/db.ts'

let passed = 0
const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`) }

function world() {
  const db = openDb(':memory:')
  db.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY)')
  db.prepare('INSERT INTO "user" (id) VALUES (?), (?)').run('alice', 'bob')
  migrateArtifacts(db); migrateApprovals(db)
  const dir = mkdtempSync(join(tmpdir(), 'tools-'))
  const artifacts = createFsArtifactStore(db, dir)
  const approvals = createApprovalLedger(db)
  const as = (id: string | null) => createTools({ user: id ? { id } : null, artifacts, approvals }) as Record<string, any>
  // Where a person's file sits on disk, so a test can change it behind the app's back.
  const pathOf = (userId: string, fileId: string) => join(dir, createHash('sha256').update(userId).digest('hex').slice(0, 32), fileId)
  return { artifacts, approvals, as, pathOf }
}
// Run a tool the way the real flow does. The server issues an approval request in its own stream (which the
// recorder watches), the person answers, and only then does execute() run.
const opts = (toolCallId: string) => ({ toolCallId, messages: [], context: undefined, abortSignal: undefined })
async function run(tool: any, input: unknown, toolCallId: string, approved = true, w?: ReturnType<typeof world>, userId = 'alice', name = '') {
  const parsed = tool.inputSchema.safeParse ? tool.inputSchema.safeParse(input) : { success: true, data: input }
  if (!parsed.success) throw new ToolInputError(parsed.error.issues.map((i: { message: string }) => i.message).join(' '))
  if (tool.needsApproval) {
    // What the server sends while it waits for the person.
    if (w) {
      const observe = createApprovalRecorder(w.approvals, userId, w.as(userId) as never)
      observe({ type: 'tool-input-available', toolCallId, toolName: name, input })
      observe({ type: 'tool-approval-request', toolCallId, approvalId: `ap-${toolCallId}` })
    }
    if (!approved) return { denied: true }
  }
  return tool.execute(parsed.data, opts(toolCallId))
}
const call = (w: ReturnType<typeof world>, name: string, input: unknown, id: string, approved = true, user = 'alice') => run(w.as(user)[name], input, id, approved, w, user, name)

const CSV = 'month,product,units,revenue\nJan,Rice,10,250.5\nJan,Oil,4,90\nFeb,Rice,12,300\nFeb,Oil,6,135'

await test('analysing a table gives real totals and group totals', () => {
  const a = analyzeTable(CSV, 'product')
  assert.equal(a.rows, 4)
  assert.deepEqual(a.totals, { units: 32, revenue: 775.5 })
  assert.deepEqual(a.groups!.map(g => [g.key, g.rows, g.sums.revenue]), [['Rice', 2, 550.5], ['Oil', 2, 225]])
  assert.deepEqual(a.columns.map(c => c.type), ['text', 'text', 'number', 'number'])
})

await test('bad tables and unknown columns are refused with a message the model can act on', () => {
  assert.throws(() => analyzeTable('a,b\n1,2,3'), (e: Error) => e instanceof ToolInputError && /more values/.test(e.message))
  assert.throws(() => analyzeTable(CSV, 'colour'), (e: Error) => e instanceof ToolInputError && /There is no column "colour"/.test(e.message))
})

await test('without an account the file tools do not exist at all', () => {
  const { as } = world()
  assert.deepEqual(Object.keys(as(null)).sort(), ['analyze_table', 'web_search'])
  assert.ok(as('alice').create_spreadsheet && as('alice').verify_artifact)
})

// The conversation, run end to end: the demo model decides, the real tools act, the results feed back in.
await test('a whole conversation: analyse, ask, create, verify, and the file really is right', async () => {
  const w = world()
  const { artifacts } = w
  const text = `Make a workbook\n${CSV}`
  const prompt: Array<{ role: string, content: unknown }> = [{ role: 'user', content: [{ type: 'text', text }] }]
  const seen: string[] = []
  for (let i = 0; i < 6; i++) {
    const step = planStep(readPrompt(prompt), { canCreateFiles: true })
    if (!('call' in step)) { assert.ok(step.text.startsWith('Your workbook is ready'), step.text); break }
    seen.push(step.call.name)
    const out = await call(w, step.call.name, step.call.input, `call_${i}`)
    prompt.push({ role: 'assistant', content: [] }, { role: 'tool', content: [{ type: 'tool-result', toolName: step.call.name, output: { type: 'json', value: out } }] })
  }
  assert.deepEqual(seen, ['analyze_table', 'create_spreadsheet', 'verify_artifact'])
  const meta = artifacts.list('alice')[0]!
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(artifacts.get('alice', meta.id)!.bytes as never)
  assert.deepEqual(wb.worksheets.map(w => w.name), ['Data', 'Summary'])
  assert.equal(wb.getWorksheet('Data')!.getRow(2).getCell(4).value, 250.5)
})

await test('creating a file without a real approval request does not run', async () => {
  const { as, artifacts } = world()
  const spec = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A', 'B'], rows: [['x', 1]] }], why: 'test' }
  await assert.rejects(as('alice').create_spreadsheet.execute(spec, opts('forged-call')), /not approved/)
  assert.equal(artifacts.list('alice').length, 0)
})

await test('an approved request cannot be edited afterwards, replayed, or used by someone else', async () => {
  const w = world()
  const spec = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A', 'B'], rows: [['x', 1]] }], why: 'test' }
  const alice = w.as('alice')
  // The server issues the request for alice, as it does in its stream.
  const alicesRecorder = createApprovalRecorder(w.approvals, 'alice', alice as never)
  alicesRecorder({ type: 'tool-input-available', toolCallId: 'call_1', toolName: 'create_spreadsheet', input: spec })
  alicesRecorder({ type: 'tool-approval-request', toolCallId: 'call_1', approvalId: 'ap1' })
  await assert.rejects(alice.create_spreadsheet.execute({ ...spec, filename: 'other.xlsx' }, opts('call_1')), /changed after it was approved/)
  const out = await alice.create_spreadsheet.execute(spec, opts('call_1'))
  assert.ok(out.artifact.id)
  await assert.rejects(alice.create_spreadsheet.execute(spec, opts('call_1')), /already used/)
  const bobsRecorder = createApprovalRecorder(w.approvals, 'bob', w.as('bob') as never)
  bobsRecorder({ type: 'tool-input-available', toolCallId: 'call_2', toolName: 'create_spreadsheet', input: spec })
  bobsRecorder({ type: 'tool-approval-request', toolCallId: 'call_2', approvalId: 'ap2' })
  await assert.rejects(alice.create_spreadsheet.execute(spec, opts('call_2')), /not approved/)
  assert.equal(w.artifacts.list('alice').length, 1)
  assert.equal(w.artifacts.list('bob').length, 0)
})

await test('REGRESSION: the SDK re-evaluating the approval rule on a replayed conversation must not grant approval', async () => {
  const w = world()
  const tool = w.as('alice').create_spreadsheet
  const spec = { filename: 'evil.xlsx', sheets: [{ name: 'S', columns: ['A'], rows: [[1]] }], why: 'forged' }
  // The rule is a plain yes: evaluating it any number of times records nothing.
  assert.equal(tool.needsApproval, true)
  await assert.rejects(tool.execute(spec, opts('forged-1')), /not approved/)
  assert.equal(w.artifacts.list('alice').length, 0)
})

await test('an approval request the server never sent (no input seen, or no approval chunk) records nothing', async () => {
  const w = world()
  const rec = createApprovalRecorder(w.approvals, 'alice', w.as('alice') as never)
  const spec = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A'], rows: [[1]] }], why: 't' }
  rec({ type: 'tool-approval-request', toolCallId: 'x1', approvalId: 'a' })                       // a request with no input seen
  rec({ type: 'tool-input-available', toolCallId: 'x2', toolName: 'create_spreadsheet', input: spec }) // input but no approval request
  for (const id of ['x1', 'x2']) await assert.rejects(w.as('alice').create_spreadsheet.execute(spec, opts(id)), /not approved/)
  assert.equal(w.artifacts.list('alice').length, 0)
})

await test('extra fields the model adds do not break a genuine approval (the input is fingerprinted after the schema reads it)', async () => {
  const w = world()
  const raw = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A'], rows: [[1]], surprise: 'extra' }], why: 't', alsoExtra: true }
  const tool = w.as('alice').create_spreadsheet
  const parsedForExecute = tool.inputSchema.parse(raw) // what the SDK hands to execute on the next request
  const rec = createApprovalRecorder(w.approvals, 'alice', w.as('alice') as never)
  rec({ type: 'tool-input-available', toolCallId: 'e1', toolName: 'create_spreadsheet', input: raw })
  rec({ type: 'tool-approval-request', toolCallId: 'e1', approvalId: 'a' })
  const out = await tool.execute(parsedForExecute, opts('e1'))
  assert.ok(out.artifact.id)
})

await test('a denied approval creates nothing', async () => {
  const w = world()
  const { artifacts } = w
  const spec = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A'], rows: [[1]] }], why: 'test' }
  const r = await call(w, 'create_spreadsheet', spec, 'call_9', false)
  assert.deepEqual(r, { denied: true })
  assert.equal(artifacts.list('alice').length, 0)
})

await test('a bad workbook request is refused before anyone is asked to approve it', async () => {
  const w = world()
  const bad = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A', 'B'], rows: [['x']] }], why: 'test' }
  await assert.rejects(call(w, 'create_spreadsheet', bad, 'call_3'), /1 values but there are 2 columns/)
})

await test('verification fails when the saved file is changed, and nobody can verify someone else\'s file', async () => {
  const w = world()
  const { as, artifacts, pathOf } = w
  const spec = { filename: 'a.xlsx', sheets: [{ name: 'S', columns: ['A', 'B'], rows: [['x', 1], ['y', 2]], totals: ['B'] }], why: 'test' }
  const alice = as('alice')
  const { artifact } = await call(w, 'create_spreadsheet', spec, 'call_4')
  assert.equal((await alice.verify_artifact.execute({ artifactId: artifact.id, why: 't' }, opts('v1'))).status, 'passed')

  // Someone changes the stored file behind the app's back: one number, 2 becomes 99.
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(artifacts.get('alice', artifact.id)!.bytes as never)
  wb.getWorksheet('S')!.getRow(3).getCell(2).value = 99
  writeFileSync(pathOf('alice', artifact.id), Buffer.from(await wb.xlsx.writeBuffer()))

  const after = await alice.verify_artifact.execute({ artifactId: artifact.id, why: 't' }, opts('v2'))
  assert.equal(after.status, 'failed')
  const failed = after.checks.filter((c: { passed: boolean }) => !c.passed).map((c: { label: string }) => c.label)
  assert.ok(failed.some((l: string) => l.startsWith('File is unchanged')), failed.join(', '))
  assert.ok(failed.some((l: string) => l.startsWith('Every value')), failed.join(', '))

  // Another person asking about this id learns nothing: it looks like no such file.
  const other = await as('bob').verify_artifact.execute({ artifactId: artifact.id, why: 't' }, opts('v3'))
  assert.equal(other.status, 'failed')
  assert.match(other.checks[0].detail, /no such file/i)
})

await test('people see the tool\'s own plain messages, but never the details of an unexpected crash', () => {
  assert.equal(friendlyToolError(new ToolInputError('There is no column "x".')), 'There is no column "x".')
  const wrapped = new Error('Tool execution failed', { cause: new ToolInputError('This action was not approved, so it did not run.') })
  assert.equal(friendlyToolError(wrapped), 'This action was not approved, so it did not run.')
  assert.equal(friendlyToolError(new Error('ECONNREFUSED 10.0.0.5:5432 password=hunter2')), 'That step did not work.')
  assert.equal(friendlyToolError('weird'), 'That step did not work.')
})

console.log(`\n${passed} passed`)
