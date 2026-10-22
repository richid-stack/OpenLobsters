<script setup lang="ts">
import { ref } from 'vue'
import Navbar from '../components/Navbar.vue'
import ProviderPanel from '../components/models/ProviderPanel.vue'
import { useModels } from '../composables/useModels'

const m = useModels()
const openId = ref<string | null>(null)
const adding = ref(false)
const name = ref('')
const url = ref('')

function toggle(id: string) { openId.value = openId.value === id ? null : id }
function addCustom() {
  if (!url.value.trim()) return
  const id = m.addCustom(name.value, url.value)
  name.value = ''; url.value = ''; adding.value = false; openId.value = id
}
</script>

<template>
  <UDashboardPanel
    id="models"
    class="min-h-0 flex-1 h-full"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <span class="text-sm font-medium text-highlighted">Models</span>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="py-6 pt-[calc(var(--ui-header-height)+1.5rem)] space-y-5">
        <div class="space-y-1.5">
          <h1 class="text-2xl font-bold text-highlighted">
            Bring your own models
          </h1>
          <p class="text-sm text-muted">
            Use any provider you like. Your keys stay in this browser and are sent only with your own requests. Use a key with a spending limit.
          </p>
        </div>

        <div class="rounded-xl border border-default bg-elevated/40 p-3.5 flex items-center gap-3">
          <UIcon
            name="i-lucide-cpu"
            class="size-5 text-muted shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="text-xs text-muted">
              Using now
            </p>
            <p class="text-sm font-medium text-highlighted truncate">
              {{ m.label.value }} <span class="text-muted font-normal">({{ m.providerLabel.value }})</span>
            </p>
          </div>
          <UButton
            v-if="m.state.value.selected"
            label="Use demo"
            size="sm"
            color="neutral"
            variant="soft"
            @click="m.selectDemo()"
          />
        </div>

        <div class="space-y-2.5">
          <ProviderPanel
            v-for="def in m.providers.value"
            :key="def.id"
            :def="def"
            :open="openId === def.id"
            @toggle="toggle(def.id)"
          />
        </div>

        <div class="rounded-xl border border-dashed border-accented p-3.5 space-y-3">
          <button
            v-if="!adding"
            type="button"
            class="w-full flex items-center gap-2 text-sm font-medium text-highlighted"
            @click="adding = true"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            Add another OpenAI-compatible provider
          </button>
          <template v-else>
            <p class="text-sm text-muted">
              Any server that speaks the OpenAI chat protocol works: vLLM, LiteLLM, a company gateway, a self-hosted model.
            </p>
            <UInput
              v-model="name"
              placeholder="Name (for example, Work gateway)"
              class="w-full"
            />
            <UInput
              v-model="url"
              placeholder="https://your-server.example.com/v1"
              class="w-full"
            />
            <div class="flex gap-2">
              <UButton
                label="Add"
                size="sm"
                :disabled="!url.trim()"
                @click="addCustom"
              />
              <UButton
                label="Cancel"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="adding = false"
              />
            </div>
          </template>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
