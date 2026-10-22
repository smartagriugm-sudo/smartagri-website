import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { IF_NOTES, IF_PUBLICATIONS } from "../lib/indoor-farming-knowledge";
import SiteHeader from "../components/SiteHeader";
import IndoorFarmingNav from "../components/IndoorFarmingNav";
import IndoorFarmingCrumb from "../components/IndoorFarmingCrumb";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { EASE, MaskLine, META, NoteCard } from "../components/NoteParts";
import { Eyebrow, fadeUp } from "../components/IndoorFarmingParts";

export const Route = createFileRoute("/indoor-farming_/knowledge")({
  component: IndoorFarmingKnowledge,
  head: () => ({
    meta: [
      { title: "Knowledge · Indoor Farming | smartagri" },
      {
        name: "description",
        content:
          "Field notes, trials, and publications on controlled-environment agriculture in the tropics from the Smart Agriculture Research Center, Universitas Gadjah Mada.",
      },
    ],
  }),
});

// Knowledge on controlled-environment growing: the related field notes
// (filterable by category, nine at a time), the center's papers on
// greenhouses, hydroponics and plant factories, and the landing call to action.

const PAGE = 9;
const PAPERS_SHOWN = 8;

const CATEGORIES = [
  "All",
  ...Array.from(new Set(IF_NOTES.map((n) => n.category))).sort(),
];

function IndoorFarmingKnowledge() {
  const [category, setCategory] = useState("All");
  const [limit, setLimit] = useState(PAGE);
  const [allPapers, setAllPapers] = useState(false);
  const filtered = category === "All" ? IF_NOTES : IF_NOTES.filter((n) => n.category === category);
  const shown = filtered.slice(0, limit);
  const papers = allPapers ? IF_PUBLICATIONS : IF_PUBLICATIONS.slice(0, PAPERS_SHOWN);

  const figures = [
    { value: IF_NOTES.length, label: "Field notes" },
    { value: IF_PUBLICATIONS.length, label: "Papers" },
  ].filter((f) => f.value > 0);

  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader subnav={<IndoorFarmingNav />} />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={7} />
          <div className="relative">
            {/* Masthead */}
            <section className="mx-auto max-w-[1360px] px-6 pb-14 pt-12 md:px-12 md:pb-16 md:pt-16">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <IndoorFarmingCrumb current="Knowledge" />
              </motion.div>
              <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
                <motion.h1
                  initial="hidden"
                  animate="show"
                  className="text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px] lg:col-span-8"
                  style={display}
                >
                  <MaskLine delay={0}>What we are learning,</MaskLine>
                  <MaskLine delay={0.12}>
                    as we <span style={accent}>learn it.</span>
                  </MaskLine>
                </motion.h1>
                <div className="lg:col-span-4">
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                    className="text-base leading-relaxed text-neutral-600 md:text-lg"
                    style={body}
                  >
                    Trials, installations, and training from our greenhouses and plant factory,
                    written up as they happen, alongside the papers behind them.
                  </motion.p>
                  {figures.length > 0 && (
                    <div className="mt-6 flex gap-8">
                      {figures.map((f, i) => (
                        <motion.div
                          key={f.label}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: EASE }}
                        >
                          <span
                            className="block text-4xl font-semibold leading-none tracking-[-0.035em] text-neutral-900"
                            style={display}
                          >
                            {f.value}
                          </span>
                          <span className={`mt-2 block text-neutral-400 ${META}`} style={body}>
                            {f.label}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Field notes */}
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-24">
                {IF_NOTES.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#0B6477]/25 bg-white p-10 text-center">
                    <p className="mx-auto max-w-[520px] text-base text-neutral-500" style={body}>
                      Articles on controlled-environment growing will appear here as they are
                      published. In the meantime, browse all of our field notes.
                    </p>
                    <Link
                      to="/field-notes"
                      className="group mt-6 inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
                      style={body}
                    >
                      All field notes
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <Eyebrow>Field notes</Eyebrow>
                        <motion.h2
                          initial="hidden"
                          whileInView="show"
                          viewport={{ once: true, amount: 0.6 }}
                          className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                          style={display}
                        >
                          <MaskLine delay={0}>From the greenhouse</MaskLine>
                          <MaskLine delay={0.1}>
                            <span style={accent}>and the plant factory.</span>
                          </MaskLine>
                        </motion.h2>
                      </div>
                      <motion.div {...fadeUp(0.2)}>
                        <Link
                          to="/field-notes"
                          className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                          style={body}
                        >
                          All field notes
                          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                      </motion.div>
                    </div>

                    {CATEGORIES.length > 2 && (
                      <div className="mb-10 flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
                        {CATEGORIES.map((c) => {
                          const on = c === category;
                          const count = c === "All" ? IF_NOTES.length : IF_NOTES.filter((n) => n.category === c).length;
                          return (
                            <button
                              key={c}
                              type="button"
                              role="tab"
                              aria-selected={on}
                              onClick={() => {
                                setCategory(c);
                                setLimit(PAGE);
                              }}
                              className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                on
                                  ? "border-transparent text-white"
                                  : "border-[#0B6477]/15 bg-white/70 text-neutral-700 hover:border-[#0B6477]/40"
                              }`}
                              style={body}
                            >
                              {on && (
                                <motion.span
                                  layoutId="if-knowledge-pill"
                                  className="absolute inset-0 rounded-full bg-[#08313A]"
                                  transition={{ duration: 0.45, ease: EASE }}
                                />
                              )}
                              <span className="relative">
                                {c}
                                <span className={on ? "text-white/60" : "text-neutral-400"}> {count}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                      >
                        {shown.map((note, i) => (
                          <motion.div
                            key={note.slug}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.15 }}
                            transition={{ delay: (i % 3) * 0.08, duration: 0.7, ease: EASE }}
                          >
                            <NoteCard note={note} index={i} />
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>

                    {filtered.length > limit && (
                      <div className="mt-12 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setLimit((l) => l + PAGE)}
                          className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
                          style={body}
                        >
                          Load more
                          <span className="text-white/50">{filtered.length - limit}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Papers */}
            {IF_PUBLICATIONS.length > 0 && (
              <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <Eyebrow>Publications</Eyebrow>
                    <motion.h2
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.6 }}
                      className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                      style={display}
                    >
                      <MaskLine delay={0}>The science</MaskLine>
                      <MaskLine delay={0.1}>
                        <span style={accent}>underneath.</span>
                      </MaskLine>
                    </motion.h2>
                  </div>
                  <motion.p
                    {...fadeUp(0.2)}
                    className="max-w-[460px] text-base leading-relaxed text-neutral-500 md:text-lg"
                    style={body}
                  >
                    Our papers on greenhouses, hydroponics, plant factories, and climate control,
                    newest first.
                  </motion.p>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-[#0B6477]/12 bg-white/85 backdrop-blur">
                  <div
                    className={`hidden grid-cols-[72px_minmax(0,1fr)_minmax(0,0.45fr)_80px] gap-6 border-b border-[#0B6477]/10 px-6 py-4 text-neutral-400 md:grid ${META}`}
                    style={body}
                  >
                    <span>Year</span>
                    <span>Title</span>
                    <span>Journal</span>
                    <span className="text-right">Cited by</span>
                  </div>
                  <ul>
                    {papers.map((pub, i) => (
                      <motion.li
                        key={pub.slug}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.5, ease: EASE }}
                        className="border-b border-[#0B6477]/8 last:border-b-0"
                      >
                        <Link
                          to="/publications/$slug"
                          params={{ slug: pub.slug }}
                          className="group grid gap-1.5 px-6 py-5 transition-colors hover:bg-[#F3F7F6] md:grid-cols-[72px_minmax(0,1fr)_minmax(0,0.45fr)_80px] md:items-center md:gap-6"
                        >
                          <span className="text-sm tabular-nums text-neutral-400" style={body}>
                            {pub.year}
                          </span>
                          <span
                            className="flex items-start gap-2 text-[15px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-[#0B6477]"
                            style={display}
                          >
                            {pub.title}
                            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#14919B] opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                          <span className="truncate text-sm text-neutral-500" style={body}>
                            {pub.venue}
                          </span>
                          <span className="text-sm tabular-nums text-neutral-500 md:text-right" style={body}>
                            <span className="md:hidden">Cited by </span>
                            {pub.citations ?? 0}
                          </span>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
                  {IF_PUBLICATIONS.length > PAPERS_SHOWN && (
                    <button
                      type="button"
                      onClick={() => setAllPapers((v) => !v)}
                      className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
                      style={body}
                    >
                      {allPapers ? "Show fewer" : `Show all ${IF_PUBLICATIONS.length}`}
                    </button>
                  )}
                  <Link
                    to="/publications"
                    className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                    style={body}
                  >
                    All publications
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </section>
            )}

            <CallToAction />
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}
