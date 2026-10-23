import { getAuthInstance } from '../auth/auth'
import { getDb } from '../utils/db'
import { createSqliteChatStore } from './store'
import type { ChatStore } from './store'

let store: ChatStore | undefined

/** The shared chat store. Waits for the tables to exist first. */
export async function getChatStore(): Promise<ChatStore> {
  await getAuthInstance()
  return (store ??= createSqliteChatStore(getDb()))
}
