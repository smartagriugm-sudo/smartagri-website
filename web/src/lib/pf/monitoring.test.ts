import { describe, expect, it } from "vitest";
import { ago, formatBand, formatWithUnit, isStale, latestAt, metricsAt, niceTicks, parseAssetForm, parseCalibrationForm, parseRuleForm, parseTargetRows, rangeState, splitGaps, stripColumns, type Asset, type AssetForm, type LatestReading } from "./monitoring";

describe("a reading against its band", () => {
  it("says which side it fell on", () => {
    expect(rangeState(22, { low: 20, high: 25 })).toBe("ok");
    expect(rangeState(19, { low: 20, high: 25 })).toBe("rendah");
    expect(rangeState(26, { low: 20, high: 25 })).toBe("tinggi");
    expect(rangeState(20, { low: 20, high: 25 })).toBe("ok");
    expect(rangeState(99, { low: 20, high: null })).toBe("ok");
    expect(rangeState(1, { low: null, high: 5 })).toBe("ok");
  });

  it("claims nothing without a band", () => {
    expect(rangeState(22, null)).toBeNull();
    expect(rangeState(22, { low: null, high: null })).toBeNull();
  });

  it("writes a band and a value in English figures", () => {
    expect(formatBand("suhu", { low: 20, high: 25 })).toBe("20.0–25.0 °C");
    expect(formatBand("ph", { low: 5.5, high: null })).toBe("at least 5.50");
    expect(formatBand("ec", { low: null, high: 2 })).toBe("at most 2.00 mS/cm");
    expect(formatWithUnit("rh", 72.4)).toBe("72 % RH");
    expect(formatWithUnit("ph", 6.4)).toBe("6.40");
  });
});

describe("reading the latest values", () => {
  const row = (over: Partial<LatestReading>): LatestReading => ({ asset_id: "a", asset_code: "A", metric: "suhu", location_id: "l", location_code: "PF01", ts: "2026-11-06T04:00:00Z", value: 1, ...over });

  it("takes the newest at that place", () => {
    const list = [row({ value: 1 }), row({ value: 2, ts: "2026-11-06T05:00:00Z", asset_id: "b" }), row({ value: 3, location_code: "CH1", ts: "2026-11-06T06:00:00Z" })];
    expect(latestAt(list, "PF01", "suhu")?.value).toBe(2);
    expect(latestAt(list, "PF01", "rh")).toBeNull();
  });

  it("lists a place's metrics in catalogue order, leaving retired devices out", () => {
    const assets = [
      { location_code: "PF01", status: "aktif", metrics: ["ec", "suhu"] },
      { location_code: "PF01", status: "pensiun", metrics: ["co2"] },
      { location_code: "CH1", status: "aktif", metrics: ["rh"] },
    ] as Asset[];
    expect(metricsAt(assets, "PF01")).toEqual(["suhu", "ec"]);
  });

  it("says how long ago", () => {
    const now = new Date("2026-11-06T12:00:00Z");
    expect(ago("2026-11-06T11:59:40Z", now)).toBe("just now");
    expect(ago("2026-11-06T11:30:00Z", now)).toBe("30 minutes ago");
    expect(ago("2026-11-06T09:00:00Z", now)).toBe("3 hours ago");
    expect(ago("2026-11-04T09:00:00Z", now)).toBe("2 days ago");
  });
});

describe("how a strip of readings sits", () => {
  it("leaves no hole at the end of a row", () => {
    expect(stripColumns(4)).toEqual({ columns: 4, lastSpan: 1 });
    expect(stripColumns(6)).toEqual({ columns: 3, lastSpan: 1 });
    expect(stripColumns(7)).toEqual({ columns: 4, lastSpan: 2 });
    expect(stripColumns(9)).toEqual({ columns: 5, lastSpan: 2 });
  });
});

describe("a reading gone stale", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  const assets = [{ id: "a", interval_s: 60 }];
  it("depends on how often its device reports", () => {
    expect(isStale({ asset_id: "a", ts: "2026-11-06T11:58:00Z" }, assets, now)).toBe(false);
    expect(isStale({ asset_id: "a", ts: "2026-11-06T11:56:00Z" }, assets, now)).toBe(true);
  });
});

describe("forms", () => {
  const asset: AssetForm = { code: "ENV-1", name: "Sensor", kind: "iklim", model: "", serial: "", locationId: "l", metrics: ["suhu"], intervalS: "60", status: "aktif", notes: "" };

  it("checks a device", () => {
    expect(parseAssetForm(asset)).toEqual({ error: null, interval: 60 });
    expect(parseAssetForm({ ...asset, code: "a b" }).error).toMatch(/letters/);
    expect(parseAssetForm({ ...asset, name: " " }).error).toMatch(/name/);
    expect(parseAssetForm({ ...asset, locationId: "" }).error).toMatch(/location/);
    expect(parseAssetForm({ ...asset, metrics: [] }).error).toMatch(/type/);
    expect(parseAssetForm({ ...asset, intervalS: "0" }).error).toMatch(/interval/);
    expect(parseAssetForm({ ...asset, intervalS: "1.5" }).error).toMatch(/interval/);
  });

  it("keeps alarm limits in order", () => {
    const f = { warnLow: "60", warnHigh: "80", critLow: "50", critHigh: "90", delayMin: "5" };
    expect(parseRuleForm(f)).toEqual({ error: null, warnLow: 60, warnHigh: 80, critLow: 50, critHigh: 90, delayS: 300 });
    expect(parseRuleForm({ ...f, critLow: "70" }).error).toMatch(/out of order/);
    expect(parseRuleForm({ ...f, warnLow: "85" }).error).toMatch(/out of order/);
    expect(parseRuleForm({ warnLow: "", warnHigh: "", critLow: "", critHigh: "", delayMin: "" }).error).toMatch(/at least/);
    expect(parseRuleForm({ ...f, warnHigh: "abc" }).error).toMatch(/number/);
    expect(parseRuleForm({ ...f, delayMin: "-1" }).error).toMatch(/negative/);
    expect(parseRuleForm({ warnLow: "", warnHigh: "6.5", critLow: "", critHigh: "", delayMin: "" })).toMatchObject({ error: null, warnHigh: 6.5, delayS: 0 });
  });

  it("defaults a calibration to no change", () => {
    expect(parseCalibrationForm("", "")).toEqual({ error: null, offsetValue: 0, slopeValue: 1 });
    expect(parseCalibrationForm("-0,5", "1.02")).toEqual({ error: null, offsetValue: -0.5, slopeValue: 1.02 });
    expect(parseCalibrationForm("", "0").error).toMatch(/zero/);
    expect(parseCalibrationForm("x", "").error).toMatch(/number/);
  });

  it("drops empty target rows and checks the rest", () => {
    expect(parseTargetRows([{ metric: "suhu", low: "20", target: "22", high: "25" }, { metric: "rh", low: "", target: "", high: "" }])).toEqual({ error: null, targets: [{ metric: "suhu", low: 20, target: 22, high: 25 }] });
    expect(parseTargetRows([{ metric: "suhu", low: "30", target: "", high: "25" }]).error).toMatch(/Temperature/);
    expect(parseTargetRows([{ metric: "ph", low: "abc", target: "", high: "" }]).error).toMatch(/pH/);
  });
});

describe("the chart", () => {
  it("picks round ticks covering the values", () => {
    expect(niceTicks(20, 25)).toEqual([20, 22, 24, 26]);
    const flat = niceTicks(24, 24);
    expect(flat[0]).toBeLessThanOrEqual(24);
    expect(flat[flat.length - 1]).toBeGreaterThanOrEqual(24);
    expect(niceTicks(0, 1000)).toEqual([0, 250, 500, 750, 1000]);
  });

  it("breaks the line where readings stop", () => {
    const at = (m: number) => ({ t: new Date(Date.UTC(2026, 10, 6, 0, m)).toISOString() });
    const runs = splitGaps([at(0), at(5), at(15), at(40), at(45)], 5);
    expect(runs.map((r) => r.length)).toEqual([3, 2]);
    expect(splitGaps([], 5)).toEqual([]);
  });
});
