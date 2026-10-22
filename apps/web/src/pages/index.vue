<script setup lang="ts">
import LobMark from '../components/brand/LobMark.vue'
import { computed, ref, watch } from 'vue'
import { useChat } from '@ai-sdk/vue'
import { DefaultChatTransport, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import Navbar from '../components/Navbar.vue'
import MessageParts from '../components/chat/MessageParts.vue'
import StatusLine from '../components/chat/StatusLine.vue'
import { statusFromParts } from '../lib/status'

const input = ref('')

const { messages, status, sendMessage, addToolApprovalResponse, stop, error } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  // After the person answers an approval, the run continues on its own.
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses
})

// "Always allow" is remembered for this session. Denying and allowing once are never remembered.
const alwaysAllow = ref(new Set<string>())
const answered = new Set<string>()

function respond(approvalId: string, approved: boolean, always: boolean, toolName?: string) {
  if (answered.has(approvalId)) return
  answered.add(approvalId)
  if (always && toolName) alwaysAllow.value.add(toolName)
  addToolApprovalResponse({ id: approvalId, approved })
}

watch(messages, (list) => {
  const last = list[list.length - 1]
  if (!last || last.role !== 'assistant') return
  for (const part of last.parts) {
    if (!isToolUIPart(part) || part.state !== 'approval-requested') continue
    const name = part.type.replace(/^tool-/, '')
    if (alwaysAllow.value.has(name)) respond(part.approval.id, true, false)
  }
}, { deep: true })

const statusView = computed(() => {
  const last = messages.value[messages.value.length - 1]
  if (!last) return statusFromParts([], 'ready')
  if (last.role === 'user') return statusFromParts([], status.value === 'ready' ? 'ready' : 'submitted')
  return statusFromParts(last.parts as never[], status.value)
})

function submit() {
  const text = input.value.trim()
  if (!text) return
  sendMessage({ text })
  input.value = ''
}

function ask(text: string) {
  sendMessage({ text })
}

const suggestions = [
  { icon: 'i-lucide-file-spreadsheet', label: 'Summarise my sales and make me a workbook' },
  { icon: 'i-lucide-globe', label: 'Search for the latest news on this topic' },
  { icon: 'i-lucide-hand', label: 'Hello, what can you do?' }
]
</script>

<template>
  <UDashboardPanel
    id="chat"
    class="relative min-h-0 flex-1 h-full"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <span class="text-sm font-medium text-highlighted truncate">New chat</span>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <div
          v-if="!messages.length"
          class="flex-1 flex flex-col items-center justify-center text-center gap-5 pt-(--ui-header-height) pb-8"
        >
          <div class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LobMark class="size-12" />
          </div>
          <div class="space-y-1.5">
            <h1 class="text-2xl sm:text-3xl font-bold text-highlighted">
              What would you like to get done?
            </h1>
            <p class="text-sm text-muted max-w-sm mx-auto">
              I work with your files, the web and your tools. I show what I am doing, and I ask before I change anything.
            </p>
          </div>
          <div class="flex flex-col gap-2 w-full max-w-md">
            <UButton
              v-for="s in suggestions"
              :key="s.label"
              :icon="s.icon"
              :label="s.label"
              color="neutral"
              variant="subtle"
              size="lg"
              class="justify-start"
              @click="ask(s.label)"
            />
          </div>
        </div>

        <UChatMessages
          v-else
          should-auto-scroll
          :messages="messages"
          :status="(status === 'streaming' && messages[messages.length - 1]?.role === 'user') ? 'submitted' : status"
          :spacing-offset="200"
          class="pt-(--ui-header-height) pb-4 sm:pb-6"
        >
          <template #indicator>
            <span />
          </template>
          <template #content="{ message }">
            <MessageParts
              :message="message"
              @respond="(id, ok, always) => respond(id, ok, always, (message.parts.find(p => isToolUIPart(p) && p.state === 'approval-requested' && p.approval.id === id) as { type: string } | undefined)?.type.replace(/^tool-/, ''))"
            />
          </template>
        </UChatMessages>

        <div class="sticky bottom-0 z-10 bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-sm pt-2 pb-[env(safe-area-inset-bottom)]">
          <StatusLine :view="statusView" />
          <UChatPrompt
            v-model="input"
            :error="error"
            color="neutral"
            variant="subtle"
            class="rounded-b-none border-t border-default shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]"
            :ui="{ base: 'px-3 py-2' }"
            placeholder="Ask OpenLobs to do something"
            @submit="submit"
          >
            <template #footer>
              <div class="flex items-center gap-2 pt-1">
                <UButton
                  icon="i-lucide-plus"
                  class="rounded-full shrink-0 shadow-sm"
                  variant="soft"
                  color="primary"
                  size="sm"
                  aria-label="Add files or tools"
                />
                <UBadge
                  icon="i-openlobs-device"
                  label="Bridge: demo"
                  color="neutral"
                  variant="subtle"
                />
              </div>
              <UChatPromptSubmit
                :status="status"
                color="primary"
                size="sm"
                class="rounded-full"
                @stop="stop()"
              />
            </template>
          </UChatPrompt>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
