// Builds src/generated/icons.json: the Lucide icons this app uses (found by scanning for `i-lucide-*`),
// plus the custom OpenLobs set, so everything ships in the bundle and nothing is fetched at runtime.
// Run `npm run icons` after using a new icon name. It is idempotent.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOTS = ['src', 'server', 'index.html', 'node_modules/@nuxt/ui/dist']
const EXT = new Set(['.vue', '.ts', '.js', '.mjs', '.html', '.json'])

function* walk(path) {
  const st = statSync(path, { throwIfNoEntry: false })
  if (!st) return
  if (st.isFile()) { yield path; return }
  for (const name of readdirSync(path)) {
    if (name === 'generated' || name === 'node_modules') continue
    yield* walk(join(path, name))
  }
}

const used = new Set()
const re = /\bi-lucide[-:]([a-z0-9]+(?:-[a-z0-9]+)*)/g
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (!EXT.has(extname(file))) continue
    for (const m of readFileSync(file, 'utf8').matchAll(re)) used.add(m[1])
  }
}

const data = JSON.parse(readFileSync(require.resolve('@iconify-json/lucide/icons.json'), 'utf8'))
const icons = {}
const aliases = {}
for (const name of [...used].sort()) {
  if (data.icons[name]) icons[name] = data.icons[name]
  else if (data.aliases?.[name]) {
    aliases[name] = data.aliases[name]
    const parent = data.aliases[name].parent
    if (data.icons[parent]) icons[parent] = data.icons[parent]
  }
}

// The custom set lives in src/icons/openlobs.ts. Read it without a TS loader by evaluating the exported object text.
const src = readFileSync('src/icons/openlobs.ts', 'utf8')
const objText = src.slice(src.indexOf('export const openlobsIcons'))
const g = (inner) => `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">${inner}</g>`
const custom = new Function('g', `${objText.replace(/^export const openlobsIcons[^=]*=/, 'return ')}`)(g)
const customIcons = Object.fromEntries(Object.entries(custom).map(([k, v]) => [k, { body: v.body }]))

// Brand marks (Lobe Icons, MIT) for the providers and labs listed in shared/brands.ts.
const brandsSrc = readFileSync('shared/brands.ts', 'utf8')
const nameList = brandsSrc.match(/BRAND_ICON_NAMES = \[([\s\S]*?)\] as const/)?.[1] ?? ''
const brandNames = [...nameList.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1])
const brandIcons = {}
for (const name of brandNames) {
  const svg = readFileSync(`node_modules/@lobehub/icons-static-svg/icons/${name}.svg`, 'utf8')
  const open = svg.match(/<svg([^>]*)>/)?.[1] ?? ''
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '')
  // Keep the colour and fill-rule set on the root element, which Iconify's body format has no place for.
  const keep = ['fill', 'fill-rule', 'clip-rule'].map(a => open.match(new RegExp(`\\s${a}="([^"]*)"`))?.[1] ? `${a}="${open.match(new RegExp(`\\s${a}="([^"]*)"`))[1]}"` : '').filter(Boolean).join(' ')
  const vb = (open.match(/viewBox="([^"]*)"/)?.[1] ?? '0 0 24 24').split(/\s+/).map(Number)
  brandIcons[name] = { body: keep ? `<g ${keep}>${inner}</g>` : inner, ...(vb[2] !== 24 || vb[3] !== 24 ? { width: vb[2], height: vb[3] } : {}) }
}

mkdirSync('src/generated', { recursive: true })
writeFileSync('src/generated/icons.json', JSON.stringify([
  { prefix: 'lucide', icons, aliases, width: data.width, height: data.height },
  { prefix: 'openlobs', icons: customIcons, width: 24, height: 24 },
  { prefix: 'brand', icons: brandIcons, width: 24, height: 24 }
]))
console.log(`lucide: ${Object.keys(icons).length}, openlobs: ${Object.keys(customIcons).length}, brand: ${Object.keys(brandIcons).length}`)
