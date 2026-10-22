// Brand marks for providers and for the labs that make models. They come from Lobe Icons (MIT licence),
// are bundled into the app at build time (see scripts/build-icons.mjs), and are never fetched from the
// providers' websites: no tracking requests, and they work offline.
// The marks belong to their owners and are used only to say which provider or lab a model comes from.
//
// Colour versions are used where they stay readable on light and dark backgrounds. Single-colour versions
// (they follow the text colour) are used where the colour version fades into a dark background.

export const BRAND_ICON_NAMES = [
  'openrouter-color', 'openai', 'anthropic', 'claude-color', 'google-color', 'gemini-color', 'gemma',
  'groq', 'mistral-color', 'deepseek-color', 'xai', 'grok', 'together-color', 'fireworks', 'cerebras-color',
  'deepinfra', 'ollama', 'lmstudio', 'meta-color', 'qwen-color', 'cohere-color', 'microsoft-color',
  'nvidia-color', 'perplexity-color', 'moonshot', 'zhipu-color', 'minimax-color', 'nousresearch', 'ai21',
  'stability-color', 'huggingface-color'
] as const

export type BrandIconName = typeof BRAND_ICON_NAMES[number]

/** The icon for a provider (who you pay and send requests to). */
const PROVIDER_ICON: Record<string, BrandIconName> = {
  openrouter: 'openrouter-color',
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google-color',
  groq: 'groq',
  mistral: 'mistral-color',
  deepseek: 'deepseek-color',
  xai: 'xai',
  together: 'together-color',
  fireworks: 'fireworks',
  cerebras: 'cerebras-color',
  deepinfra: 'deepinfra',
  ollama: 'ollama',
  lmstudio: 'lmstudio'
}

/** OpenRouter and similar gateways name models "lab/model". The lab part decides the icon. */
const LAB_PREFIX: Record<string, BrandIconName> = {
  'anthropic': 'claude-color', 'openai': 'openai', 'google': 'gemini-color', 'meta-llama': 'meta-color',
  'meta': 'meta-color', 'mistralai': 'mistral-color', 'deepseek': 'deepseek-color', 'qwen': 'qwen-color',
  'x-ai': 'grok', 'cohere': 'cohere-color', 'microsoft': 'microsoft-color', 'nvidia': 'nvidia-color',
  'perplexity': 'perplexity-color', 'moonshotai': 'moonshot', 'z-ai': 'zhipu-color', 'minimax': 'minimax-color',
  'nousresearch': 'nousresearch', 'ai21': 'ai21', 'stabilityai': 'stability-color'
}

/** For plain model ids with no lab prefix (claude-..., gpt-..., llama3...). First match wins. */
const NAME_RULES: Array<[RegExp, BrandIconName]> = [
  [/claude/i, 'claude-color'],
  [/gemma/i, 'gemma'],
  [/gemini/i, 'gemini-color'],
  [/(^|[^a-z])(gpt|chatgpt|o[1-9](-|$)|davinci|codex)/i, 'openai'],
  [/llama|^meta/i, 'meta-color'],
  [/mistral|mixtral|codestral|pixtral|ministral|magistral|devstral/i, 'mistral-color'],
  [/deepseek/i, 'deepseek-color'],
  [/qwen|qwq/i, 'qwen-color'],
  [/grok/i, 'grok'],
  [/command|cohere/i, 'cohere-color'],
  [/(^|[^a-z])phi-?\d|microsoft/i, 'microsoft-color'],
  [/nemotron|nvidia/i, 'nvidia-color'],
  [/sonar|perplexity/i, 'perplexity-color'],
  [/kimi|moonshot/i, 'moonshot'],
  [/glm|zhipu/i, 'zhipu-color'],
  [/minimax/i, 'minimax-color'],
  [/hermes|nous/i, 'nousresearch'],
  [/jamba|ai21/i, 'ai21'],
  [/stable-?diffusion|stablelm|stable-?code|stability/i, 'stability-color'],
  [/huggingface|zephyr/i, 'huggingface-color']
]

export function labIconFor(modelId?: string): BrandIconName | undefined {
  if (!modelId) return undefined
  const slash = modelId.indexOf('/')
  if (slash > 0) {
    const hit = LAB_PREFIX[modelId.slice(0, slash).toLowerCase()]
    if (hit) return hit
  }
  return NAME_RULES.find(([re]) => re.test(modelId))?.[1]
}

export function providerIconFor(providerId?: string): BrandIconName | undefined {
  return providerId ? PROVIDER_ICON[providerId] : undefined
}

/** The icon class to draw. The model's lab wins (a Claude model through OpenRouter shows Claude), then the provider. */
export function brandIcon(providerId?: string, modelId?: string, fallback = 'i-lucide-cpu'): string {
  const name = labIconFor(modelId) ?? providerIconFor(providerId)
  return name ? `i-brand-${name}` : fallback
}
