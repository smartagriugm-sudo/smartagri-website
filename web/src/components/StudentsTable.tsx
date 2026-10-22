import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  GraduationCap,
  Search,
} from "lucide-react";
import { body, display } from "../lib/fonts";
import { STUDENTS, type Student, type StudentLevel } from "../lib/students";
import { EASE } from "./NoteParts";

// Students who worked with the center, as a searchable, sortable, paged table
// (same pattern as the Publications table): search and filters on top, sort
// from the column headers, pager at the bottom.

const LEVELS: StudentLevel[] = ["Doctoral", "Postgraduate", "Undergraduate"];
const LEVEL_RANK: Record<StudentLevel, number> = { Doctoral: 0, Postgraduate: 1, Undergraduate: 2 };
const YEARS = [...new Set(STUDENTS.map((s) => s.year))].sort((a, b) => b - a);
const PAGE_SIZES = [10, 25, 50];

type SortKey = "name" | "level" | "year";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string; align?: "right"; first: "asc" | "desc" }[] = [
  { key: "name", label: "Student", first: "asc" },
  { key: "level", label: "Level", first: "asc" },
  { key: "year", label: "Year", align: "right", first: "desc" },
];

const GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_80px]";

const levelPill: Record<StudentLevel, string> = {
  Doctoral: "bg-[#08313A] text-[#45DFB1]",
  Postgraduate: "bg-[#45DFB1]/25 text-[#0B6477]",
  Undergraduate: "border border-[#0B6477]/15 bg-white text-neutral-600",
};

const avatarTint = ["bg-[#0B6477]", "bg-[#14919B]", "bg-[#08313A]", "bg-[#45DFB1] text-[#08313A]"];

const collator = new Intl.Collator("id", { sensitivity: "base" });

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
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

const controlClass =
  "h-10 rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-700 outline-none transition-colors focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";

export default function StudentsTable() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"all" | StudentLevel>("all");
  const [year, setYear] = useState<"all" | number>("all");
  const [sort, setSort] = useState<Sort>({ key: "year", dir: "desc" });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = STUDENTS.map((s, i) => ({ ...s, i })).filter(
      (s) =>
        (level === "all" || s.level === level) &&
        (year === "all" || s.year === year) &&
        (!q || s.name.toLowerCase().includes(q)),
    );
    const sign = sort.dir === "asc" ? 1 : -1;
    const cmp = (a: Student, b: Student) =>
      sort.key === "name"
        ? collator.compare(a.name, b.name)
        : sort.key === "level"
          ? LEVEL_RANK[a.level] - LEVEL_RANK[b.level]
          : a.year - b.year;
    return list.sort((a, b) => cmp(a, b) * sign || collator.compare(a.name, b.name));
  }, [query, level, year, sort]);

  useEffect(() => setPage(0), [query, level, year, sort, pageSize]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const view = rows.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: SortKey, first: "asc" | "desc") =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: first }));

  return (
    <div className="overflow-clip rounded-[24px] border border-[#0B6477]/12 bg-white/90 shadow-[0_30px_80px_-50px_rgba(8,49,58,0.45)] backdrop-blur">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-[#0B6477]/10 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#0B6477]/15 bg-[#F3F7F6] text-[#0B6477]">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span style={body}>
            <span className="block text-lg font-semibold tracking-[-0.02em] text-neutral-900" style={display}>
              Students
            </span>
            <span className="block text-[13px] text-neutral-500">
              {STUDENTS.length} students across {YEARS.length} years
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              aria-label="Search students"
              className={`${controlClass} w-full pl-9`}
              style={body}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 md:flex">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as "all" | StudentLevel)}
              aria-label="Filter by level"
              className={`${controlClass} w-full min-w-0 px-2 md:w-auto md:px-3`}
              style={body}
            >
              <option value="all">All levels</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
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
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Students per page"
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

      {/* Column headers */}
      <div className={`border-b border-[#0B6477]/10 bg-[#F3F7F6]/70 px-5 py-3 md:px-6 ${GRID}`}>
        {COLUMNS.map((c) => {
          const active = sort.key === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleSort(c.key, c.first)}
              aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                c.align === "right" ? "justify-self-end" : ""
              } ${c.key === "level" ? "hidden md:inline-flex" : ""} ${
                active ? "text-[#0B6477]" : "text-neutral-400 hover:text-neutral-700"
              }`}
              style={body}
            >
              {c.label}
              {active ? (
                <motion.span animate={{ rotate: sort.dir === "asc" ? 180 : 0 }} transition={{ duration: 0.3, ease: EASE }} className="inline-flex text-[#14919B]">
                  <ArrowDown className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div onMouseLeave={() => setHovered(null)}>
        {view.length === 0 ? (
          <p className="px-6 py-14 text-center text-neutral-500" style={body}>
            No students match your search.
          </p>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={`${current}-${sort.key}-${sort.dir}-${level}-${year}-${pageSize}-${query}`}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              variants={{ show: { transition: { staggerChildren: 0.025 } } }}
            >
              {view.map((s) => (
                <motion.li
                  key={s.i}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
                  }}
                  onMouseEnter={() => setHovered(s.i)}
                  className="relative border-b border-[#0B6477]/8 last:border-b-0"
                >
                  {hovered === s.i && (
                    <motion.span
                      layoutId="student-row-hover"
                      className="absolute inset-0 bg-[#F3F7F6]"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    >
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-[#14919B]" />
                    </motion.span>
                  )}
                  <div className={`relative px-5 py-3.5 md:px-6 ${GRID}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white ${avatarTint[s.i % avatarTint.length]}`}
                        style={body}
                        aria-hidden="true"
                      >
                        {initials(s.name)}
                      </span>
                      <span className="min-w-0" style={body}>
                        <span className="block truncate text-[15px] font-medium text-neutral-900">
                          <Highlight text={s.name} query={query} />
                        </span>
                        <span className="block text-[12px] text-neutral-500 md:hidden">{s.level}</span>
                      </span>
                    </span>
                    <span className="hidden md:block">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${levelPill[s.level]}`} style={body}>
                        {s.level}
                      </span>
                    </span>
                    <span className="justify-self-end text-[14px] tabular-nums text-neutral-500" style={body}>
                      {s.year}
                    </span>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0B6477]/10 bg-[#F3F7F6]/60 px-5 py-4 md:px-6" style={body}>
        <span className="text-[13px] text-neutral-500">
          <span className="font-semibold text-neutral-900 tabular-nums">{rows.length}</span> results
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="Previous page"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#0B6477]/15 bg-white text-neutral-700 transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1] disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[96px] text-center text-[13px] tabular-nums text-neutral-600">
            Page{" "}
            <motion.span key={current} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block font-semibold text-neutral-900">
              {current + 1}
            </motion.span>{" "}
            of {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            aria-label="Next page"
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#0B6477]/15 bg-white text-neutral-700 transition-colors hover:border-[#08313A] hover:bg-[#08313A] hover:text-[#45DFB1] disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
