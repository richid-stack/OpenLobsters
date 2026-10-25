<script setup lang="ts">
import { computed } from 'vue'
import { isToolStreaming } from '@nuxt/ui/utils/ai'
import { toolMeta, LOCATION_LABEL } from '../../../shared/toolMeta'
import { toolSubject } from '../../lib/status'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props = defineProps<{ part: any }>()
const emit = defineEmits<{ respond: [approvalId: string, approved: boolean, always: boolean] }>()

const name = computed<string>(() => props.part.type.replace(/^tool-/, ''))
const meta = computed(() => toolMeta(name.value))
const state = computed<string>(() => props.part.state)
const waiting = computed(() => state.value === 'approval-requested')
const denied = computed(() => state.value === 'output-denied')
const failed = computed(() => state.value === 'output-error')
const running = computed(() => isToolStreaming(props.part) || state.value === 'approval-responded')
const output = computed(() => props.part.output as Record<string, unknown> | undefined)

const text = computed(() => {
  if (waiting.value) return `Ready to ${meta.value.approve}`
  if (denied.value) return meta.value.denied
  if (failed.value) return `${meta.value.running} failed`
  if (running.value) return `${meta.value.running}...`
  return meta.value.done
})

const icon = computed(() => waiting.value ? 'i-openlobs-approval' : denied.value ? 'i-lucide-ban' : failed.value ? 'i-lucide-triangle-alert' : meta.value.icon)

const suffix = computed(() => toolSubject(props.part.input))
const why = computed(() => {
  const w = (props.part.input as Record<string, unknown> | undefined)?.why
  return typeof w === 'string' ? w : ''
})

const locationIcon = computed(() => ({ remote: 'i-lucide-globe', bridge: 'i-openlobs-bridge', server: 'i-lucide-server' })[meta.value.location])
const pretty = (v: unknown) => (v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2))

const checks = computed(() => (name.value === 'verify_artifact' && Array.isArray(output.value?.checks))
  ? output.value!.checks as Array<{ label: string, passed: boolean, detail: string }>
  : [])
const verified = computed(() => name.value === 'verify_artifact' && output.value?.status === 'passed')
const problems = computed(() => name.value === 'verify_artifact' && output.value?.status === 'failed')

// A saved file: offered for download right on the step that made it.
interface Artifact { id: string, name: string, sizeBytes: number, sheets: Array<{ name: string, rows: number }> }
const artifact = computed(() => (output.value?.artifact as Artifact | undefined))
const fileLine = computed(() => {
  const a = artifact.value
  if (!a) return ''
  const kb = a.sizeBytes < 1024 ? `${a.sizeBytes} B` : `${(a.sizeBytes / 1024).toFixed(a.sizeBytes < 10240 ? 1 : 0)} KB`
  return `${kb} \u00b7 ${a.sheets.length} ${a.sheets.length === 1 ? 'sheet' : 'sheets'}`
})

// What the person is about to allow, in a few plain words.
const describe = computed(() => meta.value.describe?.(props.part.input))
</script>

<template>
  <div class="my-1.5">
    <UChatTool
      :text="text"
      :suffix="suffix"
      :icon="icon"
      :streaming="running"
      chevron="leading"
    >
      <div
        v-if="part.input !== undefined || output"
        class="text-xs font-mono max-h-48 overflow-y-auto space-y-3 py-1"
      >
        <pre
          v-if="part.input !== undefined"
          class="whitespace-pre-wrap text-muted"
        >{{ pretty(part.input) }}</pre>
        <pre
          v-if="output"
          class="whitespace-pre-wrap text-muted"
        >{{ pretty(output) }}</pre>
      </div>
    </UChatTool>

    <div class="mt-1.5 ms-6 space-y-2">
      <p
        v-if="failed && part.errorText"
        class="flex items-start gap-1.5 text-sm text-error"
        role="alert"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="mt-0.5 size-4 shrink-0"
        />
        <span>{{ part.errorText }}</span>
      </p>
      <p
        v-if="why"
        class="flex items-start gap-1.5 text-xs text-muted"
      >
        <UIcon
          name="i-openlobs-why"
          class="size-3.5 mt-px shrink-0"
        />
        <span>{{ why }}</span>
      </p>

      <div class="flex flex-wrap items-center gap-1.5">
        <UBadge
          :icon="locationIcon"
          :label="LOCATION_LABEL[meta.location]"
          color="neutral"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="meta.risk === 'write'"
          icon="i-lucide-pencil-line"
          label="Changes something"
          color="warning"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="verified"
          icon="i-openlobs-verify"
          label="Verified"
          color="success"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="problems"
          icon="i-lucide-triangle-alert"
          label="Problems found"
          color="error"
          variant="soft"
          size="sm"
        />
        <UBadge
          v-if="output?.demo"
          label="Demo data"
          color="neutral"
          variant="soft"
          size="sm"
        />
      </div>

      <div
        v-if="artifact"
        class="flex items-center gap-3 py-0.5"
      >
        <UIcon
          name="i-lucide-file-spreadsheet"
          class="size-5 shrink-0 text-success"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-highlighted">
            {{ artifact.name }}
          </p>
          <p class="text-xs text-muted">
            {{ fileLine }}
          </p>
        </div>
        <UButton
          :to="`/api/artifacts/${artifact.id}`"
          external
          download
          label="Download"
          icon="i-lucide-download"
          size="sm"
          color="neutral"
          variant="soft"
        />
      </div>

      <div
        v-if="waiting"
        class="space-y-2.5 pt-1"
      >
        <div class="flex items-start gap-2">
          <UIcon
            name="i-openlobs-approval"
            class="size-5 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0"
          />
          <div class="min-w-0">
            <p class="text-sm font-medium text-highlighted">
              Allow OpenLobs to {{ meta.approve }}?
            </p>
            <p
              v-if="describe"
              class="mt-0.5 flex items-center gap-1.5 text-sm text-highlighted"
            >
              <UIcon
                :name="meta.icon"
                class="size-4 shrink-0 text-muted"
              />
              <span class="min-w-0 truncate">{{ describe }}</span>
            </p>
            <p class="text-xs text-muted mt-0.5">
              {{ meta.approveDetail ?? `Nothing happens until you choose. This runs ${LOCATION_LABEL[meta.location].toLowerCase()}.` }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            label="Allow once"
            icon="i-lucide-check"
            size="sm"
            @click="emit('respond', part.approval.id, true, false)"
          />
          <UButton
            label="Always allow"
            color="neutral"
            variant="soft"
            size="sm"
            @click="emit('respond', part.approval.id, true, true)"
          />
          <UButton
            label="Deny"
            icon="i-lucide-x"
            color="error"
            variant="ghost"
            size="sm"
            @click="emit('respond', part.approval.id, false, false)"
          />
        </div>
      </div>

      <ul
        v-if="checks.length"
        class="space-y-1.5 pt-0.5"
      >
        <li
          v-for="c in checks"
          :key="c.label"
          class="flex items-start gap-2 text-xs"
        >
          <UIcon
            :name="c.passed ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
            class="size-4 shrink-0"
            :class="c.passed ? 'text-success' : 'text-error'"
          />
          <span class="min-w-0">
            <span class="block text-highlighted">{{ c.label }}</span>
            <span class="block text-muted">{{ c.detail }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
