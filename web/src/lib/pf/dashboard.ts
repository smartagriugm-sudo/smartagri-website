import { addDays, daysBetween } from "./facility";
import type { FoundationSummary } from "./foundation";
import type { SeedLot } from "./batch";

// What the ERP's front page works out: the day's queue of work, and where each
// batch stands on the calendar. Plain functions over plain data, so the rules can
// be tested without a browser or a database.

export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** A stored date as people read it: 26 Okt 2026. */
export const formatLongDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/* ------------------------------------------------------------- the day's work */

export type WorkTone = "urgent" | "due" | "setup" | "later";

export type WorkLink =
  | { to: "/erp/batch/$id"; id: string }
  | { to: "/erp/orders/$id"; id: string }
  | { to: "/erp/invoice/$id"; id: string }
  | { to: "/erp/purchasing/$id"; id: string }
  | { to: "/erp/maintenance" | "/erp/attendance" | "/erp/people" | "/erp/stock" | "/erp/alarms" | "/erp/devices" | "/erp/orders" | "/erp/batch" | "/erp/seed-lots" | "/erp/crops" | "/erp/recipes" | "/erp/settings/locations" | "/erp/seedlings" | "/erp/plant-factory" };

export type WorkItem = { key: string; tone: WorkTone; tag: string; title: string; detail: string; action: string; link: WorkLink };

export type BatchWork = {
  id?: string;
  code: string;
  crop: string;
  sownAt: string;
  age: number;
  cycle: number;
  transplantDay: number;
  /** Plants in the plant factory now. */
  plants: number;
  /** Of those, the ones the recipe says are ready. */
  harvestReady: number;
  problemHoles: readonly string[];
  problemTrays: readonly string[];
  /** Seedlings in trays marked ready to move. */
  readySeedlings: number;
};

export type WorkInput = {
  today: string;
  batches: readonly BatchWork[];
  freeHoles: number;
  sanitation: readonly { rack: number; tier: number }[];
  /** Null while unknown: nothing is claimed about what could not be read. */
  planned: readonly { id: string; code: string; crop: string }[] | null;
  lots: readonly (Pick<SeedLot, "id" | "lot_no" | "qty_on_hand" | "unit" | "expiry_date"> & { itemName?: string })[] | null;
  setup: FoundationSummary | null;
  /** From the sensors' side, empty where it is not installed. */
  alarms?: readonly { id: string; level: "peringatan" | "kritis"; label: string; value: string; place: string; since: string }[];
  silentDevices?: readonly { id: string; code: string; since: string }[];
  calibrationsDue?: readonly { id: string; code: string; due: string }[];
  /** From the sales side, empty where the reader has no access or it is not installed. */
  ordersDue?: readonly { id: string; no: string; customer: string; requested: string; openKg: string }[];
  invoicesOverdue?: readonly { id: string; no: string; customer: string; due: string; balance: string }[];
  lotsAging?: readonly { id: string; code: string; label: string; kg: string; until: string }[];
  /** From inventory, empty where the reader has no access or it is not installed. */
  lowStock?: readonly { id: string; name: string; left: string; minimum: string }[];
  shortages?: readonly { id: string; name: string; short: string; batch: string }[];
  purchasesLate?: readonly { id: string; no: string; supplier: string; expected: string }[];
  /** From people, empty where the reader has no access or it is not installed. */
  absentToday?: readonly { id: string; name: string; start: string }[];
  flaggedAttendance?: readonly { id: string; name: string; flag: string }[];
  leavePending?: readonly { id: string; name: string; label: string; from: string }[];
  contractsEnding?: readonly { id: string; name: string; until: string }[];
  /** From maintenance, empty where the reader has no access or it is not installed. */
  maintenanceDue?: readonly { id: string; title: string; due: string }[];
};

export const LOT_EXPIRY_WARNING_DAYS = 14;

const TONE_ORDER: Record<WorkTone, number> = { urgent: 0, due: 1, setup: 2, later: 3 };

const batchLink = (b: { id?: string }, fallback: "/erp/seedlings" | "/erp/plant-factory"): WorkLink => (b.id ? { to: "/erp/batch/$id", id: b.id } : { to: fallback });

const list = (items: readonly string[], shown = 2) =>
  items.length <= shown ? items.join(", ") : `${items.slice(0, shown).join(", ")}, and ${items.length - shown} more`;

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const ago = (days: number) => (days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`);

export function buildWork({ today, batches, freeHoles, sanitation, planned, lots, setup, alarms = [], silentDevices = [], calibrationsDue = [], ordersDue = [], invoicesOverdue = [], lotsAging = [], lowStock = [], shortages = [], purchasesLate = [], absentToday = [], flaggedAttendance = [], leavePending = [], contractsEnding = [], maintenanceDue = [] }: WorkInput): WorkItem[] {
  const items: WorkItem[] = [];

  for (const a of alarms) {
    items.push({
      key: `alarm-${a.id}`,
      tone: "urgent",
      tag: a.level === "kritis" ? "Critical alarms" : "Alarm",
      title: `${a.label} ${a.value} at ${a.place}`,
      detail: `Since ${a.since}`,
      action: "View alarms",
      link: { to: "/erp/alarms" },
    });
  }
  for (const d of silentDevices) {
    items.push({ key: `silent-${d.id}`, tone: "urgent", tag: "Device", title: `${d.code} stopped sending`, detail: `Last ${d.since}`, action: "Check", link: { to: "/erp/devices" } });
  }

  for (const b of batches) {
    if (b.problemHoles.length > 0) {
      items.push({
        key: `holes-${b.code}`,
        tone: "urgent",
        tag: "Problem",
        title: `${count(b.problemHoles.length, "plant")} with a problem in ${b.code}`,
        detail: list(b.problemHoles),
        action: "Check",
        link: batchLink(b, "/erp/plant-factory"),
      });
    }
    if (b.problemTrays.length > 0) {
      items.push({
        key: `trays-${b.code}`,
        tone: "urgent",
        tag: "Problem",
        title: `${count(b.problemTrays.length, "tray")} with a problem in ${b.code}`,
        detail: list(b.problemTrays),
        action: "Check",
        link: batchLink(b, "/erp/seedlings"),
      });
    }

    const target = addDays(b.sownAt, b.cycle);
    if (b.plants > 0 && b.age > b.cycle) {
      items.push({
        key: `harvest-${b.code}`,
        tone: "urgent",
        tag: "Late",
        title: `${b.code} past the harvest target`,
        detail: `${b.plants} plants ${b.crop} · target ${formatShortDate(target)}, ${ago(b.age - b.cycle)}`,
        action: "Record harvest",
        link: batchLink(b, "/erp/plant-factory"),
      });
    } else if (b.harvestReady > 0) {
      items.push({
        key: `harvest-${b.code}`,
        tone: "due",
        tag: "Ready to harvest",
        title: `${b.code} ready to harvest`,
        detail: `${b.harvestReady} plants ${b.crop} · target ${formatShortDate(target)}`,
        action: "Record harvest",
        link: batchLink(b, "/erp/plant-factory"),
      });
    }

    if (b.readySeedlings > 0) {
      const planned = addDays(b.sownAt, b.transplantDay);
      const late = b.age > b.transplantDay;
      items.push({
        key: `move-${b.code}`,
        tone: late ? "urgent" : "due",
        tag: late ? "Late" : "Ready to move",
        title: `${b.code} ready to transplant`,
        detail: `${b.readySeedlings} seedlings ${b.crop} · scheduled ${formatShortDate(planned)}${late ? `, ${ago(b.age - b.transplantDay)}` : ""}`,
        action: "Transplant",
        link: batchLink(b, "/erp/seedlings"),
      });
    }
  }

  const seedlings = batches.reduce((n, b) => n + b.readySeedlings, 0);
  if (seedlings > freeHoles) {
    items.push({
      key: "capacity",
      tone: "due",
      tag: "Capacity",
      title: `${seedlings - freeHoles} seedlings have no hole yet`,
      detail: `${seedlings} seedlings ready to transplant, ${freeHoles} holes ready`,
      action: "View tier",
      link: { to: "/erp/plant-factory" },
    });
  }

  if (sanitation.length > 0) {
    items.push({
      key: "sanitation",
      tone: "due",
      tag: "Sanitation",
      title: `${count(sanitation.length, "tier")} waiting for sanitation`,
      detail: list(sanitation.map((t) => `Rack ${t.rack} · Tier ${t.tier}`)),
      action: "Mark as done",
      link: { to: "/erp/batch" },
    });
  }

  for (const l of lots ?? []) {
    if (l.qty_on_hand <= 0 || !l.expiry_date) continue;
    const left = `left ${l.qty_on_hand.toLocaleString("en-GB")} ${l.unit}`;
    const until = daysBetween(today, l.expiry_date);
    if (until < 0) {
      items.push({ key: `lot-${l.id}`, tone: "due", tag: "Expires", title: `${l.itemName ?? "Lot"} ${l.lot_no} already expired`, detail: `${left} · since ${formatShortDate(l.expiry_date)}`, action: "Correct stock", link: { to: l.itemName ? "/erp/stock" : "/erp/seed-lots" } });
    } else if (until <= LOT_EXPIRY_WARNING_DAYS) {
      items.push({ key: `lot-${l.id}`, tone: "later", tag: "Expiring soon", title: `${l.itemName ?? "Lot"} ${l.lot_no} expires ${until === 0 ? "today" : `in ${until} days`}`, detail: `${left} · until ${formatShortDate(l.expiry_date)}`, action: "View lots", link: { to: l.itemName ? "/erp/stock" : "/erp/seed-lots" } });
    }
  }

  for (const o of ordersDue) {
    const late = o.requested < today;
    items.push({
      key: `order-${o.id}`,
      tone: late ? "urgent" : "due",
      tag: late ? "Late" : "Ship today",
      title: `${o.no} for ${o.customer}`,
      detail: `${o.openKg} not delivered · requested ${formatShortDate(o.requested)}`,
      action: "Send",
      link: { to: "/erp/orders/$id", id: o.id },
    });
  }
  for (const i of invoicesOverdue) {
    items.push({ key: `invoice-${i.id}`, tone: "due", tag: "Due date", title: `${i.no} of ${i.customer} unpaid`, detail: `Left ${i.balance} · due ${formatShortDate(i.due)}`, action: "View", link: { to: "/erp/invoice/$id", id: i.id } });
  }
  for (const l of lotsAging) {
    items.push({ key: `aging-${l.id}`, tone: "due", tag: "Sell soon", title: `${l.code}: ${l.kg} ${l.label}`, detail: `Keep until ${formatShortDate(l.until)}`, action: "Create order", link: { to: "/erp/orders" } });
  }

  for (const x of absentToday) {
    items.push({ key: `absent-${x.id}`, tone: "due", tag: "Not clocked in", title: `${x.name} not clocked in`, detail: `Scheduled from ${x.start}`, action: "View", link: { to: "/erp/attendance" } });
  }
  for (const x of flaggedAttendance) {
    items.push({ key: `flag-${x.id}`, tone: "later", tag: "Check attendance", title: `${x.name}: ${x.flag.toLowerCase()}`, detail: "For a coordinator to check", action: "Check", link: { to: "/erp/attendance" } });
  }
  for (const x of leavePending) {
    items.push({ key: `leave-${x.id}`, tone: "due", tag: "Leave", title: `${x.name} asked for ${x.label}`, detail: `Starts ${formatShortDate(x.from)}`, action: "Decide", link: { to: "/erp/attendance" } });
  }
  for (const x of contractsEnding) {
    items.push({ key: `contract-${x.id}`, tone: "later", tag: "Contract", title: `Contract ${x.name} ending soon`, detail: `Until ${formatShortDate(x.until)}`, action: "View", link: { to: "/erp/people" } });
  }
  for (const x of maintenanceDue) {
    items.push({ key: `maintenance-${x.id}`, tone: "due", tag: "Maintenance", title: x.title, detail: `Scheduled ${formatShortDate(x.due)}`, action: "Open", link: { to: "/erp/maintenance" } });
  }
  for (const x of shortages) {
    items.push({ key: `short-${x.id}`, tone: "due", tag: "Short of stock", title: `${x.name} short by ${x.short}`, detail: `When used ${x.batch}`, action: "Handle", link: { to: "/erp/stock" } });
  }
  for (const x of lowStock) {
    items.push({ key: `low-${x.id}`, tone: "due", tag: "Running low", title: `${x.name} left ${x.left}`, detail: `Minimum level ${x.minimum}`, action: "View stock", link: { to: "/erp/stock" } });
  }
  for (const x of purchasesLate) {
    items.push({ key: `po-${x.id}`, tone: "due", tag: "Not arrived yet", title: `${x.no} of ${x.supplier}`, detail: `Expected ${formatShortDate(x.expected)}`, action: "View", link: { to: "/erp/purchasing/$id", id: x.id } });
  }

  for (const c of calibrationsDue) {
    items.push({ key: `cal-${c.id}`, tone: "due", tag: "Calibration", title: `${c.code} past their calibration date`, detail: `Scheduled ${formatShortDate(c.due)}`, action: "Record", link: { to: "/erp/devices" } });
  }

  for (const p of planned ?? []) {
    items.push({ key: `plan-${p.id}`, tone: "later", tag: "Not sown yet", title: `${p.code} not sown yet`, detail: p.crop, action: "Sow", link: { to: "/erp/batch/$id", id: p.id } });
  }

  if (setup) {
    if (setup.slots.missing.length > 0) items.push({ key: "setup-slots", tone: "setup", tag: "Preparation", title: "Location codes are incomplete", detail: `${setup.slots.present} of ${setup.slots.expected} holes and tray positions`, action: "Check", link: { to: "/erp/settings/locations" } });
    if (setup.crops === 0) items.push({ key: "setup-crops", tone: "setup", tag: "Preparation", title: "No crops yet", detail: "Recipes and seed lots need a crop", action: "Add", link: { to: "/erp/crops" } });
    if (setup.activeRecipes === 0) items.push({ key: "setup-recipes", tone: "setup", tag: "Preparation", title: "No active recipe yet", detail: "New batches use the active recipe", action: "Set recipe", link: { to: "/erp/recipes" } });
    if (setup.seedLots === 0) items.push({ key: "setup-lots", tone: "setup", tag: "Preparation", title: "No seed lots yet", detail: "Every batch uses one seed lot", action: "Add", link: { to: "/erp/seed-lots" } });
  }

  return items.map((item, i) => [item, i] as const).sort(([a, i], [b, j]) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || i - j).map(([item]) => item);
}

/** The line under the page title: how much there is, and where to start. */
export function workSummary(items: readonly WorkItem[]) {
  if (items.length === 0) return "Nothing pending today.";
  const first = items[0];
  if (items.length === 1) return `${first.title}.`;
  return `${count(items.length, "task")} waiting. ${first.tone === "urgent" ? "Most urgent" : "Starting from"}: ${first.title}.`;
}

/* ---------------------------------------------------------------- the calendar */

export type ScheduleBatch = {
  code: string;
  sownAt: string;
  cycle: number;
  transplantDay: number;
  transplantedAt: string | null;
};

const MIN_WINDOW_DAYS = 42;

/**
 * The dates one chart shares: from the earliest sowing to the latest harvest,
 * with today always inside and a few days of air at each end.
 */
export function scheduleWindow(batches: readonly ScheduleBatch[], today: string) {
  let from = addDays(today, -7);
  let to = addDays(today, 7);
  for (const b of batches) {
    if (b.sownAt < from) from = b.sownAt;
    const end = addDays(b.sownAt, b.cycle);
    if (end > to) to = end;
  }
  from = addDays(from, -2);
  to = addDays(to, 2);
  const short = MIN_WINDOW_DAYS - daysBetween(from, to);
  if (short > 0) to = addDays(to, short);
  return { from, to, days: daysBetween(from, to) };
}

export type ScheduleWindow = ReturnType<typeof scheduleWindow>;

/** Where a date falls in the window, in percent. */
export const positionOf = (date: string, w: ScheduleWindow) => (daysBetween(w.from, date) / w.days) * 100;

/** The Mondays in the window, for the chart's labels. */
export function weekTicks(w: ScheduleWindow) {
  const ticks: string[] = [];
  const weekday = new Date(`${w.from}T00:00:00Z`).getUTCDay();
  for (let d = addDays(w.from, (8 - weekday) % 7); d <= w.to; d = addDays(d, 7)) ticks.push(d);
  return ticks;
}

/** One batch's bar: in the chamber, in the plant factory, and any days past its target. */
export function scheduleBar(b: ScheduleBatch, today: string) {
  const end = addDays(b.sownAt, b.cycle);
  const planned = addDays(b.sownAt, b.transplantDay);
  const moveOn = b.transplantedAt ?? (planned < today ? today : planned);
  return { start: b.sownAt, moveOn: moveOn > end ? end : moveOn, end, overdueTo: today > end ? today : null };
}
