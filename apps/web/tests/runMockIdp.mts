import { createServer } from 'node:http'

// A fake OpenID Connect provider for trying "Continue with <provider>" without a real account.
// It approves every sign-in as the same person. Never use anywhere real. http://127.0.0.1:4020
const issuer = 'http://127.0.0.1:4020'
createServer((req, res) => {
  const url = new URL(req.url!, issuer)
  const json = (o: unknown) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
  if (url.pathname === '/.well-known/openid-configuration') return json({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, userinfo_endpoint: `${issuer}/userinfo`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] })
  if (url.pathname === '/authorize') { res.writeHead(302, { location: `${url.searchParams.get('redirect_uri')}?code=the-code&state=${url.searchParams.get('state')}` }); return void res.end() }
  if (url.pathname === '/token') return json({ access_token: 'access-1', token_type: 'Bearer', expires_in: 3600, scope: 'openid profile email' })
  if (url.pathname === '/userinfo') return json({ sub: 'idp-user-1', email: 'sso@example.com', email_verified: true, name: 'SSO Person' })
  res.writeHead(404); res.end()
}).listen(4020, '127.0.0.1', () => console.log('mock identity provider on', issuer))
