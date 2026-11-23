import { createFileRoute } from '@tanstack/react-router'
import SiteHeader from '../../components/SiteHeader'
import ChatInterface from '../../components/ai/ChatInterface'
import { headLang } from '../../lib/i18n'

export const Route = createFileRoute('/ai/chat')({
  component: AIChatPage,
  head: ({ matches }) => {
    const l = headLang(matches)
    return {
      meta: [
        { title: l === 'id' ? 'Asisten Riset AI | smartagri' : 'AI Research Assistant | smartagri' },
        {
          name: 'description',
          content:
            l === 'id'
              ? 'Asisten riset AI SmartAgri UGM untuk pertanyaan seputar pertanian presisi, penulisan akademik, dan analisis data.'
              : 'SmartAgri UGM AI research assistant for questions on precision agriculture, academic writing, and data analysis.',
        },
      ],
    }
  },
})

function AIChatPage() {
  return (
    <main>
      <SiteHeader />
      <ChatInterface />
    </main>
  )
}
