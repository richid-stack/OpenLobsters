import type { ModelInfo, ProviderDef } from '../../shared/providers'

// Fetch and normalise a provider's model list. Providers describe models in different shapes, and most say
// nothing about capabilities. Where a provider does say (OpenRouter lists supported parameters), we use it.
// Where it does not, tools and reasoning are `null` (unknown), and the Test button checks tool calling for real.

type Json = Record<string, unknown>
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function normalizeOpenAIList(body: unknown): ModelInfo[] {
  return arr((body as Json)?.data)
    .map((m): ModelInfo | null => {
      const id = str((m as Json)?.id)
      return id ? { id, tools: null, reasoning: null } : null
    })
    .filter((m): m is ModelInfo => !!m)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function normalizeOpenRouterList(body: unknown): ModelInfo[] {
  return arr((body as Json)?.data)
    .map((m): ModelInfo | null => {
      const o = m as Json
      const id = str(o.id)
      if (!id) return null
      const params = arr(o.supported_parameters).filter((p): p is string => typeof p === 'string')
      const known = params.length > 0
      return {
        id,
        name: str(o.name),
        contextLength: num(o.context_length),
        // Only claim a yes or no when the provider gave us a parameter list to read it from.
        tools: known ? params.includes('tools') : null,
        reasoning: known ? params.includes('reasoning') || params.includes('include_reasoning') : null
      }
    })
    .filter((m): m is ModelInfo => !!m)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function normalizeAnthropicList(body: unknown): ModelInfo[] {
  return arr((body as Json)?.data)
    .map((m): ModelInfo | null => {
      const o = m as Json
      const id = str(o.id)
      return id ? { id, name: str(o.display_name), tools: null, reasoning: null } : null
    })
    .filter((m): m is ModelInfo => !!m)
}

export function normalizeGoogleList(body: unknown): ModelInfo[] {
  return arr((body as Json)?.models)
    .map((m): ModelInfo | null => {
      const o = m as Json
      const raw = str(o.name)
      if (!raw) return null
      const methods = arr(o.supportedGenerationMethods)
      // Only keep models that can generate text; embedding-only models cannot chat.
      if (methods.length && !methods.includes('generateContent')) return null
      return { id: raw.replace(/^models\//, ''), name: str(o.displayName), contextLength: num(o.inputTokenLimit), tools: null, reasoning: null }
    })
    .filter((m): m is ModelInfo => !!m)
}

export interface ListOptions {
  apiKey?: string
  baseURL?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export async function fetchModelList(def: Pick<ProviderDef, 'listStyle' | 'baseURL' | 'keyRequired'>, opts: ListOptions): Promise<ModelInfo[]> {
  const base = (opts.baseURL || def.baseURL || '').replace(/\/+$/, '')
  if (!base) throw new Error('No address set for this provider.')
  const f = opts.fetchImpl ?? fetch
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 15000)
  let url = `${base}/models`
  const headers: Record<string, string> = { accept: 'application/json' }

  switch (def.listStyle) {
    case 'anthropic':
      headers['x-api-key'] = opts.apiKey ?? ''
      headers['anthropic-version'] = '2023-06-01'
      break
    case 'google':
      url += `?key=${encodeURIComponent(opts.apiKey ?? '')}&pageSize=200`
      break
    case 'openrouter':
      // The OpenRouter list is public. A key is not needed just to look.
      break
    case 'none':
      throw new Error('This provider does not list its models. Add a model id by hand.')
    default:
      if (opts.apiKey) headers.authorization = `Bearer ${opts.apiKey}`
  }

  if (def.keyRequired && !opts.apiKey && def.listStyle !== 'openrouter') {
    throw new Error('Add an API key first.')
  }

  const res = await f(url, { headers, signal })
  if (!res.ok) {
    throw new Error(`The provider answered ${res.status}. Check the key and the address.`)
  }
  const body = await res.json()
  switch (def.listStyle) {
    case 'openrouter': return normalizeOpenRouterList(body)
    case 'anthropic': return normalizeAnthropicList(body)
    case 'google': return normalizeGoogleList(body)
    default: return normalizeOpenAIList(body)
  }
}
