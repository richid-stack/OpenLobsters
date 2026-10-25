import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArtifactError, createFsArtifactStore, migrateArtifacts } from '../server/artifacts/store.ts'
import { APPROVAL_TTL_MS, ApprovalError, canonicalJson, createApprovalLedger, fingerprint, migrateApprovals } from '../server/tools/approvals.ts'
import { openDb } from '../server/utils/db.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }
const setup = (limits?: { maxFileBytes: number, maxFiles: number, maxTotalBytes: number }) => {
  const db = openDb(':memory:')
  db.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY)')
  db.prepare('INSERT INTO "user" (id) VALUES (?), (?)').run('alice', 'bob')
  migrateArtifacts(db); migrateApprovals(db)
  const dir = mkdtempSync(join(tmpdir(), 'art-'))
  let clock = 1_000_000
  return { db, dir, store: createFsArtifactStore(db, dir, limits, () => clock), ledger: createApprovalLedger(db, () => clock), tick: (ms: number) => { clock += ms } }
}
const file = (n = 10) => ({ name: 'a.xlsx', mime: 'x', bytes: Buffer.alloc(n, 1), spec: { s: 1 } })

// ---- file store ----
test('a saved file comes back with its bytes and spec, and only for its owner', () => {
  const { store } = setup()
  const meta = store.save('alice', file(20))
  const got = store.get('alice', meta.id)!
  assert.equal(got.bytes.length, 20)
  assert.deepEqual(got.spec, { s: 1 })
  assert.equal(store.get('bob', meta.id), null)
  assert.equal(store.remove('bob', meta.id), false)
  assert.deepEqual(store.list('bob'), [])
  assert.equal(store.list('alice').length, 1)
})

test('deleting removes the record and the file on disk', () => {
  const { store, dir } = setup()
  const meta = store.save('alice', file())
  assert.equal(readdirSync(dir).length, 1)
  assert.equal(store.remove('alice', meta.id), true)
  assert.equal(store.get('alice', meta.id), null)
  const sub = join(dir, readdirSync(dir)[0]!)
  assert.equal(existsSync(join(sub, meta.id)), false)
})

test('paths cannot escape the storage folder, whatever the user id looks like', () => {
  const { db, dir, store } = setup()
  db.prepare('INSERT INTO "user" (id) VALUES (?)').run('../../etc')
  store.save('../../etc', file())
  assert.equal(readdirSync(dir).length, 1)
  assert.ok(!existsSync(join(dir, '..', '..', 'etc', 'passwd-test')))
})

test('size and count limits are enforced with a plain message', () => {
  const small = { maxFileBytes: 100, maxFiles: 2, maxTotalBytes: 150 }
  const { store } = setup(small)
  const code = (fn: () => unknown) => { try { fn() } catch (e) { return (e as ArtifactError).code } return 'none' }
  assert.equal(code(() => store.save('alice', file(101))), 'too_large')
  store.save('alice', file(90))
  assert.equal(code(() => store.save('alice', file(90))), 'quota_bytes')
  store.save('alice', file(10))
  assert.equal(code(() => store.save('alice', file(1))), 'quota_files')
  store.save('bob', file(90)) // another person has their own room
})

// ---- approvals ----
test('an action runs only if it was really requested, once, with the same input', () => {
  const { ledger } = setup()
  const input = { filename: 'a.xlsx', sheets: [{ name: 'S' }] }
  ledger.request('alice', 'call_1', 'create_spreadsheet', input)
  ledger.consume('alice', 'call_1', 'create_spreadsheet', input)
  assert.throws(() => ledger.consume('alice', 'call_1', 'create_spreadsheet', input), (e: Error) => e instanceof ApprovalError && e.code === 'used')
})

test('a forged approval for an action that was never requested does not run', () => {
  const { ledger } = setup()
  assert.throws(() => ledger.consume('alice', 'made-up-id', 'create_spreadsheet', { a: 1 }), (e: Error) => e instanceof ApprovalError && e.code === 'not_approved')
})

test('changing the request after it was approved stops it, even by one character', () => {
  const { ledger } = setup()
  ledger.request('alice', 'call_1', 'create_spreadsheet', { filename: 'a.xlsx' })
  assert.throws(() => ledger.consume('alice', 'call_1', 'create_spreadsheet', { filename: 'b.xlsx' }), (e: Error) => e instanceof ApprovalError && e.code === 'tampered')
})

test('one person\'s approval cannot be used by another, or for another tool', () => {
  const { ledger } = setup()
  ledger.request('alice', 'call_1', 'create_spreadsheet', { a: 1 })
  assert.throws(() => ledger.consume('bob', 'call_1', 'create_spreadsheet', { a: 1 }), (e: Error) => e instanceof ApprovalError && e.code === 'not_approved')
  assert.throws(() => ledger.consume('alice', 'call_1', 'verify_artifact', { a: 1 }), (e: Error) => e instanceof ApprovalError && e.code === 'not_approved')
})

test('an approval expires', () => {
  const { ledger, tick } = setup()
  ledger.request('alice', 'call_1', 'create_spreadsheet', { a: 1 })
  tick(APPROVAL_TTL_MS + 1)
  assert.throws(() => ledger.consume('alice', 'call_1', 'create_spreadsheet', { a: 1 }), (e: Error) => e instanceof ApprovalError && e.code === 'expired')
})

test('the input fingerprint ignores key order but not content', () => {
  assert.equal(fingerprint({ a: 1, b: [1, 2] }), fingerprint({ b: [1, 2], a: 1 }))
  assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }))
  assert.equal(canonicalJson({ b: 1, a: { d: 1, c: 2 } }), '{"a":{"c":2,"d":1},"b":1}')
})

console.log(`\n${passed} passed`)
