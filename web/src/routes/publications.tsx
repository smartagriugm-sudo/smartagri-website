import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { PUBLICATIONS, type Publication } from "../lib/publications";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import { EASE, MaskLine } from "../components/NoteParts";

export const Route = createFileRoute("/publications")({
  component: PublicationsPage,
  head: () => ({
    meta: [
      { title: "Publications | smartagri" },
      {
        name: "description",
        content:
          "Peer-reviewed publications from the Smart Agriculture Research Center on AI, IoT sensing, and data-driven agriculture.",
      },
    ],
  }),
});

// Every publication as a sortable, searchable, paged table (after a "team
// members" table reference): search, year filter and page size on top, sort
// from the column headers, pager at the bottom.

const YEARS = [...new Set(PUBLICATIONS.map((p) => p.year))].sort((a, b) => Number(b) - Number(a));
const TOTAL_CITATIONS = PUBLICATIONS.reduce((n, p) => n + (p.citations ?? 0), 0);
const PAGE_SIZES = [10, 30, 50, 100];

type SortKey = "title" | "venue" | "publisher" | "citations" | "year";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string; align?: "right" | "center"; first: "asc" | "desc" }[] = [
  { key: "title", label: "Title", first: "asc" },
  { key: "venue", label: "Journal", first: "asc" },
  { key: "publisher", label: "Publisher", first: "asc" },
  { key: "citations", label: "Cited by", align: "center", first: "desc" },
  { key: "year", label: "Year", align: "right", first: "desc" },
];

// Title | Journal | Publisher | Cited by | Year | arrow
const GRID = "md:grid md:grid-cols-[minmax(0,2.7fr)_minmax(0,1.35fr)_minmax(0,1.2fr)_88px_64px_20px] md:items-center md:gap-6";

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function compare(a: Publication, b: Publication, key: SortKey) {
  switch (key) {
    case "citations":
      return (a.citations ?? 0) - (b.citations ?? 0);
    case "year":
      return Number(a.year) - Number(b.year);
    default: {
      const av = (a[key] ?? "").trim();
      const bv = (b[key] ?? "").trim();
      // Empty values always sink to the bottom, whatever the direction.
      if (!av || !bv) return 0;
      return collator.compare(av, bv);
    }
  }
}

// Wraps search matches in a mint highlight.
function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-[#45DFB1]/40 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  return (
    <motion.span
      animate={{ rotate: dir === "asc" ? 180 : 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="inline-flex text-[#14919B]"
    >
      <ArrowDown className="h-3.5 w-3.5" />
    </motion.span>
  );
}

const controlClass =
  "h-10 rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-700 outline-none transition-colors focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";

function PublicationsPage() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState<Sort>({ key: "year", dir: "desc" });
  const [pageSize, setPageSize] = useState(30);
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const tableTop = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = PUBLICATIONS.filter((p) => {
      if (year !== "all" && p.year !== year) return false;
      if (!q) return true;
      return `${p.title} ${p.authors} ${p.venue} ${p.publisher ?? ""}`.toLowerCase().includes(q);
    });
    const sign = sort.dir === "asc" ? 1 : -1;
    const empty = (p: Publication) => sort.key !== "citations" && sort.key !== "year" && !(p[sort.key] ?? "").trim();
    return [...list].sort((a, b) => {
      const ea = empty(a);
      const eb = empty(b);
      if (ea !== eb) return ea ? 1 : -1;
      return compare(a, b, sort.key) * sign || Number(b.year) - Number(a.year);
    });
  }, [query, year, sort]);

  const pages = Math.max(1, Math.ceil(results.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = results.slice(current * pageSize, current * pageSize + pageSize);

  // Any change to what is listed starts again from page 1.
  useEffect(() => setPage(0), [query, year, sort, pageSize]);

  const goTo = (p: number) => {
    setPage(p);
    const top = tableTop.current;
    if (top && top.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: top.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
    }
  };

  const toggleSort = (key: SortKey, first: "asc" | "desc") =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: first },
    );

  return (
    <main>
      <SiteHeader />
      <div className="relative overflow-clip bg-white">
        <AmbientWash count={4} />
        <div className="relative mx-auto max-w-[1360px] px-6 pb-20 pt-12 md:px-12 md:pb-28 md:pt-20">
          {/* Masthead, as on the other archive pages. */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <motion.h1
              initial="hidden"
              animate="show"
              className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 sm:text-5xl md:text-[64px]"
              style={display}
            >
              <MaskLine delay={0}>From the field</MaskLine>
              <MaskLine delay={0.12}>
                <span style={accent}>to peer review.</span>
              </MaskLine>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="max-w-[520px] text-base leading-relaxed text-neutral-500 md:text-lg"
              style={body}
            >
              Our peer-reviewed work on sensing, modelling and the human side of data-driven
              agriculture. Search, filter by year, and sort by any column.
            </motion.p>
          </div>

          {/* Table card */}
          <motion.div
            ref={tableTop}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8, ease: EASE }}
            className="mt-12 overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-white/90 shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)] backdrop-blur"
          >
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-[#0B6477]/10 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#0B6477]/15 bg-[#F3F7F6] text-[#0B6477]">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span style={body}>
                  <span className="block text-lg font-semibold tracking-[-0.02em] text-neutral-900" style={display}>
                    Publications
                  </span>
                  <span className="block text-[13px] text-neutral-500">
                    {PUBLICATIONS.length} papers · {TOTAL_CITATIONS.toLocaleString("en-US")} citations · {YEARS[YEARS.length - 1]}–{YEARS[0]}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative sm:w-[280px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search title, author, journal..."
                    aria-label="Search publications"
                    className={`${controlClass} w-full pl-9`}
                    style={body}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 md:flex">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    aria-label="Filter by year"
                    className={`${controlClass} w-full min-w-0 px-2 md:w-auto md:px-3`}
                    style={body}
                  >
                    <option value="all">All years</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  {/* Phones have no column headers, so sorting moves here. */}
                  <select
                    value={`${sort.key}:${sort.dir}`}
                    onChange={(e) => {
                      const [key, dir] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
                      setSort({ key, dir });
                    }}
                    aria-label="Sort publications"
                    className={`${controlClass} w-full min-w-0 px-2 md:hidden`}
                    style={body}
                  >
                    <option value="year:desc">Newest</option>
                    <option value="year:asc">Oldest</option>
                    <option value="citations:desc">Most cited</option>
                    <option value="title:asc">Title A–Z</option>
                    <option value="venue:asc">Journal A–Z</option>
                    <option value="publisher:asc">Publisher A–Z</option>
                  </select>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Publications per page"
                    className={`${controlClass} w-full min-w-0 px-2 md:w-auto md:px-3`}
                    style={body}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        Show {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Column headers: click to sort, again to flip. */}
            <div
              className={`hidden border-b border-[#0B6477]/10 bg-[#F3F7F6]/70 px-6 py-3 ${GRID}`}
              role="row"
            >
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleSort(c.key, c.first)}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={`group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                      c.align === "right" ? "justify-self-end" : c.align === "center" ? "justify-self-center" : ""
                    } ${active ? "text-[#0B6477]" : "text-neutral-400 hover:text-neutral-700"}`}
                    style={body}
                  >
                    {c.label}
                    <SortIcon active={active} dir={sort.dir} />
                  </button>
                );
              })}
              <span />
            </div>

            {/* Rows */}
            <div onMouseLeave={() => setHovered(null)} className="relative">
              {rows.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-16 text-center text-neutral-500"
                  style={body}
                >
                  No publications match your search.
                </motion.p>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.ul
                    key={`${current}-${sort.key}-${sort.dir}-${year}-${pageSize}-${query}`}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    variants={{ show: { transition: { staggerChildren: 0.018 } } }}
                  >
                    {rows.map((pub) => (
                      <motion.li
                        key={pub.slug}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
                        }}
                        onMouseEnter={() => setHovered(pub.slug)}
                        className="relative border-b border-[#0B6477]/8 last:border-b-0"
                      >
                        {/* Hover highlight that glides from row to row. */}
                        {hovered === pub.slug && (
                          <motion.span
                            layoutId="pub-row-hover"
                            className="absolute inset-0 bg-[#F3F7F6]"
                            transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          >
                            <span className="absolute inset-y-0 left-0 w-[3px] bg-[#14919B]" />
                          </motion.span>
                        )}
                        <Link
                          to="/publications/$slug"
                          params={{ slug: pub.slug }}
                          className={`group relative block px-5 py-4 md:px-6 ${GRID}`}
                        >
                          <span className="block min-w-0">
                            <span
                              className="block text-[15px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-[#0B6477]"
                              style={display}
                            >
                              <Highlight text={pub.title} query={query} />
                            </span>
                            <span className="mt-1 block truncate text-[13px] text-neutral-500" style={body}>
                              <Highlight text={pub.authors} query={query} />
                            </span>
                            {/* Phones: journal, publisher, citations and year under the title. */}
                            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500 md:hidden" style={body}>
                              {pub.venue && <span className="font-medium text-neutral-700">{pub.venue}</span>}
                              <span>{pub.year}</span>
                              {!!pub.citations && <span>Cited by {pub.citations}</span>}
                            </span>
                          </span>
                          <span className="hidden min-w-0 text-[14px] leading-snug text-neutral-800 md:line-clamp-2" style={body}>
                            {pub.venue ? <Highlight text={pub.venue} query={query} /> : <span className="text-neutral-400">Not listed</span>}
                          </span>
                          <span className="hidden min-w-0 text-[13px] leading-snug text-neutral-500 md:line-clamp-2" style={body}>
                            {pub.publisher ? <Highlight text={pub.publisher} query={query} /> : <span className="text-neutral-400">Not listed</span>}
                          </span>
                          <span className="hidden justify-self-center md:block">
                            <span
                              className={`inline-flex min-w-[40px] justify-center rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums ${
                                pub.citations
                                  ? "bg-[#08313A] text-white"
                                  : "border border-[#0B6477]/15 bg-white text-neutral-400"
                              }`}
                              style={body}
                            >
                              {pub.citations ?? 0}
                            </span>
                          </span>
                          <span className="hidden justify-self-end text-[14px] tabular-nums text-neutral-500 md:block" style={body}>
                            {pub.year}
                          </span>
                          <ArrowUpRight className="hidden h-4 w-4 justify-self-end text-[#0B6477] opacity-0 transition-[opacity,rotate] duration-300 group-hover:rotate-45 group-hover:opacity-100 md:block" />
                        </Link>
                      </motion.li>
                    ))}
                  </motion.ul>
                </AnimatePresence>
              )}
            </div>

            {/* Footer: result count and pager. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0B6477]/10 bg-[#F3F7F6]/60 px-5 py-4 md:px-6" style={body}>
              <span className="text-[13px] text-neutral-500">
                <span className="font-semibold text-neutral-900 tabular-nums">{results.length}</span> results
                {results.length > 0 && (
                  <span className="text-neutral-400">
                    {" "}
                    · showing {current * pageSize + 1}–{current * pageSize + rows.length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => goTo(current - 1)}
                  disabled={current === 0}
                  aria-label="Previous page"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#0B6477]/15 bg-white text-neutral-700 transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[96px] text-center text-[13px] text-neutral-600 tabular-nums">
                  Page{" "}
                  <motion.span
                    key={current}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-block font-semibold text-neutral-900"
                  >
                    {current + 1}
                  </motion.span>{" "}
                  of {pages}
                </span>
                <button
                  type="button"
                  onClick={() => goTo(current + 1)}
                  disabled={current >= pages - 1}
                  aria-label="Next page"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#0B6477]/15 bg-white text-neutral-700 transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
