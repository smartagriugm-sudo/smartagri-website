import { addDays, daysBetween } from "./facility";
import type { FoundationSummary } from "./foundation";
import type { SeedLot } from "./batch";

// What the ERP's front page works out: the day's queue of work, and where each
// batch stands on the calendar. Plain functions over plain data, so the rules can
// be tested without a browser or a database.

export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** A stored date as people read it: 26 Okt 2026. */
export const formatLongDate = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/* ------------------------------------------------------------- the day's work */

export type WorkTone = "urgent" | "due" | "setup" | "later";

export type WorkLink =
  | { to: "/erp/batch/$id"; id: string }
  | { to: "/erp/pesanan/$id"; id: string }
  | { to: "/erp/invoice/$id"; id: string }
  | { to: "/erp/alarm" | "/erp/perangkat" | "/erp/pesanan" | "/erp/batch" | "/erp/benih" | "/erp/tanaman" | "/erp/resep" | "/erp/pengaturan/lokasi" | "/erp/persemaian" | "/erp/plant-factory" };

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
  lots: readonly Pick<SeedLot, "id" | "lot_no" | "qty_on_hand" | "unit" | "expiry_date">[] | null;
  setup: FoundationSummary | null;
  /** From the sensors' side, empty where it is not installed. */
  alarms?: readonly { id: string; level: "peringatan" | "kritis"; label: string; value: string; place: string; since: string }[];
  silentDevices?: readonly { id: string; code: string; since: string }[];
  calibrationsDue?: readonly { id: string; code: string; due: string }[];
  /** From the sales side, empty where the reader has no access or it is not installed. */
  ordersDue?: readonly { id: string; no: string; customer: string; requested: string; openKg: string }[];
  invoicesOverdue?: readonly { id: string; no: string; customer: string; due: string; balance: string }[];
  lotsAging?: readonly { id: string; code: string; label: string; kg: string; until: string }[];
};

export const LOT_EXPIRY_WARNING_DAYS = 14;

const TONE_ORDER: Record<WorkTone, number> = { urgent: 0, due: 1, setup: 2, later: 3 };

const batchLink = (b: { id?: string }, fallback: "/erp/persemaian" | "/erp/plant-factory"): WorkLink => (b.id ? { to: "/erp/batch/$id", id: b.id } : { to: fallback });

const list = (items: readonly string[], shown = 2) =>
  items.length <= shown ? items.join(", ") : `${items.slice(0, shown).join(", ")}, dan ${items.length - shown} lainnya`;

const ago = (days: number) => (days === 0 ? "hari ini" : `${days} hari lalu`);

export function buildWork({ today, batches, freeHoles, sanitation, planned, lots, setup, alarms = [], silentDevices = [], calibrationsDue = [], ordersDue = [], invoicesOverdue = [], lotsAging = [] }: WorkInput): WorkItem[] {
  const items: WorkItem[] = [];

  for (const a of alarms) {
    items.push({
      key: `alarm-${a.id}`,
      tone: "urgent",
      tag: a.level === "kritis" ? "Alarm kritis" : "Alarm",
      title: `${a.label} ${a.value} di ${a.place}`,
      detail: `Sejak ${a.since}`,
      action: "Lihat alarm",
      link: { to: "/erp/alarm" },
    });
  }
  for (const d of silentDevices) {
    items.push({ key: `silent-${d.id}`, tone: "urgent", tag: "Perangkat", title: `${d.code} berhenti mengirim`, detail: `Terakhir ${d.since}`, action: "Periksa", link: { to: "/erp/perangkat" } });
  }

  for (const b of batches) {
    if (b.problemHoles.length > 0) {
      items.push({
        key: `holes-${b.code}`,
        tone: "urgent",
        tag: "Bermasalah",
        title: `${b.problemHoles.length} tanaman bermasalah di ${b.code}`,
        detail: list(b.problemHoles),
        action: "Periksa",
        link: batchLink(b, "/erp/plant-factory"),
      });
    }
    if (b.problemTrays.length > 0) {
      items.push({
        key: `trays-${b.code}`,
        tone: "urgent",
        tag: "Bermasalah",
        title: `${b.problemTrays.length} nampan bermasalah di ${b.code}`,
        detail: list(b.problemTrays),
        action: "Periksa",
        link: batchLink(b, "/erp/persemaian"),
      });
    }

    const target = addDays(b.sownAt, b.cycle);
    if (b.plants > 0 && b.age > b.cycle) {
      items.push({
        key: `harvest-${b.code}`,
        tone: "urgent",
        tag: "Terlambat",
        title: `${b.code} lewat target panen`,
        detail: `${b.plants} tanaman ${b.crop} · target ${formatShortDate(target)}, ${ago(b.age - b.cycle)}`,
        action: "Catat panen",
        link: batchLink(b, "/erp/plant-factory"),
      });
    } else if (b.harvestReady > 0) {
      items.push({
        key: `harvest-${b.code}`,
        tone: "due",
        tag: "Siap panen",
        title: `${b.code} siap panen`,
        detail: `${b.harvestReady} tanaman ${b.crop} · target ${formatShortDate(target)}`,
        action: "Catat panen",
        link: batchLink(b, "/erp/plant-factory"),
      });
    }

    if (b.readySeedlings > 0) {
      const planned = addDays(b.sownAt, b.transplantDay);
      const late = b.age > b.transplantDay;
      items.push({
        key: `move-${b.code}`,
        tone: late ? "urgent" : "due",
        tag: late ? "Terlambat" : "Siap pindah",
        title: `${b.code} siap pindah tanam`,
        detail: `${b.readySeedlings} bibit ${b.crop} · jadwal ${formatShortDate(planned)}${late ? `, ${ago(b.age - b.transplantDay)}` : ""}`,
        action: "Pindah tanam",
        link: batchLink(b, "/erp/persemaian"),
      });
    }
  }

  const seedlings = batches.reduce((n, b) => n + b.readySeedlings, 0);
  if (seedlings > freeHoles) {
    items.push({
      key: "capacity",
      tone: "due",
      tag: "Kapasitas",
      title: `${seedlings - freeHoles} bibit belum punya lubang`,
      detail: `${seedlings} bibit siap pindah, ${freeHoles} lubang siap pakai`,
      action: "Lihat tingkat",
      link: { to: "/erp/plant-factory" },
    });
  }

  if (sanitation.length > 0) {
    items.push({
      key: "sanitation",
      tone: "due",
      tag: "Sanitasi",
      title: `${sanitation.length} tingkat menunggu sanitasi`,
      detail: list(sanitation.map((t) => `Rak ${t.rack} · Tingkat ${t.tier}`)),
      action: "Tandai selesai",
      link: { to: "/erp/batch" },
    });
  }

  for (const l of lots ?? []) {
    if (l.qty_on_hand <= 0 || !l.expiry_date) continue;
    const left = `sisa ${l.qty_on_hand.toLocaleString("id-ID")} ${l.unit}`;
    const until = daysBetween(today, l.expiry_date);
    if (until < 0) {
      items.push({ key: `lot-${l.id}`, tone: "due", tag: "Kedaluwarsa", title: `Lot ${l.lot_no} sudah kedaluwarsa`, detail: `${left} · sejak ${formatShortDate(l.expiry_date)}`, action: "Koreksi stok", link: { to: "/erp/benih" } });
    } else if (until <= LOT_EXPIRY_WARNING_DAYS) {
      items.push({ key: `lot-${l.id}`, tone: "later", tag: "Segera habis masa", title: `Lot ${l.lot_no} kedaluwarsa ${until === 0 ? "hari ini" : `${until} hari lagi`}`, detail: `${left} · sampai ${formatShortDate(l.expiry_date)}`, action: "Lihat lot", link: { to: "/erp/benih" } });
    }
  }

  for (const o of ordersDue) {
    const late = o.requested < today;
    items.push({
      key: `order-${o.id}`,
      tone: late ? "urgent" : "due",
      tag: late ? "Terlambat" : "Kirim hari ini",
      title: `${o.no} untuk ${o.customer}`,
      detail: `${o.openKg} belum terkirim · diminta ${formatShortDate(o.requested)}`,
      action: "Kirim",
      link: { to: "/erp/pesanan/$id", id: o.id },
    });
  }
  for (const i of invoicesOverdue) {
    items.push({ key: `invoice-${i.id}`, tone: "due", tag: "Jatuh tempo", title: `${i.no} dari ${i.customer} belum lunas`, detail: `Sisa ${i.balance} · jatuh tempo ${formatShortDate(i.due)}`, action: "Lihat", link: { to: "/erp/invoice/$id", id: i.id } });
  }
  for (const l of lotsAging) {
    items.push({ key: `aging-${l.id}`, tone: "due", tag: "Segera jual", title: `${l.code}: ${l.kg} ${l.label}`, detail: `Batas simpan ${formatShortDate(l.until)}`, action: "Buat pesanan", link: { to: "/erp/pesanan" } });
  }

  for (const c of calibrationsDue) {
    items.push({ key: `cal-${c.id}`, tone: "due", tag: "Kalibrasi", title: `${c.code} lewat jadwal kalibrasi`, detail: `Jadwal ${formatShortDate(c.due)}`, action: "Catat", link: { to: "/erp/perangkat" } });
  }

  for (const p of planned ?? []) {
    items.push({ key: `plan-${p.id}`, tone: "later", tag: "Belum disemai", title: `${p.code} belum disemai`, detail: p.crop, action: "Semai", link: { to: "/erp/batch/$id", id: p.id } });
  }

  if (setup) {
    if (setup.slots.missing.length > 0) items.push({ key: "setup-slots", tone: "setup", tag: "Persiapan", title: "Kode lokasi belum lengkap", detail: `${setup.slots.present} dari ${setup.slots.expected} lubang dan posisi nampan`, action: "Periksa", link: { to: "/erp/pengaturan/lokasi" } });
    if (setup.crops === 0) items.push({ key: "setup-crops", tone: "setup", tag: "Persiapan", title: "Belum ada tanaman", detail: "Resep dan lot benih memerlukan tanaman", action: "Tambah", link: { to: "/erp/tanaman" } });
    if (setup.activeRecipes === 0) items.push({ key: "setup-recipes", tone: "setup", tag: "Persiapan", title: "Belum ada resep aktif", detail: "Batch baru memakai resep aktif", action: "Atur resep", link: { to: "/erp/resep" } });
    if (setup.seedLots === 0) items.push({ key: "setup-lots", tone: "setup", tag: "Persiapan", title: "Belum ada lot benih", detail: "Setiap batch memakai satu lot benih", action: "Tambah", link: { to: "/erp/benih" } });
  }

  return items.map((item, i) => [item, i] as const).sort(([a, i], [b, j]) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || i - j).map(([item]) => item);
}

/** The line under the page title: how much there is, and where to start. */
export function workSummary(items: readonly WorkItem[]) {
  if (items.length === 0) return "Tidak ada pekerjaan tertunda hari ini.";
  const first = items[0];
  if (items.length === 1) return `${first.title}.`;
  return `${items.length} pekerjaan menunggu. ${first.tone === "urgent" ? "Paling mendesak" : "Mulai dari"}: ${first.title}.`;
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
