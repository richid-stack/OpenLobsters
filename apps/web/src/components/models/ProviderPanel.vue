<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ModelInfo, ProviderDef } from '../../../shared/providers'
import { brandIcon } from '../../../shared/brands'
import { useModels } from '../../composables/useModels'

const props = defineProps<{ def: ProviderDef, open: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const m = useModels()
const showKey = ref(false)
const search = ref('')
const manual = ref('')
const busy = ref<'' | 'models' | 'test'>('')
const error = ref('')
interface TestResult { ok: boolean, ms: number, tools?: string, error?: string, reply?: string }
const test = ref<TestResult | null>(null)

const c = computed(() => m.conn(props.def.id))
const status = computed(() => m.status(props.def))
const models = computed(() => c.value.models ?? [])
const baseURL = computed({
  get: () => c.value.baseURL ?? props.def.baseURL ?? '',
  set: v => m.patch(props.def.id, { baseURL: v })
})
const apiKey = computed({
  get: () => c.value.apiKey ?? '',
  set: v => m.patch(props.def.id, { apiKey: v })
})
const showAddress = computed(() => !!props.def.custom || !!props.def.local || props.def.kind === 'openai-compatible')

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = q ? models.value.filter(x => x.id.toLowerCase().includes(q) || x.name?.toLowerCase().includes(q)) : models.value
  return list.slice(0, 40)
})

const badge = computed(() => ({
  ready: { label: 'Connected', color: 'success' },
  server: { label: 'Server key', color: 'success' },
  local: { label: 'Local', color: 'neutral' },
  'needs-key': { label: 'Add key', color: 'neutral' }
}[status.value] as { label: string, color: 'success' | 'neutral' }))

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  if (!res.ok) throw new Error((json.statusText as string) || (json.message as string) || (json.statusMessage as string) || `Request failed (${res.status})`)
  return json as T
}

async function getModels() {
  busy.value = 'models'; error.value = ''
  try {
    const { models: list } = await post<{ models: ModelInfo[] }>('/api/providers/models', { providerId: props.def.id, apiKey: apiKey.value || undefined, baseURL: baseURL.value || undefined })
    m.patch(props.def.id, { models: list, fetchedAt: Date.now() })
    if (!list.length) error.value = 'The provider returned no models. You can add a model id by hand.'
  } catch (e) { error.value = (e as Error).message } finally { busy.value = '' }
}

async function runTest() {
  const first = m.state.value.selected?.providerId === props.def.id ? m.state.value.selected.modelId : models.value[0]?.id
  if (!first) { error.value = 'Pick or add a model first, then test it.'; return }
  busy.value = 'test'; error.value = ''; test.value = null
  try {
    const result = await post<TestResult>('/api/providers/test', {
      providerId: props.def.id, modelId: first, apiKey: apiKey.value || undefined, baseURL: baseURL.value || undefined,
      providerName: props.def.custom ? props.def.name : undefined
    })
    test.value = result
    // The test is real evidence, so it updates what we know about the model. Unclear changes nothing.
    if (result.ok && (result.tools === 'works' || result.tools === 'not_supported')) {
      const known = models.value.some(x => x.id === first)
      const updated = (known ? models.value : [{ id: first, tools: null, reasoning: null } as ModelInfo, ...models.value])
        .map(x => x.id === first ? { ...x, tools: result.tools === 'works' } : x)
      m.patch(props.def.id, { models: updated })
    }
  } catch (e) { error.value = (e as Error).message } finally { busy.value = '' }
}

function addManual() {
  const id = manual.value.trim()
  if (!id) return
  if (!models.value.some(x => x.id === id)) m.patch(props.def.id, { models: [{ id, tools: null, reasoning: null }, ...models.value] })
  m.select(props.def.id, id)
  manual.value = ''
}

function toolsLabel(x: ModelInfo) { return x.tools === true ? 'Tools' : x.tools === false ? 'No tools' : 'Tools: unknown' }
const ctx = (n?: number | null) => (n ? `${n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`} context` : '')
</script>

<template>
  <div class="rounded-xl border border-default bg-default overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center gap-3 p-3.5 text-left"
      :aria-expanded="open"
      @click="emit('toggle')"
    >
      <UIcon
        :name="brandIcon(def.id, undefined, def.custom ? 'i-lucide-plug-zap' : 'i-lucide-cloud')"
        class="size-6 shrink-0 text-highlighted"
      />
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium text-highlighted truncate">{{ def.name }}</span>
        <span class="block text-xs text-muted truncate">{{ def.blurb }}</span>
      </span>
      <UBadge
        :label="badge.label"
        :color="badge.color"
        variant="subtle"
        size="sm"
      />
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 text-muted transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="open"
      class="border-t border-default p-3.5 space-y-3"
    >
      <UFormField
        :label="def.keyRequired ? 'API key' : 'API key (optional)'"
        :help="status === 'server' ? 'The server already has a key for this provider. You can leave this empty.' : undefined"
      >
        <UInput
          v-model="apiKey"
          :type="showKey ? 'text' : 'password'"
          placeholder="Paste your key"
          autocomplete="off"
          class="w-full"
        >
          <template #trailing>
            <UButton
              :icon="showKey ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              color="neutral"
              variant="link"
              size="sm"
              :aria-label="showKey ? 'Hide key' : 'Show key'"
              @click="showKey = !showKey"
            />
          </template>
        </UInput>
      </UFormField>

      <UFormField
        v-if="showAddress"
        label="Address (base URL)"
        help="Change this for a self-hosted or different endpoint."
      >
        <UInput
          v-model="baseURL"
          placeholder="https://.../v1"
          autocomplete="off"
          class="w-full"
        />
      </UFormField>

      <div class="flex flex-wrap gap-2">
        <UButton
          label="Get models"
          icon="i-lucide-refresh-cw"
          size="sm"
          :loading="busy === 'models'"
          @click="getModels"
        />
        <UButton
          label="Test"
          icon="i-lucide-plug-zap"
          size="sm"
          color="neutral"
          variant="soft"
          :loading="busy === 'test'"
          @click="runTest"
        />
        <UButton
          :label="def.custom ? 'Remove' : 'Clear key'"
          icon="i-lucide-trash-2"
          size="sm"
          color="error"
          variant="ghost"
          @click="def.custom ? m.removeProvider(def.id) : m.patch(def.id, { apiKey: '', models: undefined })"
        />
      </div>

      <p
        v-if="error"
        class="flex items-start gap-1.5 text-xs text-error"
        role="alert"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="size-4 shrink-0"
        />{{ error }}
      </p>

      <div
        v-if="test"
        class="rounded-lg border p-2.5 text-xs space-y-1"
        :class="test.ok ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5'"
        role="status"
      >
        <p
          v-if="test.ok"
          class="flex items-center gap-1.5 font-medium text-highlighted"
        >
          <UIcon
            name="i-lucide-circle-check"
            class="size-4 text-success"
          />Works ({{ test.ms }} ms)
        </p>
        <p
          v-else
          class="flex items-start gap-1.5 text-error"
        >
          <UIcon
            name="i-lucide-circle-x"
            class="size-4 shrink-0"
          />{{ test.error }}
        </p>
        <p
          v-if="test.ok"
          class="text-muted"
        >
          Tool calling:
          <strong class="text-highlighted">{{ test.tools === 'works' ? 'works' : test.tools === 'not_supported' ? 'not supported, so this model will chat without tools' : 'could not be confirmed' }}</strong>
        </p>
      </div>

      <div class="space-y-2">
        <UInput
          v-model="manual"
          placeholder="Add a model id by hand"
          size="sm"
          class="w-full"
          @keydown.enter.prevent="addManual"
        >
          <template #trailing>
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="link"
              size="sm"
              aria-label="Add model"
              @click="addManual"
            />
          </template>
        </UInput>

        <template v-if="models.length">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search models"
            size="sm"
            class="w-full"
          />
          <ul class="max-h-72 overflow-y-auto divide-y divide-default rounded-lg border border-default">
            <li
              v-for="x in visible"
              :key="x.id"
            >
              <button
                type="button"
                class="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-elevated/60"
                @click="m.select(def.id, x.id)"
              >
                <UIcon
                  :name="brandIcon(def.id, x.id)"
                  class="size-5 shrink-0 text-highlighted"
                />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm text-highlighted truncate">{{ x.id }}</span>
                  <span class="flex flex-wrap items-center gap-1 mt-0.5">
                    <UBadge
                      :label="toolsLabel(x)"
                      :color="x.tools === true ? 'success' : x.tools === false ? 'warning' : 'neutral'"
                      variant="subtle"
                      size="sm"
                    />
                    <UBadge
                      v-if="x.reasoning"
                      label="Reasoning"
                      color="neutral"
                      variant="subtle"
                      size="sm"
                    />
                    <span
                      v-if="ctx(x.contextLength)"
                      class="text-xs text-dimmed"
                    >{{ ctx(x.contextLength) }}</span>
                  </span>
                </span>
                <UIcon
                  v-if="m.isSelected(def.id, x.id)"
                  name="i-lucide-circle-check"
                  class="size-5 text-primary shrink-0"
                />
              </button>
            </li>
          </ul>
          <p
            v-if="models.length > visible.length"
            class="text-xs text-dimmed"
          >
            Showing {{ visible.length }} of {{ models.length }}. Search to narrow it down.
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
