import { supabase } from "./auth/supabase";

// Analytics for the public /links page. Events are written by anonymous
// visitors (RLS allows anon INSERT) and read back only by signed-in team
// members on /links/insights (RLS restricts SELECT to authenticated). See
// supabase/link_events.sql for the table and policies.

export type LinkEventType = "view" | "click";

export interface LinkEventRow {
  type: LinkEventType;
  link: string | null;
  created_at: string;
}

// Fire-and-forget: never let a tracking failure block the page or a click.
function record(type: LinkEventType, link?: string) {
  if (!supabase) return;
  void supabase
    .from("link_events")
    .insert({ type, link: link ?? null })
    .then(({ error }) => {
      if (error) console.warn("[links-analytics] failed to record", error.message);
    });
}

export function trackView() {
  record("view");
}

export function trackClick(link: string) {
  record("click", link);
}

// ---- Aggregation (dashboard side) -----------------------------------------

export interface DayBucket {
  /** ISO date, e.g. "2026-07-23" */
  date: string;
  views: number;
  clicks: number;
}

export interface LinkStats {
  totalViews: number;
  totalClicks: number;
  /** clicks / views, 0 when there are no views. */
  clickRate: number;
  perLink: { link: string; clicks: number }[];
  days: DayBucket[];
}

/** Local YYYY-MM-DD for a Date (buckets days in the viewer's timezone). */
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build an ordered list of the last `n` calendar days ending today. */
export function lastNDays(n: number, today: Date): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

/** Fold raw event rows into totals, per-link counts, and daily buckets. */
export function aggregate(rows: LinkEventRow[], days: string[]): LinkStats {
  const dayMap = new Map<string, DayBucket>(
    days.map((date) => [date, { date, views: 0, clicks: 0 }]),
  );
  const perLink = new Map<string, number>();
  let totalViews = 0;
  let totalClicks = 0;

  for (const row of rows) {
    const date = isoDay(new Date(row.created_at));
    const bucket = dayMap.get(date);
    if (row.type === "view") {
      totalViews++;
      if (bucket) bucket.views++;
    } else {
      totalClicks++;
      if (bucket) bucket.clicks++;
      const label = row.link ?? "Unknown";
      perLink.set(label, (perLink.get(label) ?? 0) + 1);
    }
  }

  return {
    totalViews,
    totalClicks,
    clickRate: totalViews > 0 ? totalClicks / totalViews : 0,
    perLink: [...perLink.entries()]
      .map(([link, clicks]) => ({ link, clicks }))
      .sort((a, b) => b.clicks - a.clicks),
    days: days.map((d) => dayMap.get(d)!),
  };
}
