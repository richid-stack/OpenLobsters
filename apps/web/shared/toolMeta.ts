// What the UI needs to know about each tool, in one place. The server registers the tools; this
// describes them for people: the icon, the words for each state, where the work happens and how risky it is.
// Later this becomes the Tool Registry entry (schemas, permissions, health) described in the plan.
export type ToolLocation = 'remote' | 'bridge' | 'sandbox'
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
}

export const TOOL_META: Record<string, ToolMeta> = {
  web_search: { icon: 'i-lucide-globe', running: 'Searching the web', done: 'Searched the web', denied: 'Search skipped', approve: 'search the web', location: 'remote', risk: 'read' },
  read_file: { icon: 'i-openlobs-device', running: 'Reading a file on your computer', done: 'Read a file on your computer', denied: 'File not read', approve: 'read a file on your computer', location: 'bridge', risk: 'read' },
  analyze_table: { icon: 'i-lucide-table-2', running: 'Analysing the data', done: 'Analysed the data', denied: 'Analysis skipped', approve: 'analyse the data', location: 'sandbox', risk: 'read' },
  create_spreadsheet: { icon: 'i-lucide-file-spreadsheet', running: 'Creating the workbook', done: 'Created the workbook', denied: 'Workbook not created', approve: 'create the workbook', location: 'bridge', risk: 'write' },
  verify_artifact: { icon: 'i-openlobs-verify', running: 'Checking the result', done: 'Checked the result', denied: 'Check skipped', approve: 'check the result', location: 'sandbox', risk: 'read' }
}

export const LOCATION_LABEL: Record<ToolLocation, string> = {
  remote: 'Online',
  bridge: 'Your computer',
  sandbox: 'Sandbox'
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
