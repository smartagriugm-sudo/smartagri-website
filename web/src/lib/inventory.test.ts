import { describe, expect, it } from "vitest";
import {
  type Instrument,
  type UsageLog,
  billingBasis,
  chargeFor,
  findClash,
  groupRupiah,
  instrumentSlug,
  minimumQuantity,
  operatorChoices,
  overdueDays,
  parseRupiah,
  suggestQuantity,
} from "./inventory";
import { computeInventoryStats } from "./inventory-stats";

const inst = (over: Partial<Instrument> = {}): Instrument => ({
  id: "i1",
  ord: 1,
  slug: "wgfs-105-chlorophyll-meter",
  code: "WGFS 105",
  name: "Chlorophyll Meter",
  brand: null,
  lab: "Lab TLBP",
  category: null,
  rate_internal_self: 75000,
  rate_internal_tech: 90000,
  rate_external: 125000,
  unit: "per hari",
  status: "available",
  kind: "portable",
  pic: null,
  notes: null,
  photo: null,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const log = (over: Partial<UsageLog>): UsageLog => ({
  id: "l1",
  created_at: "2026-11-01T00:00:00Z",
  instrument_id: "i1",
  borrower_name: "Rina",
  borrower_org: null,
  user_type: "internal",
  operator: "self",
  technician_name: null,
  purpose: null,
  checkout_at: "2026-11-10T08:00:00Z",
  expected_return: "2026-11-12T08:00:00Z",
  returned_at: null,
  quantity: null,
  unit: null,
  rate_type: null,
  unit_rate: null,
  cost: null,
  condition_out: null,
  condition_in: null,
  notes: null,
  status: "booked",
  log_type: "borrow",
  created_by: null,
  ...over,
});

describe("operatorChoices", () => {
  it("offers both internal ways when both are priced", () => {
    expect(operatorChoices(inst(), "internal").map((c) => c.operator)).toEqual(["self", "technician"]);
  });
  it("drops the way the rate card does not offer", () => {
    const c = operatorChoices(inst({ rate_internal_self: null }), "internal");
    expect(c.map((x) => x.operator)).toEqual(["technician"]);
    expect(c[0].unitRate).toBe(90000);
  });
  it("keeps both open when nothing is priced", () => {
    const c = operatorChoices(inst({ rate_internal_self: null, rate_internal_tech: null }), "internal");
    expect(c).toHaveLength(2);
    expect(c.every((x) => x.unitRate == null)).toBe(true);
  });
  it("uses the external rate for external users", () => {
    expect(operatorChoices(inst(), "external")).toEqual([
      { operator: "self", label: "External rate", rateType: "external", unitRate: 125000 },
    ]);
  });
});

describe("billing units", () => {
  it("reads the rate card units", () => {
    expect(billingBasis("per hari")).toBe("day");
    expect(billingBasis("per hari (exc. genset battery)")).toBe("day");
    expect(billingBasis("per 4 jam")).toBe("four_hours");
    expect(billingBasis("per sampel")).toBe("sample");
    expect(billingBasis("per Ha (Min 1000 Ha)")).toBe("hectare");
    expect(billingBasis(null)).toBe("other");
  });
  it("finds a minimum", () => {
    expect(minimumQuantity("per Ha (Min 1000 Ha)")).toBe(1000);
    expect(minimumQuantity("per Ha (Min 1.000 Ha)")).toBe(1000);
    expect(minimumQuantity("per hari")).toBeNull();
  });
  it("counts started days and 4-hour blocks", () => {
    const s = new Date("2026-11-10T08:00:00Z");
    expect(suggestQuantity("per hari", s, new Date("2026-11-10T17:00:00Z"))).toBe(1);
    expect(suggestQuantity("per hari", s, new Date("2026-11-12T08:00:00Z"))).toBe(2);
    expect(suggestQuantity("per hari", s, new Date("2026-11-12T09:00:00Z"))).toBe(3);
    expect(suggestQuantity("per 4 jam", s, new Date("2026-11-10T13:00:00Z"))).toBe(2);
    expect(suggestQuantity("per sampel", s, new Date("2026-11-12T08:00:00Z"))).toBeNull();
    expect(suggestQuantity("per hari", s, s)).toBeNull();
  });
});

describe("findClash", () => {
  const logs = [
    log({ id: "a", checkout_at: "2026-11-10T08:00:00Z", expected_return: "2026-11-12T08:00:00Z" }),
    log({ id: "b", status: "cancelled", checkout_at: "2026-11-20T08:00:00Z", expected_return: "2026-11-21T08:00:00Z" }),
    log({ id: "c", log_type: "check", status: "returned", checkout_at: "2026-11-25T08:00:00Z" }),
  ];
  it("flags an overlap", () => {
    expect(findClash(logs, new Date("2026-11-11T08:00:00Z"), new Date("2026-11-13T08:00:00Z"))?.id).toBe("a");
  });
  it("lets a slot start when the last one ends", () => {
    expect(findClash(logs, new Date("2026-11-12T08:00:00Z"), new Date("2026-11-13T08:00:00Z"))).toBeNull();
  });
  it("ignores cancelled bookings and inspections", () => {
    expect(findClash(logs, new Date("2026-11-20T00:00:00Z"), new Date("2026-11-26T00:00:00Z"))).toBeNull();
  });
  it("treats a loan with no due date as open-ended", () => {
    const open = [log({ id: "x", status: "ongoing", expected_return: null })];
    expect(findClash(open, new Date("2027-01-01T00:00:00Z"), new Date("2027-01-02T00:00:00Z"))?.id).toBe("x");
  });
});

describe("overdueDays", () => {
  const now = new Date("2026-11-14T09:00:00Z");
  it("counts started days past due for open loans", () => {
    expect(overdueDays({ status: "ongoing", expected_return: "2026-11-12T08:00:00Z" }, now)).toBe(3);
    expect(overdueDays({ status: "ongoing", expected_return: "2026-11-15T08:00:00Z" }, now)).toBe(0);
    expect(overdueDays({ status: "returned", expected_return: "2026-11-12T08:00:00Z" }, now)).toBe(0);
  });
});

describe("instrument input", () => {
  it("makes the address name like the seeded ones", () => {
    expect(instrumentSlug("WGFS 91", "Trinity Pro Platform")).toBe("wgfs-91-trinity-pro-platform");
    expect(instrumentSlug("WGFS 122", "PH/EC/TDS/Temperature Monitor")).toBe("wgfs-122-ph-ec-tds-temperature-monitor");
    const long = instrumentSlug("WGFS 94", "Analisis Data Drone Fotogrametri - Agisoft Metashape Professional");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("-")).toBe(false);
  });
  it("reads and writes rupiah", () => {
    expect(parseRupiah("Rp 1.500.000")).toBe(1500000);
    expect(parseRupiah("")).toBeNull();
    expect(groupRupiah(1500000)).toBe("1.500.000");
    expect(groupRupiah(null)).toBe("");
  });
});

describe("stats leave plans out", () => {
  it("does not count bookings or cancelled entries as use", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    const s = computeInventoryStats(
      [inst()],
      [
        log({ id: "1", status: "booked" }),
        log({ id: "2", status: "cancelled" }),
        log({ id: "3", status: "returned", returned_at: "2026-11-12T08:00:00Z" }),
      ],
      now,
    );
    expect(s.totalEntries.current).toBe(1);
    expect(s.currentlyOut).toBe(0);
  });
});

// Worked examples from the WGFS 1.2 rate letter (019/WGFS/1.2/SE/XI/2026).
describe("charges follow the rate letter", () => {
  const f750 = [
    { from: 21, internal_tech: 60000, external: 95000 },
    { from: 101, internal_tech: 50000, external: 80000 },
  ];
  const internal = (n: number) => chargeFor(75000, "internal_tech", n, 10, f750).cost;
  const external = (n: number) => chargeFor(120000, "external", n, 10, f750).cost;
  it("prices the F-750 samples in tiers", () => {
    expect(internal(30)).toBe(2_100_000); // 30 mangoes
    expect(internal(10)).toBe(750_000); // 10 grape groups
    expect(internal(15)).toBe(1_125_000); // 15 cut melons
    expect(external(12)).toBe(1_440_000); // rice, 4 varieties x 3
    expect(internal(60)).toBe(3_900_000); // 20 tomatoes x 3 days
    expect(external(150)).toBe(14_000_000); // 150 avocados
  });
  it("charges the minimum of 10 samples", () => {
    const c = chargeFor(75000, "internal_tech", 6, 10, f750);
    expect(c.cost).toBe(750_000);
    expect(c.billed).toBe(10);
    expect(c.raisedToMinimum).toBe(true);
  });
  it("shows the tier lines", () => {
    expect(chargeFor(120000, "external", 150, 10, f750).lines).toEqual([
      { qty: 20, rate: 120000 },
      { qty: 80, rate: 95000 },
      { qty: 50, rate: 80000 },
    ]);
  });
  it("handles the flat per-sample examples", () => {
    expect(chargeFor(50000, "internal_tech", 50, null, null).cost).toBe(2_500_000); // F-920
    expect(chargeFor(25000, "external", 20, null, null).cost).toBe(500_000); // LI-3000C
    expect(chargeFor(7500, "internal_tech", 15, null, null).cost).toBe(112_500); // soil pH
    expect(chargeFor(10000, "external", 28, null, null).cost).toBe(280_000); // pH/EC monitor
  });
  it("applies the hectare minimum", () => {
    expect(chargeFor(5000, "internal_tech", 400, 1000, null).cost).toBe(5_000_000);
    expect(minimumQuantity("per sampel (Minimum 10 sampel)")).toBe(10);
  });
  it("gives no price without a rate", () => {
    expect(chargeFor(null, "internal_self", 5).cost).toBeNull();
  });
});
