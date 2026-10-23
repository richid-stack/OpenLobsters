import { ref } from 'vue'

export interface PublicAuthConfig {
  email: boolean
  signupsOpen: boolean
  passwordReset: boolean
  emailVerification: boolean
  providers: Array<{ id: string, name: string, kind: 'social' | 'oidc' }>
}

const config = ref<PublicAuthConfig | null>(null)
let loading: Promise<void> | undefined

/** Which sign-in methods this server offers. A button only exists for a method that is switched on. */
export function useAuthConfig() {
  loading ??= fetch('/api/auth-config')
    .then(r => r.json())
    .then((c: PublicAuthConfig) => { config.value = c })
    .catch(() => { loading = undefined })
  return { config, ready: loading }
}
