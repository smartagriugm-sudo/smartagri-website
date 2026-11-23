import { createFileRoute } from '@tanstack/react-router'
import AccessSettings from '../components/agrosphere/AccessSettings'
import { headLang } from '../lib/i18n'

// Who may open which dashboard, and approving new accounts. Lab admins only: the
// page says so to anyone else, and every change is checked in the database.
export const Route = createFileRoute('/agrosphere/settings/access')({
  component: AccessSettings,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === 'id' ? 'Akses | agrosphere' : 'Access | agrosphere' }] }),
})
