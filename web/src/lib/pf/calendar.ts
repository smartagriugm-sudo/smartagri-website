import { addDays } from "./facility";
import { weekStart } from "./people";

// What the team calendar works out: which days a day, week or month view covers, and
// where events sit. Days are plain YYYY-MM-DD strings in the lab's time, like everywhere
// else in the ERP, so no time zone can move a shift to another day.

export type CalendarMode = "day" | "week" | "month";

export const addMonths = (date: string, n: number) => {
  const [y, m] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  return first.toISOString().slice(0, 10);
};

export const monthStart = (date: string) => `${date.slice(0, 7)}-01`;

/** Six rows would leave an empty last row in most months, so the grid ends with the month's last week. */
export function monthGrid(date: string): string[] {
  const first = monthStart(date);
  const last = addDays(addMonths(first, 1), -1);
  const start = weekStart(first);
  const days: string[] = [];
  for (let d = start; d <= last || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  return days;
}

export function daysOf(mode: CalendarMode, date: string): string[] {
  if (mode === "day") return [date];
  if (mode === "week") return Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i));
  return monthGrid(date);
}

export function step(mode: CalendarMode, date: string, by: 1 | -1) {
  if (mode === "day") return addDays(date, by);
  if (mode === "week") return addDays(date, 7 * by);
  return addMonths(date, by);
}

export const minutesOfDay = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** A shift ending at or before it starts runs past midnight, and the day's grid shows it up to midnight. */
export const endMinutes = (start: string, end: string) => {
  const from = minutesOfDay(start);
  const to = minutesOfDay(end);
  return to > from ? to : 24 * 60;
};

export type Placed<T> = { item: T; from: number; to: number; lane: number; lanes: number };

/**
 * Lays out one day's events side by side, as a paper diary would: each takes the first
 * lane free when it starts, and everything in a run of overlaps shares that run's width.
 */
export function placeEvents<T>(items: readonly T[], range: (item: T) => { from: number; to: number }): Placed<T>[] {
  const sorted = items.map((item) => ({ item, ...range(item) })).sort((a, b) => a.from - b.from || b.to - a.to);
  const out: Placed<T>[] = [];
  let run: Placed<T>[] = [];
  let runEnd = -1;
  const close = () => {
    const lanes = Math.max(1, ...run.map((p) => p.lane + 1));
    for (const p of run) p.lanes = lanes;
    out.push(...run);
    run = [];
  };
  for (const e of sorted) {
    if (run.length > 0 && e.from >= runEnd) {
      close();
      runEnd = -1;
    }
    const taken = new Set(run.filter((p) => p.to > e.from).map((p) => p.lane));
    let lane = 0;
    while (taken.has(lane)) lane++;
    run.push({ item: e.item, from: e.from, to: e.to, lane, lanes: 1 });
    runEnd = Math.max(runEnd, e.to);
  }
  if (run.length > 0) close();
  return out;
}

/** The hours worth drawing: the working day, stretched to whatever is scheduled outside it. */
export function hourRange(events: readonly { from: number; to: number }[], open = 7, close = 18) {
  const from = Math.min(open, ...events.map((e) => Math.floor(e.from / 60)));
  const to = Math.max(close, ...events.map((e) => Math.ceil(e.to / 60)));
  return { from, to };
}

const HUES = ["#14919B", "#0E7A5C", "#6D5BD0", "#B26205", "#C2417C", "#2F6DB5", "#5B7F1E", "#8A5A07"];

/** A person keeps one colour on every view, whichever people the filter leaves. */
export function personColor(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length];
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
