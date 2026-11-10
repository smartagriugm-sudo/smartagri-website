import { describe, expect, it } from "vitest";
import { addDay, addTimeTo, bestOptions, bookingIcs, bookingMessage, bookingStage, countdownLabel, dayLanes, checkBookingForm, clashesFor, copyTimesToAll, emptyBookingForm, nextAnswer, overlaps, sharedDuration, slotAt, tally, whenLabel, withDuration, type Booking, type Busy, type TimeOption } from "./booking";
import type { Leave } from "./people";

const t = (day: string, start: string | null, end: string | null): TimeOption => ({ day, start, end });

describe("picking times", () => {
  it("starts a new day at 09.00 for the chosen length", () => {
    expect(addDay([], "2026-11-11", 60)).toEqual([t("2026-11-11", "09:00", "10:00")]);
  });

  it("gives a new day the times of the last day picked", () => {
    const one = [t("2026-11-11", "12:00", "13:00"), t("2026-11-11", "13:00", "14:00")];
    expect(addDay(one, "2026-11-19", 60).filter((o) => o.day === "2026-11-19")).toEqual([t("2026-11-19", "12:00", "13:00"), t("2026-11-19", "13:00", "14:00")]);
  });

  it("adds the next time straight after the day's last, and not twice", () => {
    const one = [t("2026-11-11", "12:00", "13:00")];
    const two = addTimeTo(one, "2026-11-11", 60);
    expect(two).toEqual([t("2026-11-11", "12:00", "13:00"), t("2026-11-11", "13:00", "14:00")]);
  });

  it("keeps a time inside the day", () => {
    expect(slotAt("2026-11-11", 23 * 60 + 30, 60)).toEqual(t("2026-11-11", "23:00", "24:00"));
  });

  it("moves every end when the length changes, and merges what becomes the same", () => {
    const opts = [t("2026-11-11", "09:00", "10:00"), t("2026-11-11", "09:00", "09:30")];
    expect(withDuration(opts, 120)).toEqual([t("2026-11-11", "09:00", "11:00")]);
    expect(withDuration(opts, 0)).toEqual([t("2026-11-11", null, null)]);
  });

  it("copies one day's times to every day", () => {
    const opts = [t("2026-11-11", "09:00", "10:00"), t("2026-11-11", "13:00", "14:00"), t("2026-11-12", "15:00", "16:00")];
    expect(copyTimesToAll(opts, "2026-11-11").filter((o) => o.day === "2026-11-12")).toEqual([t("2026-11-12", "09:00", "10:00"), t("2026-11-12", "13:00", "14:00")]);
  });

  it("names the shared length only when every time has it", () => {
    expect(sharedDuration([t("2026-11-11", "09:00", "10:00"), t("2026-11-12", "13:00", "14:00")])).toBe(60);
    expect(sharedDuration([t("2026-11-11", "09:00", "10:00"), t("2026-11-12", "13:00", "13:30")])).toBeNull();
  });
});

describe("the poll", () => {
  it("counts an if-need-be as half a yes and picks the best", () => {
    const votes = [
      { option_id: "a", answer: "ya" as const },
      { option_id: "a", answer: "mungkin" as const },
      { option_id: "b", answer: "ya" as const },
      { option_id: "b", answer: "ya" as const },
    ];
    const tallies = tally([{ id: "a" }, { id: "b" }], votes);
    expect(tallies.map((x) => x.score)).toEqual([1.5, 2]);
    expect([...bestOptions(tallies)]).toEqual(["b"]);
  });

  it("calls nothing best before anyone answers", () => {
    expect(bestOptions(tally([{ id: "a" }], [])).size).toBe(0);
  });

  it("cycles answers, skipping if-need-be when it is off", () => {
    expect(nextAnswer(undefined, true)).toBe("ya");
    expect(nextAnswer("ya", true)).toBe("mungkin");
    expect(nextAnswer("ya", false)).toBe("tidak");
    expect(nextAnswer("tidak", false)).toBeUndefined();
  });
});

describe("clashes", () => {
  const busy: Busy[] = [{ bookingId: "x", title: "School visit", space: "plant_factory", day: "2026-11-11", start: "09:00", end: "11:00" }];
  const leave = { id: "l", person_id: "p1", full_name: "Sari", type: "cuti", start_date: "2026-11-10", end_date: "2026-11-12", reason: "", status: "disetujui", decide_note: "" } as Leave;

  it("sees overlapping times, and a whole day overlapping everything that day", () => {
    expect(overlaps(t("2026-11-11", "10:30", "11:30"), busy[0])).toBe(true);
    expect(overlaps(t("2026-11-11", "11:00", "12:00"), busy[0])).toBe(false);
    expect(overlaps(t("2026-11-11", null, null), busy[0])).toBe(true);
  });

  it("names the room taken and who is away, but not for an online booking", () => {
    const people = [{ id: "p1", name: "Sari" }];
    expect(clashesFor(t("2026-11-11", "10:00", "11:00"), "plant_factory", busy, [leave], people)).toEqual(["Plant factory is booked: School visit, 09.00–11.00", "Sari is on leave"]);
    expect(clashesFor(t("2026-11-11", "10:00", "11:00"), "daring", busy, [], people)).toEqual([]);
  });
});

describe("a booking's stage and form", () => {
  const base = { status: "terjadwal" as const, chosen_day: "2026-11-11", last_day: "2026-11-11" };
  it("calls a booked time that has passed done", () => {
    expect(bookingStage(base, "2026-11-10")).toBe("booked");
    expect(bookingStage(base, "2026-11-12")).toBe("done");
    expect(bookingStage({ ...base, status: "batal" }, "2026-11-10")).toBe("cancelled");
    expect(bookingStage({ status: "mencari", chosen_day: null, last_day: "2026-11-20" }, "2026-11-10")).toBe("finding");
  });

  it("describes a poll by its offered times", () => {
    expect(whenLabel({ status: "mencari", chosen_day: null, chosen_start: null, chosen_end: null, first_day: "2026-11-11", last_day: "2026-11-19", option_count: 3 })).toBe("3 times offered · 11 Nov–19 Nov");
  });

  it("asks for a title, a time, and sensible contact details", () => {
    const f = emptyBookingForm();
    expect(checkBookingForm(f, "2026-11-09")).toMatch(/title/);
    const named = { ...f, title: "Visit" };
    expect(checkBookingForm(named, "2026-11-09")).toMatch(/date/);
    const timed = { ...named, options: [t("2026-11-11", "09:00", "10:00")] };
    expect(checkBookingForm(timed, "2026-11-09")).toBeNull();
    expect(checkBookingForm(timed, "2026-11-12")).toMatch(/past/);
    expect(checkBookingForm({ ...timed, contactEmail: "nope" }, "2026-11-09")).toMatch(/email/);
    expect(checkBookingForm({ ...timed, videoLink: "meet.google.com/x" }, "2026-11-09")).toMatch(/https/);
  });
});

describe("a booking's day and sharing it", () => {
  const base = { id: "b1", title: "School visit, group A", kind: "kunjungan", space: "plant_factory", place_note: "Lobby", host_id: null, host_name: "Hendra", guest_org: "", guest_count: null, contact_name: "", contact_phone: "", contact_email: "", video_link: "", description: "Line one\nline two", allow_maybe: true, status: "terjadwal", chosen_option: "o1", chosen_day: "2026-11-12", chosen_start: "09:00:00", chosen_end: "11:00:00", cancel_note: "", created_by: null, created_at: "2026-11-01T00:00:00Z", option_count: 1, voter_count: 0, first_day: "2026-11-12", last_day: "2026-11-12" } as Booking;

  it("says how far off a day is", () => {
    expect(countdownLabel("2026-11-10", "2026-11-10")).toBe("Today");
    expect(countdownLabel("2026-11-11", "2026-11-10")).toBe("Tomorrow");
    expect(countdownLabel("2026-11-14", "2026-11-10")).toBe("In 4 days");
    expect(countdownLabel("2026-11-08", "2026-11-10")).toBe("2 days ago");
  });

  it("writes a calendar file in WIB, with commas and new lines escaped", () => {
    const ics = bookingIcs(base, new Date("2026-11-10T01:02:03Z")) as string;
    expect(ics).toContain("DTSTART;TZID=Asia/Jakarta:20261112T090000");
    expect(ics).toContain("DTEND;TZID=Asia/Jakarta:20261112T110000");
    expect(ics).toContain("SUMMARY:School visit\\, group A");
    expect(ics).toContain("DESCRIPTION:Line one\\nline two");
    expect(ics).toContain("DTSTAMP:20261110T010203Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("books a whole day as a date, ending the next day", () => {
    const ics = bookingIcs({ ...base, chosen_start: null, chosen_end: null, chosen_day: "2026-11-30" }) as string;
    expect(ics).toContain("DTSTART;VALUE=DATE:20261130");
    expect(ics).toContain("DTEND;VALUE=DATE:20261201");
    expect(bookingIcs({ ...base, chosen_day: null })).toBeNull();
  });

  it("writes a message for the guests", () => {
    expect(bookingMessage(base)).toBe("School visit, group A\nWhen: Thursday, 12 November 2026, 09.00–11.00 WIB\nWhere: Plant factory, Lobby\nHost: Hendra");
  });

  it("lays a day out by space, the space in focus always there", () => {
    const other = { ...base, id: "b2", title: "Meeting", space: "ruang_rapat", chosen_start: "13:00:00", chosen_end: "14:00:00" } as Booking;
    const lanes = dayLanes("2026-11-12", [base, other, { ...base, id: "b3", status: "mencari" } as Booking], "lab", [{ id: "o9", title: "x", kind: "rapat", start: "08:00", end: "09:00", offered: true }]);
    expect(lanes.map((l) => l.space)).toEqual(["plant_factory", "lab", "ruang_rapat"]);
    expect(lanes[0].items.map((i) => i.id)).toEqual(["b1"]);
    expect(lanes[1].items.map((i) => i.id)).toEqual(["o9"]);
  });
});
