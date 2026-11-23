import { Outlet, createFileRoute } from '@tanstack/react-router'
import AgroGate from '../components/agrosphere/AgroGate'
import { A } from '../lib/assets'
import { headLang } from '../lib/i18n'

// agrosphere's own pages (the launcher, later its settings), all behind the account
// check. The sign-in and sign-up pages sit outside this layout (agrosphere_.sign-*.tsx).
// Plan: docs/agrosphere/RENCANA-AGROSPHERE.md.
export const Route = createFileRoute('/agrosphere')({
  component: AgrosphereLayout,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === 'id' ? 'agrosphere | dashboard smartagri' : 'agrosphere | smartagri dashboards' },
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
