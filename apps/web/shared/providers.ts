// The provider catalog. One list, shared by the server (to build models) and the app (to draw the settings screen).
//
// OpenLobs is model-agnostic. Three native adapters (OpenAI, Anthropic, Google) plus one generic
// "OpenAI-compatible" adapter that covers OpenRouter, Groq, Mistral, DeepSeek, xAI, Together, Fireworks,
// Cerebras, DeepInfra, Ollama, LM Studio, vLLM and any other endpoint that speaks that protocol.
//
// Base URLs below were correct when written but providers change them. Every URL is editable in the app.
// Model lists are fetched live from the provider; nothing here hardcodes which models exist.

export type ProviderKind = 'openai' | 'anthropic' | 'google' | 'openai-compatible'

/** How to list models: each provider exposes this differently. */
export type ModelListStyle = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'none'

export interface ProviderDef {
  id: string
  name: string
  kind: ProviderKind
  baseURL?: string
  /** Local providers (Ollama, LM Studio) need no key and run on the person's own machine. */
  local?: boolean
  keyRequired: boolean
  listStyle: ModelListStyle
  blurb: string
  /** Custom providers are created by the person; the id is generated. */
  custom?: boolean
}

export const PROVIDERS: ProviderDef[] = [
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai-compatible', baseURL: 'https://openrouter.ai/api/v1', keyRequired: true, listStyle: 'openrouter', blurb: 'One key, hundreds of models from many labs. The model list shows which support tools.' },
  { id: 'openai', name: 'OpenAI', kind: 'openai', keyRequired: true, listStyle: 'openai', baseURL: 'https://api.openai.com/v1', blurb: 'GPT models, direct.' },
  { id: 'anthropic', name: 'Anthropic', kind: 'anthropic', keyRequired: true, listStyle: 'anthropic', baseURL: 'https://api.anthropic.com/v1', blurb: 'Claude models, direct.' },
  { id: 'google', name: 'Google AI Studio', kind: 'google', keyRequired: true, listStyle: 'google', baseURL: 'https://generativelanguage.googleapis.com/v1beta', blurb: 'Gemini models, direct.' },
  { id: 'groq', name: 'Groq', kind: 'openai-compatible', baseURL: 'https://api.groq.com/openai/v1', keyRequired: true, listStyle: 'openai', blurb: 'Very fast inference for open models.' },
  { id: 'mistral', name: 'Mistral', kind: 'openai-compatible', baseURL: 'https://api.mistral.ai/v1', keyRequired: true, listStyle: 'openai', blurb: 'Mistral models, direct.' },
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai-compatible', baseURL: 'https://api.deepseek.com/v1', keyRequired: true, listStyle: 'openai', blurb: 'DeepSeek models, direct.' },
  { id: 'xai', name: 'xAI', kind: 'openai-compatible', baseURL: 'https://api.x.ai/v1', keyRequired: true, listStyle: 'openai', blurb: 'Grok models, direct.' },
  { id: 'together', name: 'Together AI', kind: 'openai-compatible', baseURL: 'https://api.together.xyz/v1', keyRequired: true, listStyle: 'openai', blurb: 'Open models hosted by Together.' },
  { id: 'fireworks', name: 'Fireworks AI', kind: 'openai-compatible', baseURL: 'https://api.fireworks.ai/inference/v1', keyRequired: true, listStyle: 'openai', blurb: 'Open models hosted by Fireworks.' },
  { id: 'cerebras', name: 'Cerebras', kind: 'openai-compatible', baseURL: 'https://api.cerebras.ai/v1', keyRequired: true, listStyle: 'openai', blurb: 'Fast inference for open models.' },
  { id: 'deepinfra', name: 'DeepInfra', kind: 'openai-compatible', baseURL: 'https://api.deepinfra.com/v1/openai', keyRequired: true, listStyle: 'openai', blurb: 'Open models hosted by DeepInfra.' },
  { id: 'ollama', name: 'Ollama (local)', kind: 'openai-compatible', baseURL: 'http://localhost:11434/v1', local: true, keyRequired: false, listStyle: 'openai', blurb: 'Models running on your own computer. Free, private, works offline.' },
  { id: 'lmstudio', name: 'LM Studio (local)', kind: 'openai-compatible', baseURL: 'http://localhost:1234/v1', local: true, keyRequired: false, listStyle: 'openai', blurb: 'Models running on your own computer through LM Studio.' }
]

export const CUSTOM_PROVIDER_PREFIX = 'custom-'

export function getProviderDef(id: string): ProviderDef | undefined {
  return PROVIDERS.find(p => p.id === id)
}

/** What a model can do. `null` means unknown: we say so instead of guessing. */
export interface ModelInfo {
  id: string
  name?: string
  contextLength?: number | null
  tools: boolean | null
  reasoning: boolean | null
}

/** What the app sends with each chat request. The key travels in the request body and is never stored by the server. */
export interface ModelSelection {
  providerId: string
  modelId: string
  apiKey?: string
  baseURL?: string
  /** From the capability matrix. `false` means: chat only, do not offer tools. */
  supportsTools?: boolean | null
  /** For custom providers, the display name. */
  providerName?: string
}

export function envKeyName(providerId: string): string {
  return `OPENLOBS_${providerId.replace(/[^a-z0-9]/gi, '_').toUpperCase()}_API_KEY`
}
