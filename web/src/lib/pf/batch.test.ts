import { describe, expect, it } from "vitest";
import { accessOf } from "./foundation";
import { ageOn, batchStage, batchStep, holeStateOn, isLotUsable, jakartaToday, parseGerminated, parseHarvestForm, parseSeedLotForm, parseSowForm, phaseAt, tierOfHole, transplantDay, type BatchOverview, type SeedLotForm } from "./batch";

const phases = [
  { phase: "semai", duration_days: 4 },
  { phase: "bibit", duration_days: 6 },
  { phase: "vegetatif", duration_days: 15 },
  { phase: "pra_panen", duration_days: 5 },
] as const;

describe("the step a batch is on", () => {
  const b = { status: "berjalan", plants_now: 0, harvested_kg: 0 } as const;
  it("follows the work, not the calendar", () => {
    expect(batchStep({ ...b, status: "direncanakan" }, 0, false)).toBe(0);
    expect(batchStep(b, 0, false)).toBe(1);
    expect(batchStep(b, 10, false)).toBe(2);
    expect(batchStep({ ...b, plants_now: 5 }, 10, false)).toBe(2);
    expect(batchStep({ ...b, plants_now: 5 }, 0, false)).toBe(3);
    expect(batchStep({ ...b, plants_now: 5 }, 0, true)).toBe(4);
    expect(batchStep({ ...b, plants_now: 5, harvested_kg: 1 }, 0, false)).toBe(4);
    expect(batchStep({ ...b, status: "gagal" }, 0, false)).toBe(5);
  });
});

describe("a batch's stage from the recipe's days", () => {
  it("finds the phase for an age, and none past the end", () => {
    expect(phaseAt(0, phases)).toBe("semai");
    expect(phaseAt(4, phases)).toBe("bibit");
    expect(phaseAt(29, phases)).toBe("pra_panen");
    expect(phaseAt(30, phases)).toBeNull();
  });

  it("gives holes the look of the plant's age", () => {
    expect(holeStateOn(5, phases)).toBe("semai");
    expect(holeStateOn(10, phases)).toBe("vegetatif");
    expect(holeStateOn(25, phases)).toBe("siap_panen");
    expect(holeStateOn(99, phases)).toBe("siap_panen");
  });

  it("is ready at the end of a recipe with no pre-harvest phase", () => {
    const short = [{ phase: "vegetatif", duration_days: 10 }] as const;
    expect(holeStateOn(9, short)).toBe("vegetatif");
    expect(holeStateOn(10, short)).toBe("siap_panen");
  });

  it("plans the move when vegetative growth starts, with a default otherwise", () => {
    expect(transplantDay(phases)).toBe(10);
    expect(transplantDay([{ phase: "vegetatif", duration_days: 10 }])).toBe(10);
    expect(transplantDay([{ phase: "semai", duration_days: 3 }])).toBe(10);
  });

  it("never counts a negative age", () => {
    expect(ageOn("2026-11-10", "2026-11-06")).toBe(0);
    expect(ageOn(null, "2026-11-06")).toBe(0);
    expect(ageOn("2026-11-01", "2026-11-06")).toBe(5);
  });

  it("says where a batch is", () => {
    const b = { status: "berjalan", sown_at: "2026-11-01", cycle_days: 30, plants_now: 0, trays_now: 2 } as BatchOverview;
    expect(batchStage(b, "2026-11-06")).toBe("Persemaian · hari 5 dari 30");
    expect(batchStage({ ...b, plants_now: 3 }, "2026-11-06")).toMatch(/^Sebagian di plant factory/);
    expect(batchStage({ ...b, plants_now: 3, trays_now: 0 }, "2026-11-06")).toMatch(/^Plant factory/);
    expect(batchStage({ ...b, status: "direncanakan" }, "2026-11-06")).toBe("Menunggu semai");
    expect(batchStage({ ...b, status: "gagal" }, "2026-11-06")).toBe("Gagal");
  });
});

describe("small helpers", () => {
  it("names the tier of a hole", () => {
    expect(tierOfHole("R1-T2-G3-H12")).toBe("R1-T2");
  });

  it("uses the lab's date, not the browser's", () => {
    expect(jakartaToday(new Date("2026-11-05T18:00:00Z"))).toBe("2026-11-06");
    expect(jakartaToday(new Date("2026-11-05T16:59:00Z"))).toBe("2026-11-05");
  });

  it("offers only lots with stock that have not expired", () => {
    expect(isLotUsable({ qty_on_hand: 5, expiry_date: null }, "2026-11-06")).toBe(true);
    expect(isLotUsable({ qty_on_hand: 5, expiry_date: "2026-11-06" }, "2026-11-06")).toBe(true);
    expect(isLotUsable({ qty_on_hand: 5, expiry_date: "2026-11-05" }, "2026-11-06")).toBe(false);
    expect(isLotUsable({ qty_on_hand: 0, expiry_date: null }, "2026-11-06")).toBe(false);
  });

  it("lets operators record and managers plan", () => {
    expect(accessOf(["operator"], false)).toMatchObject({ canOperate: true, canManageProduction: false, canAdmin: false });
    expect(accessOf(["manajer_produksi"], false)).toMatchObject({ canOperate: true, canManageProduction: true });
    expect(accessOf(["peneliti"], false).canOperate).toBe(false);
    expect(accessOf([], true).canOperate).toBe(true);
  });
});

describe("forms", () => {
  const lot: SeedLotForm = { cropId: "c", unit: "biji", lotNo: "L1", qty: "100", receivedOn: "2026-10-01", expiryOn: "", supplier: "", notes: "" };

  it("checks a seed lot", () => {
    expect(parseSeedLotForm(lot)).toMatchObject({ error: null, qty: 100 });
    expect(parseSeedLotForm({ ...lot, unit: "gram", qty: "12,5" })).toMatchObject({ error: null, qty: 12.5 });
    expect(parseSeedLotForm({ ...lot, qty: "12,5" }).error).toMatch(/bulat/);
    expect(parseSeedLotForm({ ...lot, cropId: "" }).error).toMatch(/tanaman/);
    expect(parseSeedLotForm({ ...lot, lotNo: " " }).error).toMatch(/lot/);
    expect(parseSeedLotForm({ ...lot, qty: "0" }).error).toMatch(/lebih dari 0/);
    expect(parseSeedLotForm({ ...lot, expiryOn: "2026-09-01" }).error).toMatch(/kedaluwarsa/);
  });

  it("checks a sowing, asking for the weight only on lots kept in grams", () => {
    expect(parseSowForm(["a"], "20", "2026-11-06", "2026-11-06", "biji", "")).toMatchObject({ error: null, perTray: 20, seedUsed: null });
    expect(parseSowForm(["a"], "20", "2026-11-06", "2026-11-06", "gram", "").error).toMatch(/berat/);
    expect(parseSowForm(["a"], "20", "2026-11-06", "2026-11-06", "gram", "2,5")).toMatchObject({ seedUsed: 2.5 });
    expect(parseSowForm([], "20", "2026-11-06", "2026-11-06", "biji", "").error).toMatch(/posisi/);
    expect(parseSowForm(["a"], "2.5", "2026-11-06", "2026-11-06", "biji", "").error).toMatch(/bulat/);
    expect(parseSowForm(["a"], "20", "2026-11-07", "2026-11-06", "biji", "").error).toMatch(/masa depan/);
  });

  it("checks a harvest", () => {
    expect(parseHarvestForm("2,5", "2026-11-06", "", "2026-10-01", "2026-11-06")).toMatchObject({ error: null, weight: 2.5 });
    expect(parseHarvestForm("0", "2026-11-06", "", "2026-10-01", "2026-11-06").error).toMatch(/Berat/);
    expect(parseHarvestForm("1", "2026-09-01", "", "2026-10-01", "2026-11-06").error).toMatch(/antara/);
    expect(parseHarvestForm("1", "2026-11-07", "", "2026-10-01", "2026-11-06").error).toMatch(/antara/);
    expect(parseHarvestForm("1", "2026-11-06", "2026-11-01", "2026-10-01", "2026-11-06").error).toMatch(/Batas simpan/);
  });

  it("keeps a tray's count within its seeds, counting what already moved", () => {
    expect(parseGerminated("8", { qty: 10, moved: 2 })).toMatchObject({ error: null, count: 8 });
    expect(parseGerminated("9", { qty: 10, moved: 2 }).error).toMatch(/melebihi/);
    expect(parseGerminated("-1", { qty: 10, moved: 0 }).error).toMatch(/bulat/);
  });
});
