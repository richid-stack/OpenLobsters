import { defineHandler } from 'nitro'
import { createError } from 'nitro/h3'
import { getSessionUser } from '../../../auth/session'
import { getChatStore } from '../../../chats'

export default defineHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to see your chats.' })
  return { chats: (await getChatStore()).list(user.id) }
})
