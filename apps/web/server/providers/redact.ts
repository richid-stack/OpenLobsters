// Keys must never appear in logs, errors or anything sent back to the browser.
export function redactSecrets(text: string, secrets: Array<string | undefined | null>): string {
  let out = text
  for (const s of secrets) {
    if (s && s.length >= 6) out = out.split(s).join('[key hidden]')
  }
  // Common key shapes, in case a provider echoes a different key back.
  out = out.replace(/\b(sk|pk|rk|gsk|xai)-[A-Za-z0-9_-]{16,}\b/g, '[key hidden]')
  out = out.replace(/\bBearer\s+[A-Za-z0-9._-]{12,}/gi, 'Bearer [key hidden]')
  out = out.replace(/([?&]key=)[^&\s]+/gi, '$1[key hidden]')
  return out
}
