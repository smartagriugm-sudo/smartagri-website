import { describe, expect, it } from "vitest";
import { ago, deviceFresh, formatMetric, headlineReadings, metricMeta, seriesStats, siteOnline, stepMinutesFor, summarize, validSiteCode } from "./field";

const NOW = Date.parse("2026-11-16T10:00:00Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("field site freshness", () => {
  it("counts a site offline after three missed pushes", () => {
    expect(siteOnline({ last_seen_at: minutesAgo(2), interval_s: 60 }, NOW)).toBe(true);
    expect(siteOnline({ last_seen_at: minutesAgo(4), interval_s: 60 }, NOW)).toBe(false);
    expect(siteOnline({ last_seen_at: minutesAgo(25), interval_s: 600 }, NOW)).toBe(true);
    expect(siteOnline({ last_seen_at: minutesAgo(31), interval_s: 600 }, NOW)).toBe(false);
    expect(siteOnline({ last_seen_at: null, interval_s: 60 }, NOW)).toBe(false);
  });

  it("lets a 10-minute average age 45 minutes before a device is stale", () => {
    expect(deviceFresh(minutesAgo(40), NOW)).toBe(true);
    expect(deviceFresh(minutesAgo(46), NOW)).toBe(false);
    expect(deviceFresh(null, NOW)).toBe(false);
  });

  it("says how long ago in words", () => {
    expect(ago(minutesAgo(0.5), NOW)).toBe("just now");
    expect(ago(minutesAgo(5), NOW)).toBe("5 min ago");
    expect(ago(minutesAgo(180), NOW)).toBe("3 h ago");
    expect(ago(minutesAgo(60 * 72), NOW)).toBe("3 days ago");
    expect(ago(null, NOW)).toBe("never");
  });
});

describe("field metrics", () => {
  it("formats with the unit and the metric's decimals", () => {
    expect(formatMetric("temperature", 24.36)).toBe("24.4 °C");
    expect(formatMetric("ph", 6.1)).toBe("6.10");
    expect(formatMetric("co2", 812.4, false)).toBe("812");
    expect(formatMetric("ec", null)).toBe("–");
  });

  it("falls back for a metric it does not know", () => {
    expect(metricMeta("leaf_wetness").label).toBe("leaf wetness");
  });
});

describe("chart buckets", () => {
  it("matches edge_series: 10 minutes at least, wider for long ranges", () => {
    expect(stepMinutesFor(24)).toBe(10);
    expect(stepMinutesFor(24 * 7)).toBeCloseTo(33.6, 1);
    expect(stepMinutesFor(24 * 30)).toBe(144);
  });
});

describe("site codes", () => {
  it("takes lower case letters, digits and dashes", () => {
    expect(validSiteCode("sgh-grabag")).toBe(true);
    expect(validSiteCode("SGH-Grabag")).toBe(true);
    expect(validSiteCode("a")).toBe(false);
    expect(validSiteCode("grabag site")).toBe(false);
  });
});

describe("site summaries", () => {
  const device = (id: string, metrics: string[], seen: number | null) => ({
    id, site_id: "s", source_id: id, name: id, kind: "engrow", zone: "", metrics,
    last_seen_at: seen === null ? null : minutesAgo(seen),
  });
  const snap = {
    devices: [device("a", ["temperature", "humidity"], 10), device("b", ["temperature", "ph"], 90)],
    latest: [
      { device_id: "a", metric: "temperature", ts: minutesAgo(12), value: 27.1 },
      { device_id: "b", metric: "temperature", ts: minutesAgo(95), value: 30 },
      { device_id: "b", metric: "ph", ts: minutesAgo(95), value: 6.1 },
    ],
    actuators: [
      { id: "x", site_id: "s", name: "Fan", kind: "", zone: "", is_on: true, mode: "auto", online: true, changed_at: null, updated_at: "" },
      { id: "y", site_id: "s", name: "Pump", kind: "", zone: "", is_on: false, mode: "manual", online: false, changed_at: null, updated_at: "" },
    ],
  };

  it("takes one reading per headline metric, from the first device that has it", () => {
    const h = headlineReadings(snap);
    expect(h.map((r) => [r.metric, r.device.id, r.value])).toEqual([
      ["temperature", "a", 27.1],
      ["ph", "b", 6.1],
    ]);
  });

  it("counts reporting devices, actuators and what needs a look", () => {
    const s = summarize(snap, NOW);
    expect(s.reporting).toBe(1);
    expect(s.silent.map((d) => d.id)).toEqual(["b"]);
    expect(s.on).toBe(1);
    expect(s.relaysOffline.map((a) => a.id)).toEqual(["y"]);
    expect(s.notAutomatic.map((a) => a.id)).toEqual(["y"]);
    expect(s.newest).toBe(minutesAgo(12));
  });

  it("summarises a series from its averages", () => {
    expect(seriesStats([])).toBeNull();
    expect(seriesStats([{ t: "", v: 2, lo: 1, hi: 3 }, { t: "", v: 4, lo: 4, hi: 6 }])).toEqual({ last: 4, min: 2, max: 4, mean: 3 });
  });
});
