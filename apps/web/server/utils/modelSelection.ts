import { z } from 'zod'

export const modelSelectionSchema = z.object({
  providerId: z.string().min(1).max(80),
  modelId: z.string().min(1).max(300),
  apiKey: z.string().max(500).optional(),
  baseURL: z.string().max(500).optional(),
  supportsTools: z.boolean().nullable().optional(),
  providerName: z.string().max(80).optional()
})
