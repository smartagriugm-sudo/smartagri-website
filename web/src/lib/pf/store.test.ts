import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHAMBER_LAMPS, CHAMBER_LIMITS, ChamberProvider, seedSlots, vpdOf } from "./chamber";
import type { BatchOverview, ErpSnapshot, OpenSlot } from "./batch";
import { ErpStore } from "./store";

const sample = () => {
  const s = new ErpStore();
  s.useSample();
  return s;
};

// The manifest is private, so these checks run only where the local model copy
// exists (see SETUP-ERP-MODEL.md).
const manifestPath = "public/brand/plant-factory/seed_chamber_manifest.json";

describe.runIf(existsSync(manifestPath))("growth chamber data against the 3D model", () => {
  const manifest = JSON.parse(existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "{}") as {
    slots: { id: string; shelf: number; position: number; row: number; column: number }[];
    objects: { id: string; type: string; lights_shelf?: number }[];
    spec: { temp_range_c: { lamp_on: number[]; lamp_off: number[] }; humidity_range_pct: number[]; illumination_lux: number[] };
  };

  it("uses exactly the tray positions of the 3D model", () => {
    const ours = seedSlots().map(({ id, shelf, position, row, column }) => ({ id, shelf, position, row, column }));
    const theirs = manifest.slots.map(({ id, shelf, position, row, column }) => ({ id, shelf, position, row, column }));
    expect(ours).toEqual(theirs);
  });

  it("knows every lamp of the 3D model and which shelf it lights", () => {
    const lamps = manifest.objects.filter((o) => o.type === "lamp").map((o) => ({ id: o.id, shelf: o.lights_shelf }));
    expect(CHAMBER_LAMPS).toEqual(lamps);
  });

  it("keeps the device limits equal to the model's manifest", () => {
    expect(CHAMBER_LIMITS.tempLampOn).toEqual(manifest.spec.temp_range_c.lamp_on);
    expect(CHAMBER_LIMITS.tempLampOff).toEqual(manifest.spec.temp_range_c.lamp_off);
    expect(CHAMBER_LIMITS.humidity).toEqual(manifest.spec.humidity_range_pct);
    expect(CHAMBER_LIMITS.lux).toEqual(manifest.spec.illumination_lux);
  });
});

describe("sample data", () => {
  it("gives no batch a place in both facilities at the start", () => {
    const s = sample();
    for (const b of s.batches.values()) {
      expect(s.holesOfBatch(b.code).length > 0 && s.traysOfBatch(b.code).length > 0, b.code).toBe(false);
    }
  });

  it("offers only tiers that can take the batch", () => {
    const tiers = sample().tiersFor("B-121");
    expect(tiers).toHaveLength(6);
    expect(tiers.find((t) => t.rack === 1 && t.tier === 3)).toMatchObject({ code: "R1-T3", free: 80, blocked: null });
    expect(tiers.find((t) => t.rack === 2 && t.tier === 1)?.blocked).toBe("Still in sanitation");
    expect(tiers.find((t) => t.rack === 1 && t.tier === 1)?.blocked).toMatch(/B-112/);
  });

  it("follows a batch through the lifecycle by where it is", () => {
    const s = sample();
    expect(s.phaseOf(s.batch("B-124")!)).toBe(0);
    expect(s.phaseOf(s.batch("B-123")!)).toBe(1);
    expect(s.phaseOf(s.batch("B-121")!)).toBe(2);
    expect(s.phaseOf(s.batch("B-118")!)).toBe(3);
    expect(s.phaseOf(s.batch("B-112")!)).toBe(4);
  });
});

describe("records from the database", () => {
  const overview: BatchOverview = {
    id: "b1", code: "B-001", status: "berjalan", sown_at: "2026-10-20", notes: "", created_at: "2026-10-19T00:00:00Z", finished_at: null,
    recipe_id: "r1", recipe_code: "RSP-PAK", recipe_version: 2, crop_id: "c1", crop_name: "Pakcoy", crop_variety: "Nauli",
    seed_lot_id: "l1", seed_lot_no: "L1", seeds: 30, germinated: 23, trays_now: 1, plants_now: 2, transplanted_at: "2026-10-29T18:00:00Z", harvested_kg: 0, cycle_days: 30,
  };
  const slot = (o: Partial<OpenSlot>): OpenSlot => ({
    id: "s", batch_id: "b1", batch_code: "B-001", location_id: "x", location_code: "", kind: "hole", qty: 1, germinated: 0, moved: 0, state: "tumbuh", note: "", placed_at: "2026-10-30T02:00:00Z", source_code: null, ...o,
  });
  const snapshot: ErpSnapshot = {
    today: "2026-11-06",
    batches: [overview],
    slots: [
      slot({ location_code: "R1-T1-G1-H01", source_code: "CH1-S1-P01" }),
      slot({ location_code: "R1-T1-G1-H02", state: "masalah", note: "layu" }),
      slot({ location_code: "CH1-S1-P02", kind: "tray", qty: 10, germinated: 3, moved: 2, state: "siap_pindah", placed_at: "2026-10-19T17:00:00Z" }),
    ],
    phases: [
      { recipe_id: "r1", phase: "semai", seq: 1, duration_days: 10 },
      { recipe_id: "r1", phase: "vegetatif", seq: 2, duration_days: 15 },
      { recipe_id: "r1", phase: "pra_panen", seq: 3, duration_days: 5 },
    ],
    locations: [
      { id: "t1", code: "R1-T1", level: "tier", slot_status: null },
      { id: "h9", code: "R2-T1-G1-H01", level: "hole", slot_status: "sanitasi" },
      { id: "h8", code: "R2-T2-G1-H01", level: "hole", slot_status: "retired" },
      { id: "p9", code: "CH1-S2-P01", level: "tray_position", slot_status: "maintenance" },
    ],
  };

  it("replaces the blank facility with what the records say", () => {
    const s = new ErpStore();
    expect(s.mode).toBe("loading");
    expect(s.batches.size).toBe(0);
    s.applySnapshot(snapshot);
    expect(s.mode).toBe("live");
    expect(s.batch("B-001")).toMatchObject({ crop: "Pakcoy Nauli", recipe: "RSP-PAK v2", age: 17, cycle: 30, transplantedAt: "2026-10-30" });
    // Both dates are stored as UTC, a day before the lab's calendar.
    // Day 17 of a recipe whose vegetative phase runs days 10 to 24.
    expect(s.pf.getHole("R1-T1-G1-H01")).toMatchObject({ state: "vegetatif", batch: "B-001", sourceSlot: "CH1-S1-P01" });
    expect(s.pf.getHole("R1-T1-G1-H02")).toMatchObject({ state: "masalah", note: "layu" });
    expect(s.chamber.getSlot("CH1-S1-P02")).toMatchObject({ state: "siap_pindah", seedCount: 10, germinated: 3, moved: 2, transplantOn: "2026-10-30", sownOn: "2026-10-20" });
    expect(s.locationIds.get("R1-T1")).toBe("t1");
  });

  it("does not count an open tray twice in the batch's germination", () => {
    const s = new ErpStore();
    s.applySnapshot(snapshot);
    expect(s.germinationOf("B-001")).toMatchObject({ seeds: 30, germinated: 23 });
  });

  it("marks places that cannot take anything, and tiers being cleaned", () => {
    const s = new ErpStore();
    s.applySnapshot(snapshot);
    expect(s.pf.getHole("R2-T1-G1-H01")).toMatchObject({ state: "sanitasi", offline: false });
    expect(s.pf.getHole("R2-T2-G1-H01")).toMatchObject({ state: "kosong", offline: true });
    expect(s.chamber.getSlot("CH1-S2-P01")).toMatchObject({ state: "kosong", offline: true });
    expect(s.tiersInSanitation().map((t) => t.code)).toEqual(["R2-T1"]);
    const tiers = s.tiersFor("B-001");
    expect(tiers.find((t) => t.code === "R2-T2")).toMatchObject({ free: 79, blocked: null });
    expect(tiers.find((t) => t.code === "R1-T1")).toMatchObject({ free: 78, blocked: null });
    expect(s.tiersFor("B-999").find((t) => t.code === "R1-T1")?.blocked).toMatch(/B-001/);
  });

  it("moves a batch to harvest when the recipe says so", () => {
    const s = new ErpStore();
    s.applySnapshot({ ...snapshot, today: "2026-11-15" });
    expect(s.pf.getHole("R1-T1-G1-H01")?.state).toBe("siap_panen");
    expect(s.phaseOf(s.batch("B-001")!)).toBe(4);
  });

  it("drops the sample data once records arrive", () => {
    const s = new ErpStore();
    s.useSample();
    expect(s.mode).toBe("sample");
    expect(s.batches.size).toBeGreaterThan(0);
    s.applySnapshot(snapshot);
    expect(s.batches.size).toBe(1);
    expect(s.pf.getHole("R1-T3-G1-H05")?.state).toBe("kosong");
  });
});

describe("chamber monitoring", () => {
  it("works out VPD from temperature and humidity", () => {
    expect(vpdOf(24, 72)).toBeCloseTo(0.836, 2);
    expect(vpdOf(24, 100)).toBe(0);
  });

  it("keeps the simulated climate near the reference and scales light with the lamps on", () => {
    const c = new ChamberProvider();
    c.lamps.set("LAMP-CH1-L1", false);
    expect(c.climateSettled()).toBe(false);
    for (let i = 0; i < 60; i++) c.stepClimate();
    expect(c.climate.temp).toBeCloseTo(c.reference.temp, 0);
    expect(c.climate.lux).toBeCloseTo(9000, 0);
    expect(c.climateSettled()).toBe(true);
  });

  it("offers the ERP no way to command the device", () => {
    expect("applyCommand" in new ChamberProvider()).toBe(false);
  });
});
