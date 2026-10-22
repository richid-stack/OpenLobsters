import { startMockOpenAI } from './mockOpenAI.mts'
// Long-running mock provider for manual testing and screenshots: key "test-key", http://127.0.0.1:4010/v1
const m = await startMockOpenAI({ requireKey: 'test-key', port: 4010 })
console.log('mock provider on', m.url)
setInterval(() => {}, 1 << 30)
