// Plant factory PF01: the hole addressing plus placeholder operating data.
//
// The building, racks and equipment live in the plant-factory-3d package; its
// model is the source of truth for layout, so no dimensions are kept here.
// What this file shares with the model is the hole id, R<rack>-T<tier>-G<gully>-H<hole>,
// the key that links ERP records to what is on screen.
//
// The data half (batches, hole states, readings) is sample data, shown where the
// pf_* tables are not installed and, for the readings, until the sensors report.
// It is deterministic so every render agrees, which is why its "today" is fixed.
//
// A batch germinates in the growth chamber first (chamber.ts), so only batches
// past transplanting appear in these holes.

/* ------------------------------------------------------------------ holes */

export const FACILITY_CODE = "PF01";

export const RACK_SPEC = { count: 2, tiers: 3, gullies: 4, holes: 20 } as const;

export const HOLES_PER_RACK = RACK_SPEC.tiers * RACK_SPEC.gullies * RACK_SPEC.holes;
export const HOLES_TOTAL = HOLES_PER_RACK * RACK_SPEC.count;

export type HoleState = "kosong" | "semai" | "vegetatif" | "siap_panen" | "masalah" | "sanitasi";

/**
 * Handed to the 3D engine as its holeStates: `color` tints the ring around a
 * hole and `plant` scales the plant, 0 meaning none. The first five match the
 * package's defaults; sanitasi is ours, for a tier between batches.
 */
export const HOLE_STATES: Record<HoleState, { label: string; color: number; plant: number }> = {
  semai: { label: "Seedlings", color: 0xa5d66b, plant: 0.35 },
  vegetatif: { label: "Vegetative", color: 0x3fa652, plant: 0.75 },
  siap_panen: { label: "Ready to harvest", color: 0xe0a526, plant: 1.05 },
  masalah: { label: "Problem", color: 0xd9433b, plant: 0.55 },
  kosong: { label: "Empty", color: 0x8d9398, plant: 0 },
  sanitasi: { label: "Sanitation", color: 0x7fb7e8, plant: 0 },
};

export const HOLE_STATE_KEYS = Object.keys(HOLE_STATES) as HoleState[];

export const stateColor = (s: HoleState) => `#${HOLE_STATES[s].color.toString(16).padStart(6, "0")}`;

export const isPlanted = (s: HoleState) => HOLE_STATES[s].plant > 0;

export const DUMMY_TODAY = "2026-11-03";

const dayMs = 86_400_000;

export function addDays(date: string, n: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * dayMs).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs);
}

export type Batch = {
  code: string;
  crop: string;
  recipe: string;
  sownAt: string;
  /** Days since sowing, as of the dummy "today". */
  age: number;
  cycle: number;
  /** Null until the first seedlings leave the chamber. */
  transplantedAt: string | null;
  /** The day of the recipe the seedlings are due to move. */
  transplantDay: number;
  /** The recipe and its phase today, for reading sensors against its targets. */
  recipeId?: string;
  phaseKey?: string | null;
  /** The day of the recipe the first phase ends and germination shows. */
  germinationDay: number;
  /** The record's id, once the batch comes from the database. */
  id?: string;
  /** Counts of trays already emptied, so germination stays known after they are gone. */
  archived: { seeds: number; germinated: number };
};

function batch(code: string, crop: string, recipe: string, sownAt: string, cycle: number, moved?: [seeds: number, germinated: number]): Batch {
  return {
    code,
    crop,
    recipe,
    sownAt,
    cycle,
    age: daysBetween(sownAt, DUMMY_TODAY),
    transplantedAt: moved ? addDays(sownAt, 10) : null,
    transplantDay: 10,
    germinationDay: 4,
    archived: { seeds: moved?.[0] ?? 0, germinated: moved?.[1] ?? 0 },
  };
}

export const BATCHES: Batch[] = [
  batch("B-112", "Romaine lettuce", "RSP-SEL-03 v4", "2026-10-01", 35, [100, 86]),
  batch("B-115", "Butterhead lettuce", "RSP-SEL-02 v2", "2026-10-12", 35, [100, 91]),
  batch("B-118", "Pakcoy", "RSP-PAK-01 v3", "2026-10-19", 30, [100, 88]),
  batch("B-119", "Pakcoy", "RSP-PAK-01 v3", "2026-10-23", 30, [100, 90]),
  batch("B-121", "Water spinach", "RSP-KAN-01 v1", "2026-10-24", 25),
  batch("B-122", "Butterhead lettuce", "RSP-SEL-02 v2", "2026-10-28", 35),
  batch("B-123", "Romaine lettuce", "RSP-SEL-03 v4", "2026-10-30", 35),
  batch("B-124", "Pakcoy", "RSP-PAK-01 v3", "2026-11-02", 30),
];

/** What occupies each tier of each rack: a batch, "kosong" when ready for one, or "sanitasi" between batches. */
const TIER_PLAN: Record<number, string[]> = {
  1: ["B-112", "B-118", "kosong"],
  2: ["sanitasi", "B-115", "B-119"],
};

export type Hole = {
  id: string;
  rack: number;
  tier: number;
  gully: number;
  hole: number;
  state: HoleState;
  batch: string | null;
  /** The chamber tray this seedling came from, once the batch moved through the ERP. */
  sourceSlot: string | null;
  note: string;
  /** Under maintenance or retired, so it takes no plant whatever it looks like. */
  offline: boolean;
};

export function holeId(rack: number, tier: number, gully: number, hole: number) {
  return `R${rack}-T${tier}-G${gully}-H${String(hole).padStart(2, "0")}`;
}

/** Small deterministic hash, so the dummy gaps land in the same holes every render. */
function noise(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function stateFor(batch: Batch, n: number): HoleState {
  if (n < 0.012) return "masalah";
  if (n < 0.06) return "kosong";
  if (batch.age >= batch.cycle - 3) return "siap_panen";
  return batch.age >= 14 ? "vegetatif" : "semai";
}

export function seedHoles(): Hole[] {
  const out: Hole[] = [];
  for (let rack = 1; rack <= RACK_SPEC.count; rack++) {
    for (let tier = 1; tier <= RACK_SPEC.tiers; tier++) {
      const plan = TIER_PLAN[rack][tier - 1];
      const planted = BATCHES.find((b) => b.code === plan);
      for (let gully = 1; gully <= RACK_SPEC.gullies; gully++) {
        for (let hole = 1; hole <= RACK_SPEC.holes; hole++) {
          const id = holeId(rack, tier, gully, hole);
          const state = planted ? stateFor(planted, noise(id)) : (plan as HoleState);
          out.push({ id, rack, tier, gully, hole, state, batch: isPlanted(state) ? planted!.code : null, sourceSlot: null, note: "", offline: false });
        }
      }
    }
  }
  return out;
}

/** Every hole, empty, before records are laid over them. */
export function blankHoles(): Hole[] {
  return seedHoles().map((h) => ({ ...h, state: "kosong", batch: null }));
}

export function batchOf(code: string | null | undefined): Batch | undefined {
  return code ? BATCHES.find((b) => b.code === code) : undefined;
}

export function countByState(holes: Iterable<Hole>): Record<HoleState, number> {
  const c: Record<HoleState, number> = { kosong: 0, semai: 0, vegetatif: 0, siap_panen: 0, masalah: 0, sanitasi: 0 };
  for (const h of holes) c[h.state]++;
  return c;
}

/* ------------------------------------------------------------- readings */

export type Reading = { label: string; value: string; unit: string; ok: boolean };

/** Placeholder readings until the sensors report. */
export const GROW_ROOM_READINGS: Reading[] = [
  { label: "Temperature", value: "22.4", unit: "°C", ok: true },
  { label: "RH", value: "68", unit: "%", ok: true },
  { label: "CO₂", value: "812", unit: "ppm", ok: true },
  { label: "PPFD", value: "245", unit: "µmol/m²/s", ok: true },
];

export const RESERVOIR_READINGS: Reading[] = [
  { label: "EC", value: "1.62", unit: "mS/cm", ok: true },
  { label: "pH", value: "6.48", unit: "", ok: false },
  { label: "Solution temperature", value: "23.1", unit: "°C", ok: true },
  { label: "Tank level", value: "74", unit: "%", ok: true },
];
