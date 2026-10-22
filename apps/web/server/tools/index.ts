import { tool } from 'ai'
import { z } from 'zod'

// Every tool takes a `why`: one short sentence the model writes about why it is calling the tool.
// The UI shows it on the tool card, so every action has a reason people can read.
const why = z.string().max(160).describe('One short sentence: why this tool is being called now.')

// DEMO DATA. These tools return canned results so the interface can be built and reviewed without
// accounts, a Bridge or a model key. Each result carries `demo: true` and the UI labels it.
export const tools = {
  web_search: tool({
    description: 'Search the web for current information.',
    inputSchema: z.object({ query: z.string(), why }),
    execute: async ({ query }) => ({
      demo: true,
      query,
      sources: [
        { title: 'Sample result one', url: 'https://example.org/one', snippet: 'A short sample passage the real search tool would return.' },
        { title: 'Sample result two', url: 'https://example.org/two', snippet: 'Another sample passage, with its own source and date.' },
        { title: 'Sample result three', url: 'https://example.org/three', snippet: 'A third sample result so the sources list has some shape.' }
      ]
    })
  }),

  read_file: tool({
    description: 'Read a file from the connected computer, inside the folder the user approved.',
    inputSchema: z.object({ path: z.string(), why }),
    execute: async ({ path }) => ({
      demo: true,
      device: 'Richid\u2019s laptop',
      path,
      rows: 1240,
      columns: ['date', 'product', 'units', 'revenue', 'cost'],
      note: 'Read through the Bridge. Nothing outside the approved folder was touched.'
    })
  }),

  analyze_table: tool({
    description: 'Summarise a table: totals by month and the products losing money.',
    inputSchema: z.object({ task: z.string(), why }),
    execute: async () => ({
      demo: true,
      months: [
        { month: 'Jul', revenue: 18400 }, { month: 'Aug', revenue: 21150 },
        { month: 'Sep', revenue: 19720 }, { month: 'Oct', revenue: 24390 }
      ],
      losingMoney: [
        { product: 'Bulk rice 25kg', margin: -4.2 },
        { product: 'Cooking oil 5L', margin: -1.1 }
      ],
      total: 83660
    })
  }),

  // Writes a file, so it waits for the person. The runtime enforces this, not the prompt.
  create_spreadsheet: tool({
    description: 'Create an Excel workbook with the given sheets.',
    inputSchema: z.object({ filename: z.string(), sheets: z.array(z.string()), why }),
    needsApproval: true,
    execute: async ({ filename, sheets }) => ({
      demo: true,
      file: { name: filename, sizeKb: 38, sheets }
    })
  }),

  verify_artifact: tool({
    description: 'Open a created file again and check it against the success criteria.',
    inputSchema: z.object({ file: z.string(), why }),
    execute: async ({ file }) => ({
      demo: true,
      file,
      status: 'passed' as const,
      checks: [
        { label: 'Workbook opens', passed: true, detail: 'Opened without errors' },
        { label: 'Expected sheets exist', passed: true, detail: 'Summary, Monthly, Loss makers' },
        { label: 'Monthly totals add up', passed: true, detail: '83,660 matches the source total' },
        { label: 'Charts present', passed: true, detail: '1 chart on the Monthly sheet' }
      ]
    })
  })
}
