import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Quote,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { PUBLICATIONS, findPublication, type Publication } from "../lib/publications";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import { CategoryChip, EASE, META } from "../components/NoteParts";

export const Route = createFileRoute("/publications_/$slug")({
  component: PublicationDetailPage,
  loader: ({ params }) => findPublication(params.slug),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Publications"} | smartagri` },
      ...(loaderData?.abstract
        ? [{ name: "description", content: loaderData.abstract.slice(0, 160) }]
        : []),
    ],
  }),
});

type CrossrefMeta = {
  publishedDate?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  abstract?: string;
  citations?: number;
};

function extractDoi(link?: string): string | null {
  if (!link) return null;
  const match = link.match(/10\.\d{4,9}\/[^\s"']+/);
  return match ? match[0] : null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(parts?: number[]) {
  if (!parts?.length) return undefined;
  const [y, m, d] = parts;
  if (!m) return String(y);
  return d ? `${d} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}

// Bibliographic data and citation count are fetched live from the Crossref
// API (the official DOI registry) using the publication's DOI.
function useCrossref(doi: string | null) {
  const [meta, setMeta] = useState<CrossrefMeta | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!doi) return;
    let cancelled = false;
    setStatus("loading");
    fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        const m = data.message ?? {};
        setMeta({
          publishedDate: formatDate(m.published?.["date-parts"]?.[0]),
          journal: m["container-title"]?.[0],
          volume: m.volume,
          issue: m.issue,
          pages: m.page,
          publisher: m.publisher,
          abstract: m.abstract
            ? String(m.abstract)
                .replace(/<\/?[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .replace(/^Abstract\s*/i, "")
                .trim()
            : undefined,
          citations: m["is-referenced-by-count"],
        });
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [doi]);

  return { meta, status };
}

// Counts up to the value once it is known and in view.
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1200);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString("en-US")}
    </span>
  );
}

// Placeholder bar while Crossref answers.
function Shimmer({ w = "w-24" }: { w?: string }) {
  return (
    <span
      className={`inline-block h-4 ${w} animate-pulse rounded bg-[#0B6477]/10 align-middle`}
      aria-label="Loading"
    />
  );
}

function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#0B6477]/20 bg-white text-sm font-medium text-[#0B6477] transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1]"
      style={body}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? done : label}
    </button>
  );
}

// Other papers in the same journal first, then from the same year.
function relatedTo(pub: Publication) {
  const others = PUBLICATIONS.filter((p) => p.slug !== pub.slug);
  const sameVenue = pub.venue ? others.filter((p) => p.venue === pub.venue) : [];
  const sameYear = others.filter((p) => p.year === pub.year && !sameVenue.includes(p));
  return [...sameVenue, ...sameYear].slice(0, 3);
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: EASE },
});

function PublicationDetailPage() {
  const pub = Route.useLoaderData();
  const doi = extractDoi(pub?.link);
  const { meta, status } = useCrossref(doi);

  if (!pub) {
    return (
      <main>
        <SiteHeader />
        <section className="bg-[#F3F7F6]">
          <div className="max-w-[760px] mx-auto px-6 py-24 text-center flex flex-col items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900" style={display}>
              Publication not found
            </h1>
            <Link
              to="/publications"
              className="px-7 py-3 rounded-2xl border border-[#0B6477] text-[#0B6477] font-medium hover:bg-[#0B6477] hover:text-white transition-colors"
              style={body}
            >
              Back to Publications
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const loading = status === "loading";
  const abstract = pub.abstract || meta?.abstract;
  const citations = meta?.citations ?? pub.citations ?? 0;
  const journal = pub.venue || meta?.journal;
  const publisher = meta?.publisher ?? pub.publisher;
  const authors = pub.authors.split(/,\s*/).filter(Boolean);
  const related = relatedTo(pub);

  // Only fields we actually have; volume, issue and pages come from Crossref.
  const volumeLine = [meta?.volume && `vol. ${meta.volume}`, meta?.issue && `no. ${meta.issue}`]
    .filter(Boolean)
    .join(", ");
  const citation = [
    `${pub.authors} (${pub.year}).`,
    `${pub.title}.`,
    [journal, meta?.volume && `${meta.volume}${meta.issue ? `(${meta.issue})` : ""}`, meta?.pages]
      .filter(Boolean)
      .join(", ") + (journal ? "." : ""),
    doi ? `https://doi.org/${doi}` : "",
  ]
    .filter((s) => s && s !== ".")
    .join(" ");

  const facts: { label: string; value?: string; pending?: boolean }[] = [
    { label: "Journal", value: journal },
    { label: "Publisher", value: publisher, pending: loading && !publisher },
    { label: "Published", value: meta?.publishedDate ?? (loading ? undefined : pub.year), pending: loading && !meta?.publishedDate },
    { label: "Volume", value: volumeLine || undefined, pending: loading },
    { label: "Pages", value: meta?.pages, pending: loading },
    { label: "DOI", value: doi ?? undefined },
  ];

  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={4} />

        <article className="relative" key={pub.slug}>
          <header className="mx-auto max-w-[1200px] px-6 pt-10 md:px-12 md:pt-16">
            <motion.div {...rise(0)}>
              <Link
                to="/publications"
                className="group inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-[#0B6477]"
                style={body}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Publications
              </Link>
            </motion.div>
            <motion.div {...rise(0.08)} className="mt-6 flex flex-wrap gap-2">
              <CategoryChip>{pub.year}</CategoryChip>
              {journal && <CategoryChip>{journal}</CategoryChip>}
            </motion.div>
            <div className="mt-5 overflow-hidden pb-[0.08em]">
              <motion.h1
                initial={{ y: "40%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.9, ease: EASE }}
                className="max-w-[980px] text-[clamp(1.8rem,3.8vw,3.2rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-900"
                style={display}
              >
                {pub.title}
              </motion.h1>
            </div>
            {/* Authors, each popping in. */}
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.35 } } }}
              className="mt-6 flex max-w-[980px] flex-wrap gap-2"
              aria-label="Authors"
            >
              {authors.map((a) => (
                <motion.li
                  key={a}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  className="rounded-full border border-[#0B6477]/15 bg-white/80 px-3 py-1 text-[13px] text-neutral-700"
                  style={body}
                >
                  {a}
                </motion.li>
              ))}
            </motion.ul>
          </header>

          <div className="mx-auto grid max-w-[1200px] gap-10 px-6 pb-20 pt-12 md:px-12 md:pt-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
            {/* Main column: citations, abstract, figure. */}
            <div className="min-w-0">
              <motion.div
                {...rise(0.45)}
                className="flex items-center gap-5 rounded-[24px] border border-[#0B6477]/10 bg-[#08313A] p-6 text-white md:p-7"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#45DFB1] text-[#08313A]">
                  <Quote className="h-5 w-5" />
                </span>
                <span style={body}>
                  <span className="block text-4xl font-semibold leading-none tracking-[-0.03em] md:text-5xl" style={display}>
                    {loading && meta?.citations === undefined ? <Shimmer w="w-16" /> : <CountUp value={citations} />}
                  </span>
                  <span className="mt-2 block text-sm text-white/70">
                    {citations === 1 ? "citation" : "citations"} recorded by Crossref
                  </span>
                </span>
              </motion.div>

              <motion.section {...rise(0.55)} className="mt-10">
                <h2 className={`mb-4 text-neutral-400 ${META}`} style={body}>
                  Abstract
                </h2>
                {abstract ? (
                  <p className="text-[17px] leading-[1.75] text-neutral-700" style={body}>
                    {abstract}
                  </p>
                ) : loading ? (
                  <div className="flex flex-col gap-2.5">
                    {["w-full", "w-full", "w-11/12", "w-4/5"].map((w, i) => (
                      <span key={i} className={`h-4 ${w} animate-pulse rounded bg-[#0B6477]/10`} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[15px] text-neutral-500" style={body}>
                    No abstract is available for this paper yet.
                    {pub.link && " The full text is on the publisher's site."}
                  </p>
                )}
              </motion.section>

              {pub.cover && (
                <motion.figure {...rise(0.6)} className="mt-10 overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-[#F3F7F6]">
                  <img src={pub.cover} alt="" className="max-h-[440px] w-full object-contain" />
                </motion.figure>
              )}
            </div>

            {/* Side column: the paper's details and actions, sticky on desktop. */}
            <aside>
              <motion.div
                {...rise(0.5)}
                className="lg:sticky lg:top-28 rounded-[24px] border border-[#0B6477]/10 bg-white/85 p-6 shadow-[0_24px_60px_-40px_rgba(8,49,58,0.45)] backdrop-blur"
              >
                <p className={`mb-3 text-neutral-400 ${META}`} style={body}>
                  Paper details
                </p>
                <motion.dl
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.6 } } }}
                  className="flex flex-col"
                  style={body}
                >
                  {facts
                    .filter((f) => f.value || f.pending)
                    .map((f) => (
                      <motion.div
                        key={f.label}
                        variants={{ hidden: { opacity: 0, x: 8 }, show: { opacity: 1, x: 0 } }}
                        className="border-b border-[#0B6477]/8 py-2.5 last:border-b-0"
                      >
                        <dt className="text-[12px] text-neutral-400">{f.label}</dt>
                        <dd className="m-0 break-words text-[14px] leading-snug text-neutral-800">
                          {f.value ?? <Shimmer />}
                        </dd>
                      </motion.div>
                    ))}
                </motion.dl>

                <div className="mt-5 flex flex-col gap-2">
                  {pub.link && (
                    <a
                      href={pub.link}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#45DFB1] text-sm font-medium uppercase tracking-[0.06em] text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
                      style={body}
                    >
                      View at publisher
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  )}
                  {doi && <CopyButton text={`https://doi.org/${doi}`} label="Copy DOI" done="DOI copied" />}
                  <CopyButton text={citation} label="Copy citation" done="Citation copied" />
                </div>
                {doi && (
                  <p className="mt-4 text-[12px] leading-relaxed text-neutral-400" style={body}>
                    Details and citation count are retrieved live from Crossref via the DOI.
                  </p>
                )}
              </motion.div>
            </aside>
          </div>
        </article>

        {related.length > 0 && (
          <section className="relative border-t border-[#0B6477]/10">
            <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-12 md:py-24">
              <div className="mb-8 flex items-end justify-between gap-6">
                <h2
                  className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 md:text-5xl"
                  style={display}
                >
                  More
                  <br />
                  <span style={accent}>publications.</span>
                </h2>
                <Link
                  to="/publications"
                  className="group inline-flex items-center gap-2 border-b border-[#0B6477]/30 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-[#0B6477] transition-colors hover:border-[#0B6477]"
                  style={body}
                >
                  All publications
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <ol>
                {related.map((p, i) => (
                  <motion.li
                    key={p.slug}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: i * 0.08, duration: 0.55, ease: EASE }}
                    className="border-t border-[#0B6477]/12 last:border-b"
                  >
                    <Link
                      to="/publications/$slug"
                      params={{ slug: p.slug }}
                      className="group grid gap-2 py-6 transition-colors duration-300 hover:bg-[#F3F7F6] md:grid-cols-[80px_minmax(0,1fr)_40px] md:items-center md:gap-6 md:px-4"
                    >
                      <span className="text-lg font-semibold tracking-[-0.02em] text-[#14919B] tabular-nums" style={display}>
                        {p.year}
                      </span>
                      <span className="min-w-0">
                        <span
                          className="block text-[17px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-[#0B6477] md:text-lg"
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
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
