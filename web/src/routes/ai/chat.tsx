import { createFileRoute } from '@tanstack/react-router'
import SiteHeader from '../../components/SiteHeader'
import ChatInterface from '../../components/ai/ChatInterface'

const WELCOME_MESSAGE =
  'Halo! Saya AI Research Assistant SmartAgri SARC UGM. Saya siap membantu kamu dengan pertanyaan seputar riset pertanian presisi, penulisan akademik, analisis data, dan topik lainnya. Apa yang bisa saya bantu hari ini?'

export const Route = createFileRoute('/ai/chat')({
  component: AIChatPage,
  head: () => ({
    meta: [
      { title: 'AI Research Assistant | smartagri' },
      {
        name: 'description',
        content:
          'Asisten riset AI SmartAgri SARC UGM untuk pertanyaan seputar pertanian presisi, penulisan akademik, dan analisis data.',
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
