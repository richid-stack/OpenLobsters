import { defineHandler } from 'nitro'
import { createError, getRouterParam } from 'nitro/h3'
import { getSessionUser } from '../../../auth/session'
import { getToolStores } from '../../../tools/context'

// Download. Only the owner can get a file; someone else's looks exactly like a missing one.
export default defineHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to download files.' })
  const { artifacts } = await getToolStores()
  const found = artifacts.get(user.id, getRouterParam(event, 'id') ?? '')
  if (!found) throw createError({ statusCode: 404, statusMessage: 'File not found.' })
  const safeName = found.meta.name.replace(/[^A-Za-z0-9 _.-]/g, '_')
  return new Response(new Uint8Array(found.bytes), {
    headers: {
      'content-type': found.meta.mime,
      'content-length': String(found.bytes.length),
      'content-disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store'
    }
  })
})
