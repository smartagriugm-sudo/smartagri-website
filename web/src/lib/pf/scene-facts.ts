import { SLOT_STATES, slotColor } from "./chamber";
import { HOLE_STATES, addDays, stateColor } from "./facility";
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
};

type ObjectLike = { id: string; type: string; rack?: number; tier?: number; lights_shelf?: number | null; assumed?: boolean };

const dateText = (iso: string) => {
  const t = new Date(`${iso}T00:00:00`);
  return Number.isNaN(t.getTime()) ? iso : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(t);
};

export function holeFacts(store: ErpStore, id: string): SceneFacts | null {
  const hole = store.pf.getHole(id);
  if (!hole) return null;
  const batch = store.batch(hole.batch);
  const state = { label: HOLE_STATES[hole.state].label, color: stateColor(hole.state) };
  const sub = `Rack ${hole.rack} · Tier ${hole.tier} · Gully ${hole.gully} · Hole ${hole.hole}`;
  if (!batch) {
    const note = hole.offline ? "This hole is out of use." : hole.state === "sanitasi" ? "This hole is being sanitised." : "No plant in this hole yet.";
    return { title: id, sub, state, rows: [], progress: null, note };
  }
  const rows: [string, string][] = [["Crop", batch.crop], ["Batch", batch.code]];
  if (batch.transplantedAt) rows.push(["Transplant", dateText(batch.transplantedAt)]);
  rows.push(["Expected harvest", dateText(addDays(batch.sownAt, batch.cycle))]);
  if (hole.sourceSlot) rows.push(["Source tray", hole.sourceSlot]);
  return {
    title: id,
    sub,
    state,
    rows,
    progress: batch.cycle ? { value: Math.min(batch.age, batch.cycle), max: batch.cycle, label: `Day${batch.age} of ${batch.cycle}` } : null,
    note: hole.note,
  };
}

export function slotFacts(store: ErpStore, id: string): SceneFacts | null {
  const slot = store.chamber.getSlot(id);
  if (!slot) return null;
  const batch = store.batch(slot.batch);
  const state = { label: SLOT_STATES[slot.state].label, color: slotColor(slot.state) };
  const sub = `Rack ${slot.shelf} · Position ${slot.position}`;
  if (!batch) {
    return { title: id, sub, state, rows: [], progress: null, note: slot.offline ? "This position is out of use." : "No seedling tray in this position yet." };
  }
  const rows: [string, string][] = [["Crop", batch.crop], ["Batch", batch.code], ["Sown", dateText(slot.sownOn)]];
  if (slot.transplantOn) rows.push(["Planned move", dateText(slot.transplantOn)]);
  if (slot.moved > 0) rows.push(["Already moved", `${slot.moved} seedlings`]);
  return {
    title: id,
    sub,
    state,
    rows,
    progress: slot.seedCount ? { value: slot.germinated + slot.moved, max: slot.seedCount, label: `${slot.germinated + slot.moved} of ${slot.seedCount} seeds germinated` } : null,
    note: slot.note,
  };
}

const ASSUMED = "Its place is still assumed, not confirmed.";

export function factoryObjectFacts(store: ErpStore, o: ObjectLike): SceneFacts {
  const titles: Record<string, string> = {
    lamp: `Lamp, Rack ${o.rack} · Tier ${o.tier}`,
    pump: o.rack ? `Pump, Rack ${o.rack}` : "Main pump",
    sensor_climate: `Climate sensor, Rack ${o.rack}`,
    sensor_nutrient: "Nutrient sensor",
    tank: "Nutrient tank",
    cctv: o.id === "CCTV-GROW" ? "Grow room CCTV" : "Control room CCTV",
  };
  const on = o.type === "lamp" ? store.pf.lamps.get(o.id) : o.type === "pump" ? store.pf.pumps.get(o.id) : undefined;
  const sample = o.type === "lamp" || o.type === "pump";
  const label = o.type === "lamp" ? (on ? "On" : "Off") : on ? "In progress" : "Stopped";
  return {
    title: titles[o.type] ?? o.id,
    sub: o.id,
    state: sample ? { label, color: on ? "#0E9B7A" : "#8D9398" } : null,
    rows: [],
    progress: null,
    note: o.assumed ? ASSUMED : sample ? "Sample status, not from the device yet." : "",
  };
}

export function chamberObjectFacts(store: ErpStore, o: ObjectLike): SceneFacts {
  const lamp = o.type === "lamp";
  const on = lamp ? store.chamber.lamps.get(o.id) : undefined;
  return {
    title: lamp ? `LED panel above shelf ${o.lights_shelf}` : o.type === "sensor_climate" ? "Microclimate sensor" : "Growth chamber",
    sub: o.id,
    state: lamp ? { label: on ? "On" : "Off", color: on ? "#0E9B7A" : "#8D9398" } : null,
    rows: [],
    progress: null,
    note: o.assumed ? ASSUMED : "",
  };
}
