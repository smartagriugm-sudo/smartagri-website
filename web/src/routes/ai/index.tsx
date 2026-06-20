import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight, FileText, MessageSquare, Shield } from 'lucide-react'
import { accent, body, display } from '../../lib/fonts'
import PageHero from '../../components/PageHero'
import SiteHeader from '../../components/SiteHeader'
import Footer from '../../components/Footer'

export const Route = createFileRoute('/ai/')({
  component: AILandingPage,
  head: () => ({
    meta: [
      { title: 'AI Research Assistant | smartagri' },
      {
        name: 'description',
        content:
          'An AI-powered research assistant for SmartAgri UGM: precision agriculture Q&A, academic document generation, and data analysis.',
      },
    ],
  }),
})

const features = [
  {
    icon: MessageSquare,
    title: 'Chat Assistant',
    desc: 'Ask anything about precision agriculture research, smart farming, research methodology, and academic writing.',
    examples: [
      'What is the difference between drip and sprinkler fertigation?',
      'Help me review my research methodology',
      'Explain how an EC sensor works in a nutrient solution',
    ],
    to: '/ai/chat' as const,
    cta: 'Start Chat',
    variant: 'mint' as const,
    comingSoon: false,
  },
  {
    icon: FileText,
    title: 'Document Generator',
    desc: 'Generate drafts of activity reports, news articles, research proposals, journal abstracts, and other academic documents automatically.',
    examples: [
      'Field visit activity report',
      'Research proposal draft',
      'Scientific journal abstract',
    ],
    to: '/ai/generate' as const,
    cta: 'Create Document',
    variant: 'teal' as const,
    comingSoon: true,
  },
]

function AILandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="flex-1 bg-[#F3F7F6]">
        <div className="mx-auto max-w-[1360px] px-6 pt-14 pb-16 md:px-12 md:pt-20 md:pb-20">
          <PageHero
            eyebrow="AI Assistant"
            title={
              <>
                AI <span style={accent}>Research Assistant</span>
              </>
            }
            subtitle="An AI-powered research assistant for SmartAgri UGM. Ask about precision agriculture research, generate academic documents automatically, and get help analyzing your data."
          />

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                className={`flex flex-col gap-5 rounded-3xl border border-[#0B6477]/10 bg-white p-7 md:p-8 ${
                  feature.comingSoon ? 'opacity-80' : ''
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    feature.comingSoon ? 'bg-[#0B6477]/40' : 'bg-[#0B6477]'
                  }`}
                >
                  <feature.icon className="h-6 w-6 text-[#45DFB1]" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-xl font-semibold tracking-[-0.02em] text-neutral-900 md:text-2xl"
                      style={display}
                    >
                      {feature.title}
                    </h2>
                    {feature.comingSoon && (
                      <span
                        className="rounded-full bg-[#0B6477]/10 px-2.5 py-1 text-xs font-medium text-[#0B6477]"
                        style={body}
                      >
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm leading-relaxed text-neutral-500 md:text-base"
                    style={body}
                  >
                    {feature.desc}
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  {feature.examples.map((example) => (
                    <li
                      key={example}
                      className="flex items-start gap-2.5 text-sm text-neutral-600"
                      style={body}
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#45DFB1]" />
                      {example}
                    </li>
                  ))}
                </ul>
                {feature.comingSoon ? (
                  <span
                    className="mt-auto inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#0B6477]/10 px-6 py-3 text-base font-medium text-[#0B6477]/70"
                    style={body}
                  >
                    Coming soon
                  </span>
                ) : (
                  <Link
                    to={feature.to}
                    className={
                      feature.variant === 'mint'
                        ? 'mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#45DFB1] px-6 py-3 text-base font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99]'
                        : 'mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0B6477] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#14919B]'
                    }
                    style={body}
                  >
                    {feature.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
            className="mt-8 flex items-center justify-center gap-2.5 text-center"
          >
            <Shield className="h-4 w-4 shrink-0 text-[#0B6477]" />
            <p className="text-xs text-neutral-500 md:text-sm" style={body}>
              Powered by open-source AI (Qwen) via Ollama, running on the SmartAgri
              UGM server. Your data is not sent to third parties.
            </p>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
