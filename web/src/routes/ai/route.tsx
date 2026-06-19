import { useEffect } from 'react'
import { Outlet, createFileRoute, useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth/auth'
import { body } from '../../lib/fonts'
import SiteHeader from '../../components/SiteHeader'

export const Route = createFileRoute('/ai')({
  component: AILayout,
})

// Gates every /ai* page. When auth is disabled (Supabase not configured) the
// pages are open. When configured, an unauthenticated visitor is redirected to
// the sign-in page with a redirect back here.
function AILayout() {
  const { user, loading, isConfigured } = useAuth()
  const router = useRouter()

  const blocked = isConfigured && !loading && !user

  useEffect(() => {
    if (blocked) {
      const here = router.state.location.pathname
      window.location.assign(`/sign-in?redirect=${encodeURIComponent(here)}`)
    }
  }, [blocked, router])

  if (isConfigured && (loading || !user)) {
    return (
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6]">
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
            <p className="text-sm" style={body}>
              {loading ? 'Checking access...' : 'Redirecting to sign in...'}
            </p>
          </div>
        </section>
      </main>
    )
  }

  return <Outlet />
}
