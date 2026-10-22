import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import { CUSTOM_PROVIDER_PREFIX, envKeyName, getProviderDef } from '../../shared/providers'
import type { ModelSelection, ProviderDef } from '../../shared/providers'
import { assertSafeBaseURL } from './netGuard'

export class ProviderError extends Error {
  constructor(message: string, public code: 'unknown_provider' | 'missing_key' | 'missing_model' | 'unsafe_url') {
    super(message)
    this.name = 'ProviderError'
  }
}

export interface ResolvedModel {
  model: LanguageModel
  /** `false` when the person told us this model cannot call tools. */
  supportsTools: boolean
  label: string
  /** Every secret used, so callers can redact them from errors. */
  secrets: string[]
}

type Env = Record<string, string | undefined>

/** Find the definition for a selection, including person-made custom providers. */
export function definitionFor(sel: ModelSelection): ProviderDef {
  const known = getProviderDef(sel.providerId)
  if (known) return known
  if (sel.providerId.startsWith(CUSTOM_PROVIDER_PREFIX)) {
    return {
      id: sel.providerId,
      name: sel.providerName || 'Custom provider',
      kind: 'openai-compatible',
      baseURL: sel.baseURL,
      keyRequired: false,
      listStyle: 'openai',
      blurb: '',
      custom: true
    }
  }
  throw new ProviderError(`Unknown provider "${sel.providerId}".`, 'unknown_provider')
}

/** Key from the request first, then from the server's environment (for people who self-host and keep keys there). */
export function resolveKey(def: ProviderDef, sel: ModelSelection, env: Env = process.env): string | undefined {
  const fromRequest = sel.apiKey?.trim()
  if (fromRequest) return fromRequest
  return env[envKeyName(def.id)]?.trim() || undefined
}

export async function resolveModel(sel: ModelSelection, env: Env = process.env, allowLocal?: boolean): Promise<ResolvedModel> {
  if (!sel.modelId?.trim()) throw new ProviderError('Choose a model first.', 'missing_model')
  const def = definitionFor(sel)
  const apiKey = resolveKey(def, sel, env)
  if (def.keyRequired && !apiKey) {
    throw new ProviderError(`Add an API key for ${def.name} in Models.`, 'missing_key')
  }

  const baseURL = (sel.baseURL?.trim() || def.baseURL || '').replace(/\/+$/, '')
  // The address is checked even for built-in providers, because the person can edit it.
  if (baseURL) {
    try {
      await assertSafeBaseURL(baseURL, { allowLocal })
    } catch (e) {
      throw new ProviderError((e as Error).message, 'unsafe_url')
    }
  }

  const modelId = sel.modelId.trim()
  let model: LanguageModel
  switch (def.kind) {
    case 'openai':
      model = createOpenAI({ apiKey, baseURL: baseURL || undefined })(modelId)
      break
    case 'anthropic':
      model = createAnthropic({ apiKey, baseURL: baseURL || undefined })(modelId)
      break
    case 'google':
      model = createGoogleGenerativeAI({ apiKey, baseURL: baseURL || undefined })(modelId)
      break
    default:
      if (!baseURL) throw new ProviderError('Add the address (base URL) for this provider.', 'missing_key')
      model = createOpenAICompatible({ name: def.id, baseURL, apiKey, includeUsage: true })(modelId)
  }

  return {
    model,
    supportsTools: sel.supportsTools !== false,
    label: `${def.name} / ${modelId}`,
    secrets: apiKey ? [apiKey] : []
  }
}
