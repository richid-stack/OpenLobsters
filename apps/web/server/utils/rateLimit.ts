import { createError, getRequestIP } from 'nitro/h3'
import type { H3Event } from 'nitro/h3'

// A small fixed-window limiter kept in memory. It protects the chat and provider routes from being used as
// an open relay, and from runaway loops. One server process only: a hosted deployment with several
// processes needs a shared store (Redis) behind the same interface.

export interface Limiter { check(key: string): { ok: boolean, retryAfterSec: number } }

export function createRateLimiter(opts: { windowMs: number, max: number, now?: () => number }): Limiter {
  const now = opts.now ?? Date.now
  const hits = new Map<string, { count: number, resetAt: number }>()
  return {
    check(key) {
      const t = now()
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k)
      const entry = hits.get(key)
      if (!entry || entry.resetAt <= t) {
        hits.set(key, { count: 1, resetAt: t + opts.windowMs })
        return { ok: true, retryAfterSec: 0 }
      }
      entry.count++
      return entry.count <= opts.max ? { ok: true, retryAfterSec: 0 } : { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)) }
    }
  }
}

/**
 * Who is making the request: the signed-in user, else the network address. The forwarded-for header is only
 * believed when the operator says a trusted proxy sets it (OPENLOBS_TRUST_PROXY=1); otherwise anyone could
 * make up a new address on every request and never be limited.
 */
export function clientKey(event: H3Event, userId?: string | null): string {
  if (userId) return `u:${userId}`
  const ip = getRequestIP(event, { xForwardedFor: process.env.OPENLOBS_TRUST_PROXY === '1' })
  return `ip:${ip ?? 'unknown'}`
}

export function enforce(limiter: Limiter, key: string) {
  const r = limiter.check(key)
  if (!r.ok) {
    throw createError({ statusCode: 429, statusMessage: `Too many requests. Try again in ${r.retryAfterSec} seconds.`, headers: { 'retry-after': String(r.retryAfterSec) } })
  }
}
