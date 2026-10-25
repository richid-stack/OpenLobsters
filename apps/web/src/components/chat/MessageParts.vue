<script setup lang="ts">
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { isPartStreaming } from '@nuxt/ui/utils/ai'
import { stepAnchor } from '../../lib/status'
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
    <div
      v-if="isReasoningUIPart(part)"
      :id="stepAnchor(message.id, index)"
      tabindex="-1"
      class="ol-anchor"
    >
      <UChatReasoning
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
    </div>

    <div
      v-else-if="isToolUIPart(part)"
      :id="stepAnchor(message.id, index)"
      tabindex="-1"
      class="ol-anchor"
    >
      <ToolCard
        :part="part"
        @respond="(id, ok, always) => emit('respond', id, ok, always)"
      />
    </div>

    <!-- What a person typed or pasted keeps its line breaks (a pasted table must stay a table), and a very long
         paste scrolls inside its own bubble instead of pushing the conversation off the screen. -->
    <div
      v-else-if="isTextUIPart(part) && message.role === 'user'"
      class="max-h-56 overflow-y-auto whitespace-pre-wrap break-words"
    >
      {{ part.text }}
    </div>

    <!-- What a person typed or pasted keeps its line breaks. A pasted table must still look like a table. -->
    <div
      v-else-if="isTextUIPart(part) && message.role === 'user'"
      class="max-h-56 overflow-y-auto whitespace-pre-wrap break-words"
    >
      {{ part.text }}
    </div>

    <ChatComark
      v-else-if="isTextUIPart(part)"
      :value="part.text"
      :streaming="isPartStreaming(part)"
    />
  </template>
</template>
