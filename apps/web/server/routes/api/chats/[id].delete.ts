import { defineHandler } from 'nitro'
import { createError, getRouterParam } from 'nitro/h3'
import { getSessionUser } from '../../../auth/session'
import { getChatStore } from '../../../chats'

export default defineHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to delete chats.' })
  if (!(await getChatStore()).remove(user.id, getRouterParam(event, 'id') ?? '')) throw createError({ statusCode: 404, statusMessage: 'Chat not found.' })
  return { ok: true }
})
