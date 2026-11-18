import { createFileRoute } from '@tanstack/react-router'
import SignInView from '../components/auth/SignInView'
import { safeRedirect } from '../lib/auth/redirects'

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: safeRedirect(search.redirect) }),
  component: SignInPage,
  head: () => ({
    meta: [
      { title: 'Sign In | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Sign in to the SmartAgri internal tools for research assistants.' },
    ],
  }),
})

function SignInPage() {
  const { redirect } = Route.useSearch()
  return <SignInView brand="smartagri" redirect={redirect} />
}
