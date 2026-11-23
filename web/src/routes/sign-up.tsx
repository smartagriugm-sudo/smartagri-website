import { createFileRoute } from '@tanstack/react-router'
import SignUpView from '../components/auth/SignUpView'
import { safeRedirect } from '../lib/auth/redirects'
import { headLang } from '../lib/i18n'

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: safeRedirect(search.redirect) }),
  component: SignUpPage,
  head: ({ matches }) => {
    const l = headLang(matches)
    return {
      meta: [
        { title: l === 'id' ? 'Daftar | smartagri' : 'Sign Up | smartagri' },
        { name: 'robots', content: 'noindex, nofollow' },
        {
          name: 'description',
          content: l === 'id' ? 'Daftar untuk memakai fitur internal SmartAgri bagi asisten peneliti.' : 'Register for the SmartAgri internal tools for research assistants.',
        },
      ],
    }
  },
})

function SignUpPage() {
  const { redirect } = Route.useSearch()
  return <SignUpView brand="smartagri" redirect={redirect} />
}
