<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LobMark from '../components/brand/LobMark.vue'
import { authClient, friendlyAuthError } from '../lib/auth'

definePage({ meta: { layout: 'blank' } })

const route = useRoute()
const router = useRouter()
const token = String(route.query.token ?? '')
const password = ref('')
const busy = ref(false)
const error = ref(route.query.error ? friendlyAuthError({ code: String(route.query.error) }) : '')

async function submit() {
  busy.value = true; error.value = ''
  const res = await authClient.resetPassword({ newPassword: password.value, token })
  busy.value = false
  if (res.error) error.value = friendlyAuthError(res.error)
  else router.replace('/sign-in')
}
</script>

<template>
  <main class="h-full min-h-[100dvh] overflow-y-auto bg-default">
    <div class="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div class="space-y-3 text-center">
        <LobMark class="mx-auto size-14" />
        <h1 class="text-2xl font-bold text-highlighted">
          Choose a new password
        </h1>
      </div>
      <form
        v-if="token"
        class="space-y-3"
        @submit.prevent="submit"
      >
        <UInput
          v-model="password"
          type="password"
          placeholder="New password"
          autocomplete="new-password"
          required
          minlength="8"
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
          label="Save password"
          size="lg"
          block
          :loading="busy"
        />
      </form>
      <p
        v-else
        class="text-center text-sm text-muted"
      >
        {{ error || 'That link is missing its code. Ask for a new one.' }}
      </p>
      <UButton
        to="/forgot-password"
        label="Ask for a new link"
        color="neutral"
        variant="ghost"
        block
      />
    </div>
  </main>
</template>
