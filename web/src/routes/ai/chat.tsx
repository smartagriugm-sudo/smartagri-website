import { createFileRoute } from '@tanstack/react-router'
import SiteHeader from '../../components/SiteHeader'
import ChatInterface from '../../components/ai/ChatInterface'

const WELCOME_MESSAGE =
  'Ask about precision agriculture research, smart farming, methodology, data analysis, or academic writing. You can also attach a text file for context.'

export const Route = createFileRoute('/ai/chat')({
  component: AIChatPage,
  head: () => ({
    meta: [
      { title: 'AI Research Assistant | smartagri' },
      {
        name: 'description',
        content:
          'SmartAgri UGM AI research assistant for questions on precision agriculture, academic writing, and data analysis.',
      },
    ],
  }),
})

function AIChatPage() {
  return (
    <main>
      <SiteHeader />
      <ChatInterface welcomeMessage={WELCOME_MESSAGE} />
    </main>
  )
}
