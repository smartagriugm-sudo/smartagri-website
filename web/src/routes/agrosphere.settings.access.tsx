import { createFileRoute } from '@tanstack/react-router'
import AccessSettings from '../components/agrosphere/AccessSettings'

// Who may open which dashboard, and approving new accounts. Lab admins only: the
// page says so to anyone else, and every change is checked in the database.
export const Route = createFileRoute('/agrosphere/settings/access')({
  component: AccessSettings,
  head: () => ({ meta: [{ title: 'Access | agrosphere' }] }),
})
