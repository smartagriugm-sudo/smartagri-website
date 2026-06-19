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
          'Asisten riset berbasis AI untuk SmartAgri SARC UGM: tanya jawab riset pertanian presisi, pembuatan dokumen akademik, dan analisis data.',
      },
    ],
  }),
})

const features = [
  {
    icon: MessageSquare,
    title: 'Chat Assistant',
    desc: 'Tanya jawab langsung seputar riset pertanian presisi, smart farming, metodologi penelitian, dan penulisan akademik.',
    examples: [
      'Apa perbedaan fertigasi drip dan sprinkler?',
      'Bantu review metodologi penelitian saya',
      'Jelaskan cara kerja sensor EC pada larutan nutrisi',
    ],
    to: '/ai/chat' as const,
    cta: 'Mulai Chat',
    variant: 'mint' as const,
  },
  {
    icon: FileText,
    title: 'Document Generator',
    desc: 'Generate draft laporan kegiatan, artikel berita, proposal penelitian, abstrak jurnal, dan dokumen akademik lainnya secara otomatis.',
    examples: [
      'Laporan kegiatan field visit',
      'Draft proposal penelitian',
      'Abstrak jurnal ilmiah',
    ],
    to: '/ai/generate' as const,
    cta: 'Buat Dokumen',
    variant: 'teal' as const,
  },
]

function AILandingPage() {
  return (
    <main>
      <SiteHeader />
      <section className="bg-[#F3F7F6]">
        <div className="mx-auto max-w-[1360px] px-6 pt-14 pb-16 md:px-12 md:pt-20 md:pb-20">
          <PageHero
            eyebrow="AI Assistant"
            title={
              <>
                AI <span style={accent}>Research Assistant</span>
              </>
            }
            subtitle="Asisten riset berbasis AI untuk SmartAgri SARC UGM. Tanya jawab seputar riset pertanian presisi, buat dokumen akademik otomatis, dan bantu analisis data, semuanya dalam Bahasa Indonesia."
          />

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                className="flex flex-col gap-5 rounded-3xl border border-[#0B6477]/10 bg-white p-7 md:p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B6477]">
                  <feature.icon className="h-6 w-6 text-[#45DFB1]" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2
                    className="text-xl font-semibold tracking-[-0.02em] text-neutral-900 md:text-2xl"
                    style={display}
                  >
                    {feature.title}
                  </h2>
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
              Powered by open-source AI (Qwen) via Ollama, berjalan di server SARC
              UGM. Data tidak dikirim ke pihak ketiga.
            </p>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
