import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHAMBER_LAMPS, CHAMBER_LIMITS, ChamberProvider, seedSlots, vpdOf } from "./chamber";
import { ErpStore } from "./store";

const form = { state: "berkecambah" as const, batch: "B-123", crop: "Selada romaine", sownOn: "2026-10-30", seedCount: 20, germinated: 10, transplantOn: "", note: "" };

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

describe("growth chamber data", () => {
  it("gives no batch a place in both facilities at the start", () => {
    const s = new ErpStore();
    for (const b of s.batches.values()) {
      expect(s.holesOfBatch(b.code).length > 0 && s.traysOfBatch(b.code).length > 0, b.code).toBe(false);
    }
  });
});

describe("transplant from chamber to plant factory", () => {
  it("offers only tiers that can take the batch", () => {
    const tiers = new ErpStore().tiersFor("B-121");
    expect(tiers).toHaveLength(6);
    expect(tiers.find((t) => t.rack === 1 && t.tier === 3)).toMatchObject({ free: 80, blocked: null });
    expect(tiers.find((t) => t.rack === 2 && t.tier === 1)?.blocked).toBe("Masih sanitasi");
    expect(tiers.find((t) => t.rack === 1 && t.tier === 1)?.blocked).toMatch(/B-112/);
  });

  it("moves every ready seedling, linking each hole to its tray", () => {
    const s = new ErpStore();
    const ready = s.readyToMove().find((r) => r.batch.code === "B-121")!;
    const r = s.transplant("B-121", 1, 3);
    expect(r).toMatchObject({ count: ready.seedlings, left: 0, firstHole: "R1-T3-G1-H01" });
    const holes = s.holesOfBatch("B-121");
    expect(holes).toHaveLength(ready.seedlings);
    expect(holes.every((h) => h.state === "semai" && h.sourceSlot?.startsWith("CH1-S1-"))).toBe(true);
    expect(s.traysOfBatch("B-121")).toHaveLength(0);
    expect(s.chamber.getSlot("CH1-S1-P01")?.state).toBe("kosong");
    expect(s.batch("B-121")?.transplantedAt).toBeTruthy();
  });

  it("keeps the germination record after the trays are emptied", () => {
    const s = new ErpStore();
    const before = s.germinationOf("B-121");
    s.transplant("B-121", 1, 3);
    expect(s.germinationOf("B-121")).toEqual(before);
    expect(before.germinated).toBe(72);
  });

  it("leaves what does not fit in a partly emptied tray, still ready", () => {
    const s = new ErpStore();
    s.pf.updateHole("R1-T3-G1-H01", { state: "sanitasi" });
    expect(() => s.transplant("B-121", 1, 3)).toThrow(/sanitasi/);
    s.pf.updateHole("R1-T3-G1-H01", { state: "kosong" });
    // Shrink the tier to 25 free holes by planting the same batch in the rest.
    const holes = s.pf.holesOfRack(1).filter((h) => h.tier === 3);
    for (const h of holes.slice(25)) Object.assign(h, { state: "semai", batch: "B-121" });
    const r = s.transplant("B-121", 1, 3);
    expect(r).toMatchObject({ count: 25, left: 47 });
    const first = s.chamber.getSlot("CH1-S1-P01")!;
    const second = s.chamber.getSlot("CH1-S1-P02")!;
    expect(first.state).toBe("kosong");
    expect(second).toMatchObject({ state: "siap_pindah", germinated: 10, moved: 7 });
    expect(s.germinationOf("B-121").germinated).toBe(72);
    expect(s.readyToMove()[0].seedlings).toBe(47);
    expect(s.tiersFor("B-121").find((t) => t.rack === 1 && t.tier === 3)?.blocked).toBe("Penuh");
  });

  it("refuses a batch with nothing ready", () => {
    const s = new ErpStore();
    expect(() => s.transplant("B-123", 1, 3)).toThrow(/siap pindah/);
  });

  it("follows a batch through the lifecycle by where it is", () => {
    const s = new ErpStore();
    expect(s.phaseOf(s.batch("B-124")!)).toBe(0);
    expect(s.phaseOf(s.batch("B-123")!)).toBe(1);
    expect(s.phaseOf(s.batch("B-121")!)).toBe(2);
    expect(s.phaseOf(s.batch("B-118")!)).toBe(3);
    expect(s.phaseOf(s.batch("B-112")!)).toBe(4);
    s.transplant("B-121", 1, 3);
    expect(s.phaseOf(s.batch("B-121")!)).toBe(2);
  });
});

describe("tray form", () => {
  it("rejects inconsistent counts and dates", () => {
    const s = new ErpStore();
    expect(s.updateSlot("CH1-S2-P01", { ...form, germinated: 25 })).toMatch(/melebihi/);
    expect(s.updateSlot("CH1-S2-P01", { ...form, seedCount: 0 })).toMatch(/lebih dari 0/);
    expect(s.updateSlot("CH1-S2-P01", { ...form, batch: " " })).toMatch(/wajib/);
    expect(s.updateSlot("CH1-S2-P01", { ...form, transplantOn: "2026-10-01" })).toMatch(/sebelum/);
    expect(s.updateSlot("CH1-S2-P01", { ...form, crop: "Pakcoy" })).toMatch(/sudah tercatat/);
  });

  it("registers a new batch when a tray is sown with one", () => {
    const s = new ErpStore();
    expect(s.updateSlot("CH1-S1-P05", { ...form, state: "disemai", batch: "B-130", crop: "Bayam", sownOn: "2026-11-03", germinated: 0 })).toBeNull();
    expect(s.batch("B-130")).toMatchObject({ crop: "Bayam", age: 0, transplantedAt: null });
    expect(s.chamber.getSlot("CH1-S1-P05")).toMatchObject({ transplantOn: "2026-11-13" });
  });

  it("clears the tray when it is set empty", () => {
    const s = new ErpStore();
    expect(s.updateSlot("CH1-S2-P01", { ...form, state: "kosong" })).toBeNull();
    expect(s.chamber.getSlot("CH1-S2-P01")).toMatchObject({ state: "kosong", batch: null, seedCount: 0 });
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
