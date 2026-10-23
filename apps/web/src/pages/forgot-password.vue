<script setup lang="ts">
import { ref } from 'vue'
import LobMark from '../components/brand/LobMark.vue'
import { authClient, friendlyAuthError } from '../lib/auth'

definePage({ meta: { layout: 'blank' } })

const email = ref('')
const sent = ref(false)
const busy = ref(false)
const error = ref('')

async function submit() {
  busy.value = true; error.value = ''
  const res = await authClient.requestPasswordReset({ email: email.value.trim(), redirectTo: '/reset-password' })
  busy.value = false
  // Say the same thing whether or not the address has an account, so this cannot be used to find out who has one.
  if (res.error && res.error.status === 429) error.value = friendlyAuthError(res.error)
  else sent.value = true
}
</script>

<template>
  <main class="h-full min-h-[100dvh] overflow-y-auto bg-default">
    <div class="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div class="space-y-3 text-center">
        <LobMark class="mx-auto size-14" />
        <h1 class="text-2xl font-bold text-highlighted">
          Reset your password
        </h1>
      </div>
      <p
        v-if="sent"
        class="text-center text-sm text-muted"
        role="status"
      >
        If there is an account for that address, we have sent a link to choose a new password.
      </p>
      <form
        v-else
        class="space-y-3"
        @submit.prevent="submit"
      >
        <UInput
          v-model="email"
          type="email"
          placeholder="Email"
          required
          variant="soft"
          size="lg"
          class="w-full"
        />
        <p
          v-if="error"
          class="text-sm text-error"
          role="alert"
        >
          {{ error }}
        </p>
        <UButton
          type="submit"
          label="Send the link"
          size="lg"
          block
          :loading="busy"
        />
      </form>
      <UButton
        to="/sign-in"
        label="Back to sign in"
        color="neutral"
        variant="ghost"
        block
      />
    </div>
  </main>
</template>
