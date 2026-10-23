import { createAuthClient } from 'better-auth/vue'

// Talks to /api/auth on the same address as the app. Session cookies are set by the server.
export const authClient = createAuthClient()

/** Plain-language messages for sign-in problems. Falls back to the server's own message. */
export function friendlyAuthError(err: { code?: string, message?: string, status?: number } | null | undefined): string {
  if (!err) return ''
  const byCode: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: 'That email and password do not match.',
    USER_ALREADY_EXISTS: 'An account with that email already exists. Try signing in.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with that email already exists. Try signing in.',
    PASSWORD_TOO_SHORT: 'Use at least 8 characters for your password.',
    PASSWORD_TOO_LONG: 'That password is too long.',
    EMAIL_NOT_VERIFIED: 'Confirm your email first. We sent you a link.',
    INVALID_EMAIL: 'That does not look like an email address.',
    INVALID_TOKEN: 'That link has expired. Ask for a new one.',
    EMAIL_PASSWORD_SIGN_UP_DISABLED: 'New accounts are not being accepted here.',
    SIGN_UP_DISABLED: 'New accounts are not being accepted here.'
  }
  if (err.code && byCode[err.code]) return byCode[err.code]!
  if (err.status === 429) return 'Too many attempts. Wait a minute and try again.'
  return err.message || 'Something went wrong. Try again.'
}
