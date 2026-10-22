<script setup lang="ts">
import LobMark from '../components/brand/LobMark.vue'
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const sidebarOpen = ref(false)

const nav = [{
  label: 'New chat', to: '/', icon: 'i-lucide-circle-plus'
}, {
  label: 'Bridge', to: '/bridge', icon: 'i-openlobs-bridge'
}, {
  label: 'Skills', to: '/skills', icon: 'i-openlobs-skill'
}, {
  label: 'Agent teams', to: '/teams', icon: 'i-openlobs-agents'
}, {
  label: 'Icons', to: '/icons', icon: 'i-lucide-shapes'
}]
</script>

<template>
  <UDashboardGroup
    unit="rem"
    class="w-full h-full min-h-[100dvh] overflow-hidden"
  >
    <UDashboardSidebar
      id="default"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      class="py-4"
    >
      <template #header="{ collapsed }">
        <ULink
          v-if="!collapsed"
          to="/"
          class="flex items-center gap-1.5 outline-primary/25 focus-visible:outline-3 rounded-md"
        >
          <LobMark class="size-6 shrink-0" />
          <span class="text-xl font-bold text-highlighted">OpenLobs</span>
        </ULink>
        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="nav"
          :collapsed="collapsed"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <UButton
          :label="collapsed ? '' : 'Richid-stack'"
          icon="i-lucide-user-round"
          color="neutral"
          variant="ghost"
          class="w-full"
        />
      </template>
    </UDashboardSidebar>

    <div class="flex-1 flex min-w-0 h-full overflow-hidden">
      <RouterView
        :key="route.path"
        v-slot="{ Component }"
      >
        <template v-if="Component">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <div class="flex items-center justify-center w-full h-full">
                <LobMark class="size-6 ol-pulse" />
              </div>
            </template>
          </Suspense>
        </template>
      </RouterView>
    </div>
  </UDashboardGroup>
</template>
