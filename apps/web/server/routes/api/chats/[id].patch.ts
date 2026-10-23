import { defineHandler } from 'nitro'
import { createError, getRouterParam, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { getSessionUser } from '../../../auth/session'
import { getChatStore } from '../../../chats'
import { ChatStoreError } from '../../../chats/store'

export default defineHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to rename chats.' })
  const { title } = await readValidatedBody(event, z.object({ title: z.string().max(200) }).parse)
  try {
    if (!(await getChatStore()).rename(user.id, getRouterParam(event, 'id') ?? '', title)) throw createError({ statusCode: 404, statusMessage: 'Chat not found.' })
  } catch (e) {
    if (e instanceof ChatStoreError) throw createError({ statusCode: 400, statusMessage: e.message })
    throw e
  }
  return { ok: true }
})
