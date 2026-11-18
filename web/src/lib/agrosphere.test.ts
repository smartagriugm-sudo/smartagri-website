import { describe, expect, it } from 'vitest'
import { canOpen, type AgroEntry } from './agrosphere'

const entry = (app: AgroEntry['app'], site: string | null = null): AgroEntry => ({
  app,
  site_id: site,
  site_code: site,
  site_name: site,
})

describe('canOpen', () => {
  it('opens everything when auth is not configured', () => {
    expect(canOpen({ state: 'open' }, 'plant-factory')).toBe(true)
  })

  it('opens only the dashboards the database returned', () => {
    const partner = { state: 'ready' as const, entries: [entry('greenhouse', 'sgh-grabag')] }
    expect(canOpen(partner, 'greenhouse')).toBe(true)
    expect(canOpen(partner, 'plant-factory')).toBe(false)
    expect(canOpen(partner, 'indoor')).toBe(false)
  })

  it('opens nothing while loading, on an error, or with no grants', () => {
    expect(canOpen({ state: 'loading' }, 'indoor')).toBe(false)
    expect(canOpen({ state: 'error', message: 'x' }, 'indoor')).toBe(false)
    expect(canOpen({ state: 'ready', entries: [] }, 'greenhouse')).toBe(false)
  })
})
