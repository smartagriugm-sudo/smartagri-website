import { describe, expect, it } from "vitest";
import { attendanceFlags, buildRoster, contractEndingSoon, datesOnWeekdays, formatMinutes, parseArea, parseDuration, parseShiftForm, weekDays, weekStart, type Attendance, type Leave, type Shift } from "./people";

const shift = (over: Partial<Shift> = {}): Shift => ({ id: "s1", person_id: "p1", full_name: "Budi", work_date: "2026-11-06", start_at: "08:00:00", end_at: "16:00:00", area_id: null, area_name: null, notes: "", ...over });
// 01:00Z is 08:00 in Jakarta.
const record = (over: Partial<Attendance> = {}): Attendance => ({ id: "a1", person_id: "p1", full_name: "Budi", shift_id: "s1", work_date: "2026-11-06", clock_in: "2026-11-06T01:05:00Z", clock_out: null, in_accuracy_m: 10, in_within_area: true, out_within_area: null, in_photo_path: "x", out_photo_path: null, missed_out: false, source: "ponsel", note: "", photos_removed_at: null, start_at: "08:00:00", end_at: "16:00:00", ...over });
const leave = (over: Partial<Leave> = {}): Leave => ({ id: "l1", person_id: "p1", full_name: "Budi", type: "sakit", start_date: "2026-11-06", end_date: "2026-11-06", reason: "", status: "disetujui", decide_note: "", ...over });

const day = "2026-11-06";
const at = (hhmm: string) => new Date(`${day}T${hhmm}:00+07:00`);

describe("one day's roster", () => {
  it("tells on time from late, with a grace period", () => {
    expect(buildRoster(day, day, at("12:00"), [shift()], [record()], [])[0].state).toBe("hadir");
    expect(buildRoster(day, day, at("12:00"), [shift()], [record({ clock_in: "2026-11-06T01:10:00Z" })], [])[0].state).toBe("hadir");
    expect(buildRoster(day, day, at("12:00"), [shift()], [record({ clock_in: "2026-11-06T01:11:00Z" })], [])[0].state).toBe("terlambat");
  });

  it("does not call someone absent before their time", () => {
    expect(buildRoster(day, day, at("07:00"), [shift()], [], [])[0].state).toBe("belum_datang");
    expect(buildRoster(day, day, at("08:10"), [shift()], [], [])[0].state).toBe("belum_datang");
    expect(buildRoster(day, day, at("08:11"), [shift()], [], [])[0].state).toBe("tidak_hadir");
    expect(buildRoster("2026-11-07", day, at("23:00"), [shift({ work_date: "2026-11-07" })], [], [])[0].state).toBe("belum_datang");
    expect(buildRoster("2026-11-05", day, at("00:01"), [shift({ work_date: "2026-11-05" })], [], [])[0].state).toBe("tidak_hadir");
  });

  it("counts only approved leave", () => {
    expect(buildRoster(day, day, at("12:00"), [shift()], [], [leave()])[0].state).toBe("izin");
    expect(buildRoster(day, day, at("12:00"), [shift()], [], [leave({ status: "diajukan" })])[0].state).toBe("tidak_hadir");
    expect(buildRoster(day, day, at("12:00"), [shift()], [], [leave({ start_date: "2026-11-07", end_date: "2026-11-08" })])[0].state).toBe("tidak_hadir");
  });

  it("lets a person who came anyway count as present", () => {
    expect(buildRoster(day, day, at("12:00"), [shift()], [record()], [leave()])[0].state).toBe("hadir");
  });

  it("lists who came without a schedule", () => {
    const rows = buildRoster(day, day, at("12:00"), [], [record({ shift_id: null })], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("tanpa_jadwal");
  });

  it("leaves other days out", () => {
    expect(buildRoster(day, day, at("12:00"), [shift({ work_date: "2026-11-07" })], [record({ work_date: "2026-11-07" })], [])).toEqual([]);
  });
});

describe("what to check on a record", () => {
  it("separates outside from unknown", () => {
    expect(attendanceFlags(record())).toEqual([]);
    expect(attendanceFlags(record({ in_within_area: false }))).toEqual(["Clocked in outside the area"]);
    expect(attendanceFlags(record({ in_within_area: null }))).toEqual(["Clock-in location unknown"]);
    expect(attendanceFlags(record({ clock_out: "2026-11-06T09:00:00Z", out_within_area: null }))).toEqual(["Clock-out location unknown"]);
    expect(attendanceFlags(record({ out_within_area: false, missed_out: true }))).toEqual(["Clocked out outside the area", "Missed clock-out"]);
    expect(attendanceFlags(record({ source: "manual", in_within_area: null }))).toEqual(["Recorded by hand"]);
  });
});

describe("dates", () => {
  it("finds the week", () => {
    expect(weekStart("2026-11-06")).toBe("2026-11-02");
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
    expect(weekDays("2026-11-02")[6]).toBe("2026-11-08");
  });

  it("picks working days", () => {
    expect(datesOnWeekdays("2026-11-02", "2026-11-08", [1, 3, 5])).toEqual(["2026-11-02", "2026-11-04", "2026-11-06"]);
    expect(datesOnWeekdays("2026-11-02", "2030-01-01", [1, 2, 3, 4, 5, 6, 0])).toHaveLength(92);
  });
});

describe("forms", () => {
  it("checks a schedule", () => {
    const ok = parseShiftForm("p", "2026-11-02", "2026-11-03", [1], "08:00", "16:00");
    expect(ok).toEqual({ error: null, dates: ["2026-11-02"] });
    expect(parseShiftForm("", "2026-11-02", "2026-11-03", [1], "08:00", "16:00").error).toMatch(/person/);
    expect(parseShiftForm("p", "2026-11-03", "2026-11-02", [1], "08:00", "16:00").error).toMatch(/before/);
    expect(parseShiftForm("p", "2026-11-02", "2026-11-03", [1], "16:00", "08:00").error).toMatch(/after/);
    expect(parseShiftForm("p", "2026-11-03", "2026-11-03", [1], "08:00", "16:00").error).toMatch(/No date/);
  });

  it("reads a duration", () => {
    expect(parseDuration("1,5", "")).toEqual({ error: null, minutes: 90 });
    expect(parseDuration("", "45")).toEqual({ error: null, minutes: 45 });
    expect(parseDuration("", "").error).toMatch(/between/);
    expect(parseDuration("17", "").error).toMatch(/between/);
    expect(parseDuration("x", "").error).toMatch(/number/);
    expect(formatMinutes(90)).toBe("1 hour 30 minutes");
    expect(formatMinutes(120)).toBe("2 hours");
    expect(formatMinutes(45)).toBe("45 minutes");
  });

  it("checks a work area", () => {
    expect(parseArea("SARC", "-7,765", "110.372", "150")).toEqual({ error: null, lat: -7.765, lng: 110.372, radius: 150 });
    expect(parseArea("", "0", "0", "150").error).toMatch(/name/);
    expect(parseArea("X", "", "0", "150").error).toMatch(/Latitude/);
    expect(parseArea("X", "0", "181", "150").error).toMatch(/Longitude/);
    expect(parseArea("X", "0", "0", "5").error).toMatch(/radius/);
  });

  it("spots a contract about to end", () => {
    const today = "2026-11-06";
    expect(contractEndingSoon({ end_date: "2026-12-01" }, today)).toBe(true);
    expect(contractEndingSoon({ end_date: "2027-01-01" }, today)).toBe(false);
    expect(contractEndingSoon({ end_date: "2026-11-01" }, today)).toBe(false);
    expect(contractEndingSoon({ end_date: null }, today)).toBe(false);
  });
});
