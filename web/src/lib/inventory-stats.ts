// Pure aggregation for the inventory statistics page. No React, no I/O, so the
// calculations can be unit-tested in isolation. Everything is derived from the
// real `instruments` + `usage_logs` rows; nothing is fabricated. Metrics that
// need a field the data does not carry yet (e.g. due dates) report `hasData:
// false` so the UI can show an honest empty state instead of a made-up number.

import type { Instrument, UsageLog } from "./inventory";

export type Delta = {
  current: number;
  previous: number;
  /** percent change vs previous period; null when previous is 0 (i.e. "new") */
  pct: number | null;
  dir: "up" | "down" | "flat";
};
export type NamedCount = { label: string; value: number; slug?: string };
export type MonthPoint = { key: string; label: string; value: number };
export type ActivityEvent = {
  at: string;
  type: "borrow" | "return" | "check";
  person: string;
  instrument: string;
  slug: string;
};
export type OutRow = {
  instrument: string;
  slug: string;
  borrower: string;
  checkoutAt: string;
  due: string | null;
  overdueDays: number | null;
};
export type StatusRow = {
  label: string;
  value: number;
  pct: number;
  tone: string;
  available: boolean;
};

export type InventoryStats = {
  totalEntries: Delta;
  instrumentsUsed: Delta;
  peopleInvolved: Delta;
  currentlyOut: number;
  byMonth: MonthPoint[];
  utilization: { used: number; total: number; pct: number };
  avgDurationDays: number | null;
  onTime: { total: number; onTime: number; pct: number | null; hasData: boolean };
  currentlyOutRows: OutRow[];
  overdueCount: number;
  recentActivity: ActivityEvent[];
  statusBreakdown: StatusRow[];
  mostUsed: NamedCount[];
  underused: NamedCount[];
  byLab: NamedCount[];
  byCategory: NamedCount[];
  topPeople: NamedCount[];
};

const DAY = 86_400_000;
const norm = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ");
const ms = (iso: string) => new Date(iso).getTime();
const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthOf = (iso: string | null): string | null => {
  if (!iso) return null;
  const t = ms(iso);
  return isNaN(t) ? null : monthKey(new Date(t));
};
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
};
const pct = (x: number, total: number) => (total > 0 ? Math.round((x / total) * 100) : 0);
const distinct = <T>(arr: T[], f: (t: T) => string | null | undefined) =>
  new Set(arr.map(f).filter(Boolean)).size;

function makeDelta(current: number, previous: number): Delta {
  return {
    current,
    previous,
    pct: previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? null : 0,
    dir: current > previous ? "up" : current < previous ? "down" : "flat",
  };
}

/** A borrow log is anything that is not an inspection check (null = legacy borrow). */
export const isBorrow = (l: UsageLog) => l.log_type !== "check";

export function computeInventoryStats(
  instruments: Instrument[],
  logs: UsageLog[],
  now: Date,
): InventoryStats {
  const byId = new Map(instruments.map((i) => [i.id, i]));
  const nameOf = (id: string) => byId.get(id)?.name ?? "Unknown instrument";
  const slugOf = (id: string) => byId.get(id)?.slug ?? "";
  const borrow = logs.filter(isBorrow);
  const checks = logs.filter((l) => l.log_type === "check");

  // ---- period deltas (this calendar month vs last) ----
  const curKey = monthKey(now);
  const prevKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const inMonth = (arr: UsageLog[], key: string) =>
    arr.filter((l) => monthOf(l.checkout_at) === key);
  const curLogs = inMonth(logs, curKey);
  const prevLogs = inMonth(logs, prevKey);

  const totalEntries = makeDelta(curLogs.length, prevLogs.length);
  const instrumentsUsed = makeDelta(
    distinct(curLogs, (l) => l.instrument_id),
    distinct(prevLogs, (l) => l.instrument_id),
  );
  const peopleInvolved = makeDelta(
    distinct(curLogs, (l) => norm(l.borrower_name)),
    distinct(prevLogs, (l) => norm(l.borrower_name)),
  );

  // ---- monthly time series (all activity) ----
  const mMap = new Map<string, number>();
  for (const l of logs) {
    const k = monthOf(l.checkout_at);
    if (!k) continue;
    mMap.set(k, (mMap.get(k) ?? 0) + 1);
  }
  const byMonth: MonthPoint[] = [...mMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ key, label: monthLabel(key), value }));

  // ---- utilisation over borrowable (portable) instruments ----
  const portable = instruments.filter((i) => i.kind !== "installed");
  const borrowedIds = new Set(borrow.map((l) => l.instrument_id));
  const usedPortable = portable.filter((i) => borrowedIds.has(i.id)).length;
  const utilization = {
    used: usedPortable,
    total: portable.length,
    pct: pct(usedPortable, portable.length),
  };

  // ---- average loan duration (returned borrows) ----
  const durations = borrow
    .filter((l) => l.returned_at && l.checkout_at)
    .map((l) => (ms(l.returned_at!) - ms(l.checkout_at)) / DAY)
    .filter((d) => d >= 0 && d < 400);
  const avgDurationDays = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;

  // ---- on-time return (needs a due date; empty when none present) ----
  const withDue = borrow.filter((l) => l.expected_return && l.returned_at);
  const onTimeCount = withDue.filter(
    (l) => ms(l.returned_at!) <= ms(l.expected_return!),
  ).length;
  const onTime = {
    total: withDue.length,
    onTime: onTimeCount,
    pct: withDue.length ? Math.round((onTimeCount / withDue.length) * 100) : null,
    hasData: withDue.length > 0,
  };

  // ---- currently out + overdue ----
  const ongoing = borrow.filter((l) => l.status === "ongoing");
  const currentlyOutRows: OutRow[] = ongoing
    .map((l) => {
      const dueMs = l.expected_return ? ms(l.expected_return) : null;
      const overdue =
        dueMs != null ? Math.floor((now.getTime() - dueMs) / DAY) : null;
      return {
        instrument: nameOf(l.instrument_id),
        slug: slugOf(l.instrument_id),
        borrower: l.borrower_name,
        checkoutAt: l.checkout_at,
        due: l.expected_return,
        overdueDays: overdue != null && overdue > 0 ? overdue : null,
      };
    })
    .sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0));
  const overdueCount = currentlyOutRows.filter((r) => r.overdueDays).length;
  const currentlyOut = ongoing.length;

  // ---- recent activity feed ----
  const events: ActivityEvent[] = [];
  for (const l of borrow) {
    if (l.checkout_at)
      events.push({
        at: l.checkout_at,
        type: "borrow",
        person: l.borrower_name,
        instrument: nameOf(l.instrument_id),
        slug: slugOf(l.instrument_id),
      });
    if (l.returned_at)
      events.push({
        at: l.returned_at,
        type: "return",
        person: l.borrower_name,
        instrument: nameOf(l.instrument_id),
        slug: slugOf(l.instrument_id),
      });
  }
  for (const l of checks) {
    if (l.checkout_at)
      events.push({
        at: l.checkout_at,
        type: "check",
        person: l.borrower_name,
        instrument: nameOf(l.instrument_id),
        slug: slugOf(l.instrument_id),
      });
  }
  const recentActivity = events
    .sort((a, b) => ms(b.at) - ms(a.at))
    .slice(0, 10);

  // ---- loan status breakdown ----
  const returned = borrow.filter((l) => l.status === "returned").length;
  const outNotOverdue = Math.max(0, currentlyOut - overdueCount);
  const brokenAssets = instruments.filter((i) => i.status === "broken").length;
  const loanTotal = returned + currentlyOut;
  const statusBreakdown: StatusRow[] = [
    { label: "Returned", value: returned, pct: pct(returned, loanTotal), tone: "#12B886", available: true },
    { label: "Currently out", value: outNotOverdue, pct: pct(outNotOverdue, loanTotal), tone: "#14919B", available: true },
    { label: "Overdue", value: overdueCount, pct: pct(overdueCount, loanTotal), tone: "#F59E0B", available: onTime.hasData || overdueCount > 0 },
    { label: "Damaged / lost", value: brokenAssets, pct: 0, tone: "#E5484D", available: false },
  ];

  // ---- most-used / underused (portable, by borrow count) ----
  const borrowCount = new Map<string, number>();
  for (const l of borrow) borrowCount.set(l.instrument_id, (borrowCount.get(l.instrument_id) ?? 0) + 1);
  const portableCounts: NamedCount[] = portable.map((i) => ({
    label: i.name,
    value: borrowCount.get(i.id) ?? 0,
    slug: i.slug,
  }));
  const mostUsed = [...portableCounts].sort((a, b) => b.value - a.value).slice(0, 10);
  const underused = [...portableCounts].sort((a, b) => a.value - b.value).slice(0, 8);

  // ---- activity by lab / category / person ----
  const tally = (f: (l: UsageLog) => string | null | undefined): NamedCount[] => {
    const m = new Map<string, number>();
    for (const l of logs) {
      const k = f(l);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };
  const byLab = tally((l) => byId.get(l.instrument_id)?.lab || "Unknown");
  const byCategory = tally((l) => byId.get(l.instrument_id)?.category || "Uncategorized");
  const topPeople = tally((l) => norm(l.borrower_name)).slice(0, 10);

  return {
    totalEntries,
    instrumentsUsed,
    peopleInvolved,
    currentlyOut,
    byMonth,
    utilization,
    avgDurationDays,
    onTime,
    currentlyOutRows,
    overdueCount,
    recentActivity,
    statusBreakdown,
    mostUsed,
    underused,
    byLab,
    byCategory,
    topPeople,
  };
}

/** "just now" / "3 hours ago" / "2 days ago" / a date for anything older. */
export function relativeTime(iso: string, now: Date): string {
  const diff = now.getTime() - ms(iso);
  if (isNaN(diff)) return "";
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(ms(iso)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
