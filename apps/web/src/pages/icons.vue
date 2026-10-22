<script setup lang="ts">
import { openlobsIcons } from '../icons/openlobs'
import Navbar from '../components/Navbar.vue'

const names = Object.keys(openlobsIcons)
const lucide = ['i-lucide-globe', 'i-lucide-file-spreadsheet', 'i-lucide-table-2', 'i-lucide-box', 'i-lucide-check', 'i-lucide-ban']
</script>

<template>
  <UDashboardPanel
    id="icons"
    class="min-h-0 flex-1 h-full"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <span class="text-sm font-medium text-highlighted">Icons</span>
        </template>
      </Navbar>
    </template>
    <template #body>
      <UContainer class="py-6 pt-[calc(var(--ui-header-height)+1.5rem)] space-y-8">
        <section class="space-y-3">
          <h2 class="text-lg font-semibold text-highlighted">
            OpenLobs set
          </h2>
          <p class="text-sm text-muted">
            Drawn on Lucide's grid: 24px, 2px stroke, round caps and joins. Use as <code class="text-xs">i-openlobs-name</code>.
          </p>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <div
              v-for="n in names"
              :key="n"
              class="flex flex-col items-center gap-2 rounded-xl border border-default bg-elevated/40 p-4"
            >
              <UIcon
                :name="`i-openlobs-${n}`"
                class="size-8 text-primary"
              />
              <div class="text-center">
                <p class="text-sm font-medium text-highlighted">
                  {{ openlobsIcons[n]!.label }}
                </p>
                <p class="text-xs text-dimmed">
                  {{ n }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <h2 class="text-lg font-semibold text-highlighted">
            Beside Lucide
          </h2>
          <p class="text-sm text-muted">
            The custom icons next to stock Lucide ones, at the size used on tool cards. They should look like one family.
          </p>
          <div class="flex flex-wrap items-center gap-4 rounded-xl border border-default bg-elevated/40 p-4">
            <UIcon
              v-for="n in lucide"
              :key="n"
              :name="n"
              class="size-5 text-muted"
            />
            <span class="h-5 w-px bg-accented" />
            <UIcon
              v-for="n in names"
              :key="n"
              :name="`i-openlobs-${n}`"
              class="size-5 text-muted"
            />
          </div>
        </section>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
