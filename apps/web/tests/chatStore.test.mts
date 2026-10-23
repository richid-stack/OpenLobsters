import assert from 'node:assert/strict'
import type { UIMessage } from 'ai'
import { ChatStoreError, createSqliteChatStore, deriveTitle, migrateChats, MAX_CHAT_BYTES } from '../server/chats/store.ts'
import { openDb } from '../server/utils/db.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }

const msg = (role: 'user' | 'assistant', text: string, id = Math.random().toString(36).slice(2)): UIMessage => ({ id, role, parts: [{ type: 'text', text }] })
const setup = () => {
  const db = openDb(':memory:')
  db.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY)')
  db.prepare('INSERT INTO "user" (id) VALUES (?), (?)').run('alice', 'bob')
  migrateChats(db)
  let clock = 1000
  return { db, store: createSqliteChatStore(db, () => clock++) }
}

test('a saved chat comes back as it was saved, titled from the first user message', () => {
  const { store } = setup()
  const saved = store.save('alice', 'chat-aaaaaaaa', [msg('user', '  Summarise   my sales  '), msg('assistant', 'Sure.')])
  assert.equal(saved.title, 'Summarise my sales')
  const got = store.get('alice', 'chat-aaaaaaaa')!
  assert.equal(got.messages.length, 2)
  assert.equal(got.messages[1]!.parts[0]!.type, 'text')
})

test('saving again updates the messages and keeps the title', () => {
  const { store } = setup()
  store.save('alice', 'chat-aaaaaaaa', [msg('user', 'First question')])
  store.rename('alice', 'chat-aaaaaaaa', 'My title')
  store.save('alice', 'chat-aaaaaaaa', [msg('user', 'First question'), msg('assistant', 'Answer'), msg('user', 'Second')])
  const got = store.get('alice', 'chat-aaaaaaaa')!
  assert.equal(got.title, 'My title')
  assert.equal(got.messages.length, 3)
})

test('the list is newest first and only shows your own chats', () => {
  const { store } = setup()
  store.save('alice', 'chat-1111111', [msg('user', 'one')])
  store.save('bob', 'chat-2222222', [msg('user', 'bob private')])
  store.save('alice', 'chat-3333333', [msg('user', 'three')])
  assert.deepEqual(store.list('alice').map(c => c.id), ['chat-3333333', 'chat-1111111'])
  assert.deepEqual(store.list('bob').map(c => c.title), ['bob private'])
})

test('nobody can read, rename or delete someone else\'s chat, even knowing its id', () => {
  const { store } = setup()
  store.save('alice', 'chat-secret1', [msg('user', 'alice secret')])
  assert.equal(store.get('bob', 'chat-secret1'), null)
  assert.equal(store.rename('bob', 'chat-secret1', 'hacked'), false)
  assert.equal(store.remove('bob', 'chat-secret1'), false)
  assert.equal(store.get('alice', 'chat-secret1')!.title, 'alice secret')
})

test('using the same id as another person makes your own separate chat, not an overwrite', () => {
  const { store } = setup()
  store.save('alice', 'chat-shared1', [msg('user', 'alice version')])
  store.save('bob', 'chat-shared1', [msg('user', 'bob version')])
  assert.equal(store.get('alice', 'chat-shared1')!.title, 'alice version')
  assert.equal(store.get('bob', 'chat-shared1')!.title, 'bob version')
})

test('delete removes a chat, and deleting a person removes their chats', () => {
  const { db, store } = setup()
  store.save('alice', 'chat-delete1', [msg('user', 'x')])
  assert.equal(store.remove('alice', 'chat-delete1'), true)
  assert.equal(store.get('alice', 'chat-delete1'), null)
  store.save('bob', 'chat-cascade1', [msg('user', 'y')])
  db.prepare('DELETE FROM "user" WHERE id = ?').run('bob')
  assert.equal(store.list('bob').length, 0)
})

test('bad ids, bad messages, bad titles and oversize chats are refused', () => {
  const { store } = setup()
  const code = (fn: () => unknown) => { try { fn() } catch (e) { return (e as ChatStoreError).code } return 'none' }
  assert.equal(code(() => store.save('alice', 'x', [msg('user', 'hi')])), 'bad_id')
  assert.equal(code(() => store.save('alice', '../../etc/passwd', [msg('user', 'hi')])), 'bad_id')
  assert.equal(code(() => store.save('alice', 'chat-badmsg1', [{ nope: true } as unknown as UIMessage])), 'bad_messages')
  assert.equal(code(() => store.save('alice', 'chat-huge111', [msg('user', 'a'.repeat(MAX_CHAT_BYTES + 10))])), 'too_large')
  store.save('alice', 'chat-title111', [msg('user', 'hello')])
  assert.equal(code(() => store.rename('alice', 'chat-title111', '   ')), 'bad_title')
  assert.equal(code(() => store.rename('alice', 'chat-title111', 'x'.repeat(101))), 'bad_title')
})

test('titles are tidy: collapsed, trimmed, cut at 60, with a fallback', () => {
  assert.equal(deriveTitle([]), 'New chat')
  assert.equal(deriveTitle([msg('assistant', 'no user message')]), 'New chat')
  const long = deriveTitle([msg('user', 'word '.repeat(40))])
  assert.ok(long.length <= 60 && long.endsWith('\u2026'))
})

console.log(`\n${passed} passed`)
