<script setup lang="ts">
import LobMark from '../brand/LobMark.vue'
import { computed, nextTick, ref, watch } from 'vue'
import type { StatusView } from '../../lib/status'

const props = defineProps<{ view: StatusView }>()

const ticker = ref<HTMLElement | null>(null)
const MAX = 9
const shown = computed(() => props.view.chips.slice(-MAX))
const hidden = computed(() => Math.max(0, props.view.chips.length - MAX))

watch(() => props.view.chips.length, async () => {
  await nextTick()
  ticker.value?.scrollTo({ left: ticker.value.scrollWidth, behavior: 'smooth' })
})

const chipClass = (state: string) => ({
  live: 'border-primary/30 bg-primary/10 text-primary',
  done: 'border-default bg-elevated/60 text-muted',
  waiting: 'border-warning/40 bg-warning/10 text-warning-700 dark:text-warning-400',
  bad: 'border-error/30 bg-error/10 text-error'
}[state] ?? 'border-default text-muted')
</script>

<template>
  <div
    v-if="view.line || view.chips.length"
    class="px-1 pb-2 space-y-1.5"
    role="status"
    aria-live="polite"
  >
    <div
      :key="view.line"
      class="ol-line-in flex items-center gap-2 text-sm min-h-5"
    >
      <UIcon
        v-if="view.waiting"
        name="i-openlobs-approval"
        class="size-4 shrink-0 text-warning"
      />
      <LobMark
        v-else-if="view.live"
        class="size-4 shrink-0  ol-pulse"
      />
      <UIcon
        v-else
        name="i-lucide-check"
        class="size-4 shrink-0 text-muted"
      />
      <UChatShimmer
        v-if="view.live"
        :text="view.line"
        class="text-sm"
      />
      <span
        v-else
        :class="view.waiting ? 'text-warning-700 dark:text-warning-400 font-medium' : 'text-muted'"
      >{{ view.line }}</span>
    </div>

    <div
      v-if="shown.length"
      ref="ticker"
      class="no-scrollbar flex items-center gap-1.5 overflow-x-auto"
      aria-hidden="true"
    >
      <span
        v-if="hidden"
        class="shrink-0 text-xs text-dimmed"
      >+{{ hidden }}</span>
      <span
        v-for="chip in shown"
        :key="chip.key"
        class="ol-chip-in shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
        :class="chipClass(chip.state)"
      >
        <UIcon
          :name="chip.icon"
          class="size-3.5"
        />
        {{ chip.label }}
      </span>
    </div>
  </div>
</template>
