import { defineHandler } from 'nitro'
import { getAuthInstance } from '../../../auth/auth'

// Everything under /api/auth (sign in, sign up, sessions, OAuth callbacks) is handled by Better Auth.
export default defineHandler(async (event) => {
  const { auth } = await getAuthInstance()
  return auth.handler(event.req)
})
