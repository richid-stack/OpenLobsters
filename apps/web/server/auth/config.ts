// Turns environment variables into an auth configuration. Pure, so it can be tested without a server.
//
// Sign-in methods, all optional except that at least one should be on:
//   email and password        on by default (turn off with OPENLOBS_AUTH_EMAIL=0)
//   GitHub, Google, Microsoft each turns on when its id and secret are set
//   any OpenID Connect provider (Keycloak, Okta, Auth0, Entra ID, a company login) via OPENLOBS_OIDC_*
// A button only appears in the app for a method that is actually configured.

type Env = Record<string, string | undefined>

export interface SocialConfig { clientId: string, clientSecret: string, tenantId?: string }
export interface OidcConfig { id: string, name: string, discoveryUrl: string, clientId: string, clientSecret: string }

export interface AuthConfig {
  production: boolean
  baseURL: string
  secret: string
  trustedOrigins: string[]
  emailEnabled: boolean
  signupsOpen: boolean
  requireVerifiedEmail: boolean
  github?: SocialConfig
  google?: SocialConfig
  microsoft?: SocialConfig
  oidc?: OidcConfig
}

const flag = (v: string | undefined, fallback: boolean) => (v === '1' || v === 'true' ? true : v === '0' || v === 'false' ? false : fallback)
const clean = (v: string | undefined) => v?.trim() || undefined

function social(env: Env, key: string, extra?: (e: Env) => Partial<SocialConfig>): SocialConfig | undefined {
  const clientId = clean(env[`OPENLOBS_AUTH_${key}_ID`])
  const clientSecret = clean(env[`OPENLOBS_AUTH_${key}_SECRET`])
  return clientId && clientSecret ? { clientId, clientSecret, ...extra?.(env) } : undefined
}

export function authConfigFromEnv(env: Env, devSecret: () => string = () => { throw new Error('No secret') }): AuthConfig {
  const production = env.NODE_ENV === 'production'
  let secret = clean(env.BETTER_AUTH_SECRET) ?? clean(env.OPENLOBS_AUTH_SECRET)
  if (!secret) {
    if (production) throw new Error('Set BETTER_AUTH_SECRET to a random string of at least 32 characters before running in production.')
    secret = devSecret()
  }
  if (production && secret.length < 32) throw new Error('BETTER_AUTH_SECRET must be at least 32 characters in production.')

  const baseURL = (clean(env.OPENLOBS_BASE_URL) ?? clean(env.BETTER_AUTH_URL) ?? 'http://localhost:3000').replace(/\/+$/, '')
  if (production && !baseURL.startsWith('https://')) throw new Error('OPENLOBS_BASE_URL must be an https address in production.')

  const extraOrigins = (env.OPENLOBS_TRUSTED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  // In development the app is reached as localhost or 127.0.0.1; both must work or sign-in fails on a CSRF check.
  const devOrigins = production ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']

  const oidcId = clean(env.OPENLOBS_OIDC_ID)
  const oidc = oidcId && clean(env.OPENLOBS_OIDC_ISSUER) && clean(env.OPENLOBS_OIDC_CLIENT_ID) && clean(env.OPENLOBS_OIDC_CLIENT_SECRET)
    ? {
        id: oidcId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        name: clean(env.OPENLOBS_OIDC_NAME) ?? oidcId,
        // OIDC providers publish their endpoints at <issuer>/.well-known/openid-configuration.
        discoveryUrl: `${clean(env.OPENLOBS_OIDC_ISSUER)!.replace(/\/+$/, '')}/.well-known/openid-configuration`,
        clientId: clean(env.OPENLOBS_OIDC_CLIENT_ID)!,
        clientSecret: clean(env.OPENLOBS_OIDC_CLIENT_SECRET)!
      }
    : undefined

  return {
    production,
    baseURL,
    secret,
    trustedOrigins: [...new Set([baseURL, ...devOrigins, ...extraOrigins])],
    emailEnabled: flag(env.OPENLOBS_AUTH_EMAIL, true),
    signupsOpen: !['closed', '0', 'false'].includes((env.OPENLOBS_SIGNUPS ?? 'open').toLowerCase()),
    requireVerifiedEmail: flag(env.OPENLOBS_AUTH_REQUIRE_VERIFIED_EMAIL, true),
    github: social(env, 'GITHUB'),
    google: social(env, 'GOOGLE'),
    microsoft: social(env, 'MICROSOFT', e => ({ tenantId: clean(e.OPENLOBS_AUTH_MICROSOFT_TENANT) })),
    oidc
  }
}

export interface PublicAuthConfig {
  email: boolean
  signupsOpen: boolean
  passwordReset: boolean
  emailVerification: boolean
  providers: Array<{ id: string, name: string, kind: 'social' | 'oidc' }>
}

/** What the sign-in screen is allowed to know. Never includes a secret. */
export function describeAuth(cfg: AuthConfig, mailConfigured: boolean): PublicAuthConfig {
  const providers: PublicAuthConfig['providers'] = []
  if (cfg.github) providers.push({ id: 'github', name: 'GitHub', kind: 'social' })
  if (cfg.google) providers.push({ id: 'google', name: 'Google', kind: 'social' })
  if (cfg.microsoft) providers.push({ id: 'microsoft', name: 'Microsoft', kind: 'social' })
  if (cfg.oidc) providers.push({ id: cfg.oidc.id, name: cfg.oidc.name, kind: 'oidc' })
  return {
    email: cfg.emailEnabled,
    signupsOpen: cfg.signupsOpen,
    passwordReset: cfg.emailEnabled && mailConfigured,
    emailVerification: cfg.emailEnabled && mailConfigured && cfg.requireVerifiedEmail,
    providers
  }
}
