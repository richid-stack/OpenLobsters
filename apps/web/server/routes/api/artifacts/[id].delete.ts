import { defineHandler } from 'nitro'
import { createError, getRouterParam } from 'nitro/h3'
import { getSessionUser } from '../../../auth/session'
import { getToolStores } from '../../../tools/context'

export default defineHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to delete files.' })
  const { artifacts } = await getToolStores()
  if (!artifacts.remove(user.id, getRouterParam(event, 'id') ?? '')) throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  return { ok: true }
})
