import { describe, expect, it } from "vitest";
import { ago, deviceFresh, formatMetric, metricMeta, siteOnline, stepMinutesFor, validSiteCode } from "./field";

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
