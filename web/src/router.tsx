import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { rewriteInput, rewriteOutput } from './lib/agrosphere-host'

// agrosphere's own host (lib/agrosphere-host.ts). Off until DNS and Vercel are set
// up for agrosphere.smart-agri.id (docs/setup/SETUP-AGROSPHERE.md): until then the
// main site keeps its /erp and /agrosphere links as they are.
const AGROSPHERE_SUBDOMAIN_LIVE = import.meta.env.VITE_AGROSPHERE_SUBDOMAIN === 'on'

// Self-heal stale clients: when a lazy route chunk fails to load (typically a
// tab opened before the latest deployment, or a request caught mid-deploy),
// reload once so the browser picks up the fresh asset manifest instead of
// showing "Failed to fetch dynamically imported module". The timestamp guard
// prevents a reload loop if the deployment itself is broken.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    const lastReload = Number(sessionStorage.getItem('chunk-reload-at') ?? 0)
    if (Date.now() - lastReload > 10_000) {
      sessionStorage.setItem('chunk-reload-at', String(Date.now()))
      event.preventDefault()
      window.location.reload()
    }
  })
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // The router's origin is the request's host on the server and the page's in the
    // browser, so both sides map agrosphere's short addresses the same way.
    rewrite: {
      input: ({ url }) => rewriteInput(url),
      output: ({ url }) => rewriteOutput(url, AGROSPHERE_SUBDOMAIN_LIVE),
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
