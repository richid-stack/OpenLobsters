import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { brandIcon } from '../../shared/brands'
import { CUSTOM_PROVIDER_PREFIX, PROVIDERS } from '../../shared/providers'
import type { ModelInfo, ModelSelection, ProviderDef } from '../../shared/providers'

// Provider keys and the chosen model, kept in this browser only. The server never stores them: the key
// travels inside each chat request and is dropped when the request ends. Anyone who can open this
// browser profile can read the keys, which is why the Models screen tells people to use limited keys.

interface Connection { apiKey?: string, baseURL?: string, models?: ModelInfo[], fetchedAt?: number }
interface Custom { id: string, name: string, baseURL: string }
interface State {
  v: 1
  conns: Record<string, Connection>
  customs: Custom[]
  selected: { providerId: string, modelId: string } | null
}

const state = useLocalStorage<State>('openlobs.models.v1', { v: 1, conns: {}, customs: [], selected: null }, { mergeDefaults: true })
const serverKeys = ref<Record<string, boolean>>({})
let loadedCatalog = false

async function loadServerKeys() {
  if (loadedCatalog) return
  loadedCatalog = true
  try {
    const res = await fetch('/api/providers')
    const json = await res.json() as { providers: Array<{ id: string, serverKey: boolean }> }
    serverKeys.value = Object.fromEntries(json.providers.map(p => [p.id, p.serverKey]))
  } catch { /* the catalog works without this; it only says which keys the server already has */ }
}

export function useModels() {
  void loadServerKeys()

  const providers = computed<ProviderDef[]>(() => [
    ...PROVIDERS,
    ...state.value.customs.map((c): ProviderDef => ({
      id: c.id, name: c.name, kind: 'openai-compatible', baseURL: c.baseURL, keyRequired: false, listStyle: 'openai', blurb: 'Your own OpenAI-compatible endpoint.', custom: true
    }))
  ])

  const conn = (id: string): Connection => state.value.conns[id] ?? {}
  const patch = (id: string, change: Partial<Connection>) => { state.value.conns[id] = { ...conn(id), ...change } }

  /** Ready to use: has a key, or the server has one, or it is local and needs none. */
  function status(def: ProviderDef): 'ready' | 'server' | 'local' | 'needs-key' {
    if (conn(def.id).apiKey?.trim()) return 'ready'
    if (serverKeys.value[def.id]) return 'server'
    if (!def.keyRequired) return def.local ? 'local' : 'ready'
    return 'needs-key'
  }

  const selectedDef = computed(() => state.value.selected ? providers.value.find(p => p.id === state.value.selected!.providerId) : undefined)
  const selectedInfo = computed(() => {
    const s = state.value.selected
    return s ? conn(s.providerId).models?.find(m => m.id === s.modelId) : undefined
  })
  const label = computed(() => state.value.selected ? state.value.selected.modelId : 'Demo model')
  /** Short form for tight spaces: the model without its "lab/" prefix, because the logo already says who made it. */
  const shortLabel = computed(() => label.value.includes('/') ? label.value.slice(label.value.indexOf('/') + 1) : label.value)
  const icon = computed(() => state.value.selected ? brandIcon(state.value.selected.providerId, state.value.selected.modelId) : 'i-openlobs-spark')
  const providerLabel = computed(() => selectedDef.value?.name ?? 'Built in')

  /** What goes with each chat request. Undefined means the built-in demo model. */
  function payload(): ModelSelection | undefined {
    const s = state.value.selected
    if (!s) return undefined
    const def = providers.value.find(p => p.id === s.providerId)
    const c = conn(s.providerId)
    return {
      providerId: s.providerId,
      modelId: s.modelId,
      apiKey: c.apiKey?.trim() || undefined,
      // Only send an address when it differs from the built-in one or the provider is custom.
      baseURL: c.baseURL?.trim() || (def?.custom ? def.baseURL : undefined),
      supportsTools: selectedInfo.value?.tools ?? null,
      providerName: def?.custom ? def.name : undefined
    }
  }

  function addCustom(name: string, baseURL: string): string {
    const id = `${CUSTOM_PROVIDER_PREFIX}${Math.random().toString(36).slice(2, 8)}`
    state.value.customs.push({ id, name: name.trim() || 'Custom provider', baseURL: baseURL.trim() })
    return id
  }

  function removeProvider(id: string) {
    delete state.value.conns[id]
    state.value.customs = state.value.customs.filter(c => c.id !== id)
    if (state.value.selected?.providerId === id) state.value.selected = null
  }

  return {
    state, providers, serverKeys, conn, patch, status, label, shortLabel, icon, providerLabel, selectedInfo, payload, addCustom, removeProvider,
    select: (providerId: string, modelId: string) => { state.value.selected = { providerId, modelId } },
    selectDemo: () => { state.value.selected = null },
    isSelected: (providerId: string, modelId: string) => state.value.selected?.providerId === providerId && state.value.selected.modelId === modelId
  }
}
