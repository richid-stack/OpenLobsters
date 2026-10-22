import { defineHandler } from 'nitro'
import { createError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { getProviderDef } from '../../../../shared/providers'
import type { ProviderDef } from '../../../../shared/providers'
import { fetchModelList } from '../../../providers/models'
import { assertSafeBaseURL } from '../../../providers/netGuard'
import { redactSecrets } from '../../../providers/redact'
import { resolveKey } from '../../../providers/registry'

export default defineHandler(async (event) => {
  const body = await readValidatedBody(event, z.object({
    providerId: z.string().min(1).max(80),
    apiKey: z.string().max(500).optional(),
    baseURL: z.string().max(500).optional()
  }).parse)

  const known = getProviderDef(body.providerId)
  const def: ProviderDef = known ?? {
    id: body.providerId, name: 'Custom provider', kind: 'openai-compatible', baseURL: body.baseURL,
    keyRequired: false, listStyle: 'openai', blurb: '', custom: true
  }
  const apiKey = resolveKey(def, { providerId: def.id, modelId: 'x', apiKey: body.apiKey })
  const baseURL = (body.baseURL?.trim() || def.baseURL || '').replace(/\/+$/, '')

  try {
    await assertSafeBaseURL(baseURL)
    const models = await fetchModelList(def, { apiKey, baseURL })
    return { models }
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: redactSecrets((e as Error).message, [apiKey]) })
  }
})
