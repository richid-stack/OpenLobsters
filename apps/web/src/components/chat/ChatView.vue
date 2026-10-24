<script setup lang="ts">
import LobMark from '../brand/LobMark.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '../../lib/auth'
import { useChats } from '../../composables/useChats'
import { DefaultChatTransport, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import Navbar from '../Navbar.vue'
import MessageParts from './MessageParts.vue'
import StatusLine from './StatusLine.vue'
import ModelPicker from '../models/ModelPicker.vue'
import { useModels } from '../../composables/useModels'
import { statusFromParts } from '../../lib/status'

// One ChatView is one conversation. Signed in, it is saved under `chatId`; signed out, it lives only on this page.
const props = defineProps<{ chatId: string, initialMessages?: UIMessage[], title?: string }>()
const route = useRoute()
const router = useRouter()
const session = authClient.useSession()
const chats = useChats()

const input = ref('')
const models = useModels()
const statusLine = ref<InstanceType<typeof StatusLine> | null>(null)

// "Back to the latest": shown when the person has scrolled up, attached just above the message box so it can
// never hide behind it. Scroll events do not bubble, so listen on the whole document while capturing, and
// recognise the scrolling container as the one that contains the message box. This does not depend on how
// the page is laid out, or on the container existing yet when the page loads.
const composer = ref<HTMLElement | null>(null)
const awayFromBottom = ref(false)
let scroller: HTMLElement | null = null
function updateAway() {
  if (scroller) awayFromBottom.value = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 160
}
function onAnyScroll(e: Event) {
  const t = e.target
  if (!(t instanceof HTMLElement) || !composer.value || !t.contains(composer.value)) return
  scroller = t
  updateAway()
}
function toBottom() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  scroller?.scrollTo({ top: scroller.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
}
onMounted(() => document.addEventListener('scroll', onAnyScroll, { capture: true, passive: true }))
onBeforeUnmount(() => document.removeEventListener('scroll', onAnyScroll, { capture: true }))


const { messages, status, sendMessage, addToolApprovalResponse, stop, error, regenerate, clearError } = useChat({
  // The chosen model (and its key) is read fresh on every request.
  id: props.chatId,
  messages: props.initialMessages,
  transport: new DefaultChatTransport({ api: '/api/chat', body: () => ({ model: models.payload(), id: props.chatId }) }),
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

// When a run finishes and the person is signed in, the server has saved it. Refresh the list, and move the
// address to /chat/<id> so a reload or a shared link reopens it. Not while an approval is waiting, because
// the screen would be rebuilt under the person's finger.
watch(status, (now, before) => {
  if (now !== 'ready' || before === 'ready' || !messages.value.length) return
  if (!session.value.data?.user) return
  void chats.refresh()
  const waiting = messages.value.some(m => m.parts.some(p => isToolUIPart(p) && p.state === 'approval-requested'))
  if (route.path === '/' && !waiting) {
    chats.remember(props.chatId, messages.value as UIMessage[])
    router.replace(`/chat/${props.chatId}`)
  }
})

// The assistant message the status line and tray describe: the latest one.
const lastAssistantId = computed(() => {
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' ? last.id : undefined
})

// Take the person to a step in the conversation and tint it for a moment so the eye finds it.
async function jumpTo(anchor: string) {
  await nextTick()
  const el = document.getElementById(anchor)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // A tall step (a long reasoning block) is shown from its top; a short one is centred.
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.55
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: tall ? 'start' : 'center' })
  el.classList.remove('ol-flash')
  void el.offsetWidth // restart the animation if it was already running
  el.classList.add('ol-flash')
  el.focus({ preventScroll: true })
  window.setTimeout(() => el.classList.remove('ol-flash'), 1800)
}

watch(() => messages.value.length, async () => { await nextTick(); updateAway() })

const statusView = computed(() => {
  const last = messages.value[messages.value.length - 1]
  if (!last) return statusFromParts([], 'ready')
  if (last.role === 'user') return statusFromParts([], status.value === 'ready' ? 'ready' : status.value === 'error' ? 'error' : 'submitted')
  return statusFromParts(last.parts as never[], status.value)
})

function submit() {
  const text = input.value.trim()
  if (!text) return
  statusLine.value?.close()
  sendMessage({ text })
  input.value = ''
}

function ask(text: string) {
  statusLine.value?.close()
  sendMessage({ text })
}

// A failed request arrives as JSON text. Show the plain sentence, not the JSON.
const errorText = computed(() => {
  const raw = error.value?.message
  if (!raw) return undefined
  try {
    const j = JSON.parse(raw) as { statusText?: string, message?: string, statusMessage?: string }
    return new Error(j.statusText || j.statusMessage || j.message || raw)
  } catch { return error.value }
})

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
          <span class="text-sm font-medium text-highlighted truncate">{{ title || 'New chat' }}</span>
        </template>
        <UButton
          to="/bridge"
          icon="i-openlobs-bridge"
          color="neutral"
          variant="ghost"
          aria-label="Bridge: demo, not connected to a computer"
        />
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
          :auto-scroll="false"
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

        <div ref="composer"
        class="sticky bottom-0 z-10 bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-sm pt-2 pb-[env(safe-area-inset-bottom)]">
          <Transition name="ol-fade">
            <UButton
              v-if="awayFromBottom"
              icon="i-lucide-arrow-down"
              color="neutral"
              variant="soft"
              size="md"
              class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full bg-elevated shadow-md"
              aria-label="Scroll to bottom"
              @click="toBottom"
            />
          </Transition>
          <div
            v-if="errorText"
            class="flex items-start gap-2 px-1 pb-2.5 text-sm"
            role="alert"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="size-4 text-error mt-0.5 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-highlighted">
                That did not work
              </p>
              <p class="text-muted">
                {{ errorText.message }}
              </p>
              <div class="mt-1.5 flex gap-2">
                <UButton
                  label="Try again"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  @click="regenerate()"
                />
                <UButton
                  label="Models"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  to="/models"
                />
              </div>
            </div>
            <UButton
              icon="i-lucide-x"
              size="xs"
              color="neutral"
              variant="ghost"
              aria-label="Dismiss"
              @click="clearError()"
            />
          </div>
          <p
            v-if="models.selectedInfo.value?.tools === false"
            class="flex items-center gap-1.5 px-1 pb-1.5 text-xs text-muted"
          >
            <UIcon
              name="i-lucide-wrench"
              class="size-3.5"
            />
            This model cannot use tools, so it will only chat.
          </p>
          <StatusLine
            ref="statusLine"
            :view="statusView"
            :message-id="lastAssistantId"
            @jump="jumpTo"
          />
          <UChatPrompt
            v-model="input"
            :error="errorText"
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
                <ModelPicker />
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
