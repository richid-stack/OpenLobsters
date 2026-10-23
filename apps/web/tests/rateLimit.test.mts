import assert from 'node:assert/strict'
import { createRateLimiter } from '../server/utils/rateLimit.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }

test('requests pass until the limit, then are refused with a wait time', () => {
  let t = 0
  const l = createRateLimiter({ windowMs: 60_000, max: 3, now: () => t })
  assert.equal(l.check('a').ok, true); assert.equal(l.check('a').ok, true); assert.equal(l.check('a').ok, true)
  const blocked = l.check('a')
  assert.equal(blocked.ok, false)
  assert.equal(blocked.retryAfterSec, 60)
  t = 45_000
  assert.equal(l.check('a').retryAfterSec, 15)
})

test('the limit resets after the window', () => {
  let t = 0
  const l = createRateLimiter({ windowMs: 1000, max: 1, now: () => t })
  l.check('a'); assert.equal(l.check('a').ok, false)
  t = 1001
  assert.equal(l.check('a').ok, true)
})

test('people are counted separately', () => {
  const l = createRateLimiter({ windowMs: 60_000, max: 1 })
  assert.equal(l.check('u:1').ok, true)
  assert.equal(l.check('u:2').ok, true)
  assert.equal(l.check('u:1').ok, false)
})

console.log(`\n${passed} passed`)
