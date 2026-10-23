import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { authConfigFromEnv, describeAuth } from '../server/auth/config.ts'
import { createAuth, migrateAll } from '../server/auth/auth.ts'
import type { Mailer, Mail } from '../server/auth/mailer.ts'
import { openDb } from '../server/utils/db.ts'

let passed = 0
const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`) }
const SECRET = 'a'.repeat(40)
const ORIGIN = 'http://localhost:3000'

// ---------- configuration ----------
await test('production refuses to start without a strong secret or an https address', () => {
  assert.throws(() => authConfigFromEnv({ NODE_ENV: 'production', OPENLOBS_BASE_URL: 'https://x.example' }), /BETTER_AUTH_SECRET/)
  assert.throws(() => authConfigFromEnv({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'short', OPENLOBS_BASE_URL: 'https://x.example' }), /32 characters/)
  assert.throws(() => authConfigFromEnv({ NODE_ENV: 'production', BETTER_AUTH_SECRET: SECRET, OPENLOBS_BASE_URL: 'http://x.example' }), /https/)
  assert.doesNotThrow(() => authConfigFromEnv({ NODE_ENV: 'production', BETTER_AUTH_SECRET: SECRET, OPENLOBS_BASE_URL: 'https://x.example' }))
})

await test('a sign-in method appears only when it is fully configured, and no secret leaks to the screen', () => {
  const cfg = authConfigFromEnv({
    OPENLOBS_AUTH_GITHUB_ID: 'gh-id', OPENLOBS_AUTH_GITHUB_SECRET: 'gh-secret',
    OPENLOBS_AUTH_GOOGLE_ID: 'only-an-id', // no secret: not enabled
    OPENLOBS_OIDC_ID: 'Company SSO', OPENLOBS_OIDC_NAME: 'Company', OPENLOBS_OIDC_ISSUER: 'https://sso.example.com/', OPENLOBS_OIDC_CLIENT_ID: 'c', OPENLOBS_OIDC_CLIENT_SECRET: 's3cret'
  }, () => SECRET)
  const pub = describeAuth(cfg, false)
  assert.deepEqual(pub.providers.map(p => p.id), ['github', 'company-sso'])
  assert.equal(cfg.oidc!.discoveryUrl, 'https://sso.example.com/.well-known/openid-configuration')
  const text = JSON.stringify(pub)
  for (const secret of ['gh-secret', 's3cret', 'gh-id', SECRET]) assert.ok(!text.includes(secret), secret)
})

await test('password reset and email confirmation are only offered when email can really be sent', () => {
  const cfg = authConfigFromEnv({}, () => SECRET)
  assert.equal(describeAuth(cfg, false).passwordReset, false)
  assert.equal(describeAuth(cfg, false).emailVerification, false)
  assert.equal(describeAuth(cfg, true).passwordReset, true)
  assert.equal(describeAuth(cfg, true).emailVerification, true)
})

await test('sign-ups can be closed, and both local addresses are trusted in development only', () => {
  assert.equal(authConfigFromEnv({ OPENLOBS_SIGNUPS: 'closed' }, () => SECRET).signupsOpen, false)
  assert.equal(authConfigFromEnv({}, () => SECRET).signupsOpen, true)
  assert.ok(authConfigFromEnv({}, () => SECRET).trustedOrigins.includes('http://127.0.0.1:3000'))
  assert.ok(!authConfigFromEnv({ NODE_ENV: 'production', BETTER_AUTH_SECRET: SECRET, OPENLOBS_BASE_URL: 'https://x.example' }).trustedOrigins.includes('http://127.0.0.1:3000'))
})

// ---------- helpers: drive the real auth handler, no server needed ----------
async function makeAuth(env: Record<string, string> = {}, mailer?: Mailer) {
  const db = openDb(':memory:')
  const inst = createAuth({ db, env, mailer, devSecret: () => SECRET })
  await migrateAll(inst, db)
  const jar = new Map<string, string>()
  const store = (res: Response) => { for (const c of res.headers.getSetCookie()) { const [pair] = c.split(';'); const [k, ...v] = pair!.split('='); v.join('=') ? jar.set(k!, v.join('=')) : jar.delete(k!) } }
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  const call = async (path: string, init: { method?: string, body?: unknown, origin?: string } = {}) => {
    const res = await inst.auth.handler(new Request(`${ORIGIN}/api/auth${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', origin: init.origin ?? ORIGIN, cookie: cookie() },
      body: init.body ? JSON.stringify(init.body) : undefined,
      redirect: 'manual'
    }))
    store(res)
    return res
  }
  const session = async () => { const r = await call('/get-session'); const t = await r.text(); return t && t !== 'null' ? JSON.parse(t) : null }
  return { inst, db, call, session, jar }
}
const creds = { name: 'Ada', email: 'ada@example.com', password: 'correct horse battery' }

// ---------- email and password ----------
await test('sign up, read the session, sign out, sign in again', async () => {
  const a = await makeAuth()
  assert.equal((await a.call('/sign-up/email', { body: creds })).status, 200)
  assert.equal((await a.session())?.user.email, 'ada@example.com')
  await a.call('/sign-out', { body: {} })
  assert.equal(await a.session(), null)
  assert.equal((await a.call('/sign-in/email', { body: { email: creds.email, password: creds.password } })).status, 200)
  assert.equal((await a.session())?.user.name, 'Ada')
})

await test('a wrong password, a duplicate sign-up and a weak password are all refused', async () => {
  const a = await makeAuth()
  await a.call('/sign-up/email', { body: creds })
  await a.call('/sign-out', { body: {} })
  assert.equal((await a.call('/sign-in/email', { body: { email: creds.email, password: 'wrong password here' } })).status, 401)
  assert.equal(await a.session(), null)
  assert.ok((await a.call('/sign-up/email', { body: creds })).status >= 400)
  assert.ok((await a.call('/sign-up/email', { body: { ...creds, email: 'new@example.com', password: 'short' } })).status >= 400)
})

await test('requests from an unknown website are refused (cross-site protection)', async () => {
  const a = await makeAuth()
  const res = await a.call('/sign-up/email', { body: creds, origin: 'https://evil.example' })
  assert.ok(res.status >= 400)
  assert.equal(await a.session(), null)
})

await test('with sign-ups closed, new accounts are refused but existing ones still sign in', async () => {
  const open = await makeAuth()
  await open.call('/sign-up/email', { body: creds })
  const closed = createAuth({ db: open.db, env: { OPENLOBS_SIGNUPS: 'closed' }, devSecret: () => SECRET })
  const res = await closed.auth.handler(new Request(`${ORIGIN}/api/auth/sign-up/email`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify({ ...creds, email: 'other@example.com' }) }))
  assert.ok(res.status >= 400)
  const signin = await closed.auth.handler(new Request(`${ORIGIN}/api/auth/sign-in/email`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify({ email: creds.email, password: creds.password }) }))
  assert.equal(signin.status, 200)
})

await test('with email configured, sign-in is blocked until the address is confirmed, and a reset link works', async () => {
  const sent: Mail[] = []
  const mailer: Mailer = { send: async (m) => { sent.push(m) } }
  const a = await makeAuth({}, mailer)
  await a.call('/sign-up/email', { body: creds })
  assert.equal(await a.session(), null)                       // no session before confirming
  const blocked = await a.call('/sign-in/email', { body: { email: creds.email, password: creds.password } })
  assert.equal(blocked.status, 403)
  const link = sent.find(m => /Confirm/.test(m.subject))!.text.match(/https?:\/\/\S+/)![0]
  const verify = await a.call(link.replace(`${ORIGIN}/api/auth`, ''))
  assert.ok(verify.status < 400)
  await a.call('/sign-out', { body: {} })
  assert.equal((await a.call('/sign-in/email', { body: { email: creds.email, password: creds.password } })).status, 200)

  await a.call('/sign-out', { body: {} })
  await a.call('/request-password-reset', { body: { email: creds.email, redirectTo: '/reset' } })
  const reset = sent.find(m => /Reset/.test(m.subject))!.text.match(/https?:\/\/\S+/)![0]
  const redirect = await a.call(reset.replace(`${ORIGIN}/api/auth`, ''))
  const token = new URL(redirect.headers.get('location')!, ORIGIN).searchParams.get('token')!
  assert.equal((await a.call('/reset-password', { body: { newPassword: 'a brand new password', token } })).status, 200)
  assert.equal((await a.call('/sign-in/email', { body: { email: creds.email, password: creds.password } })).status, 401)
  assert.equal((await a.call('/sign-in/email', { body: { email: creds.email, password: 'a brand new password' } })).status, 200)
})

// ---------- OpenID Connect against a fake identity provider ----------
await test('signing in through an OpenID Connect provider creates the account and a session', async () => {
  let issuer = ''
  const idp = createServer((req, res) => {
    const url = new URL(req.url!, issuer)
    const json = (o: unknown) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    if (url.pathname === '/.well-known/openid-configuration') return json({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, userinfo_endpoint: `${issuer}/userinfo`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] })
    if (url.pathname === '/authorize') { res.writeHead(302, { location: `${url.searchParams.get('redirect_uri')}?code=the-code&state=${url.searchParams.get('state')}` }); return void res.end() }
    if (url.pathname === '/token') return json({ access_token: 'access-1', token_type: 'Bearer', expires_in: 3600, scope: 'openid profile email' })
    if (url.pathname === '/userinfo') return json({ sub: 'idp-user-1', email: 'sso@example.com', email_verified: true, name: 'SSO Person' })
    res.writeHead(404); res.end()
  })
  await new Promise<void>(r => idp.listen(0, '127.0.0.1', r))
  issuer = `http://127.0.0.1:${(idp.address() as { port: number }).port}`
  try {
    const a = await makeAuth({ OPENLOBS_OIDC_ID: 'mock', OPENLOBS_OIDC_ISSUER: issuer, OPENLOBS_OIDC_CLIENT_ID: 'cid', OPENLOBS_OIDC_CLIENT_SECRET: 'csecret' })
    const start = await a.call('/sign-in/social', { body: { provider: 'mock', callbackURL: '/' } })
    const body = await start.text()
    const url = start.headers.get('location') ?? (body ? (JSON.parse(body) as { url: string }).url : '')
    assert.ok(url, `no redirect url: status ${start.status} body ${body.slice(0, 200)}`)
    assert.ok(url.startsWith(`${issuer}/authorize`))
    assert.ok(new URL(url).searchParams.get('code_challenge'), 'PKCE is used')
    const consent = await fetch(url, { redirect: 'manual' })
    const back = new URL(consent.headers.get('location')!)
    const done = await a.call(`/callback/mock${back.search}`)
    assert.ok(done.status === 302 || done.status === 200, `callback status ${done.status}`)
    const s = await a.session()
    assert.equal(s?.user.email, 'sso@example.com')
    assert.equal(s?.user.name, 'SSO Person')
  } finally { idp.close() }
})

console.log(`\n${passed} passed`)
