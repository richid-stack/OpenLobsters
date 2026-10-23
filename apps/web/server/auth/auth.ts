import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { betterAuth } from 'better-auth'
import { getMigrations } from 'better-auth/db/migration'
import { genericOAuth } from 'better-auth/plugins/generic-oauth'
import { migrateChats } from '../chats/store'
import { getDb } from '../utils/db'
import type { Db } from '../utils/db'
import { authConfigFromEnv, describeAuth } from './config'
import type { AuthConfig } from './config'
import { createMailer } from './mailer'
import type { Mailer } from './mailer'

type Env = Record<string, string | undefined>

/** In development a random secret is made once and kept, so sessions survive restarts. Never used in production. */
function devSecret(): string {
  const file = 'data/.dev-auth-secret'
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  mkdirSync('data', { recursive: true })
  const s = randomBytes(32).toString('hex')
  writeFileSync(file, s, { mode: 0o600 })
  return s
}

export function createAuth(opts: { db: Db, env: Env, mailer?: Mailer, devSecret?: () => string }) {
  const cfg: AuthConfig = authConfigFromEnv(opts.env, opts.devSecret ?? devSecret)
  const { mailer } = opts
  const verify = !!mailer && cfg.requireVerifiedEmail
  const closed = !cfg.signupsOpen

  const auth = betterAuth({
    appName: 'OpenLobs',
    baseURL: cfg.baseURL,
    secret: cfg.secret,
    trustedOrigins: cfg.trustedOrigins,
    database: opts.db,
    emailAndPassword: {
      enabled: cfg.emailEnabled,
      disableSignUp: closed,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: verify,
      sendResetPassword: mailer
        ? async ({ user, url }) => { await mailer.send({ to: user.email, subject: 'Reset your OpenLobs password', text: `Open this link to choose a new password:\n\n${url}\n\nIf you did not ask for this, ignore this email.` }) }
        : undefined
    },
    emailVerification: mailer
      ? {
          sendOnSignUp: true,
          autoSignInAfterVerification: true,
          sendVerificationEmail: async ({ user, url }) => { await mailer.send({ to: user.email, subject: 'Confirm your email for OpenLobs', text: `Open this link to confirm your email:\n\n${url}\n\nIf you did not create an account, ignore this email.` }) }
        }
      : undefined,
    socialProviders: {
      ...(cfg.github ? { github: { ...cfg.github, disableSignUp: closed } } : {}),
      ...(cfg.google ? { google: { ...cfg.google, disableSignUp: closed } } : {}),
      ...(cfg.microsoft ? { microsoft: { ...cfg.microsoft, disableSignUp: closed } } : {})
    },
    plugins: cfg.oidc
      ? [genericOAuth({ config: [{ providerId: cfg.oidc.id, discoveryUrl: cfg.oidc.discoveryUrl, clientId: cfg.oidc.clientId, clientSecret: cfg.oidc.clientSecret, scopes: ['openid', 'profile', 'email'], pkce: true, disableSignUp: closed }] })]
      : [],
    // Signing in with a second method that has the same verified email joins the same account, instead of
    // creating a duplicate. Only providers that verify email addresses are trusted for this.
    account: { accountLinking: { enabled: true, trustedProviders: ['github', 'google', 'microsoft', ...(cfg.oidc ? [cfg.oidc.id] : [])] } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 5 * 60 } },
    advanced: { useSecureCookies: cfg.production, defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' } },
    rateLimit: {
      enabled: cfg.production,
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 }
      }
    }
  })

  return { auth, cfg, publicConfig: describeAuth(cfg, !!mailer) }
}

export type AuthInstance = ReturnType<typeof createAuth>

/** Create the tables for accounts and saved chats. Safe to run on every start. */
export async function migrateAll(instance: AuthInstance, db: Db) {
  const { runMigrations } = await getMigrations(instance.auth.options)
  await runMigrations()
  migrateChats(db)
}

let ready: Promise<AuthInstance> | undefined

/** The shared instance for the running server, created and migrated once. */
export function getAuthInstance(): Promise<AuthInstance> {
  return (ready ??= (async () => {
    const db = getDb()
    const instance = createAuth({ db, env: process.env, mailer: await createMailer(process.env) })
    await migrateAll(instance, db)
    return instance
  })())
}
