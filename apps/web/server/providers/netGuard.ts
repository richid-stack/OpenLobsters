import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// Anyone can type a base URL into the settings screen, and the server then makes a request to it.
// Without a guard, a hosted OpenLobs could be pointed at internal services (cloud metadata, databases,
// other machines on its network). This blocks private, loopback and link-local addresses unless the
// operator explicitly allows local models (needed for Ollama on the same machine).
//
// Known limit: this checks the address at lookup time. A hostile DNS server could answer differently
// on the real connection (DNS rebinding). Hosted deployments should also restrict egress at the network layer.

export class UnsafeURLError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeURLError'
  }
}

/** IPv4 address hidden inside an IPv6 one (::ffff:a.b.c.d or its hex form ::ffff:xxxx:xxxx, which is what URL parsing produces). */
function mappedV4(ipv6: string): string | undefined {
  const s = ipv6.toLowerCase()
  const dotted = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) return dotted[1]
  const hex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (!hex) return undefined
  const hi = parseInt(hex[1]!, 16)
  const lo = parseInt(hex[2]!, 16)
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`
}

export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number) as [number, number]
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254) // link-local, includes cloud metadata 169.254.169.254
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
  }
  if (v === 6) {
    const s = ip.toLowerCase()
    if (s === '::1' || s === '::') return true
    if (s.startsWith('fe80:') || s.startsWith('fc') || s.startsWith('fd')) return true
    const mapped = mappedV4(s)
    return mapped ? isPrivateAddress(mapped) : false
  }
  return false
}

/** Never a real model server, whatever the settings: link-local (cloud metadata lives here) and unspecified addresses. */
export function isAlwaysBlockedAddress(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number) as [number, number]
    return a === 0 || (a === 169 && b === 254)
  }
  if (v === 6) {
    const s = ip.toLowerCase()
    if (s === '::' || s.startsWith('fe80:')) return true
    const mapped = mappedV4(s)
    return mapped ? isAlwaysBlockedAddress(mapped) : false
  }
  return false
}

const METADATA_HOSTS = new Set(['metadata.google.internal', 'metadata', 'instance-data'])

export function localModelsAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.OPENLOBS_ALLOW_LOCAL_MODELS === '1') return true
  if (env.OPENLOBS_ALLOW_LOCAL_MODELS === '0') return false
  // Default: allowed in development, blocked in production.
  return env.NODE_ENV !== 'production'
}

export async function assertSafeBaseURL(
  raw: string,
  opts: { allowLocal?: boolean, resolve?: (host: string) => Promise<string[]> } = {}
): Promise<URL> {
  const allowLocal = opts.allowLocal ?? localModelsAllowed()
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeURLError('That is not a valid web address.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new UnsafeURLError('Only http and https addresses are allowed.')
  }
  if (url.username || url.password) {
    throw new UnsafeURLError('Put the key in the key field, not in the address.')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  // Blocked even when local models are allowed. Only literal addresses and known metadata names are checked
  // here; a name that resolves to one is caught below, or by the operator's network rules.
  if (METADATA_HOSTS.has(host) || (isIP(host) && isAlwaysBlockedAddress(host))) {
    throw new UnsafeURLError('That address is never a model server and is not allowed.')
  }
  if (allowLocal) return url
  if (url.protocol === 'http:') {
    throw new UnsafeURLError('This server only allows https model addresses.')
  }
  const addresses = isIP(host)
    ? [host]
    : await (opts.resolve ?? (async (h: string) => (await lookup(h, { all: true })).map(r => r.address)))(host)
  if (host === 'localhost' || addresses.some(isPrivateAddress)) {
    throw new UnsafeURLError('This server does not allow model addresses on private or local networks.')
  }
  return url
}
