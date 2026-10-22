import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

// A tiny OpenAI-compatible server, used to test the "any OpenAI-compatible endpoint" path end to end
// without a paid key. It streams text, streams reasoning for models named "*reason*", makes a tool call
// when asked, and records every request so tests can check what was sent.

export interface MockOptions { requireKey?: string, port?: number }
export interface Recorded { path: string, auth?: string, body?: any }

export async function startMockOpenAI(opts: MockOptions = {}) {
  const requests: Recorded[] = []

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8')
    const body = raw ? JSON.parse(raw) : undefined
    const auth = req.headers.authorization
    requests.push({ path: req.url ?? '', auth, body })

    // An OpenRouter-shaped public model list, with sample ids from many labs. The ids are made up
    // ("...-sample") so nothing here pretends to be a real model. Used to check logos and capability badges.
    if (req.method === 'GET' && req.url?.startsWith('/or/v1/models')) {
      const row = (id: string, context_length: number, supported_parameters?: string[]) => ({ id, name: id.split('/')[1], context_length, ...(supported_parameters ? { supported_parameters } : {}) })
      res.writeHead(200, { 'content-type': 'application/json' })
      return void res.end(JSON.stringify({ data: [
        row('anthropic/claude-sample', 200000, ['tools', 'reasoning', 'temperature']),
        row('openai/gpt-sample', 128000, ['tools', 'temperature']),
        row('google/gemini-sample', 1000000, ['tools', 'reasoning']),
        row('meta-llama/llama-sample', 128000, ['tools']),
        row('mistralai/mistral-sample', 32000, ['temperature']),
        row('deepseek/deepseek-sample', 64000, ['reasoning']),
        row('qwen/qwen-sample', 128000, ['tools', 'reasoning']),
        row('x-ai/grok-sample', 256000, ['tools']),
        row('cohere/command-sample', 128000, ['tools']),
        row('microsoft/phi-sample', 16000, ['temperature']),
        row('nvidia/nemotron-sample', 128000, ['tools']),
        row('perplexity/sonar-sample', 128000, ['temperature']),
        row('moonshotai/kimi-sample', 128000, ['tools']),
        row('z-ai/glm-sample', 128000, ['tools', 'reasoning']),
        row('some-lab/unknown-sample', 8000)
      ] }))
    }

    if (opts.requireKey && auth !== `Bearer ${opts.requireKey}`) {
      res.writeHead(401, { 'content-type': 'application/json' })
      return void res.end(JSON.stringify({ error: { message: 'Incorrect API key provided' } }))
    }

    if (req.method === 'GET' && req.url?.endsWith('/models')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      return void res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-chat' }, { id: 'mock-reasoner' }, { id: 'mock-tools' }] }))
    }

    if (req.method === 'POST' && req.url?.endsWith('/chat/completions')) {
      const messages: any[] = body.messages ?? []
      const last = messages[messages.length - 1]
      const text = JSON.stringify(messages).toLowerCase()
      const wantsTool = Array.isArray(body.tools) && body.tools.length > 0 && last?.role !== 'tool' && text.includes('ping')
      const model: string = body.model ?? 'mock'
      const reasoning = model.includes('reason')

      const base = { id: 'chatcmpl-mock', object: 'chat.completion.chunk', created: 1, model }
      const reply = last?.role === 'tool' ? 'The tool answered.' : text.includes('single word: ok') ? 'ok' : 'Hello from the mock model.'

      if (!body.stream) {
        res.writeHead(200, { 'content-type': 'application/json' })
        const message = wantsTool
          ? { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: body.tools[0].function.name, arguments: '{}' } }] }
          : { role: 'assistant', content: reply }
        return void res.end(JSON.stringify({ ...base, object: 'chat.completion', choices: [{ index: 0, message, finish_reason: wantsTool ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }))
      }

      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
      const send = (delta: object, finish: string | null = null) =>
        res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`)
      send({ role: 'assistant', content: '' })
      if (reasoning) for (const w of ['Let me ', 'think ', 'about this.']) { send({ reasoning_content: w }); await new Promise(r => setTimeout(r, 15)) }
      if (wantsTool) {
        send({ tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: body.tools[0].function.name, arguments: '' } }] })
        send({ tool_calls: [{ index: 0, function: { arguments: '{}' } }] })
        send({}, 'tool_calls')
      } else {
        for (const w of reply.split(/(?<= )/)) { send({ content: w }); await new Promise(r => setTimeout(r, 15)) }
        send({}, 'stop')
      }
      res.write(`data: ${JSON.stringify({ ...base, choices: [], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } })}\n\n`)
      res.write('data: [DONE]\n\n')
      return void res.end()
    }

    res.writeHead(404); res.end()
  })

  await new Promise<void>(resolve => server.listen(opts.port ?? 0, '127.0.0.1', resolve))
  const port = (server.address() as { port: number }).port
  return { url: `http://127.0.0.1:${port}/v1`, requests, close: () => new Promise<void>(r => server.close(() => r())) }
}
