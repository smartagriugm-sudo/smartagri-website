import type { ChamberReading, SeedChamberProvider } from "plant-factory-3d";
import { BATCHES, DUMMY_TODAY, addDays, daysBetween } from "./facility";

// Growth chamber CH1 (FAITHFUL FPG450), where every batch spends its germination
// phase before moving to the plant factory. The model in the plant-factory-3d
// package is the source of truth for layout; what this file shares with it is
// the tray position id, CH<chamber>-S<shelf>-P<position>.
//
// The tray count per shelf is estimated from photos, so nothing but SHELVES may
// assume it, and the future tables must not lock it in. The slot data and the
// climate here are dummy until the pf_* tables and the device are in place.

export const CHAMBER_CODE = "CH1";

/** S1 is the top shelf, S4 the flat floor of the interior. Positions run left to right, then front to back. */
export const SHELVES = [
  { shelf: 1, positions: 6, label: "Rak 1 (atas)" },
  { shelf: 2, positions: 6, label: "Rak 2 (tengah)" },
  { shelf: 3, positions: 6, label: "Rak 3 (bawah)" },
  { shelf: 4, positions: 4, label: "Rak 4 (dasar)" },
] as const;

export const CHAMBER_LAMPS = SHELVES.map((s) => ({ id: `LAMP-${CHAMBER_CODE}-L${s.shelf}`, shelf: s.shelf as number }));

export type SlotState = "kosong" | "disemai" | "berkecambah" | "siap_pindah" | "masalah";

/**
 * Handed to the 3D engine as its slotStates: `color` tints the tray label,
 * `plant` sets seedling height, `plugs` shows the growing media, `lid` covers a
 * freshly sown tray with an upturned one.
 */
export const SLOT_STATES: Record<SlotState, { label: string; color: number; plant: number; plugs: boolean; lid: boolean }> = {
  disemai: { label: "Baru disemai", color: 0xc9a26a, plant: 0, plugs: true, lid: true },
  berkecambah: { label: "Berkecambah", color: 0xa5d66b, plant: 0.6, plugs: true, lid: false },
  siap_pindah: { label: "Siap pindah tanam", color: 0x2f9e57, plant: 1.05, plugs: true, lid: false },
  masalah: { label: "Bermasalah", color: 0xd9433b, plant: 0.5, plugs: true, lid: false },
  kosong: { label: "Kosong", color: 0x8d9398, plant: 0, plugs: false, lid: false },
};

export const SLOT_STATE_KEYS = Object.keys(SLOT_STATES) as SlotState[];

export const slotColor = (s: SlotState) => `#${SLOT_STATES[s].color.toString(16).padStart(6, "0")}`;

export type Slot = {
  id: string;
  shelf: number;
  position: number;
  row: number;
  column: number;
  state: SlotState;
  trayColor: string;
  batch: string | null;
  crop: string;
  sownOn: string;
  seedCount: number;
  /** Seedlings still in the tray; the engine shows germinated / seedCount of them. */
  germinated: number;
  /** Seedlings already transplanted out of a partly emptied tray. */
  moved: number;
  transplantOn: string;
  note: string;
};

export function slotId(shelf: number, position: number) {
  return `${CHAMBER_CODE}-S${shelf}-P${String(position).padStart(2, "0")}`;
}

/** Which batch fills each shelf; positions beyond a list stay empty. */
const SHELF_PLAN: Record<number, { batch: string; state: SlotState; germinated: number[]; trays: number }> = {
  1: { batch: "B-121", state: "siap_pindah", germinated: [18, 17, 19, 18], trays: 4 },
  2: { batch: "B-123", state: "berkecambah", germinated: [16, 17, 6, 15, 18, 17], trays: 6 },
  3: { batch: "B-124", state: "disemai", germinated: [0, 0, 0, 0], trays: 4 },
  4: { batch: "B-122", state: "berkecambah", germinated: [19, 18, 17, 18], trays: 4 },
};

const TRAY_COLORS = ["hijau", "merah", "hijau", "biru", "hijau", "ungu"];
const SEEDS_PER_TRAY = 20;

/** Days from sowing to the planned move, matching the Pindah tanam phase of the lifecycle. */
export const DAYS_TO_TRANSPLANT = 10;

export function emptySlot(slot: Slot): Slot {
  return { ...slot, state: "kosong", batch: null, crop: "", sownOn: "", seedCount: 0, germinated: 0, moved: 0, transplantOn: "", note: "" };
}

export function seedSlots(): Slot[] {
  const out: Slot[] = [];
  for (const { shelf, positions } of SHELVES) {
    const plan = SHELF_PLAN[shelf];
    const batch = BATCHES.find((b) => b.code === plan.batch)!;
    for (let position = 1; position <= positions; position++) {
      const base: Slot = {
        id: slotId(shelf, position),
        shelf,
        position,
        row: Math.ceil(position / 2),
        column: ((position - 1) % 2) + 1,
        state: "kosong",
        trayColor: TRAY_COLORS[position - 1],
        batch: null,
        crop: "",
        sownOn: "",
        seedCount: 0,
        germinated: 0,
        moved: 0,
        transplantOn: "",
        note: "",
      };
      if (position > plan.trays) {
        out.push(base);
        continue;
      }
      const germinated = plan.germinated[position - 1];
      out.push({
        ...base,
        // One poorly germinating tray, so the problem state shows up in the demo.
        state: plan.state !== "disemai" && germinated < SEEDS_PER_TRAY / 2 ? "masalah" : plan.state,
        batch: batch.code,
        crop: batch.crop,
        sownOn: batch.sownAt,
        seedCount: SEEDS_PER_TRAY,
        germinated,
        transplantOn: addDays(batch.sownAt, DAYS_TO_TRANSPLANT),
      });
    }
  }
  return out;
}

/* --------------------------------------------------------------- climate */

/** Limits of the device according to the FPG450 brochure; a test keeps them equal to the model's manifest. */
export const CHAMBER_LIMITS = {
  tempLampOn: [10, 65],
  tempLampOff: [5, 65],
  humidity: [40, 95],
  lux: [0, 30000],
  loadPerShelfKg: 15,
} as const;

/** What the microclimate sensors report, or the reference they are read against. */
export type Climate = { temp: number; rh: number; co2: number; lux: number };

/** Vapour pressure deficit in kPa, from air temperature and relative humidity. */
export const vpdOf = (temp: number, rh: number) => 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3)) * (1 - rh / 100);

/* -------------------------------------------------------------- provider */

/**
 * The cache the chamber engine reads from, in the same shape as PfProvider.
 * The ERP only monitors: nothing here reaches the device. Until sensors report
 * through the API the climate is simulated, wandering around the reference,
 * which will come from the crop recipe.
 */
export class ChamberProvider implements SeedChamberProvider {
  slots = new Map<string, Slot>(seedSlots().map((s) => [s.id, s]));
  lamps = new Map<string, boolean>(CHAMBER_LAMPS.map((l) => [l.id, true]));
  reference: Climate = { temp: 24, rh: 72, co2: 800, lux: 12000 };
  climate: Climate = { temp: 23.8, rh: 73, co2: 790, lux: 12000 };
  private tick = 0;

  getSlot(id: string) {
    return this.slots.get(id);
  }

  lampsOn() {
    return CHAMBER_LAMPS.filter((l) => this.lamps.get(l.id)).length;
  }

  /** What the light should read with the current lamps: each of the four boards gives a quarter. */
  referenceLux() {
    return (this.reference.lux * this.lampsOn()) / CHAMBER_LAMPS.length;
  }

  vpd() {
    return vpdOf(this.climate.temp, this.climate.rh);
  }

  referenceVpd() {
    return vpdOf(this.reference.temp, this.reference.rh);
  }

  stepClimate() {
    this.tick++;
    const wave = (period: number, amp: number) => Math.sin((this.tick / period) * Math.PI * 2) * amp;
    const near = (from: number, to: number) => from + (to - from) * 0.2;
    this.climate = {
      temp: near(this.climate.temp, this.reference.temp + wave(45, 0.2)),
      rh: near(this.climate.rh, this.reference.rh + wave(60, 1.2)),
      co2: near(this.climate.co2, this.reference.co2 + wave(80, 25)),
      lux: near(this.climate.lux, this.referenceLux()),
    };
  }

  /** Drives the screen on the 3D model; the engine shows the first three. */
  readings(): Record<string, ChamberReading> {
    return {
      suhu: { label: "Suhu", value: this.climate.temp, unit: "°C", d: 1 },
      rh: { label: "Kelembapan", value: this.climate.rh, unit: "% RH", d: 0 },
      lux: { label: "Pencahayaan", value: this.climate.lux, unit: "lux", d: 0 },
    };
  }

  /** Whether the climate is near the reference, within the device's own fluctuation. */
  climateSettled() {
    return (
      Math.abs(this.climate.temp - this.reference.temp) <= 1 &&
      Math.abs(this.climate.rh - this.reference.rh) <= 5 &&
      Math.abs(this.climate.lux - this.referenceLux()) <= Math.max(200, this.referenceLux() * 0.1)
    );
  }
}

export const seedAge = (sownOn: string) => (sownOn ? daysBetween(sownOn, DUMMY_TODAY) : 0);
