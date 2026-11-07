import { describe, expect, it } from "vitest";
import { buildWork, positionOf, scheduleBar, scheduleWindow, weekTicks, workSummary, type BatchWork, type WorkInput } from "./dashboard";

const today = "2026-11-06";

const batch = (over: Partial<BatchWork> = {}): BatchWork => ({
  id: "b1",
  code: "B-001",
  crop: "Pakcoy",
  sownAt: "2026-10-27",
  age: 10,
  cycle: 30,
  transplantDay: 10,
  plants: 0,
  harvestReady: 0,
  problemHoles: [],
  problemTrays: [],
  readySeedlings: 0,
  ...over,
});

const input = (over: Partial<WorkInput> = {}): WorkInput => ({ today, batches: [], freeHoles: 480, sanitation: [], planned: [], lots: [], setup: null, ...over });

const keys = (over: Partial<WorkInput>) => buildWork(input(over)).map((w) => w.key);

describe("the day's work", () => {
  it("is empty when nothing waits, and says so", () => {
    expect(buildWork(input())).toEqual([]);
    expect(workSummary([])).toMatch(/^Nothing/);
  });

  it("names the holes and trays with a problem", () => {
    const [holes, trays] = buildWork(input({ batches: [batch({ problemHoles: ["R1-T1-G1-H01", "R1-T1-G1-H02", "R1-T1-G1-H03"], problemTrays: ["CH1-S1-P01"] })] }));
    expect(holes.title).toBe("3 plants with a problem in B-001");
    expect(holes.detail).toBe("R1-T1-G1-H01, R1-T1-G1-H02, and 1 more");
    expect(trays.title).toBe("1 tray with a problem in B-001");
    expect(holes.link).toEqual({ to: "/erp/batch/$id", id: "b1" });
  });

  it("asks for a harvest only where plants are ready, and marks it late past the target", () => {
    expect(keys({ batches: [batch({ plants: 74, age: 16 })] })).toEqual([]);
    const ready = buildWork(input({ batches: [batch({ plants: 74, harvestReady: 74, age: 26, sownAt: "2026-10-11" })] }))[0];
    expect(ready).toMatchObject({ tone: "due", tag: "Ready to harvest" });
    const late = buildWork(input({ batches: [batch({ plants: 74, harvestReady: 74, age: 32, sownAt: "2026-10-05" })] }))[0];
    expect(late).toMatchObject({ tone: "urgent", tag: "Late" });
    expect(late.detail).toContain("2 days ago");
  });

  it("does not ask for a harvest once the plants are gone", () => {
    expect(keys({ batches: [batch({ plants: 0, age: 40 })] })).toEqual([]);
  });

  it("uses the recipe's day to tell a late transplant", () => {
    const onTime = buildWork(input({ batches: [batch({ readySeedlings: 74, age: 12, transplantDay: 14 })] }))[0];
    expect(onTime).toMatchObject({ tone: "due", tag: "Ready to move" });
    const late = buildWork(input({ batches: [batch({ readySeedlings: 74, age: 12, transplantDay: 10 })] }))[0];
    expect(late).toMatchObject({ tone: "urgent", tag: "Late" });
  });

  it("warns when the seedlings outnumber the free holes", () => {
    const items = buildWork(input({ freeHoles: 160, batches: [batch({ readySeedlings: 198 })] }));
    expect(items.find((w) => w.key === "capacity")?.title).toBe("38 seedlings have no hole yet");
    expect(keys({ freeHoles: 198, batches: [batch({ readySeedlings: 198 })] })).not.toContain("capacity");
  });

  it("treats a lot's stock and expiry date separately", () => {
    const lot = { id: "l", lot_no: "PK", qty_on_hand: 50, unit: "gram" as const, expiry_date: "2026-11-01" };
    expect(buildWork(input({ lots: [lot] }))[0]).toMatchObject({ tag: "Expires", tone: "due" });
    expect(buildWork(input({ lots: [{ ...lot, expiry_date: "2026-11-20" }] }))[0].title).toBe("Lot PK expires in 14 days");
    expect(buildWork(input({ lots: [{ ...lot, expiry_date: "2026-11-21" }] }))).toEqual([]);
    expect(buildWork(input({ lots: [{ ...lot, qty_on_hand: 0 }] }))).toEqual([]);
    expect(buildWork(input({ lots: [{ ...lot, expiry_date: null }] }))).toEqual([]);
  });

  it("lists setup only for what is missing", () => {
    const setup = { slots: { present: 502, expected: 502, missing: [] }, crops: 1, activeRecipes: 0, seedLots: 1 };
    expect(keys({ setup })).toEqual(["setup-recipes"]);
    expect(keys({ setup: { ...setup, activeRecipes: 1 } })).toEqual([]);
  });

  it("claims nothing about what could not be read", () => {
    expect(buildWork(input({ planned: null, lots: null, setup: null }))).toEqual([]);
  });

  it("puts the urgent first and keeps the rest in order", () => {
    const items = buildWork(input({
      planned: [{ id: "p", code: "B-009", crop: "Pakcoy" }],
      sanitation: [{ rack: 2, tier: 1 }],
      batches: [batch({ plants: 10, harvestReady: 10, age: 26 }), batch({ code: "B-002", id: "b2", problemHoles: ["R1-T2-G1-H01"] })],
    }));
    expect(items.map((w) => w.key)).toEqual(["holes-B-002", "harvest-B-001", "sanitation", "plan-p"]);
    expect(workSummary(items)).toBe("4 tasks waiting. Most urgent: 1 plant with a problem in B-002.");
    expect(workSummary(items.slice(1))).toMatch(/Starting from: B-001 ready to harvest/);
  });

  it("puts the sensors' side where it belongs", () => {
    const items = buildWork(input({
      planned: [{ id: "p", code: "B-009", crop: "Pakcoy" }],
      alarms: [{ id: "a", level: "kritis", label: "Humidity", value: "95 % RH", place: "PF01", since: "6 Nov 2026, 10:00" }],
      silentDevices: [{ id: "d", code: "ENV-1", since: "2 hours ago" }],
      calibrationsDue: [{ id: "c", code: "PH-1", due: "2026-11-01" }],
    }));
    expect(items.map((w) => w.key)).toEqual(["alarm-a", "silent-d", "cal-c", "plan-p"]);
    expect(items[0]).toMatchObject({ tag: "Critical alarms", title: "Humidity 95 % RH at PF01" });
    expect(items[1].title).toBe("ENV-1 stopped sending");
    expect(items[2].detail).toBe("Scheduled 1 Nov");
  });

  it("brings in what sales has waiting", () => {
    const items = buildWork(input({
      ordersDue: [{ id: "o1", no: "SO-1", customer: "Restaurant", requested: "2026-11-05", openKg: "3 kg" }, { id: "o2", no: "SO-2", customer: "Shop", requested: today, openKg: "1 kg" }],
      invoicesOverdue: [{ id: "i", no: "INV-1", customer: "Restaurant", due: "2026-11-01", balance: "Rp 100" }],
      lotsAging: [{ id: "l", code: "H-1", label: "Pakcoy", kg: "2 kg", until: "2026-11-07" }],
    }));
    expect(items.map((w) => [w.key, w.tag])).toEqual([["order-o1", "Late"], ["order-o2", "Ship today"], ["invoice-i", "Due date"], ["aging-l", "Sell soon"]]);
    expect(items[0].link).toEqual({ to: "/erp/orders/$id", id: "o1" });
  });

  it("brings in what the shelf needs", () => {
    const items = buildWork(input({
      lowStock: [{ id: "i", name: "Rockwool", left: "50 pcs", minimum: "100 pcs" }],
      shortages: [{ id: "s", name: "Packaging", short: "20 pcs", batch: "B-001" }],
      purchasesLate: [{ id: "p", no: "PO-1", supplier: "Shop", expected: "2026-11-01" }],
      lots: [{ id: "l", lot_no: "N1", qty_on_hand: 2, unit: "biji", expiry_date: "2026-11-01", itemName: "Nutrients" }],
    }));
    expect(items.map((w) => w.key)).toEqual(["lot-l", "short-s", "low-i", "po-p"]);
    expect(items[0].title).toBe("Nutrients N1 already expired");
    expect(items[0].link).toEqual({ to: "/erp/stock" });
    expect(items[3].link).toEqual({ to: "/erp/purchasing/$id", id: "p" });
  });

  it("brings in what people's side needs", () => {
    const items = buildWork(input({
      absentToday: [{ id: "a", name: "Budi", start: "08.00" }],
      flaggedAttendance: [{ id: "f", name: "Rina", flag: "Clocked in outside the area" }],
      leavePending: [{ id: "l", name: "Sari", label: "cuti", from: "2026-11-10" }],
      contractsEnding: [{ id: "c", name: "Dodi", until: "2026-11-20" }],
    }));
    expect(items.map((w) => w.key)).toEqual(["absent-a", "leave-l", "flag-f", "contract-c"]);
    expect(items[2].title).toBe("Rina: clocked in outside the area");
  });

  it("brings in overdue maintenance", () => {
    const items = buildWork(input({ maintenanceDue: [{ id: "m", title: "EC calibration", due: "2026-11-01" }] }));
    expect(items[0]).toMatchObject({ key: "maintenance-m", title: "EC calibration", link: { to: "/erp/maintenance" } });
  });

  it("falls back to the facility page for a sample batch with no record", () => {
    expect(buildWork(input({ batches: [batch({ id: undefined, problemTrays: ["CH1-S1-P01"] })] }))[0].link).toEqual({ to: "/erp/seedlings" });
  });
});

describe("the calendar", () => {
  const b = { code: "B-1", sownAt: "2026-10-08", cycle: 30, transplantDay: 10, transplantedAt: null };

  it("holds every batch and today, with air at the ends", () => {
    const w = scheduleWindow([b, { ...b, sownAt: "2026-11-03" }], today);
    expect(w.from).toBe("2026-10-06");
    expect(w.to).toBe("2026-12-05");
    expect(w.days).toBe(60);
    expect(positionOf(w.from, w)).toBe(0);
    expect(positionOf(w.to, w)).toBe(100);
  });

  it("stays wide enough to read with no batch at all", () => {
    const w = scheduleWindow([], today);
    expect(w.days).toBe(42);
    expect(positionOf(today, w)).toBeGreaterThan(0);
    expect(positionOf(today, w)).toBeLessThan(100);
  });

  it("marks Mondays", () => {
    const ticks = weekTicks({ from: "2026-11-01", to: "2026-11-20", days: 19 });
    expect(ticks).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(weekTicks({ from: "2026-11-02", to: "2026-11-03", days: 1 })).toEqual(["2026-11-02"]);
  });

  it("draws the move on its real date, or no earlier than today while it is still ahead", () => {
    expect(scheduleBar({ ...b, transplantedAt: "2026-10-19" }, today).moveOn).toBe("2026-10-19");
    expect(scheduleBar(b, today).moveOn).toBe(today);
    expect(scheduleBar({ ...b, sownAt: "2026-11-01" }, today).moveOn).toBe("2026-11-11");
  });

  it("shows the days past the target", () => {
    expect(scheduleBar(b, today).overdueTo).toBeNull();
    const late = scheduleBar({ ...b, sownAt: "2026-10-01" }, today);
    expect(late.end).toBe("2026-10-31");
    expect(late.overdueTo).toBe(today);
  });
});
