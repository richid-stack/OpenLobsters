<script setup lang="ts">
import { computed, ref } from 'vue'
import { brandIcon } from '../../../shared/brands'
import { useModels } from '../../composables/useModels'

const m = useModels()
const open = ref(false)
const search = ref('')

const groups = computed(() => {
  const q = search.value.trim().toLowerCase()
  return m.providers.value
    .map(def => ({ def, models: (m.conn(def.id).models ?? []).filter(x => !q || x.id.toLowerCase().includes(q)).slice(0, 25) }))
    .filter(g => g.models.length)
})

function choose(providerId: string, modelId: string) {
  m.select(providerId, modelId)
  open.value = false
}
function demo() {
  m.selectDemo()
  open.value = false
}
</script>

<template>
  <UButton
    color="neutral"
    variant="soft"
    size="sm"
    :icon="m.icon.value"
    :label="m.shortLabel.value"
    class="max-w-44 sm:max-w-64"
    :ui="{ label: 'truncate' }"
    aria-label="Choose a model"
    @click="open = true"
  />

  <UModal
    v-model:open="open"
    title="Choose a model"
    description="Models from the providers you have connected."
  >
    <template #body>
      <div class="space-y-3">
        <button
          type="button"
          class="w-full flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-left hover:bg-elevated/60"
          @click="demo"
        >
          <UIcon
            name="i-openlobs-spark"
            class="size-5 text-muted"
          />
          <span class="flex-1">
            <span class="block text-sm font-medium text-highlighted">Demo model</span>
            <span class="block text-xs text-muted">Built in. No key needed. Scripted answers.</span>
          </span>
          <UIcon
            v-if="!m.state.value.selected"
            name="i-lucide-circle-check"
            class="size-5 text-primary"
          />
        </button>

        <UInput
          v-if="groups.length"
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search"
          size="sm"
          class="w-full"
        />

        <div
          v-for="g in groups"
          :key="g.def.id"
          class="space-y-1"
        >
          <p class="flex items-center gap-1.5 text-xs font-medium text-muted px-1">
            <UIcon
              :name="brandIcon(g.def.id, undefined, 'i-lucide-plug-zap')"
              class="size-4"
            />
            {{ g.def.name }}
          </p>
          <button
            v-for="x in g.models"
            :key="x.id"
            type="button"
            class="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-elevated/60"
            @click="choose(g.def.id, x.id)"
          >
            <UIcon
              :name="brandIcon(g.def.id, x.id)"
              class="size-5 shrink-0 text-highlighted"
            />
            <span class="flex-1 min-w-0 text-sm text-highlighted truncate">{{ x.id }}</span>
            <UBadge
              v-if="x.tools === false"
              label="No tools"
              color="warning"
              variant="subtle"
              size="sm"
            />
            <UIcon
              v-if="m.isSelected(g.def.id, x.id)"
              name="i-lucide-circle-check"
              class="size-5 text-primary shrink-0"
            />
          </button>
        </div>

        <p
          v-if="!groups.length"
          class="text-sm text-muted"
        >
          No models yet. Connect a provider and fetch its models.
        </p>

        <UButton
          to="/models"
          label="Manage providers and keys"
          icon="i-lucide-settings-2"
          color="neutral"
          variant="subtle"
          block
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
