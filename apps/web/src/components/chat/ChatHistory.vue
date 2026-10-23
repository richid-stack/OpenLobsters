<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '../../lib/auth'
import { useChats } from '../../composables/useChats'
import type { ChatSummary } from '../../composables/useChats'

const route = useRoute()
const router = useRouter()
const session = authClient.useSession()
const chats = useChats()
const confirming = ref<string | null>(null)

const signedIn = computed(() => !!session.value.data?.user)
onMounted(() => { if (signedIn.value) void chats.refresh() })
watch(signedIn, (v) => { if (v) void chats.refresh(); else chats.clear() })

// Plain headings, newest first. No boxes.
const groups = computed(() => {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
  const day = 86_400_000
  const buckets: Array<[string, ChatSummary[]]> = [['Today', []], ['Yesterday', []], ['Last 7 days', []], ['Earlier', []]]
  for (const c of chats.chats.value) {
    const age = startOfDay.getTime() - c.updatedAt
    buckets[age < 0 ? 0 : age < day ? 1 : age < 7 * day ? 2 : 3]![1].push(c)
  }
  return buckets.filter(([, list]) => list.length)
})

async function remove(id: string) {
  if (confirming.value !== id) { confirming.value = id; return }
  confirming.value = null
  if (await chats.remove(id) && route.params && (route.params as { id?: string }).id === id) router.push('/')
}
</script>

<template>
  <nav
    v-if="signedIn && groups.length"
    class="mt-4 space-y-4"
    aria-label="Your chats"
  >
    <div
      v-for="[label, list] in groups"
      :key="label"
    >
      <p class="px-2 pb-1 text-xs font-medium text-dimmed">
        {{ label }}
      </p>
      <ul>
        <li
          v-for="c in list"
          :key="c.id"
          class="group relative"
        >
          <RouterLink
            :to="`/chat/${c.id}`"
            class="flex items-center rounded-md px-2 py-1.5 pe-9 text-sm truncate hover:bg-elevated/70"
            :class="(route.params as { id?: string }).id === c.id ? 'bg-elevated text-highlighted font-medium' : 'text-muted'"
          >
            <span class="truncate">{{ c.title }}</span>
          </RouterLink>
          <UButton
            :icon="confirming === c.id ? 'i-lucide-check' : 'i-lucide-trash-2'"
            :color="confirming === c.id ? 'error' : 'neutral'"
            variant="ghost"
            size="xs"
            class="absolute end-1 top-1/2 -translate-y-1/2"
            :class="confirming === c.id ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'"
            :aria-label="confirming === c.id ? 'Confirm delete' : 'Delete chat'"
            @click.prevent="remove(c.id)"
            @blur="confirming = null"
          />
        </li>
      </ul>
    </div>
  </nav>
</template>
