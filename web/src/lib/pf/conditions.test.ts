import { describe, expect, it } from "vitest";
import { CHART_GROUPS, METRIC_SCALE, axisTicks, conditionsAt, groupsAt, mergeSeries, metricColor, parseCustomRange, rowState, rowValue, sampleSeries, stepFor, summarize } from "./conditions";
import type { Asset, LatestReading } from "./monitoring";

const NOW = Date.UTC(2026, 10, 6, 6, 0, 0);
const asset = { id: "a", location_code: "PF01", status: "aktif", metrics: ["suhu", "rh"] } as unknown as Asset;
const reading = { metric: "suhu", location_code: "PF01", value: 24.5, ts: "2026-11-06T06:00:00Z" } as LatestReading;

describe("conditionsAt", () => {
  it("shows sample values, marked as such, where no device is registered", () => {
    const c = conditionsAt("PF01", [], []);
    expect(c.sample).toBe(true);
    expect(c.rows.map((r) => r.metric)).toEqual(["suhu", "rh", "vpd", "co2", "ph", "ec", "do", "suhu_larutan"]);
  });

  it("shows only what the devices send, and a blank for what has not arrived", () => {
    const c = conditionsAt("PF01", [asset], [reading]);
    expect(c.sample).toBe(false);
    expect(c.rows.map((r) => [r.metric, r.value])).toEqual([["suhu", 24.5], ["rh", null]]);
    expect(rowValue(c.rows[1])).toBe("-");
    expect(rowState(c.rows[1])).toBeNull();
  });

  it("does not borrow a device from the other place", () => {
    expect(conditionsAt("CH1", [asset], [reading]).sample).toBe(true);
  });

  it("reads a live value against the recipe's band", () => {
    const c = conditionsAt("PF01", [asset], [reading], (m) => (m === "suhu" ? { low: 20, high: 24 } : null));
    expect(rowState(c.rows[0])).toBe("tinggi");
    expect(rowState(c.rows[1])).toBeNull();
  });

  it("marks the sample pH above its band, as the facility screen's sample does", () => {
    const ph = conditionsAt("PF01", [], []).rows.find((r) => r.metric === "ph")!;
    expect(rowState(ph)).toBe("tinggi");
  });
});

describe("sampleSeries", () => {
  it("ends on the sample value and spans the hours asked for", () => {
    const { points, stepMinutes } = sampleSeries("suhu", 22.4, 24, NOW);
    expect(stepMinutes).toBe(15);
    expect(points).toHaveLength(97);
    expect(points[points.length - 1].v).toBeCloseTo(22.4, 3);
    expect(new Date(points[points.length - 1].t).getTime()).toBe(NOW);
    expect(new Date(points[0].t).getTime()).toBe(NOW - 24 * 3_600_000);
  });

  it("gives the same past for the same inputs", () => {
    expect(sampleSeries("rh", 68, 6, NOW)).toEqual(sampleSeries("rh", 68, 6, NOW));
  });

  it("keeps about the same number of points across spans", () => {
    expect([6, 24, 168, 720].map(stepFor)).toEqual([5, 15, 60, 240]);
    for (const h of [6, 24, 168, 720]) expect(sampleSeries("co2", 800, h, NOW).points.length).toBeLessThan(200);
  });
});

describe("summarize", () => {
  it("says nothing about no data", () => {
    expect(summarize([])).toBeNull();
  });

  it("gives the low, the high and the mean", () => {
    expect(summarize([{ v: 1 }, { v: 2 }, { v: 6 }])).toEqual({ min: 1, max: 6, avg: 3 });
  });
});

describe("chart groups", () => {
  it("gives every grouped parameter a working range and its group distinct colours", () => {
    for (const g of CHART_GROUPS) {
      for (const m of g.metrics) expect(METRIC_SCALE[m]).toBeDefined();
      expect(new Set(g.metrics.map(metricColor)).size).toBe(g.metrics.length);
    }
  });

  it("offers only the groups a place can draw", () => {
    expect(groupsAt(["suhu", "rh", "co2", "cahaya"]).map((g) => g.key)).toEqual(["iklim"]);
    expect(groupsAt(["suhu"])).toEqual([]);
    expect(groupsAt(["suhu", "rh", "ph", "ec"]).map((g) => g.key)).toEqual(["iklim", "nutrisi"]);
  });

  it("gives every axis five even, round values around its readings", () => {
    for (const [metric, values] of [["suhu", [21.3, 24.8]], ["rh", [61, 74]], ["vpd", [0.71, 1.04]], ["co2", [702, 980]], ["ph", [5.82, 6.48]], ["ec", [1.31, 1.72]], ["do", [6.6, 8.3]]] as const) {
      const { ticks } = axisTicks(metric, values);
      expect(ticks).toHaveLength(5);
      expect(ticks[0]).toBeLessThanOrEqual(values[0]);
      expect(ticks[4]).toBeGreaterThanOrEqual(values[1]);
      const step = ticks[1] - ticks[0];
      ticks.forEach((t, i) => expect(t).toBeCloseTo(ticks[0] + step * i, 6));
    }
  });

  it("does not stretch a steady reading across the whole axis", () => {
    const { ticks } = axisTicks("suhu", [22.4, 22.5]);
    expect(ticks[4] - ticks[0]).toBeGreaterThanOrEqual(2.5);
  });

  it("gives ticks the decimals their step needs", () => {
    expect(axisTicks("rh", [60, 70]).decimals).toBeGreaterThanOrEqual(0);
    const { ticks, decimals } = axisTicks("ph", [5.9, 6.1]);
    expect(ticks.every((t) => Number(t.toFixed(decimals)) === t)).toBe(true);
  });
});

describe("mergeSeries", () => {
  const at = (min: number) => new Date(NOW + min * 60_000).toISOString();

  it("lines series up on their shared times", () => {
    const rows = mergeSeries([{ key: "a", points: [{ t: at(0), v: 1 }, { t: at(5), v: 2 }] }, { key: "b", points: [{ t: at(5), v: 9 }] }], 5);
    expect(rows).toEqual([{ t: NOW, a: 1 }, { t: NOW + 300_000, a: 2, b: 9 }]);
  });

  it("keeps a silence as a blank row, so the line breaks there", () => {
    const rows = mergeSeries([{ key: "a", points: [{ t: at(0), v: 1 }, { t: at(60), v: 2 }] }], 5);
    expect(rows).toHaveLength(3);
    expect(rows[1].a).toBeUndefined();
  });
});

describe("parseCustomRange", () => {
  const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();

  it("accepts a range and stops it at now", () => {
    expect(parseCustomRange(iso(48), iso(24), NOW)).toEqual({ from: NOW - 48 * 3_600_000, to: NOW - 24 * 3_600_000 });
    expect(parseCustomRange(iso(5), iso(-5), NOW)).toEqual({ from: NOW - 5 * 3_600_000, to: NOW });
  });

  it("says what is wrong otherwise", () => {
    expect(parseCustomRange("", iso(1), NOW)).toEqual({ error: "Fill in both dates and times." });
    expect(parseCustomRange(iso(1), iso(2), NOW)).toEqual({ error: "The start time must be before the end time." });
    expect(parseCustomRange(iso(-2), iso(-3), NOW)).toHaveProperty("error");
    expect(parseCustomRange(iso(24 * 91), iso(1), NOW)).toEqual({ error: "Data available up to 90 days back." });
  });
});
