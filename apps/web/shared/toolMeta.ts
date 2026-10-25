// What the UI needs to know about each tool, in one place. The server registers the tools; this
// describes them for people: the icon, the words for each state, where it runs, how risky it is, and what to
// tell the person before they approve it. Later this becomes the Tool Registry entry (schemas, permissions, health).
export type ToolLocation = 'remote' | 'bridge' | 'server'
export type ToolRisk = 'read' | 'write'

export interface ToolMeta {
  icon: string
  running: string
  done: string
  denied: string
  /** Said after "Waiting for your approval to ..." */
  approve: string
  location: ToolLocation
  risk: ToolRisk
  /** Shown on the approval card instead of the generic sentence. Say plainly what will happen. */
  approveDetail?: string
  /** What will be made or done, in a few words, for the approval card. */
  describe?: (input: unknown) => string | undefined
}

export const TOOL_META: Record<string, ToolMeta> = {
  web_search: { icon: 'i-lucide-globe', running: 'Searching the web', done: 'Searched the web', denied: 'Search skipped', approve: 'search the web', location: 'remote', risk: 'read' },
  read_file: { icon: 'i-openlobs-device', running: 'Reading a file on your computer', done: 'Read a file on your computer', denied: 'File not read', approve: 'read a file on your computer', location: 'bridge', risk: 'read' },
  analyze_table: { icon: 'i-lucide-table-2', running: 'Analysing the data', done: 'Analysed the data', denied: 'Analysis skipped', approve: 'analyse the data', location: 'server', risk: 'read' },
  create_spreadsheet: {
    icon: 'i-lucide-file-spreadsheet',
    running: 'Creating the workbook',
    done: 'Created the workbook',
    denied: 'Workbook not created',
    approve: 'create the workbook',
    location: 'server',
    risk: 'write',
    approveDetail: 'A new file will be saved to your account. Nothing is sent anywhere else, and you can delete it later.',
    describe: (input) => {
      const i = input as { filename?: string, sheets?: Array<{ rows?: unknown[] }> } | undefined
      if (!i?.filename || !Array.isArray(i.sheets)) return undefined
      const rows = i.sheets.reduce((a, s) => a + (Array.isArray(s.rows) ? s.rows.length : 0), 0)
      return `${i.filename} \u00b7 ${i.sheets.length} ${i.sheets.length === 1 ? 'sheet' : 'sheets'} \u00b7 ${rows.toLocaleString('en')} rows`
    }
  },
  verify_artifact: { icon: 'i-openlobs-verify', running: 'Checking the result', done: 'Checked the result', denied: 'Check skipped', approve: 'check the result', location: 'server', risk: 'read' }
}

export const LOCATION_LABEL: Record<ToolLocation, string> = {
  remote: 'Online',
  bridge: 'Your computer',
  server: 'On the server'
}

export function toolMeta(name: string): ToolMeta {
  return TOOL_META[name] ?? {
    icon: 'i-openlobs-run',
    running: `Running ${name.replace(/_/g, ' ')}`,
    done: `Ran ${name.replace(/_/g, ' ')}`,
    denied: `${name.replace(/_/g, ' ')} not run`,
    approve: `run ${name.replace(/_/g, ' ')}`,
    location: 'remote',
    risk: 'write'
  }
}
