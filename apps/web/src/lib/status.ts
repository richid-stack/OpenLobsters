import { toolMeta } from '../../shared/toolMeta'

// A pure function from message parts to the live status line and the list of steps (the actions taken) shown in the tray.
// Everything is built from fixed templates over real events. It never invents narration.

export interface Step {
  key: string
  /** Position of the part in the message. The tray uses it to jump to that part. */
  partIndex: number
  kind: 'tool'
  icon: string
  label: string
  /** What the step worked on: a file name, a query. */
  detail?: string
  state: 'live' | 'done' | 'waiting' | 'bad'
  /** A check that passed. */
  verified?: boolean
}

export interface StatusView {
  line: string
  live: boolean
  waiting: boolean
  /** The request failed before anything came back. */
  failed?: boolean
  steps: Step[]
  /** The part that is waiting for an answer, when one is. The status line jumps straight to it. */
  pendingPartIndex?: number
}

type AnyPart = { type: string, state?: string, text?: string, input?: Record<string, unknown>, output?: { status?: string } }

const toolName = (part: AnyPart) => part.type.replace(/^tool-/, '')
const isTool = (part: AnyPart) => part.type.startsWith('tool-')

/** A short description of what a tool call is about, taken from its input. */
export function toolSubject(input: unknown): string | undefined {
  const i = input as Record<string, unknown> | undefined
  const v = i?.filename ?? i?.path ?? i?.query ?? i?.file ?? i?.task
  return typeof v === 'string' ? v.slice(0, 44) : undefined
}

/** The id of the element a step points to. Both the message and the tray build it the same way. */
export function stepAnchor(messageId: string, partIndex: number): string {
  return `step-${messageId.replace(/[^A-Za-z0-9_-]/g, '')}-${partIndex}`
}

function stepsOf(parts: AnyPart[]): Step[] {
  const steps: Step[] = []
  parts.forEach((part, i) => {
    // Only actions are steps. Reasoning already has its own collapsed row right above the answer, and listing it
    // here would turn every plain reply into a tray with one item.
    if (isTool(part)) {
      const meta = toolMeta(toolName(part))
      const waiting = part.state === 'approval-requested'
      const denied = part.state === 'output-denied'
      const failed = part.state === 'output-error'
      const done = part.state === 'output-available'
      steps.push({
        key: `t${i}`,
        partIndex: i,
        kind: 'tool',
        icon: waiting ? 'i-openlobs-approval' : denied ? 'i-lucide-ban' : failed ? 'i-lucide-triangle-alert' : meta.icon,
        // A step only says something happened once it has. Waiting, refused and failed steps say so instead.
        label: waiting ? `Ready to ${meta.approve}` : denied ? meta.denied : failed ? `${meta.running} failed` : done ? meta.done : meta.running,
        detail: waiting ? 'Needs your approval' : toolSubject(part.input),
        state: waiting ? 'waiting' : denied || failed ? 'bad' : done ? 'done' : 'live',
        verified: toolName(part) === 'verify_artifact' && done && part.output?.status === 'passed' ? true : undefined
      })
    }
  })
  return steps
}

export function statusFromParts(parts: AnyPart[], chatStatus: 'submitted' | 'streaming' | 'ready' | 'error'): StatusView {
  const steps = stepsOf(parts)

  // A request that failed before anything came back must not look like it is still starting.
  if (chatStatus === 'error' && parts.length === 0) {
    return { line: 'The request failed', live: false, waiting: false, failed: true, steps }
  }
  if (chatStatus === 'submitted' && parts.length === 0) {
    return { line: 'Getting started', live: true, waiting: false, steps }
  }

  const last = parts[parts.length - 1]
  if (!last) return { line: '', live: false, waiting: false, steps }

  // An approval always wins: it is the only thing that can stop the run.
  let pendingPartIndex = -1
  parts.forEach((p, i) => { if (isTool(p) && p.state === 'approval-requested') pendingPartIndex = i })
  if (pendingPartIndex >= 0) {
    return { line: `Waiting for your approval to ${toolMeta(toolName(parts[pendingPartIndex]!)).approve}`, live: false, waiting: true, steps, pendingPartIndex }
  }

  if (chatStatus === 'ready' || chatStatus === 'error') {
    const tools = parts.filter(isTool).length
    return { line: tools ? `Worked with ${tools} ${tools === 1 ? 'tool' : 'tools'}` : 'Done', live: false, waiting: false, steps }
  }

  if (last.type === 'reasoning') return { line: 'Thinking it through', live: true, waiting: false, steps }
  if (isTool(last)) {
    const meta = toolMeta(toolName(last))
    return { line: last.state === 'output-available' ? meta.done : meta.running, live: true, waiting: false, steps }
  }
  if (last.type === 'text') return { line: 'Putting the answer together', live: true, waiting: false, steps }
  return { line: 'Working', live: true, waiting: false, steps }
}

export interface Notice {
  kind: 'error' | 'info'
  title?: string
  text: string
  /** Plain text buttons. The interface decides what each id does. */
  actions: Array<{ id: 'retry' | 'models'; label: string }>
  dismissible: boolean
}

/**
 * The one line above the message box has one owner at a time. An error comes first, because it is the thing
 * that needs attention. A "this model only chats" note comes next, but only while nothing is running or
 * waiting, so it never talks over live work. Otherwise the normal status line is shown.
 */
export function noticeFor(input: { error?: string, chatOnly?: boolean, view: StatusView }): Notice | null {
  if (input.error) {
    return {
      kind: 'error',
      title: 'That did not work.',
      text: input.error,
      actions: [{ id: 'retry', label: 'Try again' }, { id: 'models', label: 'Models' }],
      dismissible: true
    }
  }
  if (input.chatOnly && !input.view.live && !input.view.waiting) {
    return {
      kind: 'info',
      text: 'This model cannot use tools, so it will only chat.',
      actions: [{ id: 'models', label: 'Change model' }],
      dismissible: false
    }
  }
  return null
}
