import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileText,
  MapPin,
  Store,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import {
  ARCHITECTURE,
  DOCUMENTS,
  EVENT,
  EVENT_TAG,
  SHOWCASE,
  SPONSORS,
} from "../lib/exhibition";
import { categoryChip, notes } from "../lib/notes";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import CallToAction from "../components/CallToAction";

export const Route = createFileRoute("/exhibition")({
  component: ExhibitionPage,
  head: () => ({
    meta: [
      { title: `${EVENT.name} | smartagri` },
      {
        name: "description",
        content: `Meet smartagri at ${EVENT.name}. See our products and services, demo system architecture, sponsors, downloadable documents, and live event updates.`,
      },
    ],
  }),
});

const detail = [
  { icon: CalendarDays, label: "Date", value: EVENT.date },
  { icon: MapPin, label: "Venue", value: EVENT.venue },
  { icon: Store, label: "Find us at", value: EVENT.booth },
];

function ExhibitionPage() {
  const eventNotes = notes
    .filter((note) => note.tags?.includes(EVENT_TAG))
    .slice(0, 6);

  return (
    <main>
      <SiteHeader />

      {/* Hero */}
      <section className="relative bg-[#08313A] text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#14919B]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#45DFB1]/20 blur-3xl" />
        <div className="relative max-w-[1360px] mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-14 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[820px]"
          >
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#45DFB1] mb-4"
              style={body}
            >
              Exhibition
            </div>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.05]"
              style={display}
            >
              Meet smartagri at <span style={{ ...accent, color: "#45DFB1" }}>{EVENT.name}</span>
            </h1>
            <p
              className="text-base md:text-lg font-normal text-white/75 leading-relaxed mt-6 max-w-[620px]"
              style={body}
            >
              {EVENT.tagline} Come see our products and services, explore a live
              demo of our field-to-farmer system, and talk with the researchers
              behind smartagri.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mt-10">
              {detail.map((d) => (
                <div
                  key={d.label}
                  className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-start gap-3"
                >
                  <d.icon className="w-5 h-5 text-[#45DFB1] mt-0.5 shrink-0" />
                  <div>
                    <div
                      className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/50"
                      style={body}
                    >
                      {d.label}
                    </div>
                    <div
                      className="text-sm font-normal text-white/90 leading-relaxed"
                      style={body}
                    >
                      {d.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/contact-us"
                className="h-12 px-7 bg-[#45DFB1] rounded-2xl text-[#0B2A22] text-base font-medium hover:bg-[#80ED99] transition-colors flex items-center justify-center gap-2"
                style={body}
              >
                Contact us
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#documents"
                className="h-12 px-7 rounded-2xl border border-white/40 text-white text-base font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                style={body}
              >
                <Download className="w-4 h-4" />
                Get the leaflet
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Showcase: products & services */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              What we're showcasing
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900 max-w-[760px]"
              style={display}
            >
              Products and services, <span style={accent}>live at our booth</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SHOWCASE.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: (i % 3) * 0.1, duration: 0.5, ease: "easeOut" }}
                className="rounded-3xl bg-[#F3F7F6] p-7 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-[#45DFB1]" />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.kind === "Product"
                        ? "bg-[#0B6477] text-white"
                        : "bg-[#45DFB1] text-[#0B2A22]"
                    }`}
                    style={body}
                  >
                    {item.kind}
                  </span>
                </div>
                <h3
                  className="text-lg md:text-xl font-medium text-neutral-900 leading-snug"
                  style={display}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed"
                  style={body}
                >
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo system architecture */}
      <section className="bg-[#F3F7F6]">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="text-center mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              Live demo
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
              style={display}
            >
              How the system works, <span style={accent}>field to farmer</span>
            </h2>
            <p
              className="text-base md:text-lg font-normal text-neutral-500 max-w-[620px] mx-auto mt-4"
              style={body}
            >
              A walk-through of the smartagri stack on display, so you can follow
              the data from the soil all the way to a decision on a phone.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch gap-4">
            {ARCHITECTURE.map((stage, i) => (
              <div key={stage.title} className="contents">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
                  className="flex-1 rounded-3xl bg-white border border-[#0B6477]/10 p-6 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#0B6477] flex items-center justify-center shrink-0">
                      <stage.icon className="w-5 h-5 text-[#45DFB1]" />
                    </div>
                    <div
                      className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#14919B]"
                      style={body}
                    >
                      Layer {i + 1}
                    </div>
                  </div>
                  <h3
                    className="text-lg font-medium text-neutral-900"
                    style={display}
                  >
                    {stage.title}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {stage.components.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-sm font-normal text-neutral-600"
                        style={body}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#45DFB1] mt-2 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </motion.div>
                {i < ARCHITECTURE.length - 1 && (
                  <div className="flex items-center justify-center text-[#0B6477]">
                    <ArrowRight className="hidden lg:block w-6 h-6" />
                    <ArrowRight className="lg:hidden w-6 h-6 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="text-center mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              Sponsors & supporters
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
              style={display}
            >
              Made possible <span style={accent}>together</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {SPONSORS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: (i % 6) * 0.06, duration: 0.45, ease: "easeOut" }}
                className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] h-28 flex items-center justify-center p-5"
              >
                <img
                  src={s.logo}
                  alt={s.name}
                  loading="lazy"
                  className="max-h-14 max-w-full object-contain"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Documents / downloads */}
      <section id="documents" className="bg-[#F3F7F6] scroll-mt-24">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="mb-12">
            <div
              className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
              style={body}
            >
              Downloads
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900 max-w-[760px]"
              style={display}
            >
              Documents you can <span style={accent}>take with you</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOCUMENTS.map((doc, i) => (
              <motion.div
                key={doc.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: (i % 3) * 0.1, duration: 0.5, ease: "easeOut" }}
                className="rounded-3xl bg-white border border-[#0B6477]/10 p-7 flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#45DFB1]" />
                </div>
                <h3
                  className="text-lg md:text-xl font-medium text-neutral-900 leading-snug"
                  style={display}
                >
                  {doc.title}
                </h3>
                <p
                  className="text-sm md:text-base font-normal text-neutral-500 leading-relaxed flex-1"
                  style={body}
                >
                  {doc.desc}
                </p>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[#0B6477] font-medium hover:underline"
                    style={body}
                  >
                    <Download className="w-4 h-4" />
                    Download{doc.meta ? ` (${doc.meta})` : ""}
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-2 text-neutral-400 font-medium"
                    style={body}
                  >
                    <Download className="w-4 h-4" />
                    Coming soon
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* News, daily reports, after report */}
      <section className="bg-white">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <div
                className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
                style={body}
              >
                News & reports
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
                style={display}
              >
                Updates from the <span style={accent}>show floor</span>
              </h2>
            </div>
            <Link
              to="/field-notes"
              className="text-[#0B6477] font-medium hover:underline inline-flex items-center gap-1.5"
              style={body}
            >
              All field notes
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {eventNotes.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventNotes.map((note) => (
                <Link
                  key={note.slug}
                  to="/field-notes/$slug"
                  params={{ slug: note.slug }}
                  className="group rounded-3xl bg-[#F3F7F6] p-6 flex flex-col gap-3 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryChip(note.category)}`}
                      style={body}
                    >
                      {note.category}
                    </span>
                    <span
                      className="text-sm font-normal text-neutral-400"
                      style={body}
                    >
                      {note.date}
                    </span>
                  </div>
                  <h3
                    className="text-lg font-medium text-neutral-900 leading-snug group-hover:text-[#0B6477] transition-colors"
                    style={display}
                  >
                    {note.title}
                  </h3>
                  <p
                    className="text-sm font-normal text-neutral-500 leading-relaxed line-clamp-3"
                    style={body}
                  >
                    {note.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-10 text-center">
              <p
                className="text-base md:text-lg font-normal text-neutral-500 max-w-[560px] mx-auto"
                style={body}
              >
                News, daily reports, and the after-event report will appear here
                during {EVENT.name}. Follow along as we post updates from the
                show floor.
              </p>
            </div>
          )}
        </div>
      </section>

      <CallToAction />
      <Footer />
    </main>
  );
}
