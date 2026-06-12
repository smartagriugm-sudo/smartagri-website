import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

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
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
