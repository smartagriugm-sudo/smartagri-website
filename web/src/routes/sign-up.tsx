import { createFileRoute } from '@tanstack/react-router'
import SignUpView from '../components/auth/SignUpView'
import { safeRedirect } from '../lib/auth/redirects'

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: safeRedirect(search.redirect) }),
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: 'Sign Up | smartagri' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Register for the SmartAgri internal tools for research assistants.' },
    ],
  }),
})

function SignUpPage() {
  const { redirect } = Route.useSearch()
  return <SignUpView brand="smartagri" redirect={redirect} />
}
