import type { ComponentType } from "react";
import { useEffect } from "react";
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
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  ARCHITECTURE,
  DOCUMENTS,
  EVENT,
  EVENT_TAG,
  SHOWCASE,
  SPONSORS,
} from "../lib/exhibition";
import { categoryChip, covers, notes } from "../lib/notes";
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

type Detail = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
};

const detail: Detail[] = [
  { icon: CalendarDays, label: "Date", value: EVENT.date },
  { icon: MapPin, label: "Venue", value: EVENT.venue },
  { icon: Store, label: "Find us at", value: EVENT.booth, href: EVENT.floorPlan },
];

// Hide the Downloads section (and the hero "Get the leaflet" button) until the
// documents are ready. Flip to true once files are in place.
const SHOW_DOWNLOADS = false;

// Hand-picked Instagram posts/reels featured under News & reports, newest first.
const INSTAGRAM_POSTS = [
  "https://www.instagram.com/reel/DbVh4pKy7kg/",
  "https://www.instagram.com/reel/DbTiN0cy545/",
  "https://www.instagram.com/p/DbTRT79S2rZ/",
  "https://www.instagram.com/p/DbTQOkWSbez/",
  "https://www.instagram.com/p/DbQ5cjKhh5W/",
  "https://www.instagram.com/p/DbQ2mVkBdfE/",
  "https://www.instagram.com/p/DbNlpFThTZi/",
  "https://www.instagram.com/p/DbNlUStBkmv/",
  "https://www.instagram.com/p/DbDNn_0gW6k/",
  "https://www.instagram.com/p/DbDNayTARZ_/",
  "https://www.instagram.com/p/DbDNMHkAejj/",
  "https://www.instagram.com/p/Da167P1RkZh/",
  "https://www.instagram.com/p/Da160C5keiu/",
  "https://www.instagram.com/p/DaxlxQjgfBu/",
  "https://www.instagram.com/p/DaxlpwkARBO/",
];

// Instagram's official embed.js renders each public post/reel at its natural
// height (no clipping), then we lay them out as a tidy masonry. No access token
// or third-party service needed.
function InstagramFeed({ urls }: { urls: string[] }) {
  useEffect(() => {
    const w = window as unknown as {
      instgrm?: { Embeds: { process: () => void } };
    };
    if (w.instgrm) {
      w.instgrm.Embeds.process();
      return;
    }
    const id = "instagram-embed-js";
    const run = () => w.instgrm?.Embeds.process();
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener("load", run);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.src = "https://www.instagram.com/embed.js";
    s.addEventListener("load", run);
    document.body.appendChild(s);
  }, [urls]);

  // Row-major grid (newest reads left-to-right, top-to-bottom) inside a bounded
  // scroll box, so the section stays compact instead of stretching the page.
  return (
    <div className="relative">
      <div className="max-h-[1150px] overflow-y-auto overscroll-contain rounded-2xl pr-2 [scrollbar-color:rgba(11,100,119,0.35)_transparent] [scrollbar-width:thin]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {urls.map((url) => (
            <div key={url} className="min-w-0">
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={url}
                data-instgrm-version="14"
                style={{ margin: 0, width: "100%", minWidth: 0, maxWidth: "100%" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

function ExhibitionPage() {
  const eventNotes = notes
    .filter((note) => note.tags?.includes(EVENT_TAG))
    .slice(0, 6);

  // Featured layout: CPI larger on top, then PERTETA (left) and Hidronav (right).
  const sponsorCpi = SPONSORS.find((s) => s.name === "Cendekia Prima Inovasi");
  const sponsorPerteta = SPONSORS.find((s) => s.name === "PERTETA Yogyakarta");
  const sponsorHidronav = SPONSORS.find(
    (s) => s.name === "Hidronav Tehnikatama",
  );

  return (
    <main>
      <SiteHeader />

      {/* Hero */}
      <section className="relative bg-[#08313A] text-white overflow-hidden">
        {/* Event photo, kept behind a heavy green wash so it reads as brand
            color first and imagery second (not a raw photo hero). */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${A.inagritechHero})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[#08313A]/88" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08313A] via-[#08313A]/50 to-transparent" />
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
              {detail.map((d) => {
                const inner = (
                  <>
                    <d.icon className="w-5 h-5 text-[#45DFB1] mt-0.5 shrink-0" />
                    <div className="min-w-0">
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
                      {d.href && (
                        <div
                          className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#45DFB1]"
                          style={body}
                        >
                          View floor plan
                          <ArrowUpRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </>
                );

                return d.href ? (
                  <a
                    key={d.label}
                    href={d.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-start gap-3 hover:bg-white/10 hover:border-[#45DFB1]/40 transition-colors"
                  >
                    {inner}
                  </a>
                ) : (
                  <div
                    key={d.label}
                    className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-start gap-3"
                  >
                    {inner}
                  </div>
                );
              })}
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
              {SHOW_DOWNLOADS && (
                <a
                  href="#documents"
                  className="h-12 px-7 rounded-2xl border border-white/40 text-white text-base font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  style={body}
                >
                  <Download className="w-4 h-4" />
                  Get the leaflet
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Showcase: services */}
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
              The services we offer, <span style={accent}>live at our booth</span>
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
                <div className="w-12 h-12 rounded-2xl bg-[#0B6477] flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-[#45DFB1]" />
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

          <div className="flex justify-center mt-10">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 h-12 px-7 bg-[#0B6477] rounded-2xl text-white text-base font-medium hover:bg-[#14919B] transition-colors"
              style={body}
            >
              Explore the interactive workflow demos
              <ArrowRight className="w-4 h-4" />
            </Link>
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
          {SPONSORS.length > 0 ? (
            <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4">
              {sponsorCpi && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="w-full rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] h-40 flex items-center justify-center p-7"
                >
                  <img
                    src={sponsorCpi.logo}
                    alt={sponsorCpi.name}
                    loading="lazy"
                    className="max-h-24 max-w-full object-contain"
                  />
                </motion.div>
              )}
              <div className="grid w-full grid-cols-2 gap-4">
                {sponsorPerteta && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: 0.08, duration: 0.45, ease: "easeOut" }}
                    className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] h-28 flex items-center justify-center p-5"
                  >
                    <img
                      src={sponsorPerteta.logo}
                      alt={sponsorPerteta.name}
                      loading="lazy"
                      className="max-h-14 max-w-full object-contain"
                    />
                  </motion.div>
                )}
                {sponsorHidronav && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: 0.14, duration: 0.45, ease: "easeOut" }}
                    className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] h-28 flex items-center justify-center p-5"
                  >
                    <img
                      src={sponsorHidronav.logo}
                      alt={sponsorHidronav.name}
                      loading="lazy"
                      className="max-h-14 max-w-full object-contain"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-10 text-center">
              <p
                className="text-base md:text-lg font-normal text-neutral-500 max-w-[560px] mx-auto"
                style={body}
              >
                Sponsor and supporter logos will be announced here soon. Want to
                support smartagri at {EVENT.name}? We would love to hear from you.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Documents / downloads — hidden until content is ready */}
      {SHOW_DOWNLOADS && (
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
      )}

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
              {eventNotes.map((note, i) => (
                <Link
                  key={note.slug}
                  to="/field-notes/$slug"
                  params={{ slug: note.slug }}
                  className="group rounded-3xl bg-[#F3F7F6] overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                >
                  <div
                    className="relative h-[170px]"
                    style={{ background: covers[i % covers.length] }}
                  >
                    {note.cover ? (
                      <img
                        src={note.cover}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img src={A.iconWhite} alt="" className="h-10 w-auto opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col gap-3 flex-1">
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
                  </div>
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

          {INSTAGRAM_POSTS.length > 0 && (
            <div className="mt-16">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <h3
                  className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-neutral-900"
                  style={display}
                >
                  From our <span style={accent}>Instagram</span>
                </h3>
                <a
                  href="https://www.instagram.com/smartagri.ugm/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0B6477] font-medium hover:underline inline-flex items-center gap-1.5"
                  style={body}
                >
                  @smartagri.ugm
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
              <InstagramFeed urls={INSTAGRAM_POSTS} />
            </div>
          )}
        </div>
      </section>

      <CallToAction />
      <Footer />
    </main>
  );
}
