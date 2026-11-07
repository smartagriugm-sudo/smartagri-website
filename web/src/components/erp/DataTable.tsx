import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, ChevronsUpDown, LayoutGrid, RotateCcw, Rows3, Search } from "lucide-react";

// The ERP's one table, taken from the instrument inventory on the main site: figures
// that double as filters, status pills with counts, a search box and dropdowns, headers
// that sort, a row that lights up with a bar on its left, and on a phone each row stacks
// into a small card. Rows are given, not fetched, so any page can hand over what it has.

export type Column<T> = {
  key: string;
  label: string;
  /** Its CSS grid track. Defaults to an equal share. */
  track?: string;
  align?: "right";
  /** Makes the header sort by this column. */
  sort?: (a: T, b: T) => number;
  cell: (row: T) => ReactNode;
  /** On a phone: "title" leads the card, "hidden" drops out, the rest wrap beneath the title. */
  phone?: "title" | "hidden";
  /** For a column of buttons: they sit above the row's own link. */
  interactive?: boolean;
};

export type Pill<T> = { key: string; label: string; dot?: string; match: (row: T) => boolean };
export type Filter<T> = { label: string; all: string; value: (row: T) => string | null | undefined };
export type Figure = { label: string; value: number | string; tone: string; pill?: string };

const PAGE = 50;
const controlClass = "h-10 rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-[#36525A] outline-none transition-colors focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20";
const META = "text-[12px] font-medium tracking-[0.03em]";
const cardLink = "group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#0B6477]/10 bg-white text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#0B6477]/25 hover:shadow-[0_24px_50px_-28px_rgba(8,49,58,0.45)] motion-reduce:hover:translate-y-0";

/** The status mark in a row: a small pill with a dot in the text's colour. */
export function Chip({ label, className = "bg-[#EEF3F4] text-[#4F6B73]" }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/** A row's main text with a quieter line under it. */
export function CellTitle({ title, sub, muted }: { title: ReactNode; sub?: ReactNode; muted?: boolean }) {
  return (
    <span className="block min-w-0">
      <span className={`block truncate text-[14px] font-medium leading-snug ${muted ? "text-[#4F6B73]" : "text-[#0F2F36]"}`}>{title}</span>
      {sub && <span className="mt-0.5 block truncate text-[13px] text-[#4F6B73]">{sub}</span>}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  return <ArrowDown className={`h-3.5 w-3.5 text-[#14919B] transition-transform ${dir === "asc" ? "rotate-180" : ""}`} />;
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  noun,
  rowLink,
  onOpen,
  selected,
  searchText,
  searchLabel = "Search",
  pills,
  filters,
  figures,
  card,
  empty,
  extra,
  initialSort,
  initialPill = "all",
}: {
  rows: readonly T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Plural word for the count line: "12 of 40 items". */
  noun: string;
  rowLink?: (row: T) => string;
  onOpen?: (row: T) => void;
  selected?: string | null;
  searchText?: (row: T) => string;
  searchLabel?: string;
  pills?: Pill<T>[];
  filters?: Filter<T>[];
  figures?: Figure[];
  /** Offers a grid of cards beside the table. */
  card?: (row: T) => ReactNode;
  empty?: string;
  extra?: ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  initialPill?: string;
}) {
  const [query, setQuery] = useState("");
  const [pill, setPill] = useState(initialPill);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const [view, setView] = useState<"table" | "grid">("table");
  const [limit, setLimit] = useState(PAGE);

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      for (const f of filters ?? []) {
        const want = picked[f.label];
        if (want && f.value(r) !== want) return false;
      }
      return !q || !searchText || searchText(r).toLowerCase().includes(q);
    });
  }, [rows, query, picked, filters, searchText]);

  const shown = useMemo(() => {
    const chosen = pills?.find((p) => p.key === pill);
    const list = chosen ? base.filter(chosen.match) : [...base];
    const column = sort && columns.find((c) => c.key === sort.key);
    if (sort && column?.sort) {
      const sign = sort.dir === "asc" ? 1 : -1;
      list.sort((a, b) => column.sort!(a, b) * sign);
    }
    return list;
  }, [base, pill, pills, sort, columns]);

  const filtersOn = !!query || pill !== initialPill || Object.values(picked).some(Boolean);
  const reset = () => {
    setQuery("");
    setPill(initialPill);
    setPicked({});
    setLimit(PAGE);
  };
  const opens = !!(rowLink || onOpen);
  const template = columns.map((c) => c.track ?? "minmax(0,1fr)").join(" ") + (opens ? " 32px" : "");
  const toggleSort = (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const hasControls = !!(searchText || filters?.length || card || extra);
  const hasToolbar = !!(pills?.length || hasControls);

  return (
    <div className="space-y-4">
      {figures && figures.length > 0 && (
        <div className="grid grid-cols-2 gap-px overflow-clip rounded-2xl border border-[#0B6477]/12 bg-[#0B6477]/12 lg:grid-cols-4">
          {figures.map((f) => {
            const on = (f.pill ?? "all") === pill && (f.pill !== undefined || !filtersOn);
            return (
              <button key={f.label} type="button" aria-pressed={on} onClick={() => setPill(f.pill ?? "all")} className={`flex flex-col gap-2 p-4 text-left transition-colors ${on ? "bg-[#08313A]" : "bg-white hover:bg-[#F3F7F6]"}`}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: f.tone }} />
                  <span className={`${META} ${on ? "text-white/60" : "text-[#4F6B73]"}`}>{f.label}</span>
                </span>
                <span className={`text-[28px] font-semibold leading-none tabular-nums tracking-[-0.03em] ${on ? "text-white" : "text-[#0F2F36]"}`}>{f.value}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#0B6477]/12 bg-white shadow-[0_24px_60px_-40px_rgba(8,49,58,0.45)]">
        {hasToolbar && (
          <div className="flex flex-col gap-3 border-b border-[#0B6477]/10 p-3 md:p-4">
            {pills && pills.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by status">
                {[{ key: "all", label: "All", match: () => true } as Pill<T>, ...pills].map((p) => {
                  const on = pill === p.key;
                  return (
                    <button key={p.key} type="button" aria-pressed={on} onClick={() => setPill(p.key)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? "border-transparent bg-[#08313A] text-white" : "border-[#0B6477]/15 bg-white text-[#36525A] hover:border-[#0B6477]/40"}`}>
                      {p.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.dot }} />}
                      {p.label}
                      <span className={on ? "text-white/60" : "text-[#8FA3A8]"}>{base.filter(p.match).length}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {hasControls && (
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                {searchText && (
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8FA3A8]" />
                    <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder={searchLabel} aria-label={searchLabel} className={`${controlClass} w-full pl-9`} />
                  </div>
                )}
                {filters?.map((f) => {
                  const options = [...new Set(rows.map(f.value).filter(Boolean) as string[])].sort();
                  return (
                    <select key={f.label} aria-label={f.label} value={picked[f.label] ?? ""} onChange={(e) => setPicked((p) => ({ ...p, [f.label]: e.target.value }))} className={`${controlClass} w-full min-w-0 lg:w-auto lg:max-w-[200px]`}>
                      <option value="">{f.all}</option>
                      {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  );
                })}
                {extra}
                {card && (
                  <div className="hidden rounded-lg border border-[#0B6477]/15 bg-[#F3F7F6] p-1 md:flex" role="group" aria-label="View">
                    {([{ key: "table", icon: Rows3, label: "Table view" }, { key: "grid", icon: LayoutGrid, label: "Grid view" }] as const).map((v) => (
                      <button key={v.key} type="button" onClick={() => setView(v.key)} aria-pressed={view === v.key} aria-label={v.label} className={`grid h-8 w-9 place-items-center rounded-md transition-colors ${view === v.key ? "bg-[#08313A] text-[#45DFB1]" : "text-[#4F6B73] hover:text-[#0F2F36]"}`}>
                        <v.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex min-h-[20px] items-center justify-between gap-3">
              <p className={`${META} text-[#6B8187]`}>{shown.length === rows.length ? `${rows.length} ${noun}` : `${shown.length} of ${rows.length} ${noun}`}</p>
              {filtersOn && (
                <button type="button" onClick={reset} className={`group inline-flex items-center gap-1.5 text-[#0B6477] ${META}`}>
                  <RotateCcw className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-rotate-180" />
                  Reset filters
                </button>
              )}
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-[14px] text-[#4F6B73]">{filtersOn ? "Nothing matches these filters." : empty ?? `No ${noun} yet.`}</p>
            {filtersOn && (
              <button type="button" onClick={reset} className={`inline-flex items-center gap-1.5 border-b border-[#0B6477]/30 pb-1 text-[#0B6477] ${META}`}><RotateCcw className="h-3.5 w-3.5" /> Reset filters</button>
            )}
          </div>
        ) : view === "grid" && card ? (
          <ul className="grid gap-3 p-3 sm:grid-cols-2 md:p-4 lg:grid-cols-3 2xl:grid-cols-4">
            {shown.slice(0, limit).map((r) => (
              <li key={rowKey(r)}>
                {rowLink ? <Link to={rowLink(r)} className={cardLink}>{card(r)}</Link> : <button type="button" onClick={() => onOpen?.(r)} className={cardLink}>{card(r)}</button>}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="hidden items-center gap-4 border-b border-[#0B6477]/10 bg-[#F3F7F6]/70 px-4 py-2.5 md:grid" style={{ gridTemplateColumns: template }}>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const cls = `inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${c.align === "right" ? "justify-self-end" : ""}`;
                return c.sort ? (
                  <button key={c.key} type="button" onClick={() => toggleSort(c.key)} className={`${cls} transition-colors ${active ? "text-[#0B6477]" : "text-[#6B8187] hover:text-[#36525A]"}`}>
                    <span className="truncate">{c.label}</span>
                    <SortIcon active={!!active} dir={sort?.dir ?? "asc"} />
                  </button>
                ) : (
                  <span key={c.key} className={`${cls} text-[#6B8187]`}><span className="truncate">{c.label}</span></span>
                );
              })}
              {opens && <span />}
            </div>
            <ul>
              {shown.slice(0, limit).map((r) => {
                const key = rowKey(r);
                const on = selected === key;
                const link = rowLink?.(r);
                const cover = "absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14919B]";
                const title = columns.find((c) => c.phone === "title");
                return (
                  <li key={key} className={`group relative border-b border-[#0B6477]/8 transition-colors last:border-b-0 ${on ? "bg-[#EEF5F5]" : opens ? "hover:bg-[#F3F7F6]" : ""}`}>
                    {opens && <span className={`absolute inset-y-0 left-0 w-[3px] bg-[#14919B] transition-opacity ${on ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />}
                    {link ? <Link to={link} className={cover} aria-label="Open" /> : onOpen ? <button type="button" onClick={() => onOpen(r)} aria-pressed={on} className={cover} aria-label="Open" /> : null}
                    {/* Desktop */}
                    <div className="pointer-events-none relative hidden items-center gap-4 px-4 py-3 md:grid" style={{ gridTemplateColumns: template }}>
                      {columns.map((c) => (
                        <div key={c.key} className={`min-w-0 text-[14px] text-[#36525A] ${c.align === "right" ? "text-right" : ""} ${c.interactive ? "pointer-events-auto" : ""}`}>{c.cell(r)}</div>
                      ))}
                      {opens && (
                        <span className="grid h-8 w-8 place-items-center justify-self-end rounded-lg border border-[#0B6477]/20 text-[#0B6477] transition-colors duration-300 group-hover:border-[#08313A] group-hover:bg-[#08313A] group-hover:text-[#45DFB1]">
                          <ArrowUpRight className="h-4 w-4 transition-[rotate] duration-300 group-hover:rotate-45" />
                        </span>
                      )}
                    </div>
                    {/* Phone */}
                    <div className="pointer-events-none relative space-y-2 px-4 py-3 md:hidden">
                      {title && <div className="min-w-0">{title.cell(r)}</div>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-[#36525A]">
                        {columns.filter((c) => c !== title && c.phone !== "hidden").map((c) => <div key={c.key} className={`min-w-0 ${c.interactive ? "pointer-events-auto" : ""}`}>{c.cell(r)}</div>)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {shown.length > limit && (
          <div className="border-t border-[#0B6477]/10 p-3 text-center">
            <button type="button" onClick={() => setLimit(limit + PAGE)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Show {Math.min(PAGE, shown.length - limit)} more</button>
          </div>
        )}
      </div>
    </div>
  );
}
