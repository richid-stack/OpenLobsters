<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import LobMark from '../components/brand/LobMark.vue'
import { useAuthConfig } from '../composables/useAuthConfig'
import { authClient, friendlyAuthError } from '../lib/auth'

definePage({ meta: { layout: 'blank' } })

const router = useRouter()
const { config } = useAuthConfig()
const session = authClient.useSession()

const mode = ref<'in' | 'up'>('in')
const name = ref('')
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')

watch(() => session.value.data?.user, (u) => { if (u) router.replace('/') }, { immediate: true })

const canSignUp = computed(() => config.value?.signupsOpen !== false)
const providerIcon = (id: string) => ({ github: 'i-brand-github', google: 'i-brand-google-color', microsoft: 'i-brand-microsoft-color' } as Record<string, string>)[id] ?? 'i-lucide-key-round'

async function submit() {
  error.value = ''; notice.value = ''; busy.value = true
  try {
    const res = mode.value === 'up'
      ? await authClient.signUp.email({ name: name.value.trim() || email.value.split('@')[0]!, email: email.value.trim(), password: password.value, callbackURL: '/' })
      : await authClient.signIn.email({ email: email.value.trim(), password: password.value, callbackURL: '/' })
    if (res.error) error.value = friendlyAuthError(res.error)
    else if (mode.value === 'up' && config.value?.emailVerification) notice.value = 'Check your email. We sent a link to confirm your address.'
  } finally { busy.value = false }
}

async function social(id: string) {
  error.value = ''
  const res = await authClient.signIn.social({ provider: id as 'github', callbackURL: '/' })
  if (res?.error) error.value = friendlyAuthError(res.error)
}
</script>

<template>
  <main class="h-full min-h-[100dvh] overflow-y-auto bg-default">
    <div class="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div class="space-y-3 text-center">
        <LobMark class="mx-auto size-14" />
        <h1 class="text-2xl font-bold text-highlighted">
          {{ mode === 'in' ? 'Sign in to OpenLobs' : 'Create your account' }}
        </h1>
        <p class="text-sm text-muted">
          Save your chats and pick up where you left off on any device.
        </p>
      </div>

      <div
        v-if="config?.providers.length"
        class="space-y-2"
      >
        <UButton
          v-for="p in config.providers"
          :key="p.id"
          :label="`Continue with ${p.name}`"
          :icon="providerIcon(p.id)"
          color="neutral"
          variant="soft"
          size="lg"
          block
          @click="social(p.id)"
        />
      </div>

      <p
        v-if="config?.providers.length && config.email"
        class="text-center text-xs text-dimmed"
      >
        or use your email
      </p>

      <form
        v-if="config?.email !== false"
        class="space-y-3"
        @submit.prevent="submit"
      >
        <UInput
          v-if="mode === 'up'"
          v-model="name"
          placeholder="Your name"
          autocomplete="name"
          variant="soft"
          size="lg"
          class="w-full"
        />
        <UInput
          v-model="email"
          type="email"
          placeholder="Email"
          autocomplete="email"
          required
          variant="soft"
          size="lg"
          class="w-full"
        />
        <UInput
          v-model="password"
          type="password"
          placeholder="Password"
          :autocomplete="mode === 'in' ? 'current-password' : 'new-password'"
          required
          minlength="8"
          variant="soft"
          size="lg"
          class="w-full"
        />

        <p
          v-if="error"
          class="flex items-start gap-1.5 text-sm text-error"
          role="alert"
        >
          <UIcon
            name="i-lucide-circle-alert"
            class="mt-0.5 size-4 shrink-0"
          />{{ error }}
        </p>
        <p
          v-if="notice"
          class="flex items-start gap-1.5 text-sm text-success"
          role="status"
        >
          <UIcon
            name="i-lucide-mail-check"
            class="mt-0.5 size-4 shrink-0"
          />{{ notice }}
        </p>

        <UButton
          type="submit"
          :label="mode === 'in' ? 'Sign in' : 'Create account'"
          size="lg"
          block
          :loading="busy"
        />

        <div class="flex items-center justify-between text-sm">
          <button
            v-if="mode === 'in' && config?.passwordReset"
            type="button"
            class="text-muted hover:text-highlighted"
            @click="router.push('/forgot-password')"
          >
            Forgot password?
          </button>
          <span v-else />
          <button
            v-if="mode === 'in' ? canSignUp : true"
            type="button"
            class="font-medium text-primary"
            @click="mode = mode === 'in' ? 'up' : 'in'; error = ''; notice = ''"
          >
            {{ mode === 'in' ? 'Create an account' : 'I already have an account' }}
          </button>
        </div>
      </form>

      <UButton
        to="/"
        label="Continue without an account"
        color="neutral"
        variant="ghost"
        block
      />
    </div>
  </main>
</template>
