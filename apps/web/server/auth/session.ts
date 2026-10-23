import type { H3Event } from 'nitro/h3'
import { getAuthInstance } from './auth'

export interface SessionUser { id: string, email: string, name: string, image?: string | null }

/** The signed-in user for this request, or null. Never throws for a missing or expired session. */
export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  // Signed-out visitors carry no cookie. Skip the database for them.
  if (!event.req.headers.get('cookie')) return null
  const { auth } = await getAuthInstance()
  const session = await auth.api.getSession({ headers: event.req.headers })
  return session?.user ? { id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image } : null
}
