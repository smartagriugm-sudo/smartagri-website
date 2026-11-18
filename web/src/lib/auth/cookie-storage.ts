// Where the Supabase session lives in the browser: cookies, not localStorage, so
// one sign-in covers smart-agri.id, www.smart-agri.id and agrosphere.smart-agri.id
// (docs/agrosphere/RENCANA-AGROSPHERE.md, stage 5). On those hosts the cookie is
// set for the parent domain; anywhere else (localhost, Vercel previews) it stays on
// the host itself, which keeps previews from reading production sessions.
//
// A session (two tokens and the user) is often larger than one cookie may be
// (about 4 KB), so a long value is split over `name.0`, `name.1`, ... The cookies
// are readable by the page's script, exactly as localStorage was; the tokens are
// short-lived and refreshed by supabase-js as before.

/** The registrable domain whose subdomains share one sign-in. */
export const SHARED_DOMAIN = 'smart-agri.id'

/** Cookie size limit per chunk, after encoding; the same margin @supabase/ssr uses. */
export const CHUNK = 3180

/** Browsers cap cookie lifetimes at 400 days; supabase-js refreshes the tokens long before. */
const MAX_AGE_S = 400 * 24 * 60 * 60

export function cookieDomainFor(hostname: string): string | undefined {
  const h = hostname.toLowerCase()
  return h === SHARED_DOMAIN || h.endsWith(`.${SHARED_DOMAIN}`) ? `.${SHARED_DOMAIN}` : undefined
}

/** The part of `document` this needs, so tests can hand in a fake jar. */
export type CookieDoc = { cookie: string }

export type CookieStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function readAll(doc: CookieDoc): Map<string, string> {
  const out = new Map<string, string>()
  for (const part of doc.cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const name = part.slice(0, eq).trim()
    if (name) out.set(name, part.slice(eq + 1).trim())
  }
  return out
}

export function createCookieStorage(
  doc: CookieDoc,
  { hostname, secure }: { hostname: string; secure: boolean },
): CookieStorage {
  const domain = cookieDomainFor(hostname)
  const attrs = (maxAge: number) =>
    `; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}${domain ? `; Domain=${domain}` : ''}`

  const write = (name: string, encoded: string) => {
    doc.cookie = `${name}=${encoded}${attrs(MAX_AGE_S)}`
  }
  const drop = (name: string) => {
    doc.cookie = `${name}=${attrs(0)}`
  }
  const chunkNames = (key: string, jar: Map<string, string>) => {
    const names: string[] = []
    for (let i = 0; jar.has(`${key}.${i}`); i++) names.push(`${key}.${i}`)
    return names
  }

  return {
    getItem(key) {
      const jar = readAll(doc)
      const whole = jar.get(key)
      const parts = whole !== undefined ? [whole] : chunkNames(key, jar).map((n) => jar.get(n)!)
      if (!parts.length) return null
      try {
        return decodeURIComponent(parts.join(''))
      } catch {
        return null
      }
    },
    setItem(key, value) {
      const encoded = encodeURIComponent(value)
      const before = chunkNames(key, readAll(doc))
      if (encoded.length <= CHUNK) {
        write(key, encoded)
        before.forEach(drop)
        return
      }
      const count = Math.ceil(encoded.length / CHUNK)
      for (let i = 0; i < count; i++) write(`${key}.${i}`, encoded.slice(i * CHUNK, (i + 1) * CHUNK))
      before.slice(count).forEach(drop)
      drop(key)
    },
    removeItem(key) {
      drop(key)
      chunkNames(key, readAll(doc)).forEach(drop)
    },
  }
}

/**
 * Sessions saved before the move to cookies sit in localStorage under the same
 * key (`sb-<project>-auth-token`). Copy each into the cookies once, unless the
 * cookies already hold a newer one (signed in on another subdomain), then clear
 * localStorage so nothing is left behind there.
 */
export function moveLocalSessions(local: Storage, cookies: CookieStorage): void {
  const keys: string[] = []
  for (let i = 0; i < local.length; i++) {
    const k = local.key(i)
    if (k && /^sb-.+-auth-token$/.test(k)) keys.push(k)
  }
  for (const k of keys) {
    const value = local.getItem(k)
    if (value && cookies.getItem(k) === null) cookies.setItem(k, value)
    local.removeItem(k)
  }
}
