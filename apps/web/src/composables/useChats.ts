import { ref } from 'vue'
import type { UIMessage } from 'ai'

export interface ChatSummary { id: string, title: string, createdAt: number, updatedAt: number }

const chats = ref<ChatSummary[]>([])
const loaded = ref(false)
const newChatKey = ref(0)
// A chat that was just saved opens instantly from here, without asking the server again.
const justSaved = new Map<string, UIMessage[]>()

async function refresh() {
  try {
    const res = await fetch('/api/chats')
    if (!res.ok) { chats.value = []; return }
    chats.value = (await res.json() as { chats: ChatSummary[] }).chats
    loaded.value = true
  } catch { /* the list is a convenience; a failure should not break chatting */ }
}

export function useChats() {
  return {
    chats,
    loaded,
    newChatKey,
    refresh,
    clear() { chats.value = []; loaded.value = false },
    /** Ask for a fresh, empty chat even when already on the new-chat screen. */
    newChat() { newChatKey.value++ },
    remember(id: string, messages: UIMessage[]) { justSaved.set(id, JSON.parse(JSON.stringify(messages))) },
    takeRemembered(id: string): UIMessage[] | undefined {
      const m = justSaved.get(id)
      justSaved.delete(id)
      return m
    },
    async remove(id: string): Promise<boolean> {
      const res = await fetch(`/api/chats/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) chats.value = chats.value.filter(c => c.id !== id)
      return res.ok
    }
  }
}
