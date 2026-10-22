import { toolMeta } from '../../shared/toolMeta'

// A pure function from message parts to the live status line and the activity ticker.
// The line is built from fixed templates over real events. It is never invented narration.

export interface Chip {
  key: string
  kind: 'reasoning' | 'tool' | 'approval' | 'verified' | 'text'
  icon: string
  label: string
  state: 'live' | 'done' | 'waiting' | 'bad'
}

export interface StatusView {
  line: string
  live: boolean
  waiting: boolean
  /** The request failed before anything came back. */
  failed?: boolean
  chips: Chip[]
}

type AnyPart = { type: string, state?: string, text?: string, input?: Record<string, unknown>, output?: { status?: string } }

const toolName = (part: AnyPart) => part.type.replace(/^tool-/, '')
const isTool = (part: AnyPart) => part.type.startsWith('tool-')

export function statusFromParts(parts: AnyPart[], chatStatus: 'submitted' | 'streaming' | 'ready' | 'error'): StatusView {
  const chips: Chip[] = []
  parts.forEach((part, i) => {
    if (part.type === 'reasoning') {
      chips.push({ key: `r${i}`, kind: 'reasoning', icon: 'i-openlobs-spark', label: 'Reasoning', state: part.state === 'streaming' ? 'live' : 'done' })
    } else if (isTool(part)) {
      const meta = toolMeta(toolName(part))
      const waiting = part.state === 'approval-requested'
      const bad = part.state === 'output-error' || part.state === 'output-denied'
      const done = part.state === 'output-available'
      chips.push({
        key: `t${i}`,
        kind: waiting ? 'approval' : 'tool',
        icon: waiting ? 'i-openlobs-approval' : meta.icon,
        // A chip only says something happened once it has. Waiting and failed runs say so instead.
        label: waiting ? 'Needs approval' : part.state === 'output-denied' ? meta.denied : part.state === 'output-error' ? 'Failed' : done ? meta.done : meta.running.replace(/ing\b/, 'ing'),
        state: waiting ? 'waiting' : bad ? 'bad' : done ? 'done' : 'live'
      })
      if (toolName(part) === 'verify_artifact' && done && part.output?.status === 'passed') {
        chips.push({ key: `v${i}`, kind: 'verified', icon: 'i-openlobs-verify', label: 'Verified', state: 'done' })
      }
    }
  })

  // A request that failed before anything came back must not look like it is still starting.
  if (chatStatus === 'error' && parts.length === 0) {
    return { line: 'The request failed', live: false, waiting: false, failed: true, chips }
  }

  if (chatStatus === 'submitted' && parts.length === 0) {
    return { line: 'Getting started', live: true, waiting: false, chips }
  }

  const last = parts[parts.length - 1]
  if (!last) return { line: '', live: false, waiting: false, chips }

  // An approval always wins: it is the only thing that can stop the run.
  const pending = [...parts].reverse().find(p => isTool(p) && p.state === 'approval-requested')
  if (pending) {
    return { line: `Waiting for your approval to ${toolMeta(toolName(pending)).approve}`, live: false, waiting: true, chips }
  }

  if (chatStatus === 'ready' || chatStatus === 'error') {
    const tools = parts.filter(isTool).length
    return { line: tools ? `Worked with ${tools} ${tools === 1 ? 'tool' : 'tools'}` : 'Done', live: false, waiting: false, chips }
  }

  if (last.type === 'reasoning') return { line: 'Thinking it through', live: true, waiting: false, chips }
  if (isTool(last)) {
    const meta = toolMeta(toolName(last))
    return { line: last.state === 'output-available' ? meta.done : meta.running, live: true, waiting: false, chips }
  }
  if (last.type === 'text') return { line: 'Putting the answer together', live: true, waiting: false, chips }
  return { line: 'Working', live: true, waiting: false, chips }
}
