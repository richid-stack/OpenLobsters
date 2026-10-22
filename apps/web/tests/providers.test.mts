import assert from 'node:assert/strict'
import { streamText, tool, isStepCount } from 'ai'
import { z } from 'zod'
import { assertSafeBaseURL, isAlwaysBlockedAddress, isPrivateAddress, localModelsAllowed } from '../server/providers/netGuard.ts'
import { redactSecrets } from '../server/providers/redact.ts'
import { fetchModelList, normalizeGoogleList, normalizeOpenAIList, normalizeOpenRouterList } from '../server/providers/models.ts'
import { ProviderError, resolveModel } from '../server/providers/registry.ts'
import { startMockOpenAI } from './mockOpenAI.mts'

let passed = 0
const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`) }
const rejects = async (p: Promise<unknown>, match: RegExp) => { await assert.rejects(p, (e: Error) => match.test(e.message)) }
const resolveTo = (ip: string) => async () => [ip]

// ---- safety ----
await test('private, loopback and metadata addresses are recognised', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.9.1', '192.168.1.20', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.1.2.3', '::ffff:a00:1']) assert.equal(isPrivateAddress(ip), true, ip)
  for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip)
})

await test('with local models off, local and private addresses are refused', async () => {
  await rejects(assertSafeBaseURL('http://localhost:11434/v1', { allowLocal: false }), /https|private|local/)
  await rejects(assertSafeBaseURL('https://localhost/v1', { allowLocal: false }), /private or local/)
  await rejects(assertSafeBaseURL('https://169.254.169.254/latest', { allowLocal: false }), /private or local|never a model server/)
  await rejects(assertSafeBaseURL('https://10.0.0.8/v1', { allowLocal: false }), /private or local/)
})

await test('a public name that resolves to a private address is refused', async () => {
  await rejects(assertSafeBaseURL('https://sneaky.example.com/v1', { allowLocal: false, resolve: resolveTo('10.1.1.1') }), /private or local/)
  await assertSafeBaseURL('https://api.example.com/v1', { allowLocal: false, resolve: resolveTo('93.184.216.34') })
})

await test('cloud metadata and link-local addresses are refused even when local models are allowed', async () => {
  for (const u of ['http://169.254.169.254/v1', 'http://169.254.170.2/v1', 'http://0.0.0.0/v1', 'http://[fe80::1]/v1', 'http://metadata.google.internal/v1', 'http://[::ffff:169.254.169.254]/v1']) {
    await rejects(assertSafeBaseURL(u, { allowLocal: true }), /never a model server/)
  }
  for (const ip of ['169.254.169.254', '0.0.0.0', 'fe80::1', '::ffff:a9fe:a9fe', '::ffff:169.254.169.254']) assert.equal(isAlwaysBlockedAddress(ip), true, ip)
  for (const ip of ['127.0.0.1', '192.168.1.5', '10.0.0.2']) assert.equal(isAlwaysBlockedAddress(ip), false, ip)
  // Ollama on the same machine and a LAN server stay allowed when local models are on.
  await assertSafeBaseURL('http://localhost:11434/v1', { allowLocal: true })
  await assertSafeBaseURL('http://192.168.1.50:8000/v1', { allowLocal: true })
})

await test('odd addresses are refused whatever the setting', async () => {
  await rejects(assertSafeBaseURL('ftp://example.com', { allowLocal: true }), /http/)
  await rejects(assertSafeBaseURL('not a url', { allowLocal: true }), /valid/)
  await rejects(assertSafeBaseURL('https://user:secret@example.com/v1', { allowLocal: true }), /key field/)
})

await test('local models are allowed in development and blocked in production unless switched on', () => {
  assert.equal(localModelsAllowed({ NODE_ENV: 'development' }), true)
  assert.equal(localModelsAllowed({ NODE_ENV: 'production' }), false)
  assert.equal(localModelsAllowed({ NODE_ENV: 'production', OPENLOBS_ALLOW_LOCAL_MODELS: '1' }), true)
  assert.equal(localModelsAllowed({ NODE_ENV: 'development', OPENLOBS_ALLOW_LOCAL_MODELS: '0' }), false)
})

await test('keys are removed from error text', () => {
  const key = 'sk-or-v1-abcdef1234567890abcdef'
  assert.ok(!redactSecrets(`Bad key ${key} for request`, [key]).includes(key))
  assert.ok(!redactSecrets('Authorization: Bearer abcdefghijklmnop1234', []).includes('abcdefghijklmnop1234'))
  assert.ok(!redactSecrets('GET /models?key=AIzaSyFAKEFAKEFAKE&x=1', []).includes('AIzaSyFAKEFAKEFAKE'))
  assert.equal(redactSecrets('nothing secret here', ['abc']), 'nothing secret here')
})

// ---- model lists ----
await test('OpenRouter lists carry real capabilities, and say unknown when they do not', () => {
  const list = normalizeOpenRouterList({ data: [
    { id: 'a/with-tools', name: 'With tools', context_length: 128000, supported_parameters: ['tools', 'temperature', 'reasoning'] },
    { id: 'b/no-tools', name: 'No tools', context_length: 8000, supported_parameters: ['temperature'] },
    { id: 'c/silent', name: 'Silent' }
  ] })
  assert.deepEqual(list.map(m => [m.id, m.tools, m.reasoning]), [['a/with-tools', true, true], ['b/no-tools', false, false], ['c/silent', null, null]])
  assert.equal(list[0]!.contextLength, 128000)
})

await test('plain OpenAI-style lists make no capability claims', () => {
  const list = normalizeOpenAIList({ data: [{ id: 'z' }, { id: 'a' }, { nope: 1 }] })
  assert.deepEqual(list.map(m => m.id), ['a', 'z'])
  assert.ok(list.every(m => m.tools === null && m.reasoning === null))
})

await test('Google lists drop models that cannot generate text', () => {
  const list = normalizeGoogleList({ models: [
    { name: 'models/gemini-x', displayName: 'Gemini X', inputTokenLimit: 1000, supportedGenerationMethods: ['generateContent'] },
    { name: 'models/embed-y', supportedGenerationMethods: ['embedContent'] }
  ] })
  assert.deepEqual(list.map(m => m.id), ['gemini-x'])
})

// ---- resolving a model ----
await test('a missing key is a clear error, and the server environment can supply one', async () => {
  await assert.rejects(resolveModel({ providerId: 'openrouter', modelId: 'x/y' }, {}, true), (e: unknown) => e instanceof ProviderError && e.code === 'missing_key')
  const r = await resolveModel({ providerId: 'openrouter', modelId: 'x/y' }, { OPENLOBS_OPENROUTER_API_KEY: 'sk-env-key-123456' }, true)
  assert.deepEqual(r.secrets, ['sk-env-key-123456'])
})

await test('unknown providers, missing models and unsafe addresses are refused', async () => {
  await assert.rejects(resolveModel({ providerId: 'nope', modelId: 'm' }, {}, true), (e: unknown) => e instanceof ProviderError && e.code === 'unknown_provider')
  await assert.rejects(resolveModel({ providerId: 'ollama', modelId: ' ' }, {}, true), (e: unknown) => e instanceof ProviderError && e.code === 'missing_model')
  await assert.rejects(resolveModel({ providerId: 'ollama', modelId: 'llama' }, {}, false), (e: unknown) => e instanceof ProviderError && e.code === 'unsafe_url')
  await assert.rejects(resolveModel({ providerId: 'custom-1', modelId: 'm' }, {}, true), (e: unknown) => e instanceof ProviderError && e.code === 'missing_key')
})

await test('a model marked as unable to use tools says so', async () => {
  const r = await resolveModel({ providerId: 'ollama', modelId: 'tiny', supportsTools: false }, {}, true)
  assert.equal(r.supportsTools, false)
})

// ---- end to end through a real OpenAI-compatible endpoint ----
const mock = await startMockOpenAI({ requireKey: 'test-key' })

await test('the model list comes from the provider, with the key sent', async () => {
  const models = await fetchModelList({ listStyle: 'openai', baseURL: mock.url, keyRequired: true }, { apiKey: 'test-key', baseURL: mock.url })
  assert.deepEqual(models.map(m => m.id), ['mock-chat', 'mock-reasoner', 'mock-tools'])
  await assert.rejects(fetchModelList({ listStyle: 'openai', baseURL: mock.url, keyRequired: true }, { apiKey: 'wrong', baseURL: mock.url }), /401/)
})

await test('text streams through a custom OpenAI-compatible provider', async () => {
  const { model } = await resolveModel({ providerId: 'custom-mock', providerName: 'Mock', modelId: 'mock-chat', baseURL: mock.url, apiKey: 'test-key' }, {}, true)
  const result = streamText({ model, prompt: 'Say hello' })
  let text = ''
  for await (const part of result.fullStream) if (part.type === 'text-delta') text += (part as { text?: string, delta?: string }).text ?? (part as { delta?: string }).delta ?? ''
  assert.equal(text, 'Hello from the mock model.')
  assert.equal(mock.requests.at(-1)!.auth, 'Bearer test-key')
})

await test('reasoning from a provider arrives as reasoning, not as answer text', async () => {
  const { model } = await resolveModel({ providerId: 'custom-mock', modelId: 'mock-reasoner', baseURL: mock.url, apiKey: 'test-key' }, {}, true)
  const result = streamText({ model, prompt: 'Say hello' })
  let reasoning = ''; let text = ''
  for await (const part of result.fullStream) {
    const p = part as { type: string, text?: string, delta?: string }
    if (p.type === 'reasoning-delta') reasoning += p.text ?? p.delta ?? ''
    if (p.type === 'text-delta') text += p.text ?? p.delta ?? ''
  }
  assert.equal(reasoning, 'Let me think about this.')
  assert.equal(text, 'Hello from the mock model.')
})

await test('a tool call made by a provider runs the tool and the run continues', async () => {
  const { model } = await resolveModel({ providerId: 'custom-mock', modelId: 'mock-tools', baseURL: mock.url, apiKey: 'test-key' }, {}, true)
  let ran = false
  const result = streamText({
    model, prompt: 'Please ping once.', stopWhen: isStepCount(3),
    tools: { ping: tool({ description: 'pong', inputSchema: z.object({}), execute: async () => { ran = true; return 'pong' } }) }
  })
  let text = ''
  for await (const part of result.fullStream) if (part.type === 'text-delta') text += (part as { text?: string, delta?: string }).text ?? (part as { delta?: string }).delta ?? ''
  assert.equal(ran, true)
  assert.equal(text, 'The tool answered.')
})

await mock.close()
console.log(`\n${passed} passed`)
