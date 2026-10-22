import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Quote } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { PUBLICATIONS } from "../lib/publications";

// Landing publications band, laid out after the Blitz stats + rows pattern:
// a light band with three counting figures, then the newest papers as rows.
// Every figure is derived from src/content/publications (citations are the
// Crossref snapshot stored per paper), so it stays current as papers are added.
const FIRST_YEAR = Math.min(...PUBLICATIONS.map((p) => Number(p.year)));
const LATEST_YEAR = Math.max(...PUBLICATIONS.map((p) => Number(p.year)));
const CITATIONS = PUBLICATIONS.reduce((sum, p) => sum + (p.citations ?? 0), 0);

// Newest first; titles stored in all capitals read as shouting, so skip those.
const LATEST = PUBLICATIONS.filter(
  (p) => p.title !== p.title.toUpperCase(),
).slice(0, 5);

const FIGURES = [
  { value: PUBLICATIONS.length, label: "Journal articles and proceedings" },
  {
    value: LATEST_YEAR - FIRST_YEAR + 1,
    label: `Years of publishing, ${FIRST_YEAR}–${LATEST_YEAR}`,
  },
  { value: CITATIONS, label: "Citations recorded by Crossref" },
];

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { delay, duration: 0.55, ease: "easeOut" as const },
});

// Counts up from zero the first time it scrolls into view and again on every
// hover of its figure (`replay` changes). The server renders the final value,
// screen readers get it once, and reduced motion skips the count.
function CountUp({ value, replay }: { value: number; replay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setRun((n) => n + 1);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (run + replay === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, replay, value]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {shown.toLocaleString("en-US")}
      </span>
      <span className="sr-only">{value.toLocaleString("en-US")}</span>
    </>
  );
}

// One figure: big counting number, teal rule, label. Hovering it recounts.
function Figure({
  value,
  label,
  index,
}: {
  value: number;
  label: string;
  index: number;
}) {
  const [replay, setReplay] = useState(0);
  return (
    <motion.div
      {...reveal(0.15 + index * 0.1)}
      onMouseEnter={() => setReplay((n) => n + 1)}
      className="group border-t border-[#0B6477]/15 py-7 sm:py-8 sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0 cursor-default"
    >
      <dt className="sr-only">{label}</dt>
      <dd className="m-0">
        <span
          className="block text-[52px] md:text-[72px] font-semibold leading-none tracking-[-0.035em] text-neutral-900 transition-colors duration-300 group-hover:text-[#14919B]"
          style={display}
        >
          <CountUp value={value} replay={replay} />
        </span>
        <span
          className="mt-5 block h-1 w-12 bg-[#45DFB1] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-20"
          aria-hidden="true"
        />
        <span
          aria-hidden="true"
          className="mt-4 block text-[15px] text-neutral-500"
          style={body}
        >
          {label}
        </span>
      </dd>
    </motion.div>
  );
}

export default function Publications() {
  return (
    <section id="publications" className="relative text-neutral-900">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12">
        <div className="border-t border-[#0B6477]/10 py-20 md:py-28">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <motion.h2
                {...reveal(0)}
                className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.05]"
                style={display}
              >
                From the field
                <br />
                to <span style={accent}>peer review.</span>
              </motion.h2>
            </div>
            <motion.p
              {...reveal(0.25)}
              className="lg:col-span-4 lg:col-start-9 text-base md:text-lg leading-relaxed text-neutral-500"
              style={body}
            >
              Journal articles and proceedings on sensing, modelling and smart
              farming, written with the farms, companies and universities we
              work with.
            </motion.p>
          </div>

          <dl className="mt-14 md:mt-16 grid sm:grid-cols-3">
            {FIGURES.map((f, i) => (
              <Figure key={f.label} value={f.value} label={f.label} index={i} />
            ))}
          </dl>

          <motion.div
            {...reveal(0.1)}
            className="mt-14 mb-5 flex items-end justify-between gap-4"
          >
            <h3
              className="text-xl md:text-2xl font-medium tracking-[-0.02em]"
              style={display}
            >
              Latest papers
            </h3>
            <span className="text-[13px] text-neutral-400" style={body}>
              Newest first
            </span>
          </motion.div>

          <ol>
            {LATEST.map((pub, i) => (
              <motion.li
                key={pub.slug}
                {...reveal(0.05 + i * 0.07)}
                className="border-t border-[#0B6477]/12 last:border-b"
              >
                <Link
                  to="/publications/$slug"
                  params={{ slug: pub.slug }}
                  className="group grid gap-2 md:gap-8 py-6 md:py-7 md:px-4 md:grid-cols-12 md:items-center transition-colors duration-300 hover:bg-[#F3F7F6]"
                >
                  <span
                    className="text-lg md:text-[22px] font-semibold tracking-[-0.02em] text-[#14919B] md:col-span-1 tabular-nums"
                    style={display}
                  >
                    {pub.year}
                  </span>
                  <span className="md:col-span-9 min-w-0">
                    <span
                      className="block text-[17px] md:text-xl font-medium leading-[1.35] tracking-[-0.01em] text-neutral-900 transition-colors group-hover:text-[#0B6477]"
                      style={display}
                    >
                      {pub.title}
                    </span>
                    <span
                      className="mt-2 text-sm text-neutral-500 line-clamp-1"
                      style={body}
                    >
                      {pub.authors}
                    </span>
                    <span
                      className="mt-2.5 flex flex-wrap items-center gap-2"
                      style={body}
                    >
                      {pub.venue?.trim() && (
                        <span className="rounded-md border border-[#0B6477]/15 px-2.5 py-1 text-[13px] text-neutral-600">
                          {pub.venue}
                        </span>
                      )}
                      {!!pub.citations && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#45DFB1]/20 px-2.5 py-1 text-[13px] text-[#0B6477]">
                          <Quote className="w-3 h-3" aria-hidden="true" />
                          {pub.citations}{" "}
                          {pub.citations === 1 ? "citation" : "citations"}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="hidden md:grid md:col-span-2 justify-self-end place-items-center w-10 h-10 rounded-lg border border-[#0B6477]/25 text-[#0B6477] transition-colors duration-300 group-hover:border-[#08313A] group-hover:bg-[#08313A] group-hover:text-[#45DFB1]">
                    <ArrowUpRight className="w-4 h-4 transition-[rotate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-45" />
                  </span>
                </Link>
              </motion.li>
            ))}
          </ol>

          <motion.div {...reveal(0.2)} className="mt-10 md:mt-12">
            <Link
              to="/publications"
              className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-[13px] md:text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
              style={body}
            >
              View all {PUBLICATIONS.length} publications
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
