import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { BRAND_ICON_NAMES, brandIcon, labIconFor, providerIconFor } from '../shared/brands.ts'
import { PROVIDERS } from '../shared/providers.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }

test('every listed brand icon exists in the icon package', () => {
  for (const n of BRAND_ICON_NAMES) assert.ok(existsSync(`node_modules/@lobehub/icons-static-svg/icons/${n}.svg`), n)
})

test('every built-in provider has an icon', () => {
  for (const p of PROVIDERS) assert.ok(providerIconFor(p.id), p.id)
})

test('gateway model ids show the lab that made the model, not the gateway', () => {
  assert.equal(labIconFor('anthropic/claude-sonnet-x'), 'claude-color')
  assert.equal(labIconFor('meta-llama/llama-3-70b'), 'meta-color')
  assert.equal(labIconFor('mistralai/mixtral-8x7b'), 'mistral-color')
  assert.equal(labIconFor('x-ai/grok-x'), 'grok')
  assert.equal(labIconFor('z-ai/glm-x'), 'zhipu-color')
  assert.equal(brandIcon('openrouter', 'qwen/qwen3-x'), 'i-brand-qwen-color')
})

test('plain model ids are recognised by family', () => {
  assert.equal(labIconFor('claude-opus-5-5'), 'claude-color')
  assert.equal(labIconFor('gpt-5'), 'openai')
  assert.equal(labIconFor('o3-mini'), 'openai')
  assert.equal(labIconFor('gemini-2.5-pro'), 'gemini-color')
  assert.equal(labIconFor('gemma-3-27b'), 'gemma')
  assert.equal(labIconFor('llama3.1:8b'), 'meta-color')
  assert.equal(labIconFor('deepseek-r1'), 'deepseek-color')
})

test('names that only look similar are not mistaken for a brand', () => {
  assert.equal(labIconFor('mock-chat'), undefined)
  assert.equal(labIconFor('some-lab/some-model'), undefined)
  assert.equal(labIconFor('phoenix-7'), undefined)
  assert.equal(labIconFor('stablecoin-bot'), undefined)
  assert.equal(labIconFor('stable-diffusion-xl'), 'stability-color')
})

test('with no lab match the provider icon is used, then the fallback', () => {
  assert.equal(brandIcon('groq', 'mock-chat'), 'i-brand-groq')
  assert.equal(brandIcon('custom-abc', 'mock-chat'), 'i-lucide-cpu')
  assert.equal(brandIcon('custom-abc', 'mock-chat', 'i-lucide-plug-zap'), 'i-lucide-plug-zap')
})

console.log(`\n${passed} passed`)
