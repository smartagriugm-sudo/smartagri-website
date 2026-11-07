import { describe, expect, it } from "vitest";
import { addMonths, daysOf, endMinutes, hourRange, initials, monthGrid, personColor, placeEvents, step } from "./calendar";

describe("the days a view covers", () => {
  it("runs a month grid from the Monday before the 1st to the Sunday after the last", () => {
    const days = monthGrid("2026-11-15");
    expect(days[0]).toBe("2026-10-26");
    expect(days[days.length - 1]).toBe("2026-12-06");
    expect(days.length % 7).toBe(0);
  });

  it("gives seven days from Monday for a week, and one for a day", () => {
    const week = daysOf("week", "2026-11-07");
    expect(week[0]).toBe("2026-11-02");
    expect(week).toHaveLength(7);
    expect(daysOf("day", "2026-11-07")).toEqual(["2026-11-07"]);
  });

  it("steps a month from the 31st without skipping one", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(step("month", "2026-12-15", 1)).toBe("2027-01-01");
    expect(step("week", "2026-11-07", -1)).toBe("2026-10-31");
  });
});

describe("placing events", () => {
  const at = (from: number, to: number) => ({ from, to });
  const place = (list: { from: number; to: number }[]) => placeEvents(list, (e) => e);

  it("gives events that do not overlap the full width", () => {
    const placed = place([at(480, 600), at(600, 720)]);
    expect(placed.map((p) => p.lanes)).toEqual([1, 1]);
    expect(placed.map((p) => p.lane)).toEqual([0, 0]);
  });

  it("puts overlapping events side by side", () => {
    const placed = place([at(480, 960), at(540, 600), at(660, 720)]);
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
    expect(placed.map((p) => p.lane)).toEqual([0, 1, 1]);
  });

  it("shows a shift past midnight up to the day's end", () => {
    expect(endMinutes("22:00", "06:00")).toBe(24 * 60);
    expect(endMinutes("08:00", "16:00")).toBe(16 * 60);
  });

  it("stretches the hours to what is scheduled", () => {
    expect(hourRange([])).toEqual({ from: 7, to: 18 });
    expect(hourRange([at(5 * 60, 20 * 60 + 30)])).toEqual({ from: 5, to: 21 });
  });
});

describe("people on the calendar", () => {
  it("keeps one colour for one person", () => {
    expect(personColor("abc")).toBe(personColor("abc"));
  });

  it("makes initials from the first two names", () => {
    expect(initials("Athala Fawwaz Putra")).toBe("AF");
    expect(initials("Sari")).toBe("S");
  });
});
