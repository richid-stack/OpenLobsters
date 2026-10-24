<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { Step } from '../../lib/status'

// The list of steps behind the status line. Flat: a soft-filled sheet, plain rows, no boxes or outlines.
// Tap a row to jump to that step in the conversation. Drag the handle down, press Escape, or use the
// close button to put it away.

const props = defineProps<{ steps: Step[], id: string }>()
const emit = defineEmits<{ select: [partIndex: number], close: [] }>()

const list = ref<HTMLElement | null>(null)
const sheet = ref<HTMLElement | null>(null)

// Drag the handle down to close. The sheet follows the finger, then either closes or springs back.
const offset = ref(0)
const dragging = ref(false)
let startY = 0
function down(e: PointerEvent) {
  dragging.value = true
  startY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (dragging.value) offset.value = Math.max(0, e.clientY - startY)
}
function up() {
  if (!dragging.value) return
  dragging.value = false
  const far = offset.value > 56
  offset.value = 0
  if (far) emit('close')
}

// Keep the newest step in view while the run is still going, unless the person has scrolled up to read.
let pinned = true
function onScroll() {
  const el = list.value
  if (el) pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}
watch(() => props.steps.length, async () => {
  await nextTick()
  if (pinned && list.value) list.value.scrollTop = list.value.scrollHeight
})
onMounted(() => {
  if (list.value) list.value.scrollTop = list.value.scrollHeight
  // Move focus into the sheet so keyboard and screen-reader users land on it.
  sheet.value?.focus({ preventScroll: true })
})

const tone = (s: Step) => ({
  live: 'text-primary',
  done: 'text-muted',
  waiting: 'text-warning-700 dark:text-warning-400',
  bad: 'text-error'
}[s.state])
</script>

<template>
  <section
    :id="id"
    ref="sheet"
    role="region"
    aria-label="Steps in this run"
    tabindex="-1"
    class="rounded-t-2xl bg-elevated outline-none"
    :class="dragging ? '' : 'transition-transform duration-200'"
    :style="{ transform: `translateY(${offset}px)` }"
    @keydown.esc.stop="emit('close')"
  >
    <div class="relative flex h-9 items-center justify-center">
      <div
        data-tray-handle
        class="absolute inset-x-0 top-0 flex h-9 touch-none cursor-grab items-center justify-center"
        aria-hidden="true"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
      >
        <span class="h-1 w-9 rounded-full bg-accented" />
      </div>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        class="absolute end-1 top-0.5"
        aria-label="Close steps"
        @click="emit('close')"
      />
    </div>

    <ul
      ref="list"
      class="max-h-[42dvh] overflow-y-auto px-1.5 pb-2"
      @scroll.passive="onScroll"
    >
      <li
        v-for="s in steps"
        :key="s.key"
      >
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-default/70 focus-visible:outline-2 focus-visible:outline-primary"
          :aria-label="`${s.label}${s.detail ? `, ${s.detail}` : ''}. Go to this step`"
          @click="emit('select', s.partIndex)"
        >
          <UIcon
            :name="s.icon"
            class="size-5 shrink-0"
            :class="tone(s)"
          />
          <span class="min-w-0 flex-1">
            <span
              class="block truncate text-sm"
              :class="s.state === 'done' ? 'text-muted' : 'text-highlighted'"
            >{{ s.label }}</span>
            <span
              v-if="s.detail"
              class="block truncate text-xs"
              :class="s.state === 'waiting' ? 'text-warning-700 dark:text-warning-400 font-medium' : 'text-dimmed'"
            >{{ s.detail }}</span>
          </span>
          <UBadge
            v-if="s.verified"
            icon="i-openlobs-verify"
            label="Verified"
            color="success"
            variant="soft"
            size="sm"
          />
          <span
            v-else-if="s.state === 'live'"
            class="ol-pulse size-2 shrink-0 rounded-full bg-primary"
            aria-label="In progress"
          />
          <UIcon
            v-else-if="s.state === 'done'"
            name="i-lucide-check"
            class="size-4 shrink-0 text-dimmed"
          />
        </button>
      </li>
    </ul>
  </section>
</template>
