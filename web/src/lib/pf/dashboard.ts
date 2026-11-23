import { addDays, daysBetween } from "./facility";
import type { FoundationSummary } from "./foundation";
import type { SeedLot } from "./batch";
import { localeOf, type Lang } from "../i18n-core";

// What the ERP's front page works out: the day's queue of work, and where each
// batch stands on the calendar. Plain functions over plain data, so the rules can
// be tested without a browser or a database.

const dateLocale = (lang: Lang) => (lang === "id" ? localeOf(lang) : "en-GB");

export const formatShortDate = (iso: string, lang: Lang = "en") =>
  new Intl.DateTimeFormat(dateLocale(lang), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** A stored date as people read it: 26 Okt 2026. */
export const formatLongDate = (iso: string, lang: Lang = "en") =>
  new Intl.DateTimeFormat(dateLocale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

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
  /** The reader's language for the words of each item; English when left out. */
  lang?: Lang;
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

const list = (items: readonly string[], shown = 2, lang: Lang = "en") =>
  items.length <= shown ? items.join(", ") : `${items.slice(0, shown).join(", ")}, ${lang === "id" ? "dan" : "and"} ${items.length - shown} ${lang === "id" ? "lainnya" : "more"}`;

/** Indonesian nouns do not take a plural ending. */
const count = (n: number, word: string, lang: Lang = "en") => (lang === "id" ? `${n} ${word}` : `${n} ${word}${n === 1 ? "" : "s"}`);

const ago = (days: number, lang: Lang = "en") =>
  lang === "id" ? (days === 0 ? "hari ini" : `${days} hari lalu`) : days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;

export function buildWork({ today, lang = "en", batches, freeHoles, sanitation, planned, lots, setup, alarms = [], silentDevices = [], calibrationsDue = [], ordersDue = [], invoicesOverdue = [], lotsAging = [], lowStock = [], shortages = [], purchasesLate = [], absentToday = [], flaggedAttendance = [], leavePending = [], contractsEnding = [], maintenanceDue = [] }: WorkInput): WorkItem[] {
  const items: WorkItem[] = [];
  const id = lang === "id";
  const L = (en: string, idText: string) => (id ? idText : en);
  const date = (iso: string) => formatShortDate(iso, lang);
  const show = (xs: readonly string[]) => list(xs, 2, lang);

  for (const a of alarms) {
    items.push({
      key: `alarm-${a.id}`,
      tone: "urgent",
      tag: a.level === "kritis" ? L("Critical alarms", "Alarm kritis") : "Alarm",
      title: id ? `${a.label} ${a.value} di ${a.place}` : `${a.label} ${a.value} at ${a.place}`,
      detail: `${L("Since", "Sejak")} ${a.since}`,
      action: L("View alarms", "Lihat alarm"),
      link: { to: "/erp/alarms" },
    });
  }
  for (const d of silentDevices) {
    items.push({ key: `silent-${d.id}`, tone: "urgent", tag: L("Device", "Perangkat"), title: id ? `${d.code} berhenti mengirim` : `${d.code} stopped sending`, detail: `${L("Last", "Terakhir")} ${d.since}`, action: L("Check", "Periksa"), link: { to: "/erp/devices" } });
  }

  for (const b of batches) {
    if (b.problemHoles.length > 0) {
      items.push({
        key: `holes-${b.code}`,
        tone: "urgent",
        tag: L("Problem", "Masalah"),
        title: id ? `${count(b.problemHoles.length, "tanaman", lang)} bermasalah di ${b.code}` : `${count(b.problemHoles.length, "plant")} with a problem in ${b.code}`,
        detail: show(b.problemHoles),
        action: L("Check", "Periksa"),
        link: batchLink(b, "/erp/plant-factory"),
      });
    }
    if (b.problemTrays.length > 0) {
      items.push({
        key: `trays-${b.code}`,
        tone: "urgent",
        tag: L("Problem", "Masalah"),
        title: id ? `${count(b.problemTrays.length, "tray", lang)} bermasalah di ${b.code}` : `${count(b.problemTrays.length, "tray")} with a problem in ${b.code}`,
        detail: show(b.problemTrays),
        action: L("Check", "Periksa"),
        link: batchLink(b, "/erp/seedlings"),
      });
    }

    const target = addDays(b.sownAt, b.cycle);
    if (b.plants > 0 && b.age > b.cycle) {
      items.push({
        key: `harvest-${b.code}`,
        tone: "urgent",
        tag: L("Late", "Terlambat"),
        title: id ? `${b.code} melewati target panen` : `${b.code} past the harvest target`,
        detail: id ? `${b.plants} tanaman ${b.crop} · target ${date(target)}, ${ago(b.age - b.cycle, lang)}` : `${b.plants} plants ${b.crop} · target ${formatShortDate(target)}, ${ago(b.age - b.cycle)}`,
        action: L("Record harvest", "Catat panen"),
        link: batchLink(b, "/erp/plant-factory"),
      });
    } else if (b.harvestReady > 0) {
      items.push({
        key: `harvest-${b.code}`,
        tone: "due",
        tag: L("Ready to harvest", "Siap panen"),
        title: id ? `${b.code} siap panen` : `${b.code} ready to harvest`,
        detail: id ? `${b.harvestReady} tanaman ${b.crop} · target ${date(target)}` : `${b.harvestReady} plants ${b.crop} · target ${formatShortDate(target)}`,
        action: L("Record harvest", "Catat panen"),
        link: batchLink(b, "/erp/plant-factory"),
      });
    }

    if (b.readySeedlings > 0) {
      const planned = addDays(b.sownAt, b.transplantDay);
      const late = b.age > b.transplantDay;
      items.push({
        key: `move-${b.code}`,
        tone: late ? "urgent" : "due",
        tag: late ? L("Late", "Terlambat") : L("Ready to move", "Siap pindah"),
        title: id ? `${b.code} siap pindah tanam` : `${b.code} ready to transplant`,
        detail: id ? `${b.readySeedlings} bibit ${b.crop} · jadwal ${date(planned)}${late ? `, ${ago(b.age - b.transplantDay, lang)}` : ""}` : `${b.readySeedlings} seedlings ${b.crop} · scheduled ${formatShortDate(planned)}${late ? `, ${ago(b.age - b.transplantDay)}` : ""}`,
        action: L("Transplant", "Pindah tanam"),
        link: batchLink(b, "/erp/seedlings"),
      });
    }
  }

  const seedlings = batches.reduce((n, b) => n + b.readySeedlings, 0);
  if (seedlings > freeHoles) {
    items.push({
      key: "capacity",
      tone: "due",
      tag: L("Capacity", "Kapasitas"),
      title: id ? `${seedlings - freeHoles} bibit belum dapat lubang` : `${seedlings - freeHoles} seedlings have no hole yet`,
      detail: id ? `${seedlings} bibit siap pindah tanam, ${freeHoles} lubang siap` : `${seedlings} seedlings ready to transplant, ${freeHoles} holes ready`,
      action: L("View tier", "Lihat tier"),
      link: { to: "/erp/plant-factory" },
    });
  }

  if (sanitation.length > 0) {
    items.push({
      key: "sanitation",
      tone: "due",
      tag: L("Sanitation", "Sanitasi"),
      title: id ? `${count(sanitation.length, "tier", lang)} menunggu sanitasi` : `${count(sanitation.length, "tier")} waiting for sanitation`,
      detail: show(sanitation.map((t) => `Rack ${t.rack} · Tier ${t.tier}`)),
      action: L("Mark as done", "Tandai selesai"),
      link: { to: "/erp/batch" },
    });
  }

  for (const l of lots ?? []) {
    if (l.qty_on_hand <= 0 || !l.expiry_date) continue;
    const left = id ? `sisa ${l.qty_on_hand.toLocaleString(localeOf(lang))} ${l.unit}` : `left ${l.qty_on_hand.toLocaleString("en-GB")} ${l.unit}`;
    const until = daysBetween(today, l.expiry_date);
    if (until < 0) {
      items.push({ key: `lot-${l.id}`, tone: "due", tag: L("Expires", "Kedaluwarsa"), title: id ? `${l.itemName ?? "Lot"} ${l.lot_no} sudah kedaluwarsa` : `${l.itemName ?? "Lot"} ${l.lot_no} already expired`, detail: `${left} · ${L("since", "sejak")} ${date(l.expiry_date)}`, action: L("Correct stock", "Koreksi stok"), link: { to: l.itemName ? "/erp/stock" : "/erp/seed-lots" } });
    } else if (until <= LOT_EXPIRY_WARNING_DAYS) {
      items.push({ key: `lot-${l.id}`, tone: "later", tag: L("Expiring soon", "Segera kedaluwarsa"), title: id ? `${l.itemName ?? "Lot"} ${l.lot_no} kedaluwarsa ${until === 0 ? "hari ini" : `dalam ${until} hari`}` : `${l.itemName ?? "Lot"} ${l.lot_no} expires ${until === 0 ? "today" : `in ${until} days`}`, detail: `${left} · ${L("until", "sampai")} ${date(l.expiry_date)}`, action: L("View lots", "Lihat lot"), link: { to: l.itemName ? "/erp/stock" : "/erp/seed-lots" } });
    }
  }

  for (const o of ordersDue) {
    const late = o.requested < today;
    items.push({
      key: `order-${o.id}`,
      tone: late ? "urgent" : "due",
      tag: late ? L("Late", "Terlambat") : L("Ship today", "Kirim hari ini"),
      title: id ? `${o.no} untuk ${o.customer}` : `${o.no} for ${o.customer}`,
      detail: id ? `${o.openKg} belum dikirim · diminta ${date(o.requested)}` : `${o.openKg} not delivered · requested ${formatShortDate(o.requested)}`,
      action: L("Send", "Kirim"),
      link: { to: "/erp/orders/$id", id: o.id },
    });
  }
  for (const i of invoicesOverdue) {
    items.push({ key: `invoice-${i.id}`, tone: "due", tag: L("Due date", "Jatuh tempo"), title: id ? `${i.no} dari ${i.customer} belum dibayar` : `${i.no} of ${i.customer} unpaid`, detail: id ? `Sisa ${i.balance} · jatuh tempo ${date(i.due)}` : `Left ${i.balance} · due ${formatShortDate(i.due)}`, action: L("View", "Lihat"), link: { to: "/erp/invoice/$id", id: i.id } });
  }
  for (const l of lotsAging) {
    items.push({ key: `aging-${l.id}`, tone: "due", tag: L("Sell soon", "Segera jual"), title: `${l.code}: ${l.kg} ${l.label}`, detail: `${L("Keep until", "Simpan sampai")} ${date(l.until)}`, action: L("Create order", "Buat pesanan"), link: { to: "/erp/orders" } });
  }

  for (const x of absentToday) {
    items.push({ key: `absent-${x.id}`, tone: "due", tag: L("Not clocked in", "Belum absen"), title: id ? `${x.name} belum absen masuk` : `${x.name} not clocked in`, detail: `${L("Scheduled from", "Jadwal mulai")} ${x.start}`, action: L("View", "Lihat"), link: { to: "/erp/attendance" } });
  }
  for (const x of flaggedAttendance) {
    items.push({ key: `flag-${x.id}`, tone: "later", tag: L("Check attendance", "Cek presensi"), title: `${x.name}: ${x.flag.toLowerCase()}`, detail: L("For a coordinator to check", "Perlu dicek koordinator"), action: L("Check", "Periksa"), link: { to: "/erp/attendance" } });
  }
  for (const x of leavePending) {
    items.push({ key: `leave-${x.id}`, tone: "due", tag: L("Leave", "Cuti"), title: id ? `${x.name} mengajukan ${x.label}` : `${x.name} asked for ${x.label}`, detail: `${L("Starts", "Mulai")} ${date(x.from)}`, action: L("Decide", "Putuskan"), link: { to: "/erp/attendance" } });
  }
  for (const x of contractsEnding) {
    items.push({ key: `contract-${x.id}`, tone: "later", tag: L("Contract", "Kontrak"), title: id ? `Kontrak ${x.name} segera berakhir` : `Contract ${x.name} ending soon`, detail: `${L("Until", "Sampai")} ${date(x.until)}`, action: L("View", "Lihat"), link: { to: "/erp/people" } });
  }
  for (const x of maintenanceDue) {
    items.push({ key: `maintenance-${x.id}`, tone: "due", tag: L("Maintenance", "Pemeliharaan"), title: x.title, detail: `${L("Scheduled", "Jadwal")} ${date(x.due)}`, action: L("Open", "Buka"), link: { to: "/erp/maintenance" } });
  }
  for (const x of shortages) {
    items.push({ key: `short-${x.id}`, tone: "due", tag: L("Short of stock", "Stok kurang"), title: id ? `${x.name} kurang ${x.short}` : `${x.name} short by ${x.short}`, detail: `${L("When used", "Saat dipakai")} ${x.batch}`, action: L("Handle", "Tangani"), link: { to: "/erp/stock" } });
  }
  for (const x of lowStock) {
    items.push({ key: `low-${x.id}`, tone: "due", tag: L("Running low", "Stok menipis"), title: id ? `${x.name} sisa ${x.left}` : `${x.name} left ${x.left}`, detail: `${L("Minimum level", "Batas minimum")} ${x.minimum}`, action: L("View stock", "Lihat stok"), link: { to: "/erp/stock" } });
  }
  for (const x of purchasesLate) {
    items.push({ key: `po-${x.id}`, tone: "due", tag: L("Not arrived yet", "Belum tiba"), title: id ? `${x.no} dari ${x.supplier}` : `${x.no} of ${x.supplier}`, detail: `${L("Expected", "Diperkirakan")} ${date(x.expected)}`, action: L("View", "Lihat"), link: { to: "/erp/purchasing/$id", id: x.id } });
  }

  for (const c of calibrationsDue) {
    items.push({ key: `cal-${c.id}`, tone: "due", tag: L("Calibration", "Kalibrasi"), title: id ? `${c.code} lewat tanggal kalibrasi` : `${c.code} past their calibration date`, detail: `${L("Scheduled", "Jadwal")} ${date(c.due)}`, action: L("Record", "Catat"), link: { to: "/erp/devices" } });
  }

  for (const p of planned ?? []) {
    items.push({ key: `plan-${p.id}`, tone: "later", tag: L("Not sown yet", "Belum disemai"), title: id ? `${p.code} belum disemai` : `${p.code} not sown yet`, detail: p.crop, action: L("Sow", "Semai"), link: { to: "/erp/batch/$id", id: p.id } });
  }

  if (setup) {
    if (setup.slots.missing.length > 0) items.push({ key: "setup-slots", tone: "setup", tag: L("Preparation", "Persiapan"), title: L("Location codes are incomplete", "Kode lokasi belum lengkap"), detail: id ? `${setup.slots.present} dari ${setup.slots.expected} lubang dan posisi tray` : `${setup.slots.present} of ${setup.slots.expected} holes and tray positions`, action: L("Check", "Periksa"), link: { to: "/erp/settings/locations" } });
    if (setup.crops === 0) items.push({ key: "setup-crops", tone: "setup", tag: L("Preparation", "Persiapan"), title: L("No crops yet", "Belum ada tanaman"), detail: L("Recipes and seed lots need a crop", "Resep dan lot benih perlu tanaman"), action: L("Add", "Tambah"), link: { to: "/erp/crops" } });
    if (setup.activeRecipes === 0) items.push({ key: "setup-recipes", tone: "setup", tag: L("Preparation", "Persiapan"), title: L("No active recipe yet", "Belum ada resep aktif"), detail: L("New batches use the active recipe", "Batch baru memakai resep aktif"), action: L("Set recipe", "Atur resep"), link: { to: "/erp/recipes" } });
    if (setup.seedLots === 0) items.push({ key: "setup-lots", tone: "setup", tag: L("Preparation", "Persiapan"), title: L("No seed lots yet", "Belum ada lot benih"), detail: L("Every batch uses one seed lot", "Setiap batch memakai satu lot benih"), action: L("Add", "Tambah"), link: { to: "/erp/seed-lots" } });
  }

  return items.map((item, i) => [item, i] as const).sort(([a, i], [b, j]) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || i - j).map(([item]) => item);
}

/** The line under the page title: how much there is, and where to start. */
export function workSummary(items: readonly WorkItem[], lang: Lang = "en") {
  const id = lang === "id";
  if (items.length === 0) return id ? "Tidak ada yang tertunda hari ini." : "Nothing pending today.";
  const first = items[0];
  if (items.length === 1) return `${first.title}.`;
  if (id) return `${items.length} tugas menunggu. ${first.tone === "urgent" ? "Paling mendesak" : "Mulai dari"}: ${first.title}.`;
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
