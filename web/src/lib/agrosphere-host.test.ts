import { describe, expect, it } from 'vitest'
import {
  agrosphereOrigin,
  isAgrosphereAddress,
  mainOrigin,
  redirectFor,
  rewriteInput,
  rewriteOutput,
  toInternalPath,
  toPublicPath,
  under,
} from './agrosphere-host'

const AGRO = 'https://agrosphere.smart-agri.id'
const MAIN = 'https://www.smart-agri.id'
const u = (s: string) => new URL(s)

describe('paths', () => {
  it('keeps prefixes on segment boundaries', () => {
    expect(under('/indoor', '/indoor')).toBe(true)
    expect(under('/indoor/rooms', '/indoor')).toBe(true)
    expect(under('/indoor-farming', '/indoor')).toBe(false)
  })

  it('maps agrosphere addresses to routes and back', () => {
    const pairs: [string, string][] = [
      ['/', '/agrosphere'],
      ['/sign-in', '/agrosphere/sign-in'],
      ['/settings/access', '/agrosphere/settings/access'],
      ['/plant-factory', '/erp'],
      ['/plant-factory/batch/42', '/erp/batch/42'],
      ['/greenhouse', '/indoor-farming/dashboard/field'],
      ['/indoor', '/indoor-farming/dashboard'],
      ['/indoor/rooms', '/indoor-farming/dashboard/rooms'],
      ['/account', '/account'],
      ['/auth/confirm', '/auth/confirm'],
    ]
    for (const [pub, internal] of pairs) {
      expect(toInternalPath(pub)).toBe(internal)
      expect(toPublicPath(internal)).toBe(pub)
    }
  })

  it('has no agrosphere address for the public site and the lab tools', () => {
    expect(toPublicPath('/')).toBeNull()
    expect(toPublicPath('/research')).toBeNull()
    expect(toPublicPath('/kanban')).toBeNull()
    expect(toPublicPath('/indoor-farming')).toBeNull()
  })

  it('knows which addresses are agrosphere pages', () => {
    for (const p of ['/', '/sign-in', '/sign-up', '/settings/access', '/plant-factory', '/greenhouse', '/indoor/rooms', '/welcome'])
      expect(isAgrosphereAddress(p)).toBe(true)
    for (const p of ['/research', '/kanban', '/about-us', '/indoor-farming']) expect(isAgrosphereAddress(p)).toBe(false)
  })
})

describe('origins', () => {
  it('finds the main site from agrosphere, and back', () => {
    expect(mainOrigin(u(`${AGRO}/x`))).toBe(MAIN)
    expect(mainOrigin(u('http://agrosphere.localhost:3001/x'))).toBe('http://localhost:3001')
    expect(agrosphereOrigin(u(`${MAIN}/x`))).toBe(AGRO)
    expect(agrosphereOrigin(u('https://smart-agri.id/x'))).toBe(AGRO)
    expect(agrosphereOrigin(u('http://localhost:3001/x'))).toBe('http://agrosphere.localhost:3001')
  })

  it('has no agrosphere host to go to from a preview', () => {
    expect(agrosphereOrigin(u('https://smartagri-git-x.vercel.app/erp'))).toBeNull()
  })
})

describe('router rewrite', () => {
  it('renders the right route for an agrosphere address', () => {
    expect(rewriteInput(u(`${AGRO}/plant-factory/stock?x=1`))?.href).toBe(`${AGRO}/erp/stock?x=1`)
    expect(rewriteInput(u(`${AGRO}/`))?.pathname).toBe('/agrosphere')
    expect(rewriteInput(u(`${MAIN}/erp`))).toBeUndefined()
  })

  it('shows short addresses on agrosphere and sends other pages to the main site', () => {
    expect(rewriteOutput(u(`${AGRO}/indoor-farming/dashboard/field?site=sgh`), false)?.href).toBe(`${AGRO}/greenhouse?site=sgh`)
    expect(rewriteOutput(u(`${AGRO}/agrosphere`), false)?.href).toBe(`${AGRO}/`)
    expect(rewriteOutput(u(`${AGRO}/kanban`), false)?.href).toBe(`${MAIN}/kanban`)
    expect(rewriteOutput(u(`${AGRO}/account`), false)).toBeUndefined()
  })

  it('leaves the main site alone until the subdomain is live', () => {
    expect(rewriteOutput(u(`${MAIN}/erp`), false)).toBeUndefined()
    expect(rewriteOutput(u(`${MAIN}/erp`), true)?.href).toBe(`${AGRO}/plant-factory`)
    expect(rewriteOutput(u(`${MAIN}/research`), true)).toBeUndefined()
    expect(rewriteOutput(u('https://preview.vercel.app/erp'), true)).toBeUndefined()
  })
})

describe('server redirects', () => {
  it('moves old route addresses on agrosphere to their short form', () => {
    expect(redirectFor(u(`${AGRO}/erp/batch/7`), false)).toBe(`${AGRO}/plant-factory/batch/7`)
    expect(redirectFor(u(`${AGRO}/agrosphere/sign-in?redirect=%2Ferp`), false)).toBe(`${AGRO}/sign-in?redirect=%2Ferp`)
  })

  it('sends pages that are not agrosphere to the main site', () => {
    expect(redirectFor(u(`${AGRO}/research`), false)).toBe(`${MAIN}/research`)
    expect(redirectFor(u(`${AGRO}/plant-factory`), false)).toBeNull()
    expect(redirectFor(u(`${AGRO}/`), false)).toBeNull()
  })

  it('moves the dashboards off the main site only once the subdomain is live', () => {
    expect(redirectFor(u(`${MAIN}/erp`), false)).toBeNull()
    expect(redirectFor(u(`${MAIN}/indoor-farming/dashboard/field?site=sgh`), true)).toBe(`${AGRO}/greenhouse?site=sgh`)
    expect(redirectFor(u(`${MAIN}/agrosphere/settings/access`), true)).toBe(`${AGRO}/settings/access`)
    expect(redirectFor(u(`${MAIN}/indoor-farming`), true)).toBeNull()
  })
})
