import { Outlet, createFileRoute } from '@tanstack/react-router'
import AgroGate from '../components/agrosphere/AgroGate'
import { A } from '../lib/assets'

// agrosphere's own pages (the launcher, later its settings), all behind the account
// check. The sign-in and sign-up pages sit outside this layout (agrosphere_.sign-*.tsx).
// Plan: docs/agrosphere/RENCANA-AGROSPHERE.md.
export const Route = createFileRoute('/agrosphere')({
  component: AgrosphereLayout,
  head: () => ({
    meta: [
      { title: 'agrosphere | smartagri dashboards' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: A.agrosphereIcon }],
  }),
})

function AgrosphereLayout() {
  return (
    <AgroGate>
      <Outlet />
    </AgroGate>
  )
}
