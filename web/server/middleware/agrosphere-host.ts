import { defineEventHandler, getRequestHeader, getRequestURL } from 'h3'
import { redirectFor } from '../../src/lib/agrosphere-host'

// Sends a page request to the host it belongs on (lib/agrosphere-host.ts): an old
// /erp address on agrosphere to /plant-factory, a public page asked for on agrosphere
// to www.smart-agri.id, and, once VITE_AGROSPHERE_SUBDOMAIN is "on", the dashboards
// on the main site to agrosphere. Only page loads are moved (the browser asks for
// HTML); scripts, images, API calls and server functions pass through untouched.
// A 302 for now, so a change of address is not cached for good by browsers.
const LIVE = process.env.VITE_AGROSPHERE_SUBDOMAIN === 'on'

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  if (!(getRequestHeader(event, 'accept') ?? '').includes('text/html')) return
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  const to = redirectFor(url, LIVE)
  if (!to || to === url.href) return
  return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store' } })
})
