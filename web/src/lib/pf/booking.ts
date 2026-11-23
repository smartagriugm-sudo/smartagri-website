import { check, db, unwrap } from "./foundation";
import type { Leave } from "./people";
import type { Lang } from "../i18n-core";

// Bookings (supabase/pf-booking.sql): research sessions, visits, trainings and meetings.
// A booking offers one or more times; with more than one, the people invited answer
// each, and the organiser confirms the one that suits most. Days are YYYY-MM-DD and
// times HH:MM in the lab's time (WIB), like the rest of the ERP.

/* -------------------------------------------------------------------- types */

export const BOOKING_KINDS = [
  { key: "penelitian", label: "Research", labelId: "Penelitian", color: "#0B6477" },
  { key: "kunjungan", label: "Visit", labelId: "Kunjungan", color: "#0E7A5C" },
  { key: "pelatihan", label: "Training", labelId: "Pelatihan", color: "#6D5BD0" },
  { key: "rapat", label: "Meeting", labelId: "Rapat", color: "#2F6DB5" },
  { key: "lainnya", label: "Other", labelId: "Lainnya", color: "#8A5A07" },
] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number]["key"];
export const kindOf = (key: string) => BOOKING_KINDS.find((k) => k.key === key) ?? BOOKING_KINDS[4];
export const kindLabel = (key: string, lang: Lang = "en") => {
  const k = kindOf(key);
  return lang === "id" ? k.labelId : k.label;
};

/** Online and outdoor bookings never clash over a room. */
export const BOOKING_SPACES = [
  { key: "plant_factory", label: "Plant factory", labelId: "Plant factory", shared: false },
  { key: "growth_chamber", label: "Growth chamber", labelId: "Growth chamber", shared: false },
  { key: "lab", label: "Laboratory", labelId: "Laboratorium", shared: false },
  { key: "ruang_rapat", label: "Meeting room", labelId: "Ruang rapat", shared: false },
  { key: "lapangan", label: "Field or outdoor", labelId: "Lapangan atau luar ruang", shared: true },
  { key: "daring", label: "Online only", labelId: "Daring saja", shared: true },
] as const;
export type BookingSpace = (typeof BOOKING_SPACES)[number]["key"];
export const spaceLabel = (key: string, lang: Lang = "en") => {
  const s = BOOKING_SPACES.find((x) => x.key === key);
  return s ? (lang === "id" ? s.labelId : s.label) : key;
};

export type BookingStatus = "mencari" | "terjadwal" | "batal";
export type Answer = "ya" | "mungkin" | "tidak";

export const ANSWERS: Record<Answer, { label: string; className: string }> = {
  ya: { label: "Yes", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  mungkin: { label: "If need be", className: "bg-[#FFF6E5] text-[#B26205]" },
  tidak: { label: "No", className: "bg-[#EEF3F4] text-[#6B8187]" },
};
const ANSWERS_ID: Record<Answer, string> = { ya: "Ya", mungkin: "Kalau perlu", tidak: "Tidak" };
export const answerLabel = (a: Answer, lang: Lang = "en") => (lang === "id" ? ANSWERS_ID[a] : ANSWERS[a].label);

/** One time on offer. No start and end means the whole day. */
export type TimeOption = { day: string; start: string | null; end: string | null };

export type Booking = {
  id: string;
  title: string;
  kind: BookingKind;
  space: BookingSpace;
  place_note: string;
  host_id: string | null;
  host_name: string | null;
  guest_org: string;
  guest_count: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  video_link: string;
  description: string;
  allow_maybe: boolean;
  status: BookingStatus;
  chosen_option: string | null;
  chosen_day: string | null;
  chosen_start: string | null;
  chosen_end: string | null;
  cancel_note: string;
  created_by: string | null;
  created_at: string;
  option_count: number;
  voter_count: number;
  first_day: string | null;
  last_day: string | null;
};

export type BookingOption = { id: string; booking_id: string; day: string; start_at: string | null; end_at: string | null };
export type Vote = { option_id: string; person_id: string; full_name: string; answer: Answer };
export type Invitee = { booking_id: string; person_id: string; full_name: string };

/** Where a booking stands, as a person reads it: a confirmed time that has passed is done. */
export type BookingStage = "finding" | "booked" | "done" | "cancelled";

export const BOOKING_STAGE: Record<BookingStage, { label: string; className: string }> = {
  finding: { label: "Finding a time", className: "bg-[#E3F4F4] text-[#0B6477]" },
  booked: { label: "Booked", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  done: { label: "Done", className: "bg-[#EEF3F4] text-[#4F6B73]" },
  cancelled: { label: "Cancelled", className: "bg-[#FDECEA] text-[#B3362C]" },
};
const BOOKING_STAGE_ID: Record<BookingStage, string> = { finding: "Mencari waktu", booked: "Terjadwal", done: "Selesai", cancelled: "Dibatalkan" };
export const bookingStageLabel = (s: BookingStage, lang: Lang = "en") => (lang === "id" ? BOOKING_STAGE_ID[s] : BOOKING_STAGE[s].label);

export function bookingStage(b: Pick<Booking, "status" | "chosen_day" | "last_day">, today: string): BookingStage {
  if (b.status === "batal") return "cancelled";
  if (b.status === "terjadwal") return b.chosen_day && b.chosen_day < today ? "done" : "booked";
  return b.last_day && b.last_day < today ? "done" : "finding";
}

/* ------------------------------------------------------------- time options */

export const DURATIONS = [
  { key: 30, label: "30m" },
  { key: 60, label: "1h" },
  { key: 90, label: "1h 30m" },
  { key: 120, label: "2h" },
  { key: 180, label: "3h" },
  { key: 0, label: "All day" },
] as const;
/** A DURATIONS label in the reader's language: "1j 30m" and "Seharian" in Indonesian. */
export const durationChoiceLabel = (key: number, lang: Lang = "en") => (key === 0 ? (lang === "id" ? "Seharian" : "All day") : durationLabel(key, lang));

/** The first and last start times offered, in minutes. The lab is open 06.00–21.00. */
export const DAY_OPENS = 6 * 60;
export const DAY_CLOSES = 21 * 60;
export const STEP_MINUTES = 15;

export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const toClock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** "09:00" as the lab writes it: "09.00". */
export const clockLabel = (t: string) => t.slice(0, 5).replace(":", ".");

export function durationLabel(minutes: number, lang: Lang = "en") {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hu = lang === "id" ? "j" : "h";
  return h && m ? `${h}${hu} ${m}m` : h ? `${h}${hu}` : `${m}m`;
}

export const optionMinutes = (o: Pick<TimeOption, "start" | "end">) => (o.start && o.end ? toMinutes(o.end) - toMinutes(o.start) : 0);

export function optionLabel(o: Pick<TimeOption, "start" | "end">, lang: Lang = "en") {
  return o.start && o.end ? `${clockLabel(o.start)}–${clockLabel(o.end)}` : lang === "id" ? "Seharian" : "All day";
}

const sameOption = (a: TimeOption, b: TimeOption) => a.day === b.day && a.start === b.start && a.end === b.end;

export function sortOptions<T extends TimeOption>(options: readonly T[]): T[] {
  return [...options].sort((a, b) => a.day.localeCompare(b.day) || (a.start ?? "").localeCompare(b.start ?? ""));
}

/** A time of the chosen length from `start`, kept inside the day. */
export function slotAt(day: string, start: number, duration: number): TimeOption {
  if (duration === 0) return { day, start: null, end: null };
  const from = Math.max(0, Math.min(start, 24 * 60 - duration));
  return { day, start: toClock(from), end: toClock(from + duration) };
}

/** A day picked on the calendar gets the times of the last day picked, or one at 09.00. */
export function addDay(options: readonly TimeOption[], day: string, duration: number): TimeOption[] {
  if (options.some((o) => o.day === day)) return [...options];
  const sorted = sortOptions(options);
  const template = sorted.length ? sorted.filter((o) => o.day === sorted[sorted.length - 1].day) : [];
  const added = template.length ? template.map((o) => ({ ...o, day })) : [slotAt(day, 9 * 60, duration)];
  return sortOptions([...options, ...added]);
}

export const removeDay = (options: readonly TimeOption[], day: string) => options.filter((o) => o.day !== day);

/** One more time on a day, straight after its last one. */
export function addTimeTo(options: readonly TimeOption[], day: string, duration: number): TimeOption[] {
  const onDay = sortOptions(options.filter((o) => o.day === day));
  if (duration === 0 || onDay.some((o) => !o.start)) return [...options];
  const last = onDay[onDay.length - 1];
  const from = last?.end ? toMinutes(last.end) : 9 * 60;
  const next = slotAt(day, Math.min(from, DAY_CLOSES), duration);
  if (onDay.some((o) => sameOption(o, next))) return [...options];
  return sortOptions([...options, next]);
}

/** Changing the length moves every end, as the start is what people agree on. */
export function withDuration(options: readonly TimeOption[], duration: number): TimeOption[] {
  const out: TimeOption[] = [];
  for (const o of options) {
    const next = slotAt(o.day, o.start ? toMinutes(o.start) : 9 * 60, duration);
    if (!out.some((x) => sameOption(x, next))) out.push(next);
  }
  return sortOptions(out);
}

/** Copies one day's times to every other day picked. */
export function copyTimesToAll(options: readonly TimeOption[], fromDay: string): TimeOption[] {
  const template = options.filter((o) => o.day === fromDay);
  const days = [...new Set(options.map((o) => o.day))];
  return sortOptions(days.flatMap((d) => template.map((o) => ({ ...o, day: d }))));
}

/** The length the options share, or null when they differ, so the picker shows none chosen. */
export function sharedDuration(options: readonly TimeOption[]): number | null {
  if (options.length === 0) return null;
  const lengths = new Set(options.map(optionMinutes));
  return lengths.size === 1 ? [...lengths][0] : null;
}

/** Start times a person may choose, every quarter hour while the lab is open. */
export const startChoices = () => Array.from({ length: (DAY_CLOSES - DAY_OPENS) / STEP_MINUTES + 1 }, (_, i) => toClock(DAY_OPENS + i * STEP_MINUTES));

/* ---------------------------------------------------------------- the poll */

export type Tally = { optionId: string; ya: number; mungkin: number; tidak: number; score: number };

/** A yes counts one, an "if need be" a half, so the best time is the one most can make. */
export function tally(options: readonly Pick<BookingOption, "id">[], votes: readonly Pick<Vote, "option_id" | "answer">[]): Tally[] {
  return options.map((o) => {
    const mine = votes.filter((v) => v.option_id === o.id);
    const ya = mine.filter((v) => v.answer === "ya").length;
    const mungkin = mine.filter((v) => v.answer === "mungkin").length;
    const tidak = mine.filter((v) => v.answer === "tidak").length;
    return { optionId: o.id, ya, mungkin, tidak, score: ya + mungkin / 2 };
  });
}

/** The options with the highest score, when anyone has answered at all. */
export function bestOptions(tallies: readonly Tally[]): Set<string> {
  const top = Math.max(0, ...tallies.map((t) => t.score));
  return new Set(top > 0 ? tallies.filter((t) => t.score === top).map((t) => t.optionId) : []);
}

/** Clicking a cell goes through the answers in order, and back to none. */
export function nextAnswer(current: Answer | undefined, allowMaybe: boolean): Answer | undefined {
  const order: (Answer | undefined)[] = allowMaybe ? [undefined, "ya", "mungkin", "tidak"] : [undefined, "ya", "tidak"];
  return order[(order.indexOf(current) + 1) % order.length];
}

/* ------------------------------------------------------------- clashes */

export type Busy = { bookingId: string; title: string; space: BookingSpace; day: string; start: string | null; end: string | null };

/** Confirmed bookings that hold a room, as busy times for the picker and the poll. */
export function busyTimes(bookings: readonly Booking[], except?: string): Busy[] {
  return bookings
    .filter((b) => b.id !== except && b.status === "terjadwal" && b.chosen_day)
    .map((b) => ({ bookingId: b.id, title: b.title, space: b.space, day: b.chosen_day as string, start: b.chosen_start?.slice(0, 5) ?? null, end: b.chosen_end?.slice(0, 5) ?? null }));
}

const rangeOf = (o: { start: string | null; end: string | null }) => (o.start && o.end ? [toMinutes(o.start), toMinutes(o.end)] : [0, 24 * 60]);

export function overlaps(a: { day: string; start: string | null; end: string | null }, b: { day: string; start: string | null; end: string | null }) {
  if (a.day !== b.day) return false;
  const [a1, a2] = rangeOf(a);
  const [b1, b2] = rangeOf(b);
  return a1 < b2 && b1 < a2;
}

/** What stands in the way of one time: the room already taken, the host or someone invited on leave. */
export function clashesFor(option: TimeOption, space: string, busy: readonly Busy[], leaves: readonly Leave[], people: readonly { id: string; name: string }[], lang: Lang = "en"): string[] {
  const id = lang === "id";
  const out: string[] = [];
  const sharedSpace = BOOKING_SPACES.find((s) => s.key === space)?.shared ?? true;
  if (!sharedSpace) {
    for (const b of busy) {
      if (b.space === space && overlaps(option, b)) out.push(id ? `${spaceLabel(space, lang)} sudah dipakai: ${b.title}, ${optionLabel(b, lang)}` : `${spaceLabel(space)} is booked: ${b.title}, ${optionLabel(b)}`);
    }
  }
  for (const p of people) {
    const away = leaves.find((l) => l.person_id === p.id && l.status === "disetujui" && l.start_date <= option.day && l.end_date >= option.day);
    if (away) out.push(id ? `${p.name} sedang cuti` : `${p.name} is on leave`);
  }
  return out;
}

/* ----------------------------------------------------------------- dates */

const asDate = (d: string) => new Date(`${d}T00:00:00Z`);
export const fmtDay = (d: string, options: Intl.DateTimeFormatOptions, lang: Lang = "en") => new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { ...options, timeZone: "UTC" }).format(asDate(d));

export function whenLabel(b: Pick<Booking, "status" | "chosen_day" | "chosen_start" | "chosen_end" | "first_day" | "last_day" | "option_count">, lang: Lang = "en") {
  if (b.chosen_day) return `${fmtDay(b.chosen_day, { weekday: "short", day: "numeric", month: "short" }, lang)} · ${optionLabel({ start: b.chosen_start, end: b.chosen_end }, lang)}`;
  if (!b.first_day) return lang === "id" ? "Belum ada waktu" : "No times yet";
  const span = b.first_day === b.last_day || !b.last_day ? fmtDay(b.first_day, { day: "numeric", month: "short" }, lang) : `${fmtDay(b.first_day, { day: "numeric", month: "short" }, lang)}–${fmtDay(b.last_day, { day: "numeric", month: "short" }, lang)}`;
  if (lang === "id") return `${b.option_count} pilihan waktu · ${span}`;
  return `${b.option_count} ${b.option_count === 1 ? "time" : "times"} offered · ${span}`;
}

/** The days a booking may take place on, for a list sorted by when. */
export const sortDay = (b: Pick<Booking, "chosen_day" | "first_day" | "created_at">) => b.chosen_day ?? b.first_day ?? b.created_at.slice(0, 10);

/** How far off a day is, in words: "Today", "Tomorrow", "In 3 days", "2 days ago". */
export function countdownLabel(day: string, today: string, lang: Lang = "en") {
  const n = Math.round((asDate(day).getTime() - asDate(today).getTime()) / 86_400_000);
  if (lang === "id") {
    if (n === 0) return "Hari ini";
    if (n === 1) return "Besok";
    if (n === -1) return "Kemarin";
    return n > 0 ? `${n} hari lagi` : `${-n} hari lalu`;
  }
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

/* ------------------------------------------------------- sharing a booking */

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsStamp = (day: string, time: string) => `${day.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;

/**
 * A calendar file (.ics) for a booked time, in WIB, so it lands in Google Calendar,
 * Outlook or a phone's calendar at the right hour. Made in the browser; nothing is sent.
 */
export function bookingIcs(b: Pick<Booking, "id" | "title" | "space" | "place_note" | "description" | "video_link" | "chosen_day" | "chosen_start" | "chosen_end">, now = new Date(), lang: Lang = "en"): string | null {
  if (!b.chosen_day) return null;
  const where = [spaceLabel(b.space, lang), b.place_note].filter(Boolean).join(", ");
  const about = [b.description, b.video_link ? `${lang === "id" ? "Panggilan video" : "Video call"}: ${b.video_link}` : ""].filter(Boolean).join("\n\n");
  const timed = b.chosen_start && b.chosen_end;
  const next = new Date(`${b.chosen_day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//agrosphere//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:${b.id}@agrosphere`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    timed ? `DTSTART;TZID=Asia/Jakarta:${icsStamp(b.chosen_day, b.chosen_start as string)}` : `DTSTART;VALUE=DATE:${b.chosen_day.replace(/-/g, "")}`,
    timed ? `DTEND;TZID=Asia/Jakarta:${icsStamp(b.chosen_day, b.chosen_end as string)}` : `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`,
    `SUMMARY:${icsText(b.title)}`,
    `LOCATION:${icsText(where)}`,
    ...(about ? [`DESCRIPTION:${icsText(about)}`] : []),
    ...(b.video_link ? [`URL:${b.video_link}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/** The booking as a short message to paste into WhatsApp or an email to the guests. */
export function bookingMessage(b: Pick<Booking, "title" | "space" | "place_note" | "host_name" | "video_link" | "chosen_day" | "chosen_start" | "chosen_end">, lang: Lang = "en"): string {
  const id = lang === "id";
  const when = b.chosen_day ? `${fmtDay(b.chosen_day, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, lang)}, ${optionLabel({ start: b.chosen_start, end: b.chosen_end }, lang)}${b.chosen_start ? " WIB" : ""}` : id ? "Waktu masih ditentukan" : "Time still being decided";
  return [
    b.title,
    `${id ? "Waktu" : "When"}: ${when}`,
    `${id ? "Tempat" : "Where"}: ${[spaceLabel(b.space, lang), b.place_note].filter(Boolean).join(", ")}`,
    ...(b.host_name ? [`${id ? "Tuan rumah" : "Host"}: ${b.host_name}`] : []),
    ...(b.video_link ? [`${id ? "Panggilan video" : "Video call"}: ${b.video_link}`] : []),
  ].join("\n");
}

/* ------------------------------------------------------ one day, by space */

export type LaneItem = { id: string; title: string; kind: string; start: string | null; end: string | null; offered?: boolean; score?: number };
export type Lane = { space: BookingSpace; label: string; items: LaneItem[] };

/**
 * What happens on one day, a row per space: the booked times there, plus any times a
 * poll offers. The space in focus always gets a row, even when nothing else is there.
 */
export function dayLanes(day: string, bookings: readonly Booking[], focusSpace: string, offered: readonly LaneItem[] = [], lang: Lang = "en"): Lane[] {
  const booked = bookings.filter((b) => b.status === "terjadwal" && b.chosen_day === day);
  return BOOKING_SPACES.filter((s) => s.key === focusSpace || booked.some((b) => b.space === s.key)).map((s) => ({
    space: s.key,
    label: lang === "id" ? s.labelId : s.label,
    items: [
      ...booked.filter((b) => b.space === s.key).map((b) => ({ id: b.id, title: b.title, kind: b.kind, start: b.chosen_start?.slice(0, 5) ?? null, end: b.chosen_end?.slice(0, 5) ?? null })),
      ...(s.key === focusSpace ? offered : []),
    ].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "")),
  }));
}

/* ------------------------------------------------------------------- form */

export type BookingForm = {
  title: string;
  kind: BookingKind;
  space: BookingSpace;
  placeNote: string;
  hostId: string;
  guestOrg: string;
  guestCount: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  videoLink: string;
  description: string;
  allowMaybe: boolean;
  invitees: string[];
  options: TimeOption[];
};

export const emptyBookingForm = (hostId = ""): BookingForm => ({
  title: "",
  kind: "kunjungan",
  space: "ruang_rapat",
  placeNote: "",
  hostId,
  guestOrg: "",
  guestCount: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  videoLink: "",
  description: "",
  allowMaybe: true,
  invitees: [],
  options: [],
});

export function bookingToForm(b: Booking, options: readonly BookingOption[], invitees: readonly Invitee[]): BookingForm {
  return {
    title: b.title,
    kind: b.kind,
    space: b.space,
    placeNote: b.place_note,
    hostId: b.host_id ?? "",
    guestOrg: b.guest_org,
    guestCount: b.guest_count ? String(b.guest_count) : "",
    contactName: b.contact_name,
    contactPhone: b.contact_phone,
    contactEmail: b.contact_email,
    videoLink: b.video_link,
    description: b.description,
    allowMaybe: b.allow_maybe,
    invitees: invitees.map((i) => i.person_id),
    options: sortOptions(options.map((o) => ({ day: o.day, start: o.start_at?.slice(0, 5) ?? null, end: o.end_at?.slice(0, 5) ?? null }))),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BOOKING_FORM_ID: Record<string, string> = {
  "Give the booking a title.": "Beri judul reservasi.",
  "Pick at least one date on the calendar.": "Pilih minimal satu tanggal di kalender.",
  "A time in the past cannot be offered. Remove it from the calendar.": "Waktu yang sudah lewat tidak bisa ditawarkan. Hapus dari kalender.",
  "Each time must end after it starts.": "Setiap waktu harus selesai setelah dimulai.",
  "The number of guests must be a whole number.": "Jumlah tamu harus bilangan bulat.",
  "A booking can take at most 500 guests.": "Satu reservasi maksimal 500 tamu.",
  "The contact email does not look like an email address.": "Email kontak tidak terlihat seperti alamat email.",
  "The video call link must start with https://.": "Tautan panggilan video harus diawali https://.",
};

export function checkBookingForm(f: BookingForm, today: string, lang: Lang = "en"): string | null {
  const error = checkBookingFormEn(f, today);
  return error && lang === "id" ? (BOOKING_FORM_ID[error] ?? error) : error;
}

function checkBookingFormEn(f: BookingForm, today: string): string | null {
  if (!f.title.trim()) return "Give the booking a title.";
  if (f.options.length === 0) return "Pick at least one date on the calendar.";
  if (f.options.some((o) => o.day < today)) return "A time in the past cannot be offered. Remove it from the calendar.";
  if (f.options.some((o) => o.start && o.end && o.end <= o.start)) return "Each time must end after it starts.";
  if (f.guestCount.trim() && !/^\d+$/.test(f.guestCount.trim())) return "The number of guests must be a whole number.";
  const guests = Number(f.guestCount.trim() || "0");
  if (guests > 500) return "A booking can take at most 500 guests.";
  if (f.contactEmail.trim() && !EMAIL.test(f.contactEmail.trim())) return "The contact email does not look like an email address.";
  if (f.videoLink.trim() && !/^https?:\/\//i.test(f.videoLink.trim())) return "The video call link must start with https://.";
  return null;
}

/* ------------------------------------------------------------------ reads */

export async function fetchBookings(): Promise<Booking[]> {
  return unwrap(await db().from("pf_booking_overview").select("*").order("created_at", { ascending: false }).limit(500)) as Booking[];
}

export async function fetchBooking(id: string) {
  const [booking, options, votes, invitees] = await Promise.all([
    db().from("pf_booking_overview").select("*").eq("id", id).maybeSingle(),
    db().from("pf_booking_option").select("*").eq("booking_id", id).order("day").order("start_at"),
    db().from("pf_booking_vote_overview").select("*").eq("booking_id", id),
    db().from("pf_booking_invitee_overview").select("*").eq("booking_id", id).order("full_name"),
  ]);
  return {
    booking: unwrap(booking) as Booking | null,
    options: unwrap(options) as BookingOption[],
    votes: unwrap(votes) as Vote[],
    invitees: unwrap(invitees) as Invitee[],
  };
}

/* ----------------------------------------------------------------- writes */

export async function saveBooking(id: string | null, f: BookingForm): Promise<string> {
  const guests = Number(f.guestCount.trim() || "0");
  return unwrap(
    await db().rpc("pf_booking_save", {
      target: id,
      new_title: f.title.trim(),
      new_kind: f.kind,
      new_space: f.space,
      new_place: f.placeNote,
      host: f.hostId || null,
      org: f.guestOrg,
      guests: guests > 0 ? guests : null,
      contact: f.contactName,
      phone: f.contactPhone,
      email: f.contactEmail,
      link: f.videoLink,
      about: f.description,
      maybe: f.allowMaybe,
      options: f.options,
      invitees: f.invitees,
      book_now: f.options.length === 1,
    }),
  ) as string;
}

export async function saveVotes(booking: string, answers: Record<string, Answer>) {
  check(await db().rpc("pf_booking_vote", { booking, answers }));
}

export async function confirmBooking(booking: string, chosen: string) {
  check(await db().rpc("pf_booking_confirm", { booking, chosen }));
}

export async function reopenBooking(booking: string) {
  check(await db().rpc("pf_booking_reopen", { booking }));
}

export async function cancelBooking(booking: string, why: string) {
  check(await db().rpc("pf_booking_cancel", { booking, why }));
}
