// Presentational building blocks for the inventory statistics page. Each is a
// small, self-contained component with its own loading skeleton and empty
// state. All numbers come in as props (computed by lib/inventory-stats.ts); no
// component fetches or fabricates data.
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import {
  type ActivityEvent,
  type Delta,
  type MonthPoint,
  type NamedCount,
  type OutRow,
  type StatusRow,
  relativeTime,
} from "../lib/inventory-stats";

/* ---------------- shared primitives ---------------- */

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#0B6477]/12 bg-white p-6 shadow-[0_1px_2px_rgba(8,49,58,0.04),0_8px_24px_rgba(8,49,58,0.05)]">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-medium text-neutral-900" style={display}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#EDF3F2] ${className}`} />;
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-neutral-400 py-6 text-center" style={body}>
      {children}
    </p>
  );
}

function Heading2({ pre, hi }: { pre: string; hi: string }) {
  return (
    <h1
      className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.05] text-neutral-900"
      style={display}
    >
      {pre} <span style={accent}>{hi}</span>
    </h1>
  );
}
export { Heading2 };

/* ---------------- A. KPI card with month-over-month delta ---------------- */

export function KpiCard({
  label,
  value,
  delta,
  tone,
  loading,
}: {
  label: string;
  value: number;
  delta?: Delta;
  tone?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] px-4 py-4">
      {loading ? (
        <>
          <Skeleton className="h-8 w-14 mb-2" />
          <Skeleton className="h-3 w-24" />
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-semibold tracking-[-0.03em] tabular-nums"
              style={{ ...display, color: tone }}
            >
              {value}
            </span>
            {delta && <DeltaBadge delta={delta} />}
          </div>
          <div className="text-xs font-normal text-neutral-500 mt-1" style={body}>
            {label}
          </div>
        </>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: Delta }) {
  if (delta.dir === "flat" && delta.current === 0 && delta.previous === 0) return null;
  const isUp = delta.dir === "up";
  const isDown = delta.dir === "down";
  const color = isUp ? "#12B886" : isDown ? "#E5484D" : "#8A94A6";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const text =
    delta.pct == null ? "new" : `${Math.abs(Math.round(delta.pct))}%`;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium"
      style={{ color }}
      title={`${delta.current} this month vs ${delta.previous} last month`}
    >
      <Icon className="w-3.5 h-3.5" />
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
    <Card title={title}>
      {loading ? (
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
      ) : pct == null ? (
        <Empty>{empty ?? "Not enough data."}</Empty>
      ) : (
        <div className="flex items-center gap-4">
          <Donut pct={pct} tone={tone} />
          {sub && (
            <p className="text-sm text-neutral-500 leading-relaxed" style={body}>
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
  return (
    <Card title={title}>
      {loading ? (
        <Skeleton className="h-10 w-28" />
      ) : value == null ? (
        <Empty>{empty ?? "Not enough data."}</Empty>
      ) : (
        <>
          <div
            className="text-4xl font-semibold tracking-[-0.03em] text-neutral-900"
            style={display}
          >
            {value}
            {unit && (
              <span className="text-lg font-normal text-neutral-400"> {unit}</span>
            )}
          </div>
          {sub && (
            <p className="text-sm text-neutral-500 mt-1" style={body}>
              {sub}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function Donut({ pct, tone }: { pct: number; tone: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#EDF3F2" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-neutral-900"
        style={display}
      >
        {pct}%
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
      title="Currently out & overdue"
      action={
        overdueCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 text-[#8A5300] text-xs font-medium px-2.5 py-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {overdueCount} overdue
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Empty>Nothing is checked out right now.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="text-neutral-400 text-xs">
                <th className="py-2 pr-3 font-medium" style={body}>Instrument</th>
                <th className="py-2 pr-3 font-medium" style={body}>Borrower</th>
                <th className="py-2 pr-3 font-medium" style={body}>Out</th>
                <th className="py-2 pr-3 font-medium" style={body}>Due</th>
                <th className="py-2 font-medium" style={body}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-t border-[#0B6477]/8 text-sm ${
                    r.overdueDays ? "bg-[#F59E0B]/5" : ""
                  }`}
                >
                  <td className="py-2 pr-3 font-medium text-neutral-800" style={body}>{r.instrument}</td>
                  <td className="py-2 pr-3 text-neutral-600" style={body}>{r.borrower}</td>
                  <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap" style={body}>{fmt(r.checkoutAt)}</td>
                  <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap" style={body}>{r.due ? fmt(r.due) : "-"}</td>
                  <td className="py-2" style={body}>
                    {r.overdueDays ? (
                      <span className="inline-flex items-center rounded-full bg-[#E5484D]/12 text-[#B42318] text-xs font-medium px-2 py-0.5">
                        {r.overdueDays}d overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#14919B]/15 text-[#0B6477] text-xs font-medium px-2 py-0.5">
                        Out
                      </span>
                    )}
                  </td>
                </tr>
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
    <Card title="Recent activity">
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e, i) => {
            const m = meta[e.type];
            return (
              <li key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.bg}`}>
                  <m.Icon className="w-4 h-4" style={{ color: m.tone }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-700 leading-snug" style={body}>
                    <span className="font-medium text-neutral-900">{e.person}</span>{" "}
                    {m.verb}{" "}
                    <span className="font-medium text-neutral-900">{e.instrument}</span>
                  </p>
                  <p className="text-xs text-neutral-400" style={body}>
                    {relativeTime(e.at, now)}
                  </p>
                </div>
              </li>
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
  return (
    <Card title="Loan status breakdown">
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: r.tone }} />
              <span className="flex-1 text-sm text-neutral-700" style={body}>
                {r.label}
                {!r.available && (
                  <span className="ml-1.5 text-xs text-neutral-400">
                    · needs a due-date / status field
                  </span>
                )}
              </span>
              <span className="text-sm font-medium text-neutral-800 tabular-nums" style={body}>
                {r.available ? r.value : "-"}
              </span>
              <span className="w-10 text-right text-xs text-neutral-400 tabular-nums" style={body}>
                {r.available ? `${r.pct}%` : ""}
              </span>
            </li>
          ))}
        </ul>
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
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <Empty>{empty ?? "No data."}</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="w-[42%] shrink-0 text-sm text-neutral-700 truncate" style={body} title={r.label}>
            {r.label}
          </div>
          <div className="flex-1 h-6 rounded-md bg-[#F3F7F6] overflow-hidden">
            <div
              className="h-full rounded-md"
              style={{
                width: `${((invertNote ? max - r.value : r.value) / max) * 100}%`,
                backgroundColor: color,
                minWidth: r.value === 0 ? 0 : 6,
              }}
            />
          </div>
          <div className="w-8 shrink-0 text-right text-sm font-medium text-neutral-800 tabular-nums" style={body}>
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- monthly activity chart ---------------- */

export function MonthlyChart({
  data,
  loading,
}: {
  data: MonthPoint[];
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-56 w-full" />;
  if (data.length === 0) return <Empty>No activity yet.</Empty>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 h-56" style={{ minWidth: data.length * 40 }}>
        {data.map((d) => (
          <div key={d.key} className="flex-1 min-w-[30px] h-full flex flex-col items-center">
            <div className="text-[11px] font-medium text-neutral-500 tabular-nums mb-1" style={body}>
              {d.value}
            </div>
            <div className="flex-1 w-full flex items-end min-h-0">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-[#0B6477] to-[#45DFB1]"
                style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <div className="text-[10px] text-neutral-400 whitespace-nowrap mt-1.5" style={body}>
              {d.label}
            </div>
          </div>
        ))}
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
