import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronsUpDown,
  LayoutGrid,
  Loader2,
  Microscope,
  RotateCcw,
  Rows3,
  Search,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import AuthGate from "../components/AuthGate";
import { EASE, MaskLine, META } from "../components/NoteParts";
import { supabase } from "../lib/auth/supabase";
import {
  INSTRUMENT_STATUSES,
  type Instrument,
  type InstrumentStatus,
  formatIDR,
  statusMeta,
} from "../lib/inventory";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Instrument Inventory | smartagri" },
      // Private, gated internal tool: keep it out of search engines.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

// PUAPT (WGFS) instrument inventory: masthead, status figures that double as
// filters, a toolbar (status pills, search, lab / category / rate filters,
// table or grid view), then the instruments as a sortable table or a grid of
// cards. Each instrument opens its own page with details and the logbook.

type View = "table" | "grid";
type SortKey = "code" | "name" | "lab" | "status" | "rate";
type Sort = { key: SortKey; dir: "asc" | "desc" };
// "other" (from the summary figures) is everything portable that is neither
// available nor in use.
type StatusFilter = "All" | InstrumentStatus | "installed" | "other";

const controlClass =
  "h-10 rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-700 outline-none transition-colors focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";

const GRID =
  "md:grid md:grid-cols-[96px_minmax(0,1fr)_minmax(0,0.45fr)_150px_150px_32px] md:items-center md:gap-5";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "code", label: "Code" },
  { key: "name", label: "Instrument" },
  { key: "lab", label: "Lab" },
  { key: "status", label: "Status" },
  { key: "rate", label: "Rate", align: "right" },
];

const STATUS_ORDER: Record<string, number> = {
  available: 0,
  in_use: 1,
  calibration: 2,
  maintenance: 3,
  broken: 4,
};

function rateOf(r: Instrument) {
  return r.rate_external ?? r.rate_internal_tech ?? r.rate_internal_self;
}

// Numeric part of a WGFS code ("WGFS 91" -> 91), for smallest-to-largest sort.
function wgfsNum(code: string): number {
  const m = code.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}

function compare(a: Instrument, b: Instrument, key: SortKey) {
  switch (key) {
    case "code":
      return wgfsNum(a.code) - wgfsNum(b.code);
    case "name":
      return a.name.localeCompare(b.name);
    case "lab":
      return (a.lab ?? "").localeCompare(b.lab ?? "");
    case "status":
      return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    case "rate":
      return (rateOf(a) ?? -1) - (rateOf(b) ?? -1);
  }
}

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

function StatusChip({ r }: { r: Instrument }) {
  if (r.kind === "installed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B6477]/10 px-2.5 py-1 text-xs font-medium text-[#0B6477]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0B6477]" />
        Installed
      </span>
    );
  }
  const meta = statusMeta[r.status as InstrumentStatus];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.chip}`}>
      <span className={`relative h-1.5 w-1.5 rounded-full ${meta.dot}`}>
        {r.status === "in_use" && (
          <span className={`absolute inset-0 animate-ping rounded-full ${meta.dot} opacity-70`} />
        )}
      </span>
      {meta.label}
    </span>
  );
}

function Thumb({ r, className = "" }: { r: Instrument; className?: string }) {
  return (
    <span className={`grid place-items-center overflow-hidden rounded-xl border border-[#0B6477]/10 bg-white ${className}`}>
      {r.photo ? (
        <img src={r.photo} alt="" loading="lazy" className="h-full w-full object-contain p-1.5" />
      ) : (
        <Microscope className="h-5 w-5 text-[#0B6477]/40" />
      )}
    </span>
  );
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{shown}</span>;
}

function InventoryPage() {
  return (
    <AuthGate>
      <MotionConfig reducedMotion="user">
        <main>
          <SiteHeader />
          <div className="relative overflow-clip bg-white">
            <AmbientWash count={5} />
            <div className="relative">
              <InventoryContent />
            </div>
          </div>
          <Footer />
        </main>
      </MotionConfig>
    </AuthGate>
  );
}

function InventoryContent() {
  const [rows, setRows] = useState<Instrument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [lab, setLab] = useState("All");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [rate, setRate] = useState("All");
  const [sort, setSort] = useState<Sort>({ key: "code", dir: "asc" });
  const [view, setView] = useState<View>("table");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("Inventory storage is not configured on this environment.");
      setLoading(false);
      return;
    }
    supabase
      .from("instruments")
      .select("*")
      .order("ord", { ascending: true, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) {
          setError(err.message);
          setRows(null);
        } else {
          setRows((data ?? []) as Instrument[]);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const labs = useMemo(
    () => ["All", ...uniq((rows ?? []).map((r) => r.lab).filter(Boolean) as string[])],
    [rows],
  );
  const categories = useMemo(
    () => ["All", ...uniq((rows ?? []).map((r) => r.category).filter(Boolean) as string[])],
    [rows],
  );

  const matchesStatus = (r: Instrument, s: StatusFilter) =>
    s === "All" ||
    (s === "installed"
      ? r.kind === "installed"
      : r.kind !== "installed" &&
        (s === "other" ? r.status !== "available" && r.status !== "in_use" : r.status === s));

  // Everything except the status filter, so the pill counts follow the others.
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (lab !== "All" && r.lab !== lab) return false;
      if (category !== "All" && r.category !== category) return false;
      if (rate !== "All") {
        const hasRate =
          r.rate_internal_self != null || r.rate_internal_tech != null || r.rate_external != null;
        if (rate === "With rate" && !hasRate) return false;
        if (rate === "No rate" && hasRate) return false;
      }
      if (q) {
        const hay = `${r.code} ${r.name} ${r.brand ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, lab, category, rate]);

  const filtered = useMemo(() => {
    const sign = sort.dir === "asc" ? 1 : -1;
    return base
      .filter((r) => matchesStatus(r, status))
      .sort(
        (a, b) =>
          compare(a, b, sort.key) * sign ||
          wgfsNum(a.code) - wgfsNum(b.code) ||
          (a.ord ?? 0) - (b.ord ?? 0) ||
          a.name.localeCompare(b.name),
      );
  }, [base, status, sort]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    const n = (s: StatusFilter) => all.filter((r) => matchesStatus(r, s)).length;
    return { total: all.length, available: n("available"), in_use: n("in_use"), other: n("other") };
    // matchesStatus only reads its arguments
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const pills: { key: StatusFilter; label: string; dot?: string }[] = [
    { key: "All", label: "All" },
    ...INSTRUMENT_STATUSES.map((s) => ({ key: s as StatusFilter, label: statusMeta[s].label, dot: statusMeta[s].dot })),
    { key: "installed", label: "Installed", dot: "bg-[#0B6477]" },
  ];

  const filtersOn = query || lab !== "All" || category !== "All" || rate !== "All" || status !== "All";
  const reset = () => {
    setQuery("");
    setLab("All");
    setCategory("All");
    setRate("All");
    setStatus("All");
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const figures: { label: string; value: number; tone: string; filter: StatusFilter }[] = [
    { label: "Instruments", value: counts.total, tone: "#0B6477", filter: "All" },
    { label: "Available", value: counts.available, tone: "#12B886", filter: "available" },
    { label: "In use", value: counts.in_use, tone: "#14919B", filter: "in_use" },
    { label: "Maintenance and other", value: counts.other, tone: "#F59E0B", filter: "other" },
  ];

  return (
    <>
      {/* Masthead */}
      <section className="mx-auto max-w-[1360px] px-6 pt-12 md:px-12 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`flex items-center gap-2 text-[#14919B] ${META}`}
              style={body}
            >
              <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
              PUAPT · WGFS
            </motion.p>
            <motion.h1
              initial="hidden"
              animate="show"
              className="mt-5 text-[44px] font-semibold leading-[1.0] tracking-[-0.04em] text-neutral-900 sm:text-6xl md:text-[72px]"
              style={display}
            >
              <MaskLine delay={0}>Instrument inventory</MaskLine>
              <MaskLine delay={0.12}>
                <span style={accent}>and logbook.</span>
              </MaskLine>
            </motion.h1>
          </div>
          <div className="lg:col-span-4">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="text-base leading-relaxed text-neutral-600 md:text-lg"
              style={body}
            >
              Every PUAPT research instrument with its status and rates. Open one to see its details,
              check it out, return it, or log an inspection.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
              className="mt-6"
            >
              <Link
                to="/inventory/stats"
                className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#08313A] px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0B6477]"
                style={body}
              >
                <BarChart3 className="h-4 w-4 text-[#45DFB1]" />
                View statistics
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Figures: click to filter */}
        <div className="mt-12 grid grid-cols-2 gap-px overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-[#0B6477]/12 lg:grid-cols-4">
          {figures.map((f, i) => {
            const on = status === f.filter && (f.filter !== "All" || !filtersOn);
            return (
              <motion.button
                key={f.label}
                type="button"
                onClick={() => setStatus(f.filter)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.08, duration: 0.6, ease: EASE }}
                className={`group relative flex flex-col gap-3 p-5 text-left transition-colors md:p-6 ${
                  on ? "bg-[#08313A]" : "bg-white/90 hover:bg-[#F3F7F6]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: f.tone }} />
                  <span className={`${META} ${on ? "text-white/60" : "text-neutral-500"}`} style={body}>
                    {f.label}
                  </span>
                </span>
                <span
                  className={`text-4xl font-semibold leading-none tracking-[-0.035em] md:text-5xl ${on ? "text-white" : "text-neutral-900"}`}
                  style={display}
                >
                  {loading ? "–" : <CountUp value={f.value} />}
                </span>
                <ArrowUpRight
                  className={`absolute right-5 top-5 h-4 w-4 transition-[rotate,color] duration-300 group-hover:rotate-45 ${
                    on ? "text-[#45DFB1]" : "text-[#0B6477]/40"
                  }`}
                />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Toolbar + list */}
      <section className="mx-auto max-w-[1360px] px-6 pb-20 pt-10 md:px-12 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
          className="overflow-hidden rounded-[24px] border border-[#0B6477]/12 bg-white/90 shadow-[0_24px_60px_-40px_rgba(8,49,58,0.45)] backdrop-blur"
        >
          <div className="flex flex-col gap-4 border-b border-[#0B6477]/10 p-4 md:p-5">
            {/* Status pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filter by status">
              {pills.map((p) => {
                const on = status === p.key;
                const n = base.filter((r) => matchesStatus(r, p.key)).length;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setStatus(p.key)}
                    className={`relative inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      on ? "border-transparent text-white" : "border-[#0B6477]/15 bg-white text-neutral-700 hover:border-[#0B6477]/40"
                    }`}
                    style={body}
                  >
                    {on && (
                      <motion.span
                        layoutId="inventory-status-pill"
                        className="absolute inset-0 rounded-full bg-[#08313A]"
                        transition={{ duration: 0.45, ease: EASE }}
                      />
                    )}
                    {p.dot && <span className={`relative h-1.5 w-1.5 rounded-full ${p.dot}`} />}
                    <span className="relative">
                      {p.label}
                      <span className={on ? "text-white/60" : "text-neutral-400"}> {n}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by code, name, or brand"
                  aria-label="Search instruments"
                  className={`${controlClass} w-full pl-9`}
                  style={body}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 lg:flex">
                {[
                  { value: lab, set: setLab, options: labs, all: "All labs", label: "Filter by lab" },
                  { value: category, set: setCategory, options: categories, all: "All categories", label: "Filter by category" },
                  { value: rate, set: setRate, options: ["All", "With rate", "No rate"], all: "Any rate", label: "Filter by rate" },
                ].map((s) => (
                  <select
                    key={s.label}
                    value={s.value}
                    onChange={(e) => s.set(e.target.value)}
                    aria-label={s.label}
                    className={`${controlClass} w-full min-w-0 px-2 lg:w-auto lg:max-w-[200px] lg:px-3`}
                    style={body}
                  >
                    {s.options.map((o) => (
                      <option key={o} value={o}>
                        {o === "All" ? s.all : o}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              {/* View toggle */}
              <div className="hidden rounded-lg border border-[#0B6477]/15 bg-[#F3F7F6] p-1 md:flex" role="group" aria-label="View">
                {(
                  [
                    { key: "table", icon: Rows3, label: "Table view" },
                    { key: "grid", icon: LayoutGrid, label: "Grid view" },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setView(v.key)}
                    aria-pressed={view === v.key}
                    aria-label={v.label}
                    className={`relative grid h-8 w-9 place-items-center rounded-md transition-colors ${
                      view === v.key ? "text-[#45DFB1]" : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {view === v.key && (
                      <motion.span
                        layoutId="inventory-view"
                        className="absolute inset-0 rounded-md bg-[#08313A]"
                        transition={{ duration: 0.4, ease: EASE }}
                      />
                    )}
                    <v.icon className="relative h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className={`text-neutral-400 ${META}`} style={body}>
                {loading ? "Loading" : `${filtered.length} of ${counts.total} instruments`}
              </p>
              <AnimatePresence>
                {filtersOn && (
                  <motion.button
                    type="button"
                    onClick={reset}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className={`group inline-flex items-center gap-1.5 text-[#0B6477] ${META}`}
                    style={body}
                  >
                    <RotateCcw className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-rotate-180" />
                    Reset filters
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
            </div>
          ) : error ? (
            <p className="px-6 py-16 text-center text-sm text-neutral-500" style={body}>
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <p className="text-neutral-500" style={body}>
                No instruments match these filters.
              </p>
              <button
                type="button"
                onClick={reset}
                className={`inline-flex items-center gap-1.5 border-b border-[#0B6477]/30 pb-1 text-[#0B6477] ${META}`}
                style={body}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset filters
              </button>
            </div>
          ) : view === "grid" ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.ul
                key={`grid-${status}-${lab}-${category}-${rate}-${query}-${sort.key}-${sort.dir}`}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                variants={{ show: { transition: { staggerChildren: 0.025 } } }}
                className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filtered.map((r) => (
                  <motion.li
                    key={r.id}
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
                    }}
                  >
                    <Link
                      to="/inventory/$slug"
                      params={{ slug: r.slug }}
                      className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-[#0B6477]/10 bg-white transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[#0B6477]/25 hover:shadow-[0_24px_50px_-28px_rgba(8,49,58,0.45)]"
                    >
                      <span className="relative block aspect-[4/3] bg-[#F3F7F6]">
                        {r.photo ? (
                          <img
                            src={r.photo}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-contain p-6 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                          />
                        ) : (
                          <span className="grid h-full place-items-center">
                            <Microscope className="h-8 w-8 text-[#0B6477]/30" />
                          </span>
                        )}
                        <span className={`absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[#0B6477] ${META}`} style={body}>
                          <Highlight text={r.code} query={query} />
                        </span>
                        <span className="absolute right-3 top-3">
                          <StatusChip r={r} />
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col gap-1.5 p-5">
                        <span
                          className="text-[17px] font-medium leading-snug tracking-[-0.01em] text-neutral-900 transition-colors group-hover:text-[#0B6477]"
                          style={display}
                        >
                          <Highlight text={r.name} query={query} />
                        </span>
                        <span className="text-[13px] text-neutral-500" style={body}>
                          <Highlight text={r.brand ?? ""} query={query} />
                          {r.brand && r.category ? " · " : ""}
                          {r.category}
                        </span>
                        <span className="mt-auto flex items-end justify-between gap-3 pt-4">
                          <span className="text-[13px] text-neutral-500" style={body}>
                            {r.lab}
                          </span>
                          <span className="text-right text-sm font-medium text-neutral-900" style={body}>
                            {formatIDR(rateOf(r))}
                            {r.unit && <span className="font-normal text-neutral-400"> {r.unit}</span>}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>
          ) : (
            <>
              {/* Column headers: click to sort, again to flip. */}
              <div className={`hidden border-b border-[#0B6477]/10 bg-[#F3F7F6]/70 px-6 py-3 ${GRID}`} role="row">
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                        c.align === "right" ? "justify-self-end" : ""
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

              <div onMouseLeave={() => setHovered(null)} className="relative">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.ul
                    key={`table-${status}-${lab}-${category}-${rate}-${query}-${sort.key}-${sort.dir}`}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    variants={{ show: { transition: { staggerChildren: 0.015 } } }}
                  >
                    {filtered.map((r) => (
                      <motion.li
                        key={r.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
                        }}
                        onMouseEnter={() => setHovered(r.id)}
                        className="relative border-b border-[#0B6477]/8 last:border-b-0"
                      >
                        {hovered === r.id && (
                          <motion.span
                            layoutId="inventory-row-hover"
                            className="absolute inset-0 bg-[#F3F7F6]"
                            transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          >
                            <span className="absolute inset-y-0 left-0 w-[3px] bg-[#14919B]" />
                          </motion.span>
                        )}
                        <Link
                          to="/inventory/$slug"
                          params={{ slug: r.slug }}
                          className={`group relative flex gap-4 px-5 py-4 md:px-6 ${GRID}`}
                        >
                          <span className={`hidden text-neutral-500 md:block ${META}`} style={body}>
                            <Highlight text={r.code} query={query} />
                          </span>
                          <span className="flex min-w-0 flex-1 items-center gap-3.5">
                            <Thumb r={r} className="h-12 w-12 shrink-0" />
                            <span className="min-w-0">
                              <span
                                className="block text-[15px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-[#0B6477]"
                                style={display}
                              >
                                <Highlight text={r.name} query={query} />
                              </span>
                              <span className="mt-0.5 block truncate text-[13px] text-neutral-500" style={body}>
                                <span className="md:hidden">{r.code} · </span>
                                <Highlight text={r.brand ?? ""} query={query} />
                                {r.brand && r.category ? " · " : ""}
                                {r.category}
                              </span>
                              {/* Phones: status and rate under the name. */}
                              <span className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                                <StatusChip r={r} />
                                <span className="text-[13px] text-neutral-700" style={body}>
                                  {formatIDR(rateOf(r))}
                                  {r.unit && <span className="text-neutral-400"> {r.unit}</span>}
                                </span>
                              </span>
                            </span>
                          </span>
                          <span className="hidden min-w-0 truncate text-sm text-neutral-600 md:block" style={body}>
                            {r.lab}
                          </span>
                          <span className="hidden md:block">
                            <StatusChip r={r} />
                          </span>
                          <span className="hidden text-right text-sm text-neutral-800 md:block" style={body}>
                            {formatIDR(rateOf(r))}
                            {r.unit && <span className="block text-[12px] text-neutral-400">{r.unit}</span>}
                          </span>
                          <span className="hidden h-8 w-8 place-items-center justify-self-end rounded-lg border border-[#0B6477]/20 text-[#0B6477] transition-colors duration-300 group-hover:border-[#08313A] group-hover:bg-[#08313A] group-hover:text-[#45DFB1] md:grid">
                            <ArrowUpRight className="h-4 w-4 transition-[rotate] duration-300 group-hover:rotate-45" />
                          </span>
                        </Link>
                      </motion.li>
                    ))}
                  </motion.ul>
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </section>
    </>
  );
}
