import { defineHandler } from 'nitro'
import { envKeyName, PROVIDERS } from '../../../../shared/providers'
import { localModelsAllowed } from '../../../providers/netGuard'

// The catalog, plus which providers already have a key set on the server (self-hosters keep keys in the
// environment). Never returns a key, only whether one exists.
export default defineHandler(() => ({
  providers: PROVIDERS.map(p => ({ ...p, serverKey: !!process.env[envKeyName(p.id)]?.trim() })),
  localModelsAllowed: localModelsAllowed()
}))
