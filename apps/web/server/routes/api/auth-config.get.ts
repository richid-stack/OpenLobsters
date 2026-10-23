import { defineHandler } from 'nitro'
import { getAuthInstance } from '../../auth/auth'

// What the sign-in screen may show: which methods are on. Never contains a secret.
export default defineHandler(async () => (await getAuthInstance()).publicConfig)
