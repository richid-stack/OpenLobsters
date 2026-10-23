import { generateText, isStepCount, tool } from 'ai'
import { defineHandler } from 'nitro'
import { getSessionUser } from '../../../auth/session'
import { providerLimiter } from '../../../utils/limits'
import { clientKey, enforce } from '../../../utils/rateLimit'
import { readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { redactSecrets } from '../../../providers/redact'
import { resolveModel } from '../../../providers/registry'
import { modelSelectionSchema } from '../../../utils/modelSelection'

// Connection test. Does two real calls: a plain answer, then a tool call. The tool call matters because
// providers differ, and "supports tools" is the thing the rest of OpenLobs depends on.
export default defineHandler(async (event) => {
  enforce(providerLimiter, clientKey(event, (await getSessionUser(event))?.id))
  const sel = await readValidatedBody(event, modelSelectionSchema.parse)
  const started = Date.now()
  let secrets: string[] = []
  try {
    const resolved = await resolveModel(sel)
    secrets = resolved.secrets

    const plain = await generateText({
      model: resolved.model,
      prompt: 'Reply with the single word: ok',
      maxOutputTokens: 20,
      abortSignal: AbortSignal.timeout(25000)
    })

    let tools: 'works' | 'not_supported' | 'unclear' = 'unclear'
    try {
      let called = false
      await generateText({
        model: resolved.model,
        prompt: 'Call the ping tool once, then stop.',
        tools: { ping: tool({ description: 'Returns pong.', inputSchema: z.object({}), execute: async () => { called = true; return 'pong' } }) },
        stopWhen: isStepCount(2),
        maxOutputTokens: 60,
        abortSignal: AbortSignal.timeout(25000)
      })
      tools = called ? 'works' : 'unclear'
    } catch {
      tools = 'not_supported'
    }

    return { ok: true, label: resolved.label, ms: Date.now() - started, reply: plain.text.slice(0, 80), tools }
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: redactSecrets((e as Error).message || 'The test failed.', secrets.concat(sel.apiKey ?? '')) }
  }
})
