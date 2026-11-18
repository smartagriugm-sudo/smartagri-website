import { createFileRoute } from '@tanstack/react-router'
import AgroLauncher from '../components/agrosphere/AgroLauncher'

// The launcher: every dashboard this account may open. The layout (agrosphere.tsx)
// has already checked the account.
export const Route = createFileRoute('/agrosphere/')({
  component: AgroLauncher,
})
