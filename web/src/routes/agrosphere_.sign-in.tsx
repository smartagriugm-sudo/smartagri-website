import { createFileRoute } from '@tanstack/react-router'
import SignInView from '../components/auth/SignInView'
import { safeRedirect } from '../lib/auth/redirects'
import { A } from '../lib/assets'
import { headLang } from '../lib/i18n'

// agrosphere's own page, outside the /agrosphere layout (the trailing _ in the
// file name), so it is not behind the gate it leads to.
export const Route = createFileRoute('/agrosphere_/sign-in')({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: safeRedirect(search.redirect) }),
  component: AgrosphereSignInPage,
  head: ({ matches }) => {
    const id = headLang(matches) === 'id'
    return {
      meta: [
        { title: id ? 'Masuk | agrosphere' : 'Sign In | agrosphere' },
        { name: 'robots', content: 'noindex, nofollow' },
        {
          name: 'description',
          content: id
            ? 'Masuk ke agrosphere, dashboard smartagri untuk peneliti dan mitra.'
            : 'Sign in to agrosphere, the smartagri dashboards for researchers and partners.',
        },
      ],
      links: [{ rel: 'icon', type: 'image/svg+xml', href: A.agrosphereIcon }],
    }
  },
})

function AgrosphereSignInPage() {
  const { redirect } = Route.useSearch()
  return <SignInView brand="agrosphere" redirect={redirect} />
}
