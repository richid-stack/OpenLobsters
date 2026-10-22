<script setup lang="ts">
import Navbar from '../components/Navbar.vue'
</script>

<template>
  <UDashboardPanel id="skills" class="min-h-0 flex-1 h-full" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <Navbar><template #title><span class="text-sm font-medium text-highlighted capitalize">skills</span></template></Navbar>
    </template>
    <template #body>
      <UContainer class="flex-1 flex flex-col items-center justify-center text-center gap-3 pt-(--ui-header-height)">
        <UIcon name="i-lucide-hammer" class="size-8 text-dimmed" />
        <p class="text-sm text-muted">Coming in a later phase.</p>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
