<script setup lang="ts">
import { computed } from 'vue'
import { isToolStreaming } from '@nuxt/ui/utils/ai'
import { toolMeta, LOCATION_LABEL } from '../../../shared/toolMeta'

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

const suffix = computed(() => {
  const i = props.part.input as Record<string, unknown> | undefined
  const v = i?.filename ?? i?.path ?? i?.query ?? i?.file ?? i?.task
  return typeof v === 'string' ? v.slice(0, 44) : undefined
})
const why = computed(() => {
  const w = (props.part.input as Record<string, unknown> | undefined)?.why
  return typeof w === 'string' ? w : ''
})

const locationIcon = computed(() => ({ remote: 'i-lucide-globe', bridge: 'i-openlobs-bridge', sandbox: 'i-lucide-box' })[meta.value.location])
const pretty = (v: unknown) => (v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2))

const checks = computed(() => (name.value === 'verify_artifact' && Array.isArray(output.value?.checks))
  ? output.value!.checks as Array<{ label: string, passed: boolean, detail: string }>
  : [])
const verified = computed(() => name.value === 'verify_artifact' && output.value?.status === 'passed')
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
        class="p-2.5 border border-default rounded-md bg-elevated/40 text-xs font-mono max-h-48 overflow-y-auto space-y-2"
      >
        <pre
          v-if="part.input !== undefined"
          class="whitespace-pre-wrap text-muted"
        >{{ pretty(part.input) }}</pre>
        <pre
          v-if="output"
          class="whitespace-pre-wrap text-muted border-t border-default pt-2"
        >{{ pretty(output) }}</pre>
      </div>
    </UChatTool>

    <div class="mt-1.5 ms-6 space-y-2">
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
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-if="meta.risk === 'write'"
          icon="i-lucide-pencil-line"
          label="Changes something"
          color="warning"
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-if="verified"
          icon="i-openlobs-verify"
          label="Verified"
          color="success"
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-if="output?.demo"
          label="Demo data"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </div>

      <div
        v-if="waiting"
        class="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2.5"
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
            <p class="text-xs text-muted mt-0.5">
              Nothing happens until you choose. This runs on {{ LOCATION_LABEL[meta.location].toLowerCase() }}, inside the folder you approved.
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
        class="space-y-1 rounded-lg border border-default bg-elevated/40 p-2.5"
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
