import { MockLanguageModelV4 } from 'ai/test'

// A stand-in model that behaves like a real one: it streams reasoning, calls tools one step at a time,
// waits when a tool needs approval, and finishes with text. It lets the whole interface be built and
// reviewed without a provider key. When a key is set, the route uses the real provider instead and
// nothing else changes, because everything above the model speaks the same AI SDK protocol.

type Part = Record<string, unknown>
type Step =
  | { reasoning: string, call: { name: string, input: Record<string, unknown> } }
  | { reasoning: string, text: string }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const SALES: Step[] = [
  {
    reasoning: 'You want a clean summary of your sales. I should read the file from your computer first, so I know what is in it before I touch anything.',
    call: { name: 'read_file', input: { path: 'Documents/sales_2026.csv', why: 'I need the raw rows before I can summarise anything.' } }
  },
  {
    reasoning: 'Found 1,240 rows with revenue and cost. Next I will total revenue by month and look for products selling below cost.',
    call: { name: 'analyze_table', input: { task: 'Monthly revenue and products with a negative margin', why: 'The summary needs monthly totals and the loss makers.' } }
  },
  {
    reasoning: 'Four months of totals and two products losing money. Writing a workbook means creating a file on your computer, so I will ask you first.',
    call: { name: 'create_spreadsheet', input: { filename: 'sales-summary.xlsx', sheets: ['Summary', 'Monthly', 'Loss makers'], why: 'You asked for a workbook you can open and share.' } }
  },
  {
    reasoning: 'The file exists, but that does not prove it is right. I will open it again and check it against what the data says.',
    call: { name: 'verify_artifact', input: { file: 'sales-summary.xlsx', why: 'A created file is not a correct file until it has been checked.' } }
  },
  {
    reasoning: 'All four checks passed. I can report this with evidence instead of just saying it is done.',
    text: 'Your workbook is ready, and I checked it after creating it.\n\n**What it shows:**\n- Revenue over the four months came to **GHS 83,660**, with October the strongest month at 24,390.\n- Two products sold below cost: **Bulk rice 25kg** (-4.2% margin) and **Cooking oil 5L** (-1.1%).\n\n**What I checked:** the file opens, the three sheets exist, the monthly totals match the source, and the chart is there.\n\nThis was a demo run with sample data, so the figures are illustrative.'
  }
]

const SALES_DENIED: Step = {
  reasoning: 'You chose not to let me create the file, so I will not write anything to your computer.',
  text: 'Understood. I have not created the workbook, and nothing was written to your computer. The analysis is still here: **GHS 83,660** in revenue over four months, and two products selling below cost. Say the word and I will create the file after all.'
}

const RESEARCH: Step[] = [
  {
    reasoning: 'This needs current information, which I do not have on my own. I will search instead of guessing.',
    call: { name: 'web_search', input: { query: 'latest developments', why: 'Your question depends on recent information.' } }
  },
  {
    reasoning: 'Three sources came back. I will summarise what they agree on and say where they are thin.',
    text: 'Here is what the search turned up.\n\n- All three sources agree on the broad picture.\n- None of them gives hard numbers, so I would treat the details as unconfirmed.\n\nThis was a demo run with sample sources. A real run would cite them and flag anything it could not verify.'
  }
]

const CHAT: Step[] = [
  {
    reasoning: 'A simple message. No tools needed, so I will just answer.',
    text: 'Hello. I am OpenLobs. I can work with files on your computer, search the web, build workbooks and check my own work, and I ask before I do anything that changes something.\n\nTry: **"Summarise my sales and make me a workbook"**.'
  }
]

function pick(userText: string): Step[] {
  const t = userText.toLowerCase()
  if (/(sales|spreadsheet|excel|workbook|revenue|csv)/.test(t)) return SALES
  if (/(search|latest|news|research|find out|current)/.test(t)) return RESEARCH
  return CHAT
}

function words(text: string, size: number): string[] {
  const parts = text.split(/(\s+)/)
  const out: string[] = []
  let buf = ''
  let n = 0
  for (const p of parts) {
    buf += p
    if (p.trim()) n++
    if (n >= size) { out.push(buf); buf = ''; n = 0 }
  }
  if (buf) out.push(buf)
  return out
}

function stream(parts: Array<{ part: Part, delay: number }>) {
  return new ReadableStream<Part>({
    async start(controller) {
      for (const { part, delay } of parts) {
        if (delay) await sleep(delay)
        controller.enqueue(part)
      }
      controller.close()
    }
  })
}

const usage = {
  inputTokens: { total: 240, noCache: 240, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 120, text: 90, reasoning: 30 }
}

// Which step are we on? Count the assistant turns since the last user message. This is stateless,
// so it still works when a run resumes in a new request after an approval.
export function readPrompt(prompt: Array<{ role: string, content: unknown }>) {
  let lastUser = -1
  prompt.forEach((m, i) => { if (m.role === 'user') lastUser = i })
  const after = prompt.slice(lastUser + 1)
  const userContent = lastUser >= 0 ? prompt[lastUser]!.content : []
  const userText = Array.isArray(userContent)
    ? userContent.map((c: { type?: string, text?: string }) => (c.type === 'text' ? c.text ?? '' : '')).join(' ')
    : String(userContent ?? '')
  const lastTool = [...after].reverse().find(m => m.role === 'tool')
  return {
    userText,
    stepIndex: after.filter(m => m.role === 'assistant').length,
    denied: lastTool ? /denied/i.test(JSON.stringify(lastTool.content)) : false
  }
}

export function planStep(userText: string, stepIndex: number, denied: boolean): Step {
  const steps = pick(userText)
  if (steps === SALES && denied) return SALES_DENIED
  return steps[Math.min(stepIndex, steps.length - 1)]!
}

export function createDemoModel() {
  return new MockLanguageModelV4({
    provider: 'openlobs-demo',
    modelId: 'demo',
    doStream: async (options: { prompt: Array<{ role: string, content: unknown }> }) => {
      const { userText, stepIndex, denied } = readPrompt(options.prompt)
      const step = planStep(userText, stepIndex, denied)
      const parts: Array<{ part: Part, delay: number }> = [{ part: { type: 'stream-start', warnings: [] }, delay: 0 }]

      parts.push({ part: { type: 'reasoning-start', id: 'r' }, delay: 380 })
      for (const chunk of words(step.reasoning, 3)) {
        parts.push({ part: { type: 'reasoning-delta', id: 'r', delta: chunk }, delay: 55 })
      }
      parts.push({ part: { type: 'reasoning-end', id: 'r' }, delay: 40 })

      if ('call' in step) {
        const id = `call_${Math.random().toString(36).slice(2, 10)}`
        const json = JSON.stringify(step.call.input)
        parts.push({ part: { type: 'tool-input-start', id, toolName: step.call.name }, delay: 120 })
        const cut = Math.ceil(json.length / 3)
        for (let i = 0; i < json.length; i += cut) {
          parts.push({ part: { type: 'tool-input-delta', id, delta: json.slice(i, i + cut) }, delay: 90 })
        }
        parts.push({ part: { type: 'tool-input-end', id }, delay: 30 })
        parts.push({ part: { type: 'tool-call', toolCallId: id, toolName: step.call.name, input: json }, delay: 20 })
        parts.push({ part: { type: 'finish', usage, finishReason: { unified: 'tool-calls', raw: undefined } }, delay: 10 })
      } else {
        parts.push({ part: { type: 'text-start', id: 't' }, delay: 60 })
        for (const chunk of words(step.text, 2)) {
          parts.push({ part: { type: 'text-delta', id: 't', delta: chunk }, delay: 28 })
        }
        parts.push({ part: { type: 'text-end', id: 't' }, delay: 20 })
        parts.push({ part: { type: 'finish', usage, finishReason: { unified: 'stop', raw: undefined } }, delay: 10 })
      }

      return { stream: stream(parts) as never }
    }
  })
}
