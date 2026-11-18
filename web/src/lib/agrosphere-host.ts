// agrosphere on its own host (docs/agrosphere/RENCANA-AGROSPHERE.md, stage 6).
//
// One app serves two hosts. On agrosphere.smart-agri.id the addresses are short
// (/plant-factory, /greenhouse, /indoor, /sign-in, /settings/access) and map onto
// the routes the app already has (/erp, /indoor-farming/dashboard/..., /agrosphere/...).
// Pages that are not agrosphere's (the public site, Kanban, AI) belong to the main
// host, so a link to one of them from agrosphere leaves for www.smart-agri.id.
//
// The router uses these functions as its URL rewrite (router.tsx), in the browser
// and on the server, where the router's origin is the request's host. The server
// middleware (server/middleware/agrosphere-host.ts) uses them to send old and
// misplaced addresses to the right host. Pure functions, so they are tested alone.

export const AGROSPHERE_LABEL = 'agrosphere'
const MAIN_DOMAIN = 'smart-agri.id'
const CANONICAL_MAIN = `www.${MAIN_DOMAIN}`

/** Pages both hosts serve as they are (account, onboarding, the email link, the legal pages). */
export const SHARED_PATHS = ['/account', '/welcome', '/auth/confirm', '/privacy-policy', '/terms-of-use']

/** agrosphere's own pages under /agrosphere, by their first segment ('' is the launcher). */
export const AGROSPHERE_PAGES = ['', 'sign-in', 'sign-up', 'settings']

// Public prefix on the agrosphere host <-> the app's route prefix. Most specific first.
const MAP: [publicPrefix: string, internalPrefix: string][] = [
  ['/greenhouse', '/indoor-farming/dashboard/field'],
  ['/indoor', '/indoor-farming/dashboard'],
  ['/plant-factory', '/erp'],
]

/** `path` is `prefix` or below it, on a segment boundary (/indoor is not /indoor-farming). */
export function under(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
}

export function isAgrosphereHost(hostname: string): boolean {
  return hostname.toLowerCase().startsWith(`${AGROSPHERE_LABEL}.`)
}

/** The app's own routes that make up agrosphere. */
export function isAgrospherePath(path: string): boolean {
  return under(path, '/agrosphere') || under(path, '/erp') || under(path, '/indoor-farming/dashboard')
}

export function isSharedPath(path: string): boolean {
  return SHARED_PATHS.some((p) => under(path, p))
}

/** An address on the agrosphere host -> the app's route. */
export function toInternalPath(path: string): string {
  if (isSharedPath(path) || isAgrospherePath(path)) return path
  for (const [pub, internal] of MAP) if (under(path, pub)) return internal + path.slice(pub.length)
  return path === '/' ? '/agrosphere' : `/agrosphere${path}`
}

/** The app's route -> its address on the agrosphere host, or null when it is not an agrosphere page. */
export function toPublicPath(path: string): string | null {
  if (isSharedPath(path)) return path
  for (const [pub, internal] of MAP) if (under(path, internal)) return pub + path.slice(internal.length)
  if (under(path, '/agrosphere')) return path.slice('/agrosphere'.length) || '/'
  return null
}

/** Whether an address on the agrosphere host is one of its pages (else it belongs on the main host). */
export function isAgrosphereAddress(path: string): boolean {
  if (isSharedPath(path)) return true
  if (MAP.some(([pub]) => under(path, pub))) return true
  const first = path.split('/')[1] ?? ''
  return AGROSPHERE_PAGES.includes(first)
}

/** The main site's origin as seen from the agrosphere host. */
export function mainOrigin(url: URL): string {
  const host = url.host.toLowerCase().slice(AGROSPHERE_LABEL.length + 1)
  const bare = host.split(':')[0]
  return `${url.protocol}//${bare === MAIN_DOMAIN ? CANONICAL_MAIN : host}`
}

/**
 * agrosphere's origin as seen from the main site, or null where there is none to
 * go to (a Vercel preview, any host other than smart-agri.id or localhost).
 */
export function agrosphereOrigin(url: URL): string | null {
  const [bare, port] = url.host.toLowerCase().split(':')
  if (bare === MAIN_DOMAIN || bare === CANONICAL_MAIN) return `https://${AGROSPHERE_LABEL}.${MAIN_DOMAIN}`
  if (bare === 'localhost') return `${url.protocol}//${AGROSPHERE_LABEL}.localhost${port ? `:${port}` : ''}`
  return null
}

const withPath = (url: URL, path: string, origin = url.origin) => new URL(path + url.search + url.hash, origin)

/** Router input: the address in the bar -> the route to render. */
export function rewriteInput(url: URL): URL | undefined {
  if (!isAgrosphereHost(url.hostname)) return undefined
  const internal = toInternalPath(url.pathname)
  return internal === url.pathname ? undefined : withPath(url, internal)
}

/**
 * Router output: a route -> the address to show or link to. With `subdomainLive`,
 * agrosphere routes on the main site point at the agrosphere host; before then
 * they stay where they are, so nothing breaks while the domain is not set up.
 */
export function rewriteOutput(url: URL, subdomainLive: boolean): URL | undefined {
  if (isAgrosphereHost(url.hostname)) {
    const pub = toPublicPath(url.pathname)
    if (pub === null) return withPath(url, url.pathname, mainOrigin(url))
    return pub === url.pathname ? undefined : withPath(url, pub)
  }
  if (subdomainLive && isAgrospherePath(url.pathname)) {
    const origin = agrosphereOrigin(url)
    if (origin) return withPath(url, toPublicPath(url.pathname) ?? '/', origin)
  }
  return undefined
}

/**
 * Where the server should send a page request instead of serving it, or null to
 * serve it. On the agrosphere host: an old route address goes to its short form,
 * a page that is not agrosphere's goes to the main site. On the main site, once
 * the subdomain is live: agrosphere's routes go to the agrosphere host.
 */
export function redirectFor(url: URL, subdomainLive: boolean): string | null {
  const path = url.pathname
  if (isAgrosphereHost(url.hostname)) {
    if (isAgrospherePath(path)) return withPath(url, toPublicPath(path) ?? '/').href
    if (!isAgrosphereAddress(path)) return withPath(url, path, mainOrigin(url)).href
    return null
  }
  if (subdomainLive && isAgrospherePath(path)) {
    const origin = agrosphereOrigin(url)
    if (origin) return withPath(url, toPublicPath(path) ?? '/', origin).href
  }
  return null
}
