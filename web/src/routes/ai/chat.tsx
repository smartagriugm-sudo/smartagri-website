import { createFileRoute } from '@tanstack/react-router'
import SiteHeader from '../../components/SiteHeader'
import ChatInterface from '../../components/ai/ChatInterface'

const WELCOME_MESSAGE =
  "Hi! I'm the SmartAgri SARC UGM AI Research Assistant. I can help with questions on precision agriculture research, academic writing, data analysis, and more. How can I help you today?"

export const Route = createFileRoute('/ai/chat')({
  component: AIChatPage,
  head: () => ({
    meta: [
      { title: 'AI Research Assistant | smartagri' },
      {
        name: 'description',
        content:
          'SmartAgri SARC UGM AI research assistant for questions on precision agriculture, academic writing, and data analysis.',
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
