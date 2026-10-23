import { createRateLimiter } from './rateLimit'

// Per person (or per network address when signed out), per minute.
export const chatLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })
export const providerLimiter = createRateLimiter({ windowMs: 60_000, max: 20 })
