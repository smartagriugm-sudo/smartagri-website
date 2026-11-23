import { buildWork, type BatchWork, type WorkItem } from "./dashboard";
import { ago, formatWithUnit, metricLabel } from "./monitoring";
import { localeOf, type Lang } from "../i18n-core";
import type { ErpStore } from "./store";

// The store's side of the day's work: what the batches and sensors say, with no
// further loading. The front page adds records, sales, stock and people to this;
// the headbar's bell shows it as it is, on every page.

export function batchWork(store: ErpStore): BatchWork[] {
  return [...store.batches.values()].map((b) => {
    const holes = store.holesOfBatch(b.code);
    const trays = store.traysOfBatch(b.code);
    return {
      id: b.id,
      code: b.code,
      crop: b.crop,
      sownAt: b.sownAt,
      age: b.age,
      cycle: b.cycle,
      transplantDay: b.transplantDay,
      plants: holes.length,
      harvestReady: holes.filter((h) => h.state === "siap_panen").length,
      problemHoles: holes.filter((h) => h.state === "masalah").map((h) => h.id),
      problemTrays: trays.filter((t) => t.state === "masalah").map((t) => t.id),
      readySeedlings: trays.filter((t) => t.state === "siap_pindah").reduce((n, t) => n + t.germinated, 0),
    };
  });
}

const alarmTime = (iso: string, lang: Lang = "en") => new Intl.DateTimeFormat(lang === "id" ? localeOf(lang) : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));

/** What the bell rings for: urgent and due, nothing that only wants setting up. */
export function notifications(store: ErpStore, lang: Lang = "en"): WorkItem[] {
  if (!store.hasData) return [];
  return buildWork({
    today: store.today,
    lang,
    batches: batchWork(store),
    freeHoles: store.freeCapacity(),
    sanitation: store.mode === "sample" ? [] : store.tiersInSanitation(),
    planned: null,
    lots: null,
    setup: null,
    alarms: store.monitoring?.alarms.filter((a) => !a.ack_at).map((a) => ({ id: a.id, level: a.level, label: metricLabel(a.metric, lang), value: formatWithUnit(a.metric, a.value, lang), place: a.location_code, since: alarmTime(a.opened_at, lang) })),
    silentDevices: store.monitoring?.assets.filter((a) => a.link_state === "terlambat").map((a) => ({ id: a.id, code: a.code, since: a.last_seen_at ? ago(a.last_seen_at, new Date(), lang) : lang === "id" ? "tidak diketahui" : "unknown" })),
    calibrationsDue: store.monitoring?.assets.filter((a) => a.status === "aktif" && a.next_due && a.next_due < store.today).map((a) => ({ id: a.id, code: a.code, due: a.next_due! })),
  }).filter((w) => w.tone === "urgent" || w.tone === "due");
}
