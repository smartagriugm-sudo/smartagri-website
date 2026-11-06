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
    expect(workSummary([])).toMatch(/^Tidak ada/);
  });

  it("names the holes and trays with a problem", () => {
    const [holes, trays] = buildWork(input({ batches: [batch({ problemHoles: ["R1-T1-G1-H01", "R1-T1-G1-H02", "R1-T1-G1-H03"], problemTrays: ["CH1-S1-P01"] })] }));
    expect(holes.title).toBe("3 tanaman bermasalah di B-001");
    expect(holes.detail).toBe("R1-T1-G1-H01, R1-T1-G1-H02, dan 1 lainnya");
    expect(trays.title).toBe("1 nampan bermasalah di B-001");
    expect(holes.link).toEqual({ to: "/erp/batch/$id", id: "b1" });
  });

  it("asks for a harvest only where plants are ready, and marks it late past the target", () => {
    expect(keys({ batches: [batch({ plants: 74, age: 16 })] })).toEqual([]);
    const ready = buildWork(input({ batches: [batch({ plants: 74, harvestReady: 74, age: 26, sownAt: "2026-10-11" })] }))[0];
    expect(ready).toMatchObject({ tone: "due", tag: "Siap panen" });
    const late = buildWork(input({ batches: [batch({ plants: 74, harvestReady: 74, age: 32, sownAt: "2026-10-05" })] }))[0];
    expect(late).toMatchObject({ tone: "urgent", tag: "Terlambat" });
    expect(late.detail).toContain("2 hari lalu");
  });

  it("does not ask for a harvest once the plants are gone", () => {
    expect(keys({ batches: [batch({ plants: 0, age: 40 })] })).toEqual([]);
  });

  it("uses the recipe's day to tell a late transplant", () => {
    const onTime = buildWork(input({ batches: [batch({ readySeedlings: 74, age: 12, transplantDay: 14 })] }))[0];
    expect(onTime).toMatchObject({ tone: "due", tag: "Siap pindah" });
    const late = buildWork(input({ batches: [batch({ readySeedlings: 74, age: 12, transplantDay: 10 })] }))[0];
    expect(late).toMatchObject({ tone: "urgent", tag: "Terlambat" });
  });

  it("warns when the seedlings outnumber the free holes", () => {
    const items = buildWork(input({ freeHoles: 160, batches: [batch({ readySeedlings: 198 })] }));
    expect(items.find((w) => w.key === "capacity")?.title).toBe("38 bibit belum punya lubang");
    expect(keys({ freeHoles: 198, batches: [batch({ readySeedlings: 198 })] })).not.toContain("capacity");
  });

  it("treats a lot's stock and expiry date separately", () => {
    const lot = { id: "l", lot_no: "PK", qty_on_hand: 50, unit: "gram" as const, expiry_date: "2026-11-01" };
    expect(buildWork(input({ lots: [lot] }))[0]).toMatchObject({ tag: "Kedaluwarsa", tone: "due" });
    expect(buildWork(input({ lots: [{ ...lot, expiry_date: "2026-11-20" }] }))[0].title).toBe("Lot PK kedaluwarsa 14 hari lagi");
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
    expect(workSummary(items)).toBe("4 pekerjaan menunggu. Paling mendesak: 1 tanaman bermasalah di B-002.");
    expect(workSummary(items.slice(1))).toMatch(/Mulai dari: B-001 siap panen/);
  });

  it("puts the sensors' side where it belongs", () => {
    const items = buildWork(input({
      planned: [{ id: "p", code: "B-009", crop: "Pakcoy" }],
      alarms: [{ id: "a", level: "kritis", label: "Kelembapan", value: "95 % RH", place: "PF01", since: "6 Nov 2026, 10.00" }],
      silentDevices: [{ id: "d", code: "ENV-1", since: "2 jam lalu" }],
      calibrationsDue: [{ id: "c", code: "PH-1", due: "2026-11-01" }],
    }));
    expect(items.map((w) => w.key)).toEqual(["alarm-a", "silent-d", "cal-c", "plan-p"]);
    expect(items[0]).toMatchObject({ tag: "Alarm kritis", title: "Kelembapan 95 % RH di PF01" });
    expect(items[1].title).toBe("ENV-1 berhenti mengirim");
    expect(items[2].detail).toBe("Jadwal 1 Nov");
  });

  it("brings in what sales has waiting", () => {
    const items = buildWork(input({
      ordersDue: [{ id: "o1", no: "SO-1", customer: "Resto", requested: "2026-11-05", openKg: "3 kg" }, { id: "o2", no: "SO-2", customer: "Toko", requested: today, openKg: "1 kg" }],
      invoicesOverdue: [{ id: "i", no: "INV-1", customer: "Resto", due: "2026-11-01", balance: "Rp 100" }],
      lotsAging: [{ id: "l", code: "H-1", label: "Pakcoy", kg: "2 kg", until: "2026-11-07" }],
    }));
    expect(items.map((w) => [w.key, w.tag])).toEqual([["order-o1", "Terlambat"], ["order-o2", "Kirim hari ini"], ["invoice-i", "Jatuh tempo"], ["aging-l", "Segera jual"]]);
    expect(items[0].link).toEqual({ to: "/erp/pesanan/$id", id: "o1" });
  });

  it("falls back to the facility page for a sample batch with no record", () => {
    expect(buildWork(input({ batches: [batch({ id: undefined, problemTrays: ["CH1-S1-P01"] })] }))[0].link).toEqual({ to: "/erp/persemaian" });
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
