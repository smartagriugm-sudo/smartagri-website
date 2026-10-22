import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { NOTE_FILTERS, notes, type Note } from "../lib/notes";
import {
  Byline,
  CategoryChip,
  EASE,
  MaskLine,
  META,
  NoteCard,
  Photo,
} from "./NoteParts";

// Field Notes after the Quayside journal: a left-aligned headline revealed
// line by line, category pills (every category that has notes), one featured
// note split photo | text, then cards. Two modes:
//   - landing section: featured + 3 cards and a link to the archive;
//   - `archive` (/field-notes): page h1, every note, loaded 9 cards at a time.
// The drifting washes behind it come from AmbientWash on the route.

const PAGE = 9;

function Featured({ note }: { note: Note }) {
  return (
    <Link
      to="/field-notes/$slug"
      params={{ slug: note.slug }}
      className="group grid overflow-hidden rounded-[28px] border border-[#0B6477]/10 bg-white/85 shadow-[0_20px_60px_-30px_rgba(8,49,58,0.35)] backdrop-blur transition-shadow duration-500 hover:shadow-[0_30px_80px_-30px_rgba(8,49,58,0.45)] lg:grid-cols-2"
    >
      <div className="relative">
        <Photo
          note={note}
          index={0}
          className="h-[240px] sm:h-[300px] lg:h-full lg:min-h-[400px]"
        />
        <span
          className={`absolute bottom-5 left-6 text-white/85 ${META}`}
          style={body}
        >
          {note.category}
        </span>
      </div>

      <div className="flex flex-col gap-5 p-7 md:p-10">
        <div>
          <CategoryChip>{note.category}</CategoryChip>
        </div>
        <h3
          className="line-clamp-3 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-neutral-900 transition-colors duration-300 group-hover:text-[#0B6477] md:text-[32px]"
          style={display}
        >
          {note.title}
        </h3>
        <p
          className="line-clamp-3 text-base leading-relaxed text-neutral-500 md:text-[17px]"
          style={body}
        >
          {note.excerpt}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
          <Byline note={note} />
          <span
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#0B6477]"
            style={body}
          >
            Read the note
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.6 },
  transition: { delay, duration: 0.6, ease: "easeOut" as const },
});

export default function FieldNotes({ archive = false }: { archive?: boolean }) {
  const [filter, setFilter] = useState("All");
  const [shown, setShown] = useState(PAGE);
  const list =
    filter === "All" ? notes : notes.filter((n) => n.category === filter);
  const [featured, ...rest] = list;
  const cards = archive ? rest.slice(0, shown) : rest.slice(0, 3);
  const Heading = archive ? motion.h1 : motion.h2;

  return (
    <section id="field-notes" className="relative">
      <div
        className={`relative mx-auto max-w-[1360px] px-6 md:px-12 ${
          archive ? "pb-20 pt-12 md:pb-28 md:pt-20" : "py-20 md:py-28"
        }`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Heading
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.5 }}
              className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 sm:text-5xl md:text-[64px]"
              style={display}
            >
              {archive ? (
                <>
                  <MaskLine delay={0}>Notes from the</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>lab and field.</span>
                  </MaskLine>
                </>
              ) : (
                <>
                  <MaskLine delay={0}>Fresh notes</MaskLine>
                  <MaskLine delay={0.12}>
                    <span style={accent}>from the field.</span>
                  </MaskLine>
                </>
              )}
            </Heading>
            <motion.p
              {...fadeUp(0.3)}
              className="mt-5 max-w-[600px] text-base leading-relaxed text-neutral-500 md:text-lg"
              style={body}
            >
              {archive
                ? "Everything we publish outside of journals: news from the center, research updates, practical guides for farmers, and recaps of the events we host."
                : "News, research updates, practical guides and stories from the farms and labs we work in."}
            </motion.p>
          </div>
          <motion.div {...fadeUp(0.4)}>
            {archive ? (
              <span className={`text-neutral-400 ${META}`} style={body}>
                {list.length} {list.length === 1 ? "note" : "notes"}
                {filter !== "All" && ` in ${filter}`}
              </span>
            ) : (
              <Link
                to="/field-notes"
                className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                style={body}
              >
                All field notes
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </motion.div>
        </div>

        {/* Category pills; the dark "active" pill slides between them. */}
        <motion.div
          {...fadeUp(0.5)}
          className="mt-10 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter field notes by category"
        >
          {NOTE_FILTERS.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(f);
                  setShown(PAGE);
                }}
                className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-transparent text-white"
                    : "border-[#0B6477]/15 bg-white/70 text-neutral-700 hover:border-[#0B6477]/40"
                }`}
                style={body}
              >
                {active && (
                  <motion.span
                    layoutId={archive ? "field-notes-pill-archive" : "field-notes-pill"}
                    className="absolute inset-0 rounded-full bg-[#08313A]"
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
                <span className="relative">{f}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Revealed on scroll; switching pills cross-fades the content. */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-8 flex flex-col gap-6"
            >
              {featured && <Featured note={featured} />}
              {cards.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {cards.map((note, i) => (
                    <motion.div
                      key={note.slug}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.12 + (i % PAGE) * 0.06,
                        duration: 0.55,
                        ease: EASE,
                      }}
                      className={!archive && i === 2 ? "md:hidden lg:block" : ""}
                    >
                      <NoteCard note={note} index={i + 1} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {archive && rest.length > shown && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
              style={body}
            >
              Load more notes
              <ArrowRight className="h-4 w-4 rotate-90 transition-transform group-hover:translate-y-0.5" />
            </button>
            <span className="text-[13px] text-neutral-400" style={body}>
              Showing {shown + 1} of {list.length}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
