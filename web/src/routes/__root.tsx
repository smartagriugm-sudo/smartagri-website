import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { AuthProvider } from '../lib/auth/auth'
import { LangProvider, readLang } from '../lib/i18n'
import PageCurtain from '../components/PageCurtain'
import appCss from '../styles.css?url'

const SITE_DESC = {
  en: 'Smart Agriculture Research Center unites AI, IoT sensing, and agronomy to help farmers monitor crops, predict yields, and grow more sustainably.',
  id: 'Smart Agriculture Research Center UGM memadukan AI, sensor IoT, dan agronomi untuk membantu petani memantau tanaman, memprediksi hasil panen, dan bertani lebih berkelanjutan.',
}

export const Route = createRootRoute({
  // The visitor's language (cookie, else Accept-Language); see lib/i18n.tsx.
  loader: () => ({ lang: readLang() }),
  head: ({ loaderData }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'smartagri: sense. analyze. grow.',
      },
      {
        name: 'description',
        content: SITE_DESC[loaderData?.lang ?? 'en'],
      },
      {
        property: 'og:title',
        content: 'smartagri: sense. analyze. grow.',
      },
      {
        property: 'og:description',
        content: SITE_DESC[loaderData?.lang ?? 'en'],
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '96x96',
        href: '/favicon-96.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const lang = Route.useLoaderData()?.lang ?? 'en'
  return (
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body>
        <LangProvider initial={lang}>
          <AuthProvider>{children}</AuthProvider>
        </LangProvider>
        <PageCurtain />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
