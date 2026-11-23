import type { Lang } from "../i18n-core";
import { cctvFeed, feedDevice, feedLabel, type CctvFeed } from "./cctv";
import { slotColor, slotStateLabel } from "./chamber";
import { addDays, holeStateLabel, stateColor } from "./facility";
import type { ErpStore } from "./store";

// What a floating card says about the thing under the cursor in a 3D model: a hole with
// its plant, a seed tray, or a piece of equipment. The same words the detail panels use.

export type SceneFacts = {
  title: string;
  sub: string;
  /** Null for equipment that has no state of its own to report. */
  state: { label: string; color: string } | null;
  rows: [string, string][];
  progress: { value: number; max: number; label: string } | null;
  /** What is unusual about it, or why there is nothing else to say. */
  note: string;
  /** A camera in the model: the card shows its picture. */
  cctv?: CctvFeed;
};

type ObjectLike = { id: string; type: string; rack?: number; tier?: number; lights_shelf?: number | null; assumed?: boolean };

const dateText = (iso: string, lang: Lang) => {
  const t = new Date(`${iso}T00:00:00`);
  return Number.isNaN(t.getTime()) ? iso : new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(t);
};

/** English first, Indonesian second, picked by `lang`. */
const say = (lang: Lang, en: string, id: string) => (lang === "id" ? id : en);

export function holeFacts(store: ErpStore, id: string, lang: Lang = "en"): SceneFacts | null {
  const hole = store.pf.getHole(id);
  if (!hole) return null;
  const batch = store.batch(hole.batch);
  const state = { label: holeStateLabel(hole.state, lang), color: stateColor(hole.state) };
  const sub = say(lang, `Rack ${hole.rack} · Tier ${hole.tier} · Gully ${hole.gully} · Hole ${hole.hole}`, `Rack ${hole.rack} · Tingkat ${hole.tier} · Gully ${hole.gully} · Lubang ${hole.hole}`);
  if (!batch) {
    const note = hole.offline
      ? say(lang, "This hole is out of use.", "Lubang ini tidak dipakai.")
      : hole.state === "sanitasi"
        ? say(lang, "This hole is being sanitised.", "Lubang ini sedang disanitasi.")
        : say(lang, "No plant in this hole yet.", "Belum ada tanaman di lubang ini.");
    return { title: id, sub, state, rows: [], progress: null, note };
  }
  const rows: [string, string][] = [[say(lang, "Crop", "Tanaman"), batch.crop], ["Batch", batch.code]];
  if (batch.transplantedAt) rows.push([say(lang, "Transplant", "Pindah tanam"), dateText(batch.transplantedAt, lang)]);
  rows.push([say(lang, "Expected harvest", "Perkiraan panen"), dateText(addDays(batch.sownAt, batch.cycle), lang)]);
  if (hole.sourceSlot) rows.push([say(lang, "Source tray", "Tray asal"), hole.sourceSlot]);
  return {
    title: id,
    sub,
    state,
    rows,
    progress: batch.cycle ? { value: Math.min(batch.age, batch.cycle), max: batch.cycle, label: say(lang, `Day${batch.age} of ${batch.cycle}`, `Hari ${batch.age} dari ${batch.cycle}`) } : null,
    note: hole.note,
  };
}

export function slotFacts(store: ErpStore, id: string, lang: Lang = "en"): SceneFacts | null {
  const slot = store.chamber.getSlot(id);
  if (!slot) return null;
  const batch = store.batch(slot.batch);
  const state = { label: slotStateLabel(slot.state, lang), color: slotColor(slot.state) };
  const sub = say(lang, `Shelf ${slot.shelf} · Position ${slot.position}`, `Rak ${slot.shelf} · Posisi ${slot.position}`);
  if (!batch) {
    const note = slot.offline ? say(lang, "This position is out of use.", "Posisi ini tidak dipakai.") : say(lang, "No seedling tray in this position yet.", "Belum ada tray bibit di posisi ini.");
    return { title: id, sub, state, rows: [], progress: null, note };
  }
  const rows: [string, string][] = [[say(lang, "Crop", "Tanaman"), batch.crop], ["Batch", batch.code], [say(lang, "Sown", "Disemai"), dateText(slot.sownOn, lang)]];
  if (slot.transplantOn) rows.push([say(lang, "Planned move", "Rencana pindah"), dateText(slot.transplantOn, lang)]);
  if (slot.moved > 0) rows.push([say(lang, "Already moved", "Sudah dipindah"), say(lang, `${slot.moved} seedlings`, `${slot.moved} bibit`)]);
  return {
    title: id,
    sub,
    state,
    rows,
    progress: slot.seedCount ? { value: slot.germinated + slot.moved, max: slot.seedCount, label: say(lang, `${slot.germinated + slot.moved} of ${slot.seedCount} seeds germinated`, `${slot.germinated + slot.moved} dari ${slot.seedCount} benih berkecambah`) } : null,
    note: slot.note,
  };
}

const assumed = (lang: Lang) => say(lang, "Its place is still assumed, not confirmed.", "Posisinya masih perkiraan, belum dipastikan.");
const onOff = (on: unknown, lang: Lang) => (on ? say(lang, "On", "Menyala") : say(lang, "Off", "Mati"));

export function factoryObjectFacts(store: ErpStore, o: ObjectLike, lang: Lang = "en"): SceneFacts {
  const feed = o.type === "cctv" ? cctvFeed(o.id) : null;
  if (feed) {
    return {
      title: feedLabel(feed, lang),
      sub: `${o.id} · ${feedDevice(feed, lang)}`,
      state: null,
      rows: [],
      progress: null,
      note: feed.live ? "" : say(lang, "No camera installed here yet.", "Belum ada kamera terpasang di sini."),
      cctv: feed,
    };
  }
  const titles: Record<string, string> = {
    lamp: say(lang, `Lamp, Rack ${o.rack} · Tier ${o.tier}`, `Lampu, Rack ${o.rack} · Tingkat ${o.tier}`),
    pump: o.rack ? say(lang, `Pump, Rack ${o.rack}`, `Pompa, Rack ${o.rack}`) : say(lang, "Main pump", "Pompa utama"),
    sensor_climate: say(lang, `Climate sensor, Rack ${o.rack}`, `Sensor iklim, Rack ${o.rack}`),
    sensor_nutrient: say(lang, "Nutrient sensor", "Sensor nutrisi"),
    tank: say(lang, "Nutrient tank", "Tangki nutrisi"),
  };
  const on = o.type === "lamp" ? store.pf.lamps.get(o.id) : o.type === "pump" ? store.pf.pumps.get(o.id) : undefined;
  const sample = o.type === "lamp" || o.type === "pump";
  const label = o.type === "lamp" ? onOff(on, lang) : on ? say(lang, "In progress", "Berjalan") : say(lang, "Stopped", "Berhenti");
  return {
    title: titles[o.type] ?? o.id,
    sub: o.id,
    state: sample ? { label, color: on ? "#0E9B7A" : "#8D9398" } : null,
    rows: [],
    progress: null,
    note: o.assumed ? assumed(lang) : sample ? say(lang, "Sample status, not from the device yet.", "Status contoh, belum dari perangkat.") : "",
  };
}

export function chamberObjectFacts(store: ErpStore, o: ObjectLike, lang: Lang = "en"): SceneFacts {
  const lamp = o.type === "lamp";
  const on = lamp ? store.chamber.lamps.get(o.id) : undefined;
  return {
    title: lamp
      ? say(lang, `LED panel above shelf ${o.lights_shelf}`, `Panel LED di atas rak ${o.lights_shelf}`)
      : o.type === "sensor_climate"
        ? say(lang, "Microclimate sensor", "Sensor iklim mikro")
        : say(lang, "Growth chamber", "Growth chamber"),
    sub: o.id,
    state: lamp ? { label: onOff(on, lang), color: on ? "#0E9B7A" : "#8D9398" } : null,
    rows: [],
    progress: null,
    note: o.assumed ? assumed(lang) : "",
  };
}
