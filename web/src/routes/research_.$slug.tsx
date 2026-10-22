import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { researchPhoto, researchPhotoAlt } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS, RESEARCH_KEYWORDS, findResearchArea } from "../lib/research";
import { notes } from "../lib/notes";
import { PUBLICATIONS } from "../lib/publications";
import { STUDY_KIND, evidenceFor } from "../lib/research-evidence";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import CallToAction from "../components/CallToAction";
import { PhotoPair } from "../components/ResearchPhotos";
import { EASE, MaskLine, META, NoteCard } from "../components/NoteParts";
import { EvidenceHeading, EvidenceStats, ProjectGrid, StudyList } from "../components/ResearchEvidence";

export const Route = createFileRoute("/research_/$slug")({
  component: ResearchDetailPage,
  // Return only the slug (serializable). The area object holds an `icon`
  // component (a function), which can't be serialized to the client, so we
  // resolve the full area from the slug inside the component/head instead.
  loader: ({ params }) => ({ slug: params.slug }),
  head: ({ loaderData }) => {
    const area = loaderData ? findResearchArea(loaderData.slug) : undefined;
    return {
      meta: [
        { title: `${area?.label ?? "Research"} | smartagri` },
        ...(area ? [{ name: "description", content: area.overview.slice(0, 160) }] : []),
      ],
    };
  },
});

// One research area, laid out after the Blitz service page: back / next
// links, a split masthead with photos, a dark overview band, headline results,
// what we do, the center's projects and the student theses behind the area
// (lib/research-evidence.ts), the area in practice (field notes and papers
// that mention it), the other areas, and the landing CTA.


// Whole-word, case-insensitive match against any of the area's keywords.
function matcher(slug: string) {
  const words = RESEARCH_KEYWORDS[slug] ?? [];
  if (!words.length) return () => false;
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
  return (text: string) => re.test(text);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { delay, duration: 0.6, ease: EASE },
});

function SectionLabel({ children, tone = "light" }: { children: string; tone?: "light" | "dark" }) {
  return (
    <p
      className={`flex items-center gap-2 ${META} ${tone === "dark" ? "text-[#45DFB1]" : "text-[#14919B]"}`}
      style={body}
    >
      <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
      {children}
    </p>
  );
}

function ResearchDetailPage() {
  const { slug } = Route.useLoaderData();
  const area = findResearchArea(slug);

  if (!area) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900" style={display}>
              Research area not found
            </h1>
            <Link
              to="/research"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              Back to Research
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const index = RESEARCH_AREAS.findIndex((a) => a.slug === area.slug);
  const next = RESEARCH_AREAS[(index + 1) % RESEARCH_AREAS.length];
  const others = RESEARCH_AREAS.filter((a) => a.slug !== area.slug);
  const matches = matcher(area.slug);
  const relatedNotes = notes.filter((n) => matches(`${n.title} ${n.excerpt}`)).slice(0, 3);
  const relatedPapers = PUBLICATIONS.filter((p) => matches(p.title)).slice(0, 4);
  const evidence = evidenceFor(area.slug);
  const levels = (["Undergraduate", "Master's", "Doctoral"] as const)
    .map((l) => ({ l, n: evidence.studies.filter((s) => s.level === l).length }))
    .filter((x) => x.n > 0);

  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={6} />
        <div className="relative" key={area.slug}>
          {/* Back / next */}
          <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 border-b border-[#0B6477]/10 px-6 pb-4 pt-8 md:px-12">
            <Link
              to="/research"
              className={`group inline-flex items-center gap-2 text-neutral-600 hover:text-[#0B6477] ${META}`}
              style={body}
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              All research
            </Link>
            <Link
              to="/research/$slug"
              params={{ slug: next.slug }}
              className={`group inline-flex items-center gap-2 text-right text-neutral-600 hover:text-[#0B6477] ${META}`}
              style={body}
            >
              <span>
                <span className="hidden sm:inline">Next: </span>
                {next.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Masthead */}
          <section className="mx-auto grid max-w-[1360px] gap-12 px-6 pb-20 pt-12 md:px-12 md:pb-28 md:pt-16 lg:grid-cols-12 lg:items-center lg:gap-14">
            <div className="lg:col-span-7">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <p className={`flex items-center gap-2 text-[#14919B] ${META}`} style={body}>
                  <area.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  Research area
                </p>
              </motion.div>
              <motion.h1
                initial="hidden"
                animate="show"
                className="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px]"
                style={display}
              >
                <MaskLine delay={0.05}>{area.label}</MaskLine>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
                className="mt-6 max-w-[600px] text-lg leading-relaxed text-neutral-600 md:text-xl"
                style={body}
              >
                {area.desc}
              </motion.p>
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } } }}
                className="mt-7 flex flex-wrap gap-2"
              >
                {area.technologies.map((t) => (
                  <motion.li
                    key={t}
                    variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                  >
                    <Link
                      to="/technology"
                      className="inline-flex rounded-full border border-[#0B6477]/15 bg-white/80 px-3 py-1.5 text-[13px] text-[#0B6477] transition-colors hover:border-[#14919B] hover:bg-[#F3F7F6]"
                      style={body}
                    >
                      {t}
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                className="mt-9 flex flex-wrap items-center gap-5"
              >
                <Link
                  to="/contact-us"
                  hash="inquiry"
                  className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
                  style={body}
                >
                  Start a project
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#what-we-do"
                  className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                  style={body}
                >
                  See what we do
                  <ArrowRight className="h-4 w-4 rotate-90 transition-transform group-hover:translate-y-0.5" />
                </a>
                {area.slug === "indoor-farming-technology" && (
                  <Link
                    to="/indoor-farming"
                    className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                    style={body}
                  >
                    Indoor Farming section
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                )}
              </motion.div>
            </div>
            <div className="lg:col-span-5">
              <PhotoPair
                main={researchPhoto[area.slug]}
                second={researchPhotoAlt[area.slug]}
                side="right"
                label={area.label}
              />
            </div>
          </section>

          {/* Overview band */}
          <section className="mx-auto max-w-[1360px] px-6 md:px-12">
            <motion.div
              {...fadeUp()}
              data-header-theme="dark"
              className="relative grid gap-10 overflow-clip rounded-[32px] bg-[#08313A] px-6 py-14 text-white md:px-14 md:py-16 lg:grid-cols-12"
            >
              <div className="pointer-events-none absolute -left-24 -top-24 h-[360px] w-[360px] rounded-full bg-[#14919B]/30 blur-3xl animate-wash-b" />
              <div className="relative lg:col-span-7">
                <SectionLabel tone="dark">Overview</SectionLabel>
                <p className="mt-6 text-2xl font-medium leading-snug tracking-[-0.02em] md:text-[32px]" style={display}>
                  {area.overview}
                </p>
              </div>
              <div className="relative border-t border-white/15 pt-6 lg:col-span-4 lg:col-start-9 lg:self-end">
                <p className={`text-[#45DFB1] ${META}`} style={body}>
                  Our approach
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-white/75" style={body}>
                  Every project starts in the field: we sense what is happening, model what it
                  means, and turn the result into decisions farmers and operators can act on.
                </p>
              </div>
            </motion.div>
          </section>

          {/* Why it matters */}
          <section className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <SectionLabel>Why it matters</SectionLabel>
                <motion.h2
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.6 }}
                  className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                  style={display}
                >
                  <MaskLine delay={0}>What changes</MaskLine>
                  <MaskLine delay={0.1}>
                    <span style={accent}>in the field.</span>
                  </MaskLine>
                </motion.h2>
              </div>
              <div className="flex flex-col gap-5 lg:col-span-8">
                <EvidenceStats stats={evidence.highlights} />
                {/* Outcomes in words only when there are no headline figures. */}
                {evidence.highlights.length === 0 && (
              <div className="grid gap-px overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-[#0B6477]/12 sm:grid-cols-2">
                  {area.outcomes.map((o, i) => (
                    <motion.div
                      key={o}
                      {...fadeUp(i * 0.08)}
                      // An odd last item spans the row so no empty cell shows.
                      className={`group flex gap-4 bg-white/90 p-6 transition-colors duration-300 hover:bg-[#08313A] md:p-7 ${
                        area.outcomes.length % 2 === 1 && i === area.outcomes.length - 1 ? "sm:col-span-2" : ""
                      }`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3F7F6] text-[#14919B] transition-colors duration-300 group-hover:bg-[#45DFB1] group-hover:text-[#08313A]">
                        <Check className="h-4 w-4" />
                      </span>
                      <span
                        className="text-[17px] font-medium leading-snug text-neutral-900 transition-colors duration-300 group-hover:text-white"
                        style={display}
                      >
                        {o}
                      </span>
                    </motion.div>
                  ))}
                </div>
                )}
              </div>
            </div>
          </section>

          {/* What we do */}
          <section id="what-we-do" className="scroll-mt-24 border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
            <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <SectionLabel>What we do</SectionLabel>
              <motion.h2
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.6 }}
                className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                style={display}
              >
                <MaskLine delay={0}>
                  Our work in <span style={accent}>{area.label.toLowerCase()}.</span>
                </MaskLine>
              </motion.h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {area.capabilities.map((c, i) => (
                  <motion.div
                    key={c}
                    {...fadeUp(i * 0.08)}
                    className="group flex min-h-[170px] flex-col justify-between gap-6 rounded-[20px] border border-[#0B6477]/12 bg-white p-6 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(8,49,58,0.45)]"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0B6477] text-[#45DFB1] transition-colors duration-300 group-hover:bg-[#45DFB1] group-hover:text-[#08313A]">
                      <area.icon className="h-5 w-5" />
                    </span>
                    <span className="text-[17px] font-medium leading-snug text-neutral-900" style={display}>
                      {c}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* The center's own projects in this area */}
          {evidence.projects.length > 0 && (
            <section id="evidence" className="scroll-mt-24 mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
              <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <SectionLabel>Center projects</SectionLabel>
                  <EvidenceHeading first="What we have" second="built and tested." />
                </div>
                <motion.p
                  {...fadeUp(0.2)}
                  className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg"
                  style={body}
                >
                  {evidence.projects.length} {evidence.projects.length === 1 ? "project" : "projects"} from the
                  center&apos;s research portfolio. Open a slide to see the system, the setup and the results.
                </motion.p>
              </div>
              <ProjectGrid projects={evidence.projects} />
            </section>
          )}

          {/* Student theses supervised at the center */}
          {evidence.studies.length > 0 && (
            <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <SectionLabel>Student research</SectionLabel>
                    <EvidenceHeading first="Theses that" second="moved it forward." />
                  </div>
                  <motion.p
                    {...fadeUp(0.2)}
                    className="max-w-[440px] text-base leading-relaxed text-neutral-500 md:text-lg"
                    style={body}
                  >
                    {levels
                      .map((x) => {
                        const kind = STUDY_KIND[x.l].toLowerCase();
                        return `${x.n} ${x.n > 1 ? kind.replace("thesis", "theses") : kind}`;
                      })
                      .join(", ")}{" "}
                    supervised at the center, with their methods, key results and research framework.
                  </motion.p>
                </div>
                <StudyList studies={evidence.studies} />
              </div>
            </section>
          )}

          {/* The area in practice: field notes and papers that mention it. */}
          {(relatedNotes.length > 0 || relatedPapers.length > 0) && (
            <section className="border-t border-[#0B6477]/10">
              <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28">
                <SectionLabel>In practice</SectionLabel>
                <motion.h2
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.6 }}
                  className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                  style={display}
                >
                  <MaskLine delay={0}>
                    {area.label} <span style={accent}>in practice.</span>
                  </MaskLine>
                </motion.h2>

                {relatedNotes.length > 0 && (
                  <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {relatedNotes.map((n, i) => (
                      <motion.div key={n.slug} {...fadeUp(i * 0.08)}>
                        <NoteCard note={n} index={i} />
                      </motion.div>
                    ))}
                  </div>
                )}

                {relatedPapers.length > 0 && (
                  <div className="mt-12">
                    <p className={`mb-3 text-neutral-400 ${META}`} style={body}>
                      Related publications
                    </p>
                    <ol>
                      {relatedPapers.map((p, i) => (
                        <motion.li key={p.slug} {...fadeUp(i * 0.06)} className="border-t border-[#0B6477]/12 last:border-b">
                          <Link
                            to="/publications/$slug"
                            params={{ slug: p.slug }}
                            className="group grid gap-2 py-5 transition-colors duration-300 hover:bg-[#F3F7F6] md:grid-cols-[72px_minmax(0,1fr)_40px] md:items-center md:gap-6 md:px-4"
                          >
                            <span className="text-lg font-semibold tracking-[-0.02em] text-[#14919B] tabular-nums" style={display}>
                              {p.year}
                            </span>
                            <span className="min-w-0">
                              <span
                                className="block text-[16px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-[#0B6477] md:text-[17px]"
                                style={display}
                              >
                                {p.title}
                              </span>
                              <span className="mt-1 block truncate text-sm text-neutral-500" style={body}>
                                {[p.venue, p.publisher].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                            <span className="hidden h-10 w-10 place-items-center justify-self-end rounded-lg border border-[#0B6477]/25 text-[#0B6477] transition-colors duration-300 group-hover:border-[#08313A] group-hover:bg-[#08313A] group-hover:text-[#45DFB1] md:grid">
                              <ArrowUpRight className="h-4 w-4 transition-[rotate] duration-300 group-hover:rotate-45" />
                            </span>
                          </Link>
                        </motion.li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Other areas */}
          <section className="border-t border-[#0B6477]/10 bg-[#F3F7F6]/70">
            <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-24">
              <div className="mb-8 flex items-end justify-between gap-6">
                <div>
                  <SectionLabel>Other research</SectionLabel>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-900 md:text-4xl" style={display}>
                    Explore the <span style={accent}>other areas.</span>
                  </h2>
                </div>
                <Link
                  to="/research"
                  className="group hidden items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477] sm:inline-flex"
                  style={body}
                >
                  All research
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <ul>
                {others.map((o, i) => (
                  <motion.li key={o.slug} {...fadeUp(i * 0.05)} className="border-t border-[#0B6477]/12 last:border-b">
                    <Link
                      to="/research/$slug"
                      params={{ slug: o.slug }}
                      className="group flex items-center gap-5 py-4 md:px-4"
                    >
                      <span className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-lg sm:block">
                        <img
                          src={researchPhoto[o.slug]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover grayscale-[40%] transition-[transform,filter] duration-500 group-hover:scale-110 group-hover:grayscale-0"
                        />
                      </span>
                      <span
                        className="flex-1 text-xl font-medium tracking-[-0.02em] text-neutral-900 transition-[color,transform] duration-300 group-hover:translate-x-1 group-hover:text-[#0B6477] md:text-2xl"
                        style={display}
                      >
                        {o.label}
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-[#0B6477] transition-[rotate] duration-300 group-hover:rotate-45" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          </section>

          <CallToAction />
        </div>
      </div>
      <Footer />
    </main>
  );
}
