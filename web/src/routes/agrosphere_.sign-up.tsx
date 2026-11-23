import { createFileRoute } from '@tanstack/react-router'
import SignUpView from '../components/auth/SignUpView'
import { safeRedirect } from '../lib/auth/redirects'
import { A } from '../lib/assets'
import { headLang } from '../lib/i18n'

// agrosphere's own page, outside the /agrosphere layout (the trailing _ in the
// file name), so it is not behind the gate it leads to.
export const Route = createFileRoute('/agrosphere_/sign-up')({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: safeRedirect(search.redirect) }),
  component: AgrosphereSignUpPage,
  head: ({ matches }) => {
    const id = headLang(matches) === 'id'
    return {
      meta: [
        { title: id ? 'Minta Akses | agrosphere' : 'Request Access | agrosphere' },
        { name: 'robots', content: 'noindex, nofollow' },
        {
          name: 'description',
          content: id
            ? 'Ajukan akun mitra untuk agrosphere, dashboard smartagri.'
            : 'Request a partner account for agrosphere, the smartagri dashboards.',
        },
      ],
      links: [{ rel: 'icon', type: 'image/svg+xml', href: A.agrosphereIcon }],
    }
  },
})

function AgrosphereSignUpPage() {
  const { redirect } = Route.useSearch()
  return <SignUpView brand="agrosphere" redirect={redirect} />
}
