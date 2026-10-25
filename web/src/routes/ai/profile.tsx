import { createFileRoute, redirect } from '@tanstack/react-router'

// Profile & settings moved to /account; keep the old address working.
export const Route = createFileRoute('/ai/profile')({
  beforeLoad: () => {
    throw redirect({ to: '/account' })
  },
})
