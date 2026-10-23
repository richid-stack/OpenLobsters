<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '../../lib/auth'
import { useChats } from '../../composables/useChats'

defineProps<{ collapsed?: boolean }>()
const router = useRouter()
const session = authClient.useSession()
const chats = useChats()
const user = computed(() => session.value.data?.user)

async function signOut() {
  await authClient.signOut()
  chats.clear()
  router.push('/')
}

const items = computed(() => [[
  { label: user.value?.email ?? '', type: 'label' as const }
], [
  { label: 'Models', icon: 'i-lucide-cpu', to: '/models' },
  { label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }
]])
</script>

<template>
  <UDropdownMenu
    v-if="user"
    :items="items"
    :content="{ align: 'start', side: 'top' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      class="w-full justify-start"
      :square="collapsed"
      :aria-label="`Account: ${user.name}`"
    >
      <UAvatar
        :src="user.image ?? undefined"
        :alt="user.name"
        size="xs"
      />
      <span
        v-if="!collapsed"
        class="truncate"
      >{{ user.name }}</span>
    </UButton>
  </UDropdownMenu>

  <UButton
    v-else-if="!session.isPending"
    to="/sign-in"
    icon="i-lucide-log-in"
    :label="collapsed ? undefined : 'Sign in'"
    color="neutral"
    variant="ghost"
    class="w-full justify-start"
  />
</template>
