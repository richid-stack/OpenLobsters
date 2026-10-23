<script setup lang="ts">
import { computed } from 'vue'
import ChatView from '../components/chat/ChatView.vue'
import { useChats } from '../composables/useChats'

// A new chat gets a fresh id, and a fresh one again each time "New chat" is chosen.
const chats = useChats()
const chatId = computed(() => (void chats.newChatKey.value, crypto.randomUUID()))
</script>

<template>
  <ChatView
    :key="chatId"
    :chat-id="chatId"
  />
</template>
