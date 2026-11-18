import { describe, expect, it } from 'vitest'
import { CHUNK, cookieDomainFor, createCookieStorage, moveLocalSessions, type CookieDoc } from './cookie-storage'

// A small stand-in for document.cookie: writes take "name=value; attrs", a
// Max-Age of 0 deletes, and reads return "a=1; b=2". It also keeps the last
// attributes written per name, so the tests can check Domain and Secure.
class Jar implements CookieDoc {
  values = new Map<string, string>()
  attrs = new Map<string, string>()
  get cookie() {
    return [...this.values].map(([k, v]) => `${k}=${v}`).join('; ')
  }
  set cookie(line: string) {
    const [pair, ...rest] = line.split(';')
    const eq = pair.indexOf('=')
    const name = pair.slice(0, eq).trim()
    const attrs = rest.map((a) => a.trim()).join('; ')
    if (/Max-Age=0(;|$)/.test(attrs)) this.values.delete(name)
    else this.values.set(name, pair.slice(eq + 1))
    this.attrs.set(name, attrs)
  }
}

class Local {
  data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.data.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.data.set(k, v)
  }
  removeItem(k: string) {
    this.data.delete(k)
  }
  clear() {
    this.data.clear()
  }
}

const KEY = 'sb-abcd-auth-token'
const live = (jar: Jar) => createCookieStorage(jar, { hostname: 'agrosphere.smart-agri.id', secure: true })

describe('cookieDomainFor', () => {
  it('shares the session across smart-agri.id and its subdomains', () => {
    expect(cookieDomainFor('smart-agri.id')).toBe('.smart-agri.id')
    expect(cookieDomainFor('www.smart-agri.id')).toBe('.smart-agri.id')
    expect(cookieDomainFor('agrosphere.smart-agri.id')).toBe('.smart-agri.id')
  })

  it('keeps it on the host everywhere else', () => {
    expect(cookieDomainFor('localhost')).toBeUndefined()
    expect(cookieDomainFor('agrosphere.localhost')).toBeUndefined()
    expect(cookieDomainFor('smartagri-git-x.vercel.app')).toBeUndefined()
    expect(cookieDomainFor('notsmart-agri.id')).toBeUndefined()
  })
})

describe('createCookieStorage', () => {
  it('round-trips a short value in one cookie, set for the shared domain', () => {
    const jar = new Jar()
    const s = live(jar)
    s.setItem(KEY, '{"a":"b c;d"}')
    expect(s.getItem(KEY)).toBe('{"a":"b c;d"}')
    expect(jar.attrs.get(KEY)).toContain('Domain=.smart-agri.id')
    expect(jar.attrs.get(KEY)).toContain('Secure')
    expect(jar.attrs.get(KEY)).toContain('SameSite=Lax')
  })

  it('splits a long session over chunks and joins it back', () => {
    const jar = new Jar()
    const s = live(jar)
    const big = JSON.stringify({ access_token: 'x'.repeat(5000), user: { email: 'a@b.c' } })
    s.setItem(KEY, big)
    expect(jar.values.has(KEY)).toBe(false)
    expect(jar.values.has(`${KEY}.0`)).toBe(true)
    expect(jar.values.has(`${KEY}.1`)).toBe(true)
    for (const v of jar.values.values()) expect(v.length).toBeLessThanOrEqual(CHUNK)
    expect(s.getItem(KEY)).toBe(big)
  })

  it('leaves no stale chunk behind when a session shrinks', () => {
    const jar = new Jar()
    const s = live(jar)
    s.setItem(KEY, 'y'.repeat(9000))
    s.setItem(KEY, 'small')
    expect([...jar.values.keys()]).toEqual([KEY])
    expect(s.getItem(KEY)).toBe('small')
  })

  it('removes every piece on sign-out', () => {
    const jar = new Jar()
    const s = live(jar)
    s.setItem(KEY, 'z'.repeat(9000))
    s.removeItem(KEY)
    expect(jar.values.size).toBe(0)
    expect(s.getItem(KEY)).toBeNull()
  })

  it('stays host-only and not Secure on localhost', () => {
    const jar = new Jar()
    createCookieStorage(jar, { hostname: 'localhost', secure: false }).setItem(KEY, 'v')
    expect(jar.attrs.get(KEY)).not.toContain('Domain=')
    expect(jar.attrs.get(KEY)).not.toContain('Secure')
  })
})

describe('moveLocalSessions', () => {
  it('moves an old localStorage session into the cookies and clears it', () => {
    const jar = new Jar()
    const local = new Local()
    local.setItem(KEY, '{"old":true}')
    local.setItem('unrelated', 'keep')
    const s = live(jar)
    moveLocalSessions(local as unknown as Storage, s)
    expect(s.getItem(KEY)).toBe('{"old":true}')
    expect(local.getItem(KEY)).toBeNull()
    expect(local.getItem('unrelated')).toBe('keep')
  })

  it('keeps a session already in the cookies (signed in on another subdomain)', () => {
    const jar = new Jar()
    const s = live(jar)
    s.setItem(KEY, '{"new":true}')
    const local = new Local()
    local.setItem(KEY, '{"old":true}')
    moveLocalSessions(local as unknown as Storage, s)
    expect(s.getItem(KEY)).toBe('{"new":true}')
    expect(local.getItem(KEY)).toBeNull()
  })
})
