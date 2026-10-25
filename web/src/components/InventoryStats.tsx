// Presentational building blocks for the inventory statistics page. Each is a
// small, self-contained component with its own loading skeleton and empty
// state. All numbers come in as props (computed by lib/inventory-stats.ts); no
// component fetches or fabricates data.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useInView } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { body, display } from "../lib/fonts";
import {
  type ActivityEvent,
  type Delta,
  type MonthPoint,
  type NamedCount,
  type OutRow,
  type StatusRow,
  relativeTime,
} from "../lib/inventory-stats";
import { EASE, META } from "./NoteParts";

/* ---------------- shared primitives ---------------- */

// An instrument name that links to its detail page when a slug is known.
function InstrumentLink({
  slug,
  className,
  children,
}: {
  slug?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!slug) return <span className={className}>{children}</span>;
  return (
    <Link
      to="/inventory/$slug"
      params={{ slug }}
      className={`${className ?? ""} transition-colors hover:text-[#0B6477]`}
    >
      {children}
    </Link>
  );
}

// Counts from 0 to the value once it scrolls into view.
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setShown(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <span ref={ref} className="tabular-nums">
      {shown.toFixed(decimals)}
    </span>
  );
}

export function Card({
  title,
  eyebrow,
  action,
  children,
  dark = false,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE }}
      data-header-theme={dark ? "dark" : undefined}
      className={`relative overflow-hidden rounded-[24px] border p-6 md:p-7 ${
        dark
          ? "border-transparent bg-[#08313A] text-white"
          : "border-[#0B6477]/12 bg-white/90 shadow-[0_14px_40px_-30px_rgba(8,49,58,0.35)] backdrop-blur"
      } ${className}`}
    >
      {dark && (
        <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-[#14919B]/30 blur-3xl" />
      )}
      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <p className={`mb-1.5 ${dark ? "text-[#45DFB1]" : "text-[#14919B]"} ${META}`} style={body}>
              {eyebrow}
            </p>
          )}
          <h2
            className={`text-xl font-medium tracking-[-0.02em] ${dark ? "text-white" : "text-neutral-900"}`}
            style={display}
          >
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function Skeleton({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return <div className={`animate-pulse rounded-md ${dark ? "bg-white/10" : "bg-[#EDF3F2]"} ${className}`} />;
}

function Empty({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`py-6 text-center text-sm ${dark ? "text-white/50" : "text-neutral-400"}`} style={body}>
      {children}
    </p>
  );
}

/* ---------------- A. KPI cell with month-over-month delta ---------------- */

// One cell of the KPI strip; place several inside a gap-px grid.
export function KpiCard({
  label,
  value,
  delta,
  tone = "#0B6477",
  loading,
  index = 0,
}: {
  label: string;
  value: number;
  delta?: Delta;
  tone?: string;
  loading?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.08, duration: 0.6, ease: EASE }}
      className="flex flex-col gap-4 bg-white/90 p-5 md:p-6"
    >
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
        <span className={`text-neutral-500 ${META}`} style={body}>
          {label}
        </span>
      </span>
      {loading ? (
        <Skeleton className="h-11 w-20" />
      ) : (
        <span className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold leading-none tracking-[-0.035em] text-neutral-900 md:text-5xl" style={display}>
            <CountUp value={value} />
          </span>
          {delta && <DeltaBadge delta={delta} />}
        </span>
      )}
    </motion.div>
  );
}

function DeltaBadge({ delta }: { delta: Delta }) {
  if (delta.dir === "flat" && delta.current === 0 && delta.previous === 0) return null;
  const isUp = delta.dir === "up";
  const isDown = delta.dir === "down";
  const tone = isUp
    ? "bg-[#12B886]/12 text-[#0B7A5A]"
    : isDown
      ? "bg-[#E5484D]/12 text-[#B42318]"
      : "bg-neutral-100 text-neutral-500";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const text = delta.pct == null ? "new" : `${Math.abs(Math.round(delta.pct))}%`;
  return (
    <span
      className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      style={body}
      title={`${delta.current} this month vs ${delta.previous} last month`}
    >
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

/* ---------------- B. rate cards: donut gauge + big number ---------------- */

export function GaugeCard({
  title,
  sub,
  pct,
  tone = "#14919B",
  loading,
  empty,
}: {
  title: string;
  sub?: string;
  pct: number | null;
  tone?: string;
  loading?: boolean;
  empty?: string;
}) {
  return (
    <Card title={title} eyebrow="Rate" className="h-full">
      {loading ? (
        <Skeleton className="mx-auto h-28 w-28 rounded-full" />
      ) : pct == null ? (
        <Empty>{empty ?? "Not enough data."}</Empty>
      ) : (
        <div className="flex items-center gap-5">
          <Donut pct={pct} tone={tone} />
          {sub && (
            <p className="text-[15px] leading-relaxed text-neutral-500" style={body}>
              {sub}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function BigStatCard({
  title,
  value,
  unit,
  sub,
  loading,
  empty,
}: {
  title: string;
  value: string | null;
  unit?: string;
  sub?: string;
  loading?: boolean;
  empty?: string;
}) {
  const num = value == null ? NaN : Number(value);
  const decimals = value?.includes(".") ? value.split(".")[1]!.length : 0;
  return (
    <Card title={title} eyebrow="Average" className="h-full">
      {loading ? (
        <Skeleton className="h-12 w-28" />
      ) : value == null ? (
        <Empty>{empty ?? "Not enough data."}</Empty>
      ) : (
        <>
          <div className="text-5xl font-semibold tracking-[-0.035em] text-neutral-900" style={display}>
            {Number.isFinite(num) ? <CountUp value={num} decimals={decimals} /> : value}
            {unit && <span className="text-xl font-normal text-neutral-400"> {unit}</span>}
          </div>
          {sub && (
            <p className="mt-2 text-[15px] text-neutral-500" style={body}>
              {sub}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

// Ring that fills as it comes into view.
function Donut({ pct, tone }: { pct: number; tone: string }) {
  const r = 42;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#EDF3F2" strokeWidth="9" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="9"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: clamped / 100 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.3, ease: EASE }}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tracking-[-0.03em] text-neutral-900"
        style={display}
      >
        <CountUp value={clamped} />%
      </div>
    </div>
  );
}

/* ---------------- C. currently out & overdue ---------------- */

export function CurrentlyOutPanel({
  rows,
  overdueCount,
  loading,
}: {
  rows: OutRow[];
  overdueCount: number;
  loading?: boolean;
}) {
  return (
    <Card
      title="Currently out and overdue"
      eyebrow="Right now"
      action={
        overdueCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 px-3 py-1.5 text-xs font-medium text-[#8A5300]" style={body}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {overdueCount} overdue
          </span>
        ) : (
          <span className={`rounded-full bg-[#F3F7F6] px-3 py-1.5 text-neutral-500 ${META}`} style={body}>
            {rows.length} out
          </span>
        )
      }
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Empty>Nothing is checked out right now.</Empty>
      ) : (
        <div className="-mx-6 overflow-x-auto md:-mx-7">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="border-y border-[#0B6477]/10 bg-[#F3F7F6]/70 text-neutral-400">
                {["Instrument", "Borrower", "Out", "Due", "Status"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] first:pl-6 md:first:pl-7" style={body}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.4, ease: EASE }}
                  className={`border-b border-[#0B6477]/8 text-sm transition-colors last:border-b-0 hover:bg-[#F3F7F6]/70 ${
                    r.overdueDays ? "bg-[#F59E0B]/[0.06]" : ""
                  }`}
                >
                  <td className="px-6 py-3 font-medium text-neutral-900 md:pl-7" style={body}>
                    <InstrumentLink slug={r.slug} className="text-neutral-900">
                      {r.instrument}
                    </InstrumentLink>
                  </td>
                  <td className="px-6 py-3 text-neutral-600" style={body}>
                    {r.borrower}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-neutral-600" style={body}>
                    {fmt(r.checkoutAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-neutral-600" style={body}>
                    {r.due ? fmt(r.due) : "-"}
                  </td>
                  <td className="px-6 py-3" style={body}>
                    {r.overdueDays ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5484D]/12 px-2.5 py-1 text-xs font-medium text-[#B42318]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E5484D]" />
                        {r.overdueDays}d overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14919B]/15 px-2.5 py-1 text-xs font-medium text-[#0B6477]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#14919B]" />
                        Out
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ---------------- D. recent activity feed ---------------- */

export function ActivityFeed({
  events,
  now,
  loading,
}: {
  events: ActivityEvent[];
  now: Date;
  loading?: boolean;
}) {
  const meta = {
    borrow: { Icon: ArrowUpRight, tone: "#14919B", bg: "bg-[#14919B]/12", verb: "took out" },
    return: { Icon: ArrowDownLeft, tone: "#12B886", bg: "bg-[#12B886]/12", verb: "returned" },
    check: { Icon: Wrench, tone: "#8A5300", bg: "bg-[#F59E0B]/15", verb: "inspected" },
  } as const;
  return (
    <Card title="Recent activity" eyebrow="Logbook" className="h-full">
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <ul className="relative flex flex-col gap-4">
          {/* Timeline spine behind the icons */}
          <span aria-hidden="true" className="absolute bottom-3 left-[17px] top-3 w-px bg-[#0B6477]/12" />
          {events.map((e, i) => {
            const m = meta[e.type];
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.45, ease: EASE }}
                className="relative flex items-start gap-3.5"
              >
                <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-4 ring-white`}>
                  <span className={`absolute inset-0 rounded-full ${m.bg}`} />
                  <m.Icon className="relative h-4 w-4" style={{ color: m.tone }} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[15px] leading-snug text-neutral-600" style={body}>
                    <span className="font-medium text-neutral-900">{e.person}</span> {m.verb}{" "}
                    <InstrumentLink slug={e.slug} className="font-medium text-neutral-900">
                      {e.instrument}
                    </InstrumentLink>
                  </p>
                  <p className={`mt-1 text-neutral-400 ${META}`} style={body}>
                    {relativeTime(e.at, now)}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- E. loan status breakdown ---------------- */

export function StatusBreakdown({
  rows,
  loading,
}: {
  rows: StatusRow[];
  loading?: boolean;
}) {
  const shown = rows.filter((r) => r.available && r.value > 0);
  return (
    <Card title="Loan status breakdown" eyebrow="All loans" className="h-full">
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Stacked bar of the loans that have a status */}
          {shown.length > 0 && (
            <motion.div
              className="mb-6 flex h-3 overflow-hidden rounded-full bg-[#F3F7F6]"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {shown.map((r, i) => (
                <motion.span
                  key={r.label}
                  className="h-full"
                  style={{ background: r.tone }}
                  variants={{
                    hidden: { width: 0 },
                    show: { width: `${r.pct}%`, transition: { delay: i * 0.1, duration: 0.9, ease: EASE } },
                  }}
                />
              ))}
            </motion.div>
          )}
          <ul className="flex flex-col">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center gap-3 border-t border-[#0B6477]/8 py-3 first:border-t-0 first:pt-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.tone }} />
                <span className="flex-1 text-[15px] text-neutral-700" style={body}>
                  {r.label}
                  {!r.available && (
                    <span className="ml-1.5 text-xs text-neutral-400">· needs a due-date / status field</span>
                  )}
                </span>
                <span className="text-[15px] font-medium tabular-nums text-neutral-900" style={body}>
                  {r.available ? r.value : "-"}
                </span>
                <span className="w-12 text-right text-xs tabular-nums text-neutral-400" style={body}>
                  {r.available ? `${r.pct}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ---------------- ranking bar list (most-used / top people / underused) --------- */

export function BarList({
  rows,
  color = "#0B6477",
  loading,
  empty,
  invertNote,
}: {
  rows: NamedCount[];
  color?: string;
  loading?: boolean;
  empty?: string;
  invertNote?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <Empty>{empty ?? "No data."}</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    // The list triggers the reveal: a bar at scale 0 has no area, so it could
    // never report itself in view.
    <motion.ol
      className="flex flex-col gap-1"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {rows.map((r, i) => {
        const pct = ((invertNote ? max - r.value : r.value) / max) * 100;
        return (
          <li
            key={r.label}
            className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F3F7F6]"
          >
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-neutral-300" style={body}>
              {i + 1}
            </span>
            <div className="w-[38%] shrink-0 truncate text-sm text-neutral-700" style={body} title={r.label}>
              <InstrumentLink slug={r.slug} className="text-neutral-700">
                {r.label}
              </InstrumentLink>
            </div>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3F7F6] group-hover:bg-white">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ backgroundColor: color, width: `${Math.max(pct, r.value === 0 ? 0 : 3)}%` }}
                variants={{
                  hidden: { scaleX: 0 },
                  show: { scaleX: 1, transition: { delay: Math.min(i, 8) * 0.05, duration: 0.9, ease: EASE } },
                }}
              />
            </div>
            <div className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-900" style={body}>
              {r.value}
            </div>
          </li>
        );
      })}
    </motion.ol>
  );
}

/* ---------------- monthly activity chart ---------------- */

// Columns grow on view; the latest month is highlighted and the hovered one
// shows its value above it.
export function MonthlyChart({
  data,
  loading,
  dark = false,
}: {
  data: MonthPoint[];
  loading?: boolean;
  dark?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  if (loading) return <Skeleton className="h-64 w-full" dark={dark} />;
  if (data.length === 0) return <Empty dark={dark}>No activity yet.</Empty>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const last = data[data.length - 1]!.key;
  return (
    <div className="overflow-x-auto">
      <div className="relative h-64" style={{ minWidth: data.length * 44 }}>
        {/* Gridlines */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-6 top-6 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-px w-full ${dark ? "bg-white/8" : "bg-[#0B6477]/8"}`} />
          ))}
        </div>
        <motion.div
          className="relative flex h-full items-end gap-2"
          onMouseLeave={() => setHover(null)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          {data.map((d, i) => {
            const isLast = d.key === last;
            const on = hover === d.key || (hover == null && isLast);
            return (
              <div
                key={d.key}
                className="flex h-full min-w-[34px] flex-1 cursor-default flex-col items-center"
                onMouseEnter={() => setHover(d.key)}
              >
                <div
                  className={`mb-1 text-[11px] font-semibold tabular-nums transition-opacity ${
                    on ? "opacity-100" : "opacity-0"
                  } ${dark ? "text-[#45DFB1]" : "text-[#0B6477]"}`}
                  style={body}
                >
                  {d.value}
                </div>
                <div className="flex min-h-0 w-full flex-1 items-end">
                  <motion.div
                    className={`w-full origin-bottom rounded-t-md transition-colors ${
                      on
                        ? "bg-[#45DFB1]"
                        : dark
                          ? "bg-white/15"
                          : "bg-[#0B6477]/25"
                    }`}
                    style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
                    variants={{
                      hidden: { scaleY: 0 },
                      show: { scaleY: 1, transition: { delay: i * 0.035, duration: 0.8, ease: EASE } },
                    }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
                <div
                  className={`mt-1.5 whitespace-nowrap text-[10px] ${on ? (dark ? "text-white" : "text-neutral-900") : dark ? "text-white/40" : "text-neutral-400"}`}
                  style={body}
                >
                  {d.label}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
