import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Expand, Minus, Plus } from "lucide-react";
import { researchFramework, researchSlide } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  ROADMAP,
  STUDY_KIND,
  type CenterProject,
  type EvidenceStat,
  type StudentStudy,
  type StudyLevel,
} from "../lib/research-evidence";
import PhotoLightbox from "./PhotoLightbox";
import { EASE, MaskLine, META } from "./NoteParts";

// The evidence behind a research area (lib/research-evidence.ts): headline
// results, the center's own projects with their slides, the student theses
// with their research frameworks, and the center's roadmap.

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { delay, duration: 0.6, ease: EASE },
});

// Headline results, one cell each.
export function EvidenceStats({ stats }: { stats: EvidenceStat[] }) {
  if (!stats.length) return null;
  return (
    <div className="grid gap-px overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-[#0B6477]/12 md:grid-cols-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          {...fadeUp(i * 0.08)}
          className="group flex flex-col gap-3 bg-white/90 p-6 transition-colors duration-300 hover:bg-[#08313A] md:p-8"
        >
          <span
            className="whitespace-nowrap text-4xl font-semibold leading-none tracking-[-0.035em] text-[#0B6477] transition-colors duration-300 group-hover:text-[#45DFB1] md:text-[34px] xl:text-[44px]"
            style={display}
          >
            {s.value}
          </span>
          <span
            className="text-[15px] leading-snug text-neutral-600 transition-colors duration-300 group-hover:text-white/75"
            style={body}
          >
            {s.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
}: {
  photos: string[];
  index: number | null;
  onIndex: (i: number | null) => void;
}) {
  return (
    <AnimatePresence>
      {index !== null && (
        <PhotoLightbox photos={photos} index={index} onIndex={onIndex} onClose={() => onIndex(null)} />
      )}
    </AnimatePresence>
  );
}

// The center's projects in an area, each with its slide from the profile deck.
// Long lists start with the first six; the rest open on request.
const PROJECTS_SHOWN = 6;

export function ProjectGrid({ projects }: { projects: CenterProject[] }) {
  const slides = projects.flatMap((p) => p.slides);
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const shown = all ? projects : projects.slice(0, PROJECTS_SHOWN);
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {shown.map((p, i) => {
          const first = slides.indexOf(p.slides[0]!);
          return (
            <motion.article
              key={p.title}
              {...fadeUp((i % 2) * 0.08)}
              className={`group flex flex-col overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-white/90 shadow-[0_14px_40px_-30px_rgba(8,49,58,0.35)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(8,49,58,0.45)] ${
                shown.length % 2 === 1 && i === shown.length - 1 ? "md:col-span-2" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(first)}
                className="relative block aspect-[16/9] w-full overflow-hidden bg-[#F3F7F6] text-left"
                aria-label={`View the slide for ${p.title}`}
              >
                <img
                  src={researchSlide(p.slides[0]!)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-[#08313A]/55 via-transparent to-transparent" />
                <span
                  className={`absolute bottom-4 left-5 inline-flex items-center gap-2 text-white/90 ${META}`}
                  style={body}
                >
                  <Expand className="h-3.5 w-3.5" />
                  {p.slides.length > 1 ? `${p.slides.length} slides` : "View slide"}
                </span>
              </button>
              <div className="flex flex-1 flex-col gap-4 p-6 md:p-7">
                <h3
                  className="text-xl font-medium leading-snug tracking-[-0.02em] text-neutral-900 md:text-[22px]"
                  style={display}
                >
                  {p.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-neutral-600" style={body}>
                  {p.summary}
                </p>
                <ul className="flex flex-col gap-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-2.5 text-[15px] leading-snug text-neutral-700" style={body}>
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-[#45DFB1]" />
                      {pt}
                    </li>
                  ))}
                </ul>
                {(p.partners?.length || p.people?.length) && (
                  <div className="mt-auto flex flex-col gap-2 border-t border-[#0B6477]/10 pt-4">
                    {p.people?.length ? (
                      <p className="text-[13px] leading-relaxed text-neutral-500" style={body}>
                        <span className={`mr-2 text-neutral-400 ${META}`}>Team</span>
                        {p.people.join(" · ")}
                      </p>
                    ) : null}
                    {p.partners?.length ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`mr-1 text-neutral-400 ${META}`} style={body}>
                          With
                        </span>
                        {p.partners.map((x) => (
                          <span
                            key={x}
                            className="rounded-full border border-[#0B6477]/15 bg-[#F3F7F6] px-2.5 py-1 text-[12px] text-[#0B6477]"
                            style={body}
                          >
                            {x}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
      {projects.length > PROJECTS_SHOWN && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
            style={body}
          >
            {all ? "Show fewer" : `Show all ${projects.length} projects`}
            {all ? (
              <Minus className="h-4 w-4 text-[#45DFB1]" />
            ) : (
              <Plus className="h-4 w-4 text-[#45DFB1] transition-transform group-hover:rotate-90" />
            )}
          </button>
        </div>
      )}
      <Lightbox photos={slides.map(researchSlide)} index={open} onIndex={setOpen} />
    </>
  );
}

const LEVEL_TONE: Record<StudyLevel, string> = {
  Undergraduate: "bg-[#F3F7F6] text-[#0B6477] border-[#0B6477]/15",
  "Master's": "bg-[#14919B] text-white border-transparent",
  Doctoral: "bg-[#08313A] text-[#45DFB1] border-transparent",
};

function StudyRow({
  study,
  open,
  onToggle,
  onFigure,
}: {
  study: StudentStudy;
  open: boolean;
  onToggle: () => void;
  onFigure: () => void;
}) {
  return (
    <li className="border-t border-[#0B6477]/12 last:border-b">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group grid w-full gap-3 py-6 text-left md:grid-cols-[150px_minmax(0,1fr)_40px] md:items-start md:gap-6 md:px-4"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 ${META} ${LEVEL_TONE[study.level]}`}
            style={body}
          >
            {study.level}
          </span>
          <span className="text-sm tabular-nums text-neutral-400" style={body}>
            {study.year}
          </span>
        </span>
        <span className="min-w-0">
          <span
            className="block text-[17px] font-medium leading-snug tracking-[-0.01em] text-neutral-900 transition-colors group-hover:text-[#0B6477] md:text-lg"
            style={display}
          >
            {study.title}
          </span>
          <span className="mt-1.5 block text-sm text-neutral-500" style={body}>
            {study.author} · {STUDY_KIND[study.level]}
            {study.status ? ` (${study.status.toLowerCase()})` : ""}
          </span>
        </span>
        <span
          className={`hidden h-10 w-10 place-items-center justify-self-end rounded-lg border transition-colors duration-300 md:grid ${
            open
              ? "border-[#08313A] bg-[#08313A] text-[#45DFB1]"
              : "border-[#0B6477]/25 text-[#0B6477] group-hover:border-[#08313A] group-hover:bg-[#08313A] group-hover:text-[#45DFB1]"
          }`}
        >
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="grid gap-8 pb-8 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6 md:px-4 lg:grid-cols-[150px_minmax(0,1fr)_minmax(0,0.8fr)]">
              <div className="hidden md:block" />
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-1.5">
                  {study.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[#0B6477]/15 bg-white px-2.5 py-1 text-[12px] text-[#0B6477]"
                      style={body}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-[15px] leading-relaxed text-neutral-600 md:text-base" style={body}>
                  {study.summary}
                </p>
                <div className="grid gap-px overflow-clip rounded-2xl border border-[#0B6477]/12 bg-[#0B6477]/12 sm:grid-cols-2">
                  {study.results.map((r) => (
                    <div key={r.label} className="flex flex-col gap-1.5 bg-white p-5">
                      <span
                        className="text-2xl font-semibold tracking-[-0.03em] text-[#0B6477] md:text-[28px]"
                        style={display}
                      >
                        {r.value}
                      </span>
                      <span className="text-[13px] leading-snug text-neutral-500" style={body}>
                        {r.label}
                      </span>
                    </div>
                  ))}
                </div>
                <ul className="flex flex-col gap-2">
                  {study.points.map((pt) => (
                    <li key={pt} className="flex gap-2.5 text-[15px] leading-snug text-neutral-700" style={body}>
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-[#45DFB1]" />
                      {pt}
                    </li>
                  ))}
                </ul>
                {study.member && (
                  <Link
                    to="/team/$slug"
                    params={{ slug: study.member }}
                    className={`group/link inline-flex w-fit items-center gap-1.5 border-b border-[#0B6477]/30 pb-1 text-[#0B6477] transition-colors hover:border-[#0B6477] ${META}`}
                    style={body}
                  >
                    {study.author.split(" ")[0]}'s profile
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={onFigure}
                className="group/fig relative block self-start overflow-hidden rounded-2xl border border-[#0B6477]/12 bg-white text-left md:col-start-2 lg:col-start-auto"
                aria-label={`View the research framework of ${study.title}`}
              >
                <img
                  src={researchFramework(study.code)}
                  alt={`Research framework: ${study.title}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full transition-transform duration-700 group-hover/fig:scale-[1.03]"
                />
                <span
                  className={`flex items-center justify-between gap-2 border-t border-[#0B6477]/10 px-4 py-3 text-neutral-500 ${META}`}
                  style={body}
                >
                  Research framework
                  <Expand className="h-3.5 w-3.5 text-[#0B6477]" />
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

// Student theses in an area, filterable by level, one open at a time.
export function StudyList({ studies }: { studies: StudentStudy[] }) {
  const levels = (["Undergraduate", "Master's", "Doctoral"] as StudyLevel[]).filter((l) =>
    studies.some((s) => s.level === l),
  );
  const [level, setLevel] = useState<"All" | StudyLevel>("All");
  const [openCode, setOpenCode] = useState<string | null>(studies[0]?.code ?? null);
  const [figure, setFigure] = useState<number | null>(null);
  const shown = level === "All" ? studies : studies.filter((s) => s.level === level);

  return (
    <>
      {levels.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by level">
          {(["All", ...levels] as const).map((l) => {
            const on = l === level;
            const count = l === "All" ? studies.length : studies.filter((s) => s.level === l).length;
            return (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setLevel(l)}
                className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  on
                    ? "border-transparent text-white"
                    : "border-[#0B6477]/15 bg-white/70 text-neutral-700 hover:border-[#0B6477]/40"
                }`}
                style={body}
              >
                {on && (
                  <motion.span
                    layoutId="study-level-pill"
                    className="absolute inset-0 rounded-full bg-[#08313A]"
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
                <span className="relative">
                  {l}
                  <span className={on ? "text-white/60" : "text-neutral-400"}> {count}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <ul>
        {shown.map((s) => (
          <StudyRow
            key={s.code}
            study={s}
            open={openCode === s.code}
            onToggle={() => setOpenCode((c) => (c === s.code ? null : s.code))}
            onFigure={() => setFigure(studies.indexOf(s))}
          />
        ))}
      </ul>
      <Lightbox photos={studies.map((s) => researchFramework(s.code))} index={figure} onIndex={setFigure} />
    </>
  );
}

// The center's roadmap, 2012 to 2030, as a horizontal track.
export function Roadmap() {
  return (
    <div className="relative">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-3">
        {ROADMAP.map((r, i) => {
          const now = r.phase === "now";
          const future = r.phase === "future";
          return (
            <motion.div
              key={r.years}
              {...fadeUp(i * 0.08)}
              className={`group relative flex flex-col gap-4 rounded-[20px] border p-5 transition-[transform,background-color,border-color] duration-300 hover:-translate-y-1 ${
                now
                  ? "border-[#08313A] bg-[#08313A] text-white"
                  : future
                    ? "border-dashed border-[#0B6477]/25 bg-white/60"
                    : "border-[#0B6477]/12 bg-white/90"
              }`}
            >
              <span className="flex flex-col items-start gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 ${META} ${
                    now ? "bg-[#45DFB1] text-[#0B2A22]" : future ? "border border-dashed border-[#0B6477]/25 text-neutral-400" : "bg-[#F3F7F6] text-[#0B6477]"
                  }`}
                  style={body}
                >
                  {now ? "Now" : future ? "Next" : "Done"}
                </span>
                <span
                  className={`whitespace-nowrap text-xl font-semibold tabular-nums tracking-[-0.02em] ${now ? "text-[#45DFB1]" : "text-[#0B6477]"}`}
                  style={display}
                >
                  {r.years}
                </span>
              </span>
              <span
                className={`text-[17px] font-medium leading-snug tracking-[-0.01em] ${now ? "text-white" : "text-neutral-900"}`}
                style={display}
              >
                {r.title}
              </span>
              <ul className="mt-auto flex flex-col gap-1.5">
                {r.items.map((it) => (
                  <li
                    key={it}
                    className={`flex gap-2 text-[13px] leading-snug ${now ? "text-white/70" : "text-neutral-500"}`}
                    style={body}
                  >
                    <span className="mt-[6px] h-1 w-1 shrink-0 bg-[#45DFB1]" />
                    {it}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function EvidenceHeading({ first, second }: { first: string; second: string }) {
  return (
    <motion.h2
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
      style={display}
    >
      <MaskLine delay={0}>{first}</MaskLine>
      <MaskLine delay={0.1}>
        <span style={accent}>{second}</span>
      </MaskLine>
    </motion.h2>
  );
}
