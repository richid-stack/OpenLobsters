<script setup lang="ts">
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { isPartStreaming } from '@nuxt/ui/utils/ai'
import ChatComark from './Comark'
import ToolCard from './ToolCard.vue'

defineProps<{ message: UIMessage }>()
const emit = defineEmits<{ respond: [approvalId: string, approved: boolean, always: boolean] }>()
</script>

<template>
  <template
    v-for="(part, index) in message.parts"
    :key="`${message.id}-${part.type}-${index}`"
  >
    <UChatReasoning
      v-if="isReasoningUIPart(part)"
      :text="part.text"
      :streaming="isPartStreaming(part)"
      chevron="leading"
      icon="i-openlobs-spark"
    >
      <ChatComark
        :value="part.text"
        :streaming="isPartStreaming(part)"
      />
    </UChatReasoning>

    <ToolCard
      v-else-if="isToolUIPart(part)"
      :part="part"
      @respond="(id, ok, always) => emit('respond', id, ok, always)"
    />

    <ChatComark
      v-else-if="isTextUIPart(part)"
      :value="part.text"
      :streaming="isPartStreaming(part)"
    />
  </template>
</template>
