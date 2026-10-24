<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { stepAnchor } from '../../lib/status'
import type { StatusView } from '../../lib/status'
import LobMark from '../brand/LobMark.vue'
import StepTray from './StepTray.vue'

// One quiet line above the message box. While working it says what is happening. When it has steps, tapping
// it opens the tray of steps. When something is waiting for the person, tapping it jumps to that instead.

const props = defineProps<{ view: StatusView, messageId?: string }>()
const emit = defineEmits<{ jump: [anchor: string] }>()

const open = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const trayId = `steps-${Math.random().toString(36).slice(2, 8)}`

const hasSteps = computed(() => props.view.steps.length > 0)
const interactive = computed(() => hasSteps.value && !props.view.failed && !!props.messageId)
const count = computed(() => `${props.view.steps.length} ${props.view.steps.length === 1 ? 'step' : 'steps'}`)
const showTray = computed(() => open.value && interactive.value)

function press() {
  if (!interactive.value) return
  // Something is waiting on the person: take them to it rather than to a list.
  if (props.view.waiting && props.view.pendingPartIndex !== undefined) {
    open.value = false
    emit('jump', stepAnchor(props.messageId!, props.view.pendingPartIndex))
    return
  }
  open.value = !open.value
}

function close() {
  open.value = false
  void nextTick(() => button.value?.focus({ preventScroll: true }))
}

function select(partIndex: number) {
  open.value = false
  emit('jump', stepAnchor(props.messageId!, partIndex))
}

// A new conversation, or one with no steps, has nothing to show.
watch(hasSteps, (v) => { if (!v) open.value = false })

const label = computed(() => {
  if (!interactive.value) return props.view.line
  return props.view.waiting
    ? `${props.view.line}. Go to the approval.`
    : `${props.view.line}. ${count.value}. ${open.value ? 'Hide' : 'Show'} steps.`
})

defineExpose({ close: () => { open.value = false } })
</script>

<template>
  <div
    v-if="view.line || hasSteps"
    class="px-1"
    role="status"
    aria-live="polite"
  >
    <Transition name="ol-sheet">
      <StepTray
        v-if="showTray"
        :id="trayId"
        :steps="view.steps"
        @select="select"
        @close="close"
      />
    </Transition>

    <component
      :is="interactive ? 'button' : 'div'"
      ref="button"
      :type="interactive ? 'button' : undefined"
      :aria-expanded="interactive && !view.waiting ? open : undefined"
      :aria-controls="interactive && !view.waiting ? trayId : undefined"
      :aria-label="label"
      data-status-line
      class="flex min-h-11 w-full items-center gap-2 px-2.5 text-left text-sm"
      :class="[
        showTray ? 'rounded-b-2xl bg-elevated' : 'rounded-lg',
        interactive && !showTray ? 'hover:bg-elevated/60' : '',
        interactive ? 'focus-visible:outline-2 focus-visible:outline-primary' : ''
      ]"
      @click="press"
    >
      <UIcon
        v-if="view.failed"
        name="i-lucide-circle-alert"
        class="size-4 shrink-0 text-error"
      />
      <UIcon
        v-else-if="view.waiting"
        name="i-openlobs-approval"
        class="size-4 shrink-0 text-warning-600 dark:text-warning-400"
      />
      <LobMark
        v-else-if="view.live"
        class="size-4 shrink-0 ol-pulse"
      />
      <UIcon
        v-else
        name="i-lucide-check"
        class="size-4 shrink-0 text-muted"
      />

      <span
        :key="view.line"
        class="ol-line-in line-clamp-2 min-w-0 flex-1 py-1.5"
      >
        <UChatShimmer
          v-if="view.live"
          :text="view.line"
          class="text-sm"
        />
        <span
          v-else
          :class="view.failed ? 'text-error' : view.waiting ? 'font-medium text-warning-700 dark:text-warning-400' : 'text-muted'"
        >{{ view.line }}</span>
      </span>

      <template v-if="interactive">
        <span
          v-if="view.waiting"
          class="flex shrink-0 items-center gap-1 text-xs font-medium text-warning-700 dark:text-warning-400"
        >
          Review
          <UIcon
            name="i-lucide-arrow-down"
            class="size-3.5"
          />
        </span>
        <span
          v-else
          class="flex shrink-0 items-center gap-1 text-xs text-dimmed"
        >
          <template v-if="view.live">{{ count }}</template>
          <UIcon
            name="i-lucide-chevron-up"
            class="size-3.5 transition-transform"
            :class="open ? 'rotate-180' : ''"
          />
        </span>
      </template>
    </component>
  </div>
</template>
