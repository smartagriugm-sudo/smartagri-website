import { describe, expect, it } from "vitest";
import { batchCostsCsv, batchTotal, costGaps, formatHours, monthRange, monthlyTable, parseEntryForm, parseRupiah, perKg, planState, type BatchCost } from "./cost";

const row = (over: Partial<BatchCost> = {}): BatchCost => ({ id: "b", code: "B-001", status: "selesai", crop_name: "Pakcoy", crop_variety: "Nauli", sown_at: "2026-10-01", finished_at: null, harvested_kg: 2, sellable_kg: 1.5, material: 9000, unpriced_lots: 0, labor: 30000, minutes: 90, unrated_minutes: 0, direct: 15000, shared: 2000, revenue: 80000, sold_kg: 1, ...over });

describe("a batch's figure", () => {
  it("adds its four parts", () => {
    expect(batchTotal(row())).toBe(56000);
  });

  it("divides by what was harvested, and has no answer without a harvest", () => {
    expect(perKg(56000, 2)).toBe(28000);
    expect(perKg(56000, 0)).toBeNull();
  });

  it("says what the total leaves out", () => {
    expect(costGaps(row())).toEqual([]);
    expect(costGaps(row({ unpriced_lots: 2, unrated_minutes: 90 }))).toEqual(["2 lots without a price", "1.5 hours without a rate"]);
    expect(formatHours(120)).toBe("2 hours");
  });
});

describe("the monthly table", () => {
  it("folds categories and keeps income apart from cost", () => {
    const table = monthlyTable([
      { month: "2026-10-01", category: "bahan", amount: 100 },
      { month: "2026-11-01", category: "bahan", amount: 1000 },
      { month: "2026-11-01", category: "listrik", amount: 200 },
      { month: "2026-11-01", category: "sewa", amount: 300 },
      { month: "2026-11-01", category: "perawatan", amount: 50 },
      { month: "2026-11-01", category: "pendapatan", amount: 9000 },
    ]);
    expect(table.map((m) => m.month)).toEqual(["2026-11-01", "2026-10-01"]);
    expect(table[0]).toMatchObject({ bahan: 1000, listrik: 200, other: 350, cost: 1550, revenue: 9000 });
    expect(table[1].revenue).toBe(0);
  });
});

describe("forms", () => {
  it("reads rupiah as people write it", () => {
    expect(parseRupiah("1.500.000")).toBe(1500000);
    expect(parseRupiah("Rp 25,000")).toBe(25000);
    expect(parseRupiah("12,5")).toBe(12.5);
    expect(parseRupiah("0")).toBe(0);
    expect(parseRupiah("")).toBeNull();
    expect(parseRupiah("-5")).toBeNull();
    expect(parseRupiah("abc")).toBeNull();
  });

  it("checks a bill", () => {
    const base = { amount: "1.000", scope: "ruang" as const, batch: "", area: "persemaian", start: "2026-11-01", end: "2026-11-30" };
    expect(parseEntryForm(base)).toEqual({ error: null, amount: 1000, end: "2026-11-30" });
    expect(parseEntryForm({ ...base, amount: "0" }).error).toMatch(/zero/);
    expect(parseEntryForm({ ...base, area: "" }).error).toMatch(/room/);
    expect(parseEntryForm({ ...base, end: "2026-10-01" }).error).toMatch(/period/);
    expect(parseEntryForm({ ...base, scope: "batch" }).error).toMatch(/batch/);
    expect(parseEntryForm({ ...base, scope: "batch", batch: "b", end: "" })).toEqual({ error: null, amount: 1000, end: "2026-11-01" });
  });

  it("finds a month's edges", () => {
    expect(monthRange("2026-11-06")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(monthRange("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange("2026-12-31")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });
});

describe("maintenance", () => {
  it("tells overdue from soon", () => {
    expect(planState("2026-11-05", "2026-11-06")).toBe("lewat");
    expect(planState("2026-11-06", "2026-11-06")).toBe("segera");
    expect(planState("2026-11-13", "2026-11-06")).toBe("segera");
    expect(planState("2026-11-14", "2026-11-06")).toBe("aman");
  });
});

describe("export", () => {
  it("writes whole rupiah and leaves per-kg empty without a harvest", () => {
    const csv = batchCostsCsv([row(), row({ code: 'B;"2', harvested_kg: 0, sellable_kg: 0, unpriced_lots: 1 })]).split("\r\n");
    expect(csv[1]).toBe("B-001;Pakcoy Nauli;selesai;9000;30000;15000;2000;56000;2;1.5;28000;37333;80000;1;");
    expect(csv[2].startsWith('"B;""2";')).toBe(true);
    expect(csv[2].endsWith(";;;80000;1;1 lots without a price")).toBe(true);
  });
});
