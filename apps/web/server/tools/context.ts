import { join } from 'node:path'
import { createFsArtifactStore, DEFAULT_LIMITS } from '../artifacts/store'
import type { ArtifactStore } from '../artifacts/store'
import { getAuthInstance } from '../auth/auth'
import { getDb } from '../utils/db'
import { createApprovalLedger } from './approvals'
import type { ApprovalLedger } from './approvals'

let shared: { artifacts: ArtifactStore, approvals: ApprovalLedger } | undefined

/** The shared file store and approval ledger. Waits for the tables to exist first. */
export async function getToolStores() {
  await getAuthInstance()
  const env = process.env
  const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d)
  return (shared ??= {
    artifacts: createFsArtifactStore(getDb(), env.OPENLOBS_ARTIFACTS_DIR || join('data', 'artifacts'), {
      maxFileBytes: num(env.OPENLOBS_MAX_FILE_BYTES, DEFAULT_LIMITS.maxFileBytes),
      maxFiles: num(env.OPENLOBS_MAX_FILES_PER_USER, DEFAULT_LIMITS.maxFiles),
      maxTotalBytes: num(env.OPENLOBS_MAX_STORAGE_PER_USER, DEFAULT_LIMITS.maxTotalBytes)
    }),
    approvals: createApprovalLedger(getDb())
  })
}
