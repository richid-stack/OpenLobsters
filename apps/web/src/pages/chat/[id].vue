<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import type { UIMessage } from 'ai'
import ChatView from '../../components/chat/ChatView.vue'
import { useChats } from '../../composables/useChats'

const route = useRoute()
const router = useRouter()
const chats = useChats()
const id = (route.params as { id: string }).id

// Just saved: open straight from memory. Otherwise ask the server. Missing or not yours: back to a new chat.
let messages: UIMessage[] | undefined = chats.takeRemembered(id)
let title = chats.chats.value.find(c => c.id === id)?.title
if (!messages) {
  const res = await fetch(`/api/chats/${encodeURIComponent(id)}`)
  if (!res.ok) {
    await router.replace('/')
  } else {
    const chat = await res.json() as { title: string, messages: UIMessage[] }
    messages = chat.messages
    title = chat.title
  }
}
</script>

<template>
  <ChatView
    v-if="messages"
    :key="id"
    :chat-id="id"
    :initial-messages="messages"
    :title="title"
  />
</template>
