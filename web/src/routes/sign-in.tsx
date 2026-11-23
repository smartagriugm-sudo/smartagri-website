import { createFileRoute } from '@tanstack/react-router'
import SignInView from '../components/auth/SignInView'
import { safeRedirect } from '../lib/auth/redirects'
import { headLang } from '../lib/i18n'

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: safeRedirect(search.redirect) }),
  component: SignInPage,
  head: ({ matches }) => {
    const l = headLang(matches)
    return {
      meta: [
        { title: l === 'id' ? 'Masuk | smartagri' : 'Sign In | smartagri' },
        { name: 'robots', content: 'noindex, nofollow' },
        {
          name: 'description',
          content: l === 'id' ? 'Masuk ke fitur internal SmartAgri untuk asisten peneliti.' : 'Sign in to the SmartAgri internal tools for research assistants.',
        },
      ],
    }
  },
})

function SignInPage() {
  const { redirect } = Route.useSearch()
  return <SignInView brand="smartagri" redirect={redirect} />
}
