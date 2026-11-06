import { addDays } from "./facility";
import { check, db, unwrap } from "./foundation";

// People (supabase/pf-hr.sql): who works here, contracts, schedules, leave, attendance
// and hours per batch. Location and photo are taken only at clock-in and clock-out, and
// only after the person has agreed. What each role may see is enforced by RLS.

/* -------------------------------------------------------------------- types */

export const PERSON_TYPES = [
  { key: "karyawan", label: "Karyawan" },
  { key: "peneliti", label: "Peneliti" },
  { key: "mahasiswa", label: "Mahasiswa" },
  { key: "magang", label: "Magang" },
  { key: "harian", label: "Pekerja harian" },
] as const;
export type PersonType = (typeof PERSON_TYPES)[number]["key"];
export const personTypeLabel = (key: string) => PERSON_TYPES.find((t) => t.key === key)?.label ?? key;

export type Person = {
  id: string;
  profile_id: string | null;
  full_name: string;
  person_type: PersonType;
  supervisor_id: string | null;
  supervisor_name: string | null;
  phone: string;
  joined_on: string | null;
  left_on: string | null;
  status: "aktif" | "nonaktif";
  has_account: boolean;
};

export const CONTRACT_TYPES = [
  { key: "tetap", label: "Tetap" },
  { key: "kontrak", label: "Kontrak" },
  { key: "magang", label: "Magang" },
  { key: "harian", label: "Harian" },
  { key: "lainnya", label: "Lainnya" },
] as const;
export const RATE_BASES = [
  { key: "bulan", label: "per bulan" },
  { key: "hari", label: "per hari" },
  { key: "jam", label: "per jam" },
] as const;

export type Contract = { id: string; person_id: string; type: string; position: string; start_date: string; end_date: string | null; rate_idr: number | null; rate_basis: string; notes: string };

export type WorkArea = { id: string; name: string; lat: number; lng: number; radius_m: number; active: boolean };

export type Shift = { id: string; person_id: string; full_name: string; work_date: string; start_at: string; end_at: string; area_id: string | null; area_name: string | null; notes: string };

export const LEAVE_TYPES = [
  { key: "izin", label: "Izin" },
  { key: "sakit", label: "Sakit" },
  { key: "cuti", label: "Cuti" },
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number]["key"];
export type LeaveStatus = "diajukan" | "disetujui" | "ditolak" | "batal";
export const LEAVE_STATUS: Record<LeaveStatus, { label: string; className: string }> = {
  diajukan: { label: "Menunggu", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  disetujui: { label: "Disetujui", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  ditolak: { label: "Ditolak", className: "bg-[#FDECEA] text-[#B3362C]" },
  batal: { label: "Dibatalkan", className: "bg-[#EEF3F4] text-[#4F6B73]" },
};
export type Leave = { id: string; person_id: string; full_name: string; type: LeaveType; start_date: string; end_date: string; reason: string; status: LeaveStatus; decide_note: string };

export type Attendance = {
  id: string;
  person_id: string;
  full_name: string;
  shift_id: string | null;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  in_accuracy_m: number | null;
  in_within_area: boolean | null;
  out_within_area: boolean | null;
  in_photo_path: string | null;
  out_photo_path: string | null;
  missed_out: boolean;
  source: "ponsel" | "manual";
  note: string;
  photos_removed_at: string | null;
  start_at: string | null;
  end_at: string | null;
};

export type LaborEntry = { id: string; person_id: string; full_name: string; batch_id: string; batch_code: string; work_date: string; minutes: number; activity: string };

/* -------------------------------------------------------------------- rules */

/** Minutes past the scheduled start before someone counts as late or missing. */
export const GRACE_MINUTES = 10;

export const clockText = (t: string) => t.slice(0, 5).replace(":", ".");

export const timeOfDay = (iso: string) => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));

const jakartaMinutes = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(d).split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
};
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} jam ${m} menit` : h ? `${h} jam` : `${m} menit`;
};

export type RosterState = "hadir" | "terlambat" | "belum_datang" | "tidak_hadir" | "izin" | "tanpa_jadwal";

export const ROSTER_STATE: Record<RosterState, { label: string; className: string }> = {
  hadir: { label: "Hadir", className: "bg-[#E3F7F0] text-[#0E7A5C]" },
  terlambat: { label: "Terlambat", className: "bg-[#FFF6E5] text-[#8A5A07]" },
  belum_datang: { label: "Belum waktunya", className: "bg-[#EEF3F4] text-[#4F6B73]" },
  tidak_hadir: { label: "Belum absen", className: "bg-[#FDECEA] text-[#B3362C]" },
  izin: { label: "Izin", className: "bg-[#E3F4F4] text-[#0B6477]" },
  tanpa_jadwal: { label: "Tanpa jadwal", className: "bg-[#EEF3F4] text-[#4F6B73]" },
};

export type RosterRow = { key: string; personId: string; name: string; state: RosterState; shift: Shift | null; attendance: Attendance | null; leave: Leave | null; flags: string[] };

/** What to check about one attendance record. An unknown location is said to be unknown, not called outside. */
export function attendanceFlags(a: Pick<Attendance, "in_within_area" | "out_within_area" | "missed_out" | "source" | "clock_out">) {
  const flags: string[] = [];
  if (a.in_within_area === false) flags.push("Masuk di luar area");
  if (a.out_within_area === false) flags.push("Pulang di luar area");
  if (a.source === "ponsel" && a.in_within_area === null) flags.push("Lokasi masuk tidak diketahui");
  if (a.source === "ponsel" && a.clock_out && a.out_within_area === null) flags.push("Lokasi pulang tidak diketahui");
  if (a.missed_out) flags.push("Lupa absen pulang");
  if (a.source === "manual") flags.push("Dicatat manual");
  return flags;
}

/** One day: everyone scheduled, plus anyone who came without a schedule. */
export function buildRoster(date: string, today: string, now: Date, shifts: readonly Shift[], attendance: readonly Attendance[], leaves: readonly Leave[]): RosterRow[] {
  const dayShifts = shifts.filter((s) => s.work_date === date).sort((a, b) => a.start_at.localeCompare(b.start_at) || a.full_name.localeCompare(b.full_name));
  const day = attendance.filter((a) => a.work_date === date);
  const onLeave = (person: string) => leaves.find((l) => l.person_id === person && l.status === "disetujui" && l.start_date <= date && l.end_date >= date) ?? null;
  const nowMinutes = jakartaMinutes(now);

  const rows: RosterRow[] = dayShifts.map((shift) => {
    const record = day.find((a) => a.shift_id === shift.id) ?? null;
    const leave = onLeave(shift.person_id);
    let state: RosterState;
    if (record) state = jakartaMinutes(new Date(record.clock_in)) > minutesOf(shift.start_at) + GRACE_MINUTES ? "terlambat" : "hadir";
    else if (leave) state = "izin";
    else if (date > today || (date === today && nowMinutes <= minutesOf(shift.start_at) + GRACE_MINUTES)) state = "belum_datang";
    else state = "tidak_hadir";
    return { key: shift.id, personId: shift.person_id, name: shift.full_name, state, shift, attendance: record, leave, flags: record ? attendanceFlags(record) : [] };
  });
  for (const record of day.filter((a) => !a.shift_id || !dayShifts.some((s) => s.id === a.shift_id))) {
    rows.push({ key: record.id, personId: record.person_id, name: record.full_name, state: "tanpa_jadwal", shift: null, attendance: record, leave: null, flags: attendanceFlags(record) });
  }
  return rows;
}

/** Monday of the week a date falls in. */
export function weekStart(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** Every date in a range on the chosen weekdays (0 is Sunday). */
export function datesOnWeekdays(from: string, to: string, weekdays: readonly number[], limit = 92) {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < limit; d = addDays(d, 1)) {
    if (weekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay())) out.push(d);
  }
  return out;
}

export function parseShiftForm(personId: string, from: string, to: string, weekdays: readonly number[], start: string, end: string) {
  if (!personId) return { error: "Pilih orang." } as const;
  if (!from || !to || to < from) return { error: "Tanggal sampai sebelum tanggal mulai." } as const;
  if (!start || !end || end <= start) return { error: "Jam selesai harus setelah jam mulai." } as const;
  const dates = datesOnWeekdays(from, to, weekdays);
  if (dates.length === 0) return { error: "Tidak ada tanggal yang cocok dengan hari yang dipilih." } as const;
  return { error: null, dates } as const;
}

export function parseDuration(hours: string, minutes: string) {
  const h = hours.trim() === "" ? 0 : Number(hours.trim().replace(",", "."));
  const m = minutes.trim() === "" ? 0 : Number(minutes.trim());
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return { error: "Durasi harus berupa angka." } as const;
  const total = Math.round(h * 60 + m);
  if (total < 1 || total > 960) return { error: "Durasi harus antara 1 menit dan 16 jam." } as const;
  return { error: null, minutes: total } as const;
}

export function parseArea(name: string, lat: string, lng: string, radius: string) {
  if (!name.trim()) return { error: "Nama lokasi wajib diisi." } as const;
  const la = Number(lat.trim().replace(",", "."));
  const ln = Number(lng.trim().replace(",", "."));
  if (lat.trim() === "" || !Number.isFinite(la) || la < -90 || la > 90) return { error: "Lintang harus antara -90 dan 90." } as const;
  if (lng.trim() === "" || !Number.isFinite(ln) || ln < -180 || ln > 180) return { error: "Bujur harus antara -180 dan 180." } as const;
  const r = Number(radius.trim());
  if (!Number.isInteger(r) || r < 10 || r > 5000) return { error: "Radius harus antara 10 dan 5000 meter." } as const;
  return { error: null, lat: la, lng: ln, radius: r } as const;
}

/** Which contracts need attention: ending within this many days, and not yet over. */
export const contractEndingSoon = (c: Pick<Contract, "end_date">, today: string, days = 30) => !!c.end_date && c.end_date >= today && c.end_date <= addDays(today, days);

/* ------------------------------------------------------------- data access */

const numbers = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const copy = { ...row };
  for (const k of keys) if (copy[k] !== null && copy[k] !== undefined) (copy[k] as unknown) = Number(copy[k]);
  return copy;
};

const PHOTO_BUCKET = "pf-attendance";

export async function fetchPeople(): Promise<Person[]> {
  return unwrap(await db().from("pf_person_overview").select("*").order("full_name").limit(500)) as Person[];
}

export async function fetchMyPersonId(): Promise<string | null> {
  return unwrap(await db().rpc("pf_my_person_id")) as string | null;
}

export async function fetchContracts(person: string): Promise<Contract[]> {
  const rows = unwrap(await db().from("pf_contract").select("id,person_id,type,position,start_date,end_date,rate_idr,rate_basis,notes").eq("person_id", person).order("start_date", { ascending: false })) as Contract[];
  return rows.map((c) => numbers(c, ["rate_idr"]));
}

export async function fetchAllContracts(): Promise<Contract[]> {
  const rows = unwrap(await db().from("pf_contract").select("id,person_id,type,position,start_date,end_date,rate_idr,rate_basis,notes").limit(1000)) as Contract[];
  return rows.map((c) => numbers(c, ["rate_idr"]));
}

export async function fetchWorkAreas(): Promise<WorkArea[]> {
  const rows = unwrap(await db().from("pf_work_area").select("id,name,lat,lng,radius_m,active").order("name")) as WorkArea[];
  return rows.map((a) => numbers(a, ["lat", "lng"]));
}

/** The newest 2000, which covers months of a small team. Each page picks its own dates out of this. */
export async function fetchShifts(): Promise<Shift[]> {
  return unwrap(await db().from("pf_shift_overview").select("*").order("work_date", { ascending: false }).limit(2000)) as Shift[];
}

export async function fetchAttendance(): Promise<Attendance[]> {
  const rows = unwrap(await db().from("pf_attendance_overview").select("*").order("clock_in", { ascending: false }).limit(1000)) as Attendance[];
  return rows.map((a) => numbers(a, ["in_accuracy_m"]));
}

export async function fetchLeaves(): Promise<Leave[]> {
  return unwrap(await db().from("pf_leave_overview").select("*").order("created_at", { ascending: false }).limit(500)) as Leave[];
}

export async function fetchConsent(person: string): Promise<{ accepted_at: string; withdrawn_at: string | null } | null> {
  const rows = unwrap(await db().from("pf_attendance_consent").select("accepted_at,withdrawn_at").eq("person_id", person).limit(1)) as { accepted_at: string; withdrawn_at: string | null }[];
  return rows[0] ?? null;
}

export async function fetchBatchLabor(batch: string): Promise<LaborEntry[]> {
  return unwrap(await db().from("pf_labor_overview").select("*").eq("batch_id", batch).order("work_date", { ascending: false }).limit(200)) as LaborEntry[];
}

export async function savePerson(id: string | null, f: { account: string; name: string; type: PersonType; supervisor: string; phone: string; joined: string; left: string; status: Person["status"] }): Promise<string> {
  return unwrap(await db().rpc("pf_person_save", { target: id, account: f.account || null, new_name: f.name, new_type: f.type, supervisor: f.supervisor || null, new_phone: f.phone, joined: f.joined || null, left_day: f.left || null, new_status: f.status })) as string;
}

export async function saveContract(person: string, f: { type: string; position: string; start: string; end: string; rate: number | null; basis: string }) {
  check(await db().rpc("pf_contract_save", { target: null, person, new_type: f.type, new_position: f.position, starts: f.start, ends: f.end || null, rate: f.rate, basis: f.basis, new_notes: "" }));
}

export async function saveWorkArea(id: string | null, name: string, lat: number, lng: number, radius: number, active = true) {
  check(await db().rpc("pf_work_area_save", { target: id, new_name: name, new_lat: lat, new_lng: lng, radius, is_active: active }));
}

export async function addShifts(person: string, dates: readonly string[], start: string, end: string, area: string): Promise<number> {
  return unwrap(await db().rpc("pf_shift_add", { person, dates, starts: start, ends: end, area: area || null, new_notes: "" })) as number;
}

export async function removeShift(shift: string) {
  check(await db().rpc("pf_shift_remove", { shift }));
}

export async function requestLeave(person: string | null, type: LeaveType, start: string, end: string, why: string) {
  check(await db().rpc("pf_leave_request", { person, new_type: type, starts: start, ends: end, why }));
}

export async function decideLeave(leave: string, approve: boolean, note: string) {
  check(await db().rpc("pf_leave_decide", { leave, approve, note }));
}

export async function cancelLeave(leave: string) {
  check(await db().rpc("pf_leave_cancel", { leave }));
}

export async function acceptConsent() {
  check(await db().rpc("pf_consent_accept"));
}

export async function withdrawConsent() {
  check(await db().rpc("pf_consent_withdraw"));
}

export type Fix = { lat: number; lng: number; accuracy: number } | null;

export async function uploadPhoto(person: string, photo: Blob): Promise<string> {
  const path = `${person}/${crypto.randomUUID()}.jpg`;
  const { error } = await db().storage.from(PHOTO_BUCKET).upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Foto gagal diunggah: ${error.message}`);
  return path;
}

export async function clockIn(fix: Fix, photo: string, note: string) {
  check(await db().rpc("pf_clock_in", { at_lat: fix?.lat ?? null, at_lng: fix?.lng ?? null, accuracy: fix?.accuracy ?? null, photo, new_note: note }));
}

export async function clockOut(fix: Fix, photo: string, note: string) {
  check(await db().rpc("pf_clock_out", { at_lat: fix?.lat ?? null, at_lng: fix?.lng ?? null, accuracy: fix?.accuracy ?? null, photo, new_note: note }));
}

export async function addManualAttendance(person: string, came: string, went: string, why: string) {
  check(await db().rpc("pf_attendance_manual", { person, came, went: went || null, why }));
}

export async function correctAttendance(attendance: string, came: string, went: string, why: string) {
  check(await db().rpc("pf_attendance_correct", { attendance, came, went: went || null, why }));
}

export async function photoLink(path: string): Promise<string> {
  const { data, error } = await db().storage.from(PHOTO_BUCKET).createSignedUrl(path, 60);
  if (error || !data) throw new Error("Foto tidak bisa dibuka. Mungkin sudah lewat masa simpan.");
  return data.signedUrl;
}

/** Removes photos past retention. Run when Staf SDM opens attendance; returns how many records were cleared. */
export async function sweepExpiredPhotos(): Promise<number> {
  const expired = unwrap(await db().rpc("pf_photos_expired")) as { id: string; paths: string[] }[];
  if (expired.length === 0) return 0;
  const { error } = await db().storage.from(PHOTO_BUCKET).remove(expired.flatMap((e) => e.paths));
  if (error) throw new Error(`Foto lama gagal dihapus: ${error.message}`);
  check(await db().rpc("pf_photos_mark_removed", { attendances: expired.map((e) => e.id) }));
  return expired.length;
}

export async function addLabor(person: string | null, batch: string, workDate: string, minutes: number, activity: string) {
  check(await db().rpc("pf_labor_add", { person, batch, worked: workDate, mins: minutes, what: activity }));
}

export async function removeLabor(entry: string) {
  check(await db().rpc("pf_labor_remove", { entry }));
}

/* ----------------------------------------------------------- on the device */

/** The phone's position right now, once. Null when it cannot or may not say: attendance is still recorded, and marked unknown. */
export function currentFix(timeoutMs = 10_000): Promise<Fix> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)), accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** Shrinks a camera photo to what a check needs: a face at 720px is enough, and it uploads over poor signal. */
export async function compressPhoto(file: Blob, maxSide = 720): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Foto gagal diproses"))), "image/jpeg", 0.7));
}
