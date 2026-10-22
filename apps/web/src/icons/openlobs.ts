// OpenLobs custom icons, drawn on Lucide's grid so they sit beside `i-lucide-*` icons without a seam:
// 24 x 24, 2px stroke, round caps and joins, `currentColor`, nothing touching the outer 2px margin
// except where a shape deliberately bleeds to the edge. Use them as `i-openlobs-<name>`.
const g = (inner: string) =>
  `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">${inner}</g>`

export const openlobsIcons: Record<string, { body: string, label: string }> = {
  // A bridge: two towers, cables and a deck. The local-computer link.
  bridge: { label: 'Bridge', body: g('<path d="M2 18h20"/><path d="M7 6v12M17 6v12"/><path d="M7 6c-2 3-4 7-5 12M17 6c2 3 4 7 5 12"/><path d="M7 7c3 6 7 6 10 0"/>') },
  // Verified: a scan frame around a tick.
  verify: { label: 'Verified', body: g('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="m8.5 12.3 2.5 2.5 4.5-5"/>') },
  // Approval gate: a shield with a keyhole. Nothing runs until it opens.
  approval: { label: 'Approval', body: g('<path d="M12 3 5 6v5.2c0 4.3 2.9 7.6 7 9.8 4.1-2.2 7-5.5 7-9.8V6z"/><circle cx="12" cy="10.5" r="1.6"/><path d="M12 12.1v2.4"/>') },
  // A skill: a rounded card with a bolt.
  skill: { label: 'Skill', body: g('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m13 7.5-3 4.5h4l-3 4.5"/>') },
  // An agent team: three nodes in a triangle.
  agents: { label: 'Agent team', body: g('<circle cx="12" cy="5.5" r="2.5"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="18" r="2.5"/><path d="m10.8 7.7-3.9 8M13.2 7.7l3.9 8M8 18h8"/>') },
  // Reasoning: a four-point spark inside rays.
  spark: { label: 'Reasoning', body: g('<path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"/><path d="m12 8.2 1.3 2.5 2.7 1.3-2.7 1.3L12 15.8l-1.3-2.5L8 12l2.7-1.3z"/>') },
  // Why: the reason behind a tool call.
  why: { label: 'Why', body: g('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1 1-1.1 1.7"/><path d="M12 16.6v.01"/>') },
  // A connected device.
  device: { label: 'Device', body: g('<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2.5 19.5h19"/><circle cx="12" cy="10.5" r="1.4"/>') },
  // An artifact: a box with a corner tick.
  artifact: { label: 'Artifact', body: g('<path d="M20.5 8.2 12 3.5 3.5 8.2v7.6l8.5 4.7 8.5-4.7z"/><path d="M3.8 8.4 12 13l8.2-4.6M12 13v7.3"/>') },
  // A tool run: a wrench head with a spark. Used where a tool is working.
  run: { label: 'Tool run', body: g('<path d="M14.7 6.3a4 4 0 0 0 4.9 4.9L11 19.8a2.1 2.1 0 0 1-3-3l8.6-8.6"/><path d="m15 4 1-1.5M19.5 8.5 21 7.5M17.5 3.2V2"/>') }
}
