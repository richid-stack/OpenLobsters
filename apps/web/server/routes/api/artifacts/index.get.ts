import { defineHandler } from 'nitro'
import { createError } from 'nitro/h3'
import { getSessionUser } from '../../../auth/session'
import { getToolStores } from '../../../tools/context'

export default defineHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to see your files.' })
  const { artifacts } = await getToolStores()
  return { files: artifacts.list(user.id).map(({ id, name, size, createdAt }) => ({ id, name, size, createdAt })) }
})
