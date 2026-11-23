import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { addDays } from "../../lib/pf/facility";
import { auditActionLabel, auditSubject, auditTableLabel, fetchActorAudit, fetchMembers, type AuditEntry, type LabMember } from "../../lib/pf/foundation";
import { useLang, useT, type Bi, type Lang } from "../../lib/i18n";
import { LEAVE_STATUS, LEAVE_TYPES, attendanceFlags, optionLabel, cameLate, clockText, fetchContracts, fetchPeople, fetchPersonLabor, fetchPersonRecords, formatMinutes, personTypeLabel, savePersonDetails, timeOfDay, workedMinutes, type Attendance, type Contract, type LaborEntry, type Leave, type Person, type Shift } from "../../lib/pf/people";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { ContractSection, PersonAvatar, PersonEditor } from "./PeoplePage";
import { Card, Note, Rows, Segmented } from "./ui";

// One person's page, for whoever looks after the team: who they are, how to reach them,
// when they came, what they are scheduled for, and what they have been doing. Contract
// terms still open only for HR staff, Leadership and the person themselves.

type T = <V>(copy: Bi<V>) => V;

type Tab = "overview" | "attendance" | "schedule" | "activity" | "contracts";

const WINDOW_DAYS = 30;
const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

/** The newest contract already started and not yet over. */
const currentContract = (rows: readonly Contract[], today: string) => rows.filter((c) => c.start_date <= today && (!c.end_date || c.end_date >= today)).sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null;

function DetailsEditor({ person, onDone }: { person: Person; onDone: (saved: boolean) => void }) {
  const [email, setEmail] = useState(person.email ?? "");
  const [address, setAddress] = useState(person.address ?? "");
  const [emergency, setEmergency] = useState(person.emergency_contact ?? "");
  const [skills, setSkills] = useState(person.skills ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");
  const action = useAction();
  const t = useT();
  const submit = async () => {
    if (await action.run(() => savePersonDetails(person.id, { email, address, emergency, skills, notes }))) onDone(true);
  };
  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{t({ en: "Edit details", id: "Ubah detail" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Email", id: "Email" })}><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t({ en: "Address", id: "Alamat" })}><input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label={t({ en: "Emergency contact", id: "Kontak darurat" })} hint={t({ en: "A name and a phone number.", id: "Nama dan nomor telepon." })}><input className={inputClass} value={emergency} onChange={(e) => setEmergency(e.target.value)} /></Field>
        <Field label={t({ en: "Skills", id: "Keahlian" })} hint={t({ en: "Separate with commas: nursery work, nutrient mixing, harvesting.", id: "Pisahkan dengan koma: pembibitan, peracikan nutrisi, panen." })}><input className={inputClass} value={skills} onChange={(e) => setSkills(e.target.value)} /></Field>
        <Field label={t({ en: "Notes", id: "Catatan" })}><textarea rows={3} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function AttendanceChip({ record }: { record: Attendance }) {
  const t = useT();
  if (record.missed_out) return <Chip label={t({ en: "Missed clock-out", id: "Lupa absen pulang" })} className="bg-[#FFF6E5] text-[#8A5A07]" />;
  if (cameLate(record)) return <Chip label={t({ en: "Late", id: "Terlambat" })} className="bg-[#FFF6E5] text-[#8A5A07]" />;
  if (!record.clock_out) return <Chip label={t({ en: "Still in", id: "Masih di lokasi" })} className="bg-[#E3F4F4] text-[#0B6477]" />;
  return <Chip label={t({ en: "On time", id: "Tepat waktu" })} className="bg-[#E3F7F0] text-[#0E7A5C]" />;
}

const attendanceColumns = (t: T, lang: Lang): Column<Attendance>[] => [
  { key: "date", label: t({ en: "Date", id: "Tanggal" }), phone: "title", sort: (a, b) => a.work_date.localeCompare(b.work_date), cell: (a) => <CellTitle title={formatLongDate(a.work_date, lang)} sub={a.source === "manual" ? t({ en: "Recorded by hand", id: "Dicatat manual" }) : undefined} /> },
  { key: "in", label: t({ en: "In", id: "Masuk" }), track: "80px", cell: (a) => <span className="tabular-nums">{timeOfDay(a.clock_in)}</span> },
  { key: "out", label: t({ en: "Out", id: "Pulang" }), track: "80px", cell: (a) => <span className="tabular-nums">{a.clock_out ? timeOfDay(a.clock_out) : "-"}</span> },
  { key: "hours", label: t({ en: "Worked", id: "Durasi" }), track: "120px", align: "right", sort: (a, b) => (workedMinutes(a) ?? 0) - (workedMinutes(b) ?? 0), cell: (a) => { const m = workedMinutes(a); return <span className="tabular-nums">{m === null ? "-" : formatMinutes(m, lang)}</span>; } },
  { key: "state", label: t({ en: "Status", id: "Status" }), track: "150px", cell: (a) => <AttendanceChip record={a} /> },
  { key: "flags", label: t({ en: "To check", id: "Perlu dicek" }), phone: "hidden", cell: (a) => { const flags = attendanceFlags(a, lang); return <span className={`block truncate text-[13px] ${flags.length ? "font-medium text-[#8A5A07]" : ""}`}>{flags.join(" · ") || "-"}</span>; } },
];

const shiftColumns = (t: T, lang: Lang): Column<Shift>[] => [
  { key: "date", label: t({ en: "Date", id: "Tanggal" }), phone: "title", sort: (a, b) => a.work_date.localeCompare(b.work_date), cell: (s) => <CellTitle title={formatLongDate(s.work_date, lang)} /> },
  { key: "time", label: t({ en: "Time", id: "Jam" }), track: "130px", cell: (s) => <span className="tabular-nums">{clockText(s.start_at)}–{clockText(s.end_at)}</span> },
  { key: "area", label: t({ en: "Work area", id: "Area kerja" }), cell: (s) => <span className="block truncate text-[13px]">{s.area_name ?? t({ en: "Any work area", id: "Area kerja mana pun" })}</span> },
];

const leaveColumns = (t: T, lang: Lang): Column<Leave>[] => [
  { key: "type", label: t({ en: "Type", id: "Jenis" }), track: "110px", phone: "title", cell: (l) => <span className="font-medium text-[#0F2F36]">{optionLabel(LEAVE_TYPES.find((o) => o.key === l.type), lang)}</span> },
  { key: "date", label: t({ en: "Dates", id: "Tanggal" }), sort: (a, b) => a.start_date.localeCompare(b.start_date), cell: (l) => <span className="text-[13px]">{formatLongDate(l.start_date, lang)}{l.end_date !== l.start_date ? ` ${t({ en: "to", id: "s.d." })} ${formatLongDate(l.end_date, lang)}` : ""}</span> },
  { key: "reason", label: t({ en: "Reason", id: "Alasan" }), phone: "hidden", cell: (l) => <span className="block truncate text-[13px]">{l.reason || "-"}</span> },
  { key: "status", label: t({ en: "Status", id: "Status" }), track: "120px", cell: (l) => <Chip label={optionLabel(LEAVE_STATUS[l.status], lang)!} className={LEAVE_STATUS[l.status].className} /> },
];

type Activity = { key: string; at: string; title: string; sub: string; link: string | null };

function activityOf(labor: readonly LaborEntry[], audit: readonly AuditEntry[], lang: Lang): Activity[] {
  const work = labor.map((l): Activity => ({ key: `l${l.id}`, at: `${l.work_date}T12:00:00+07:00`, title: l.activity || (lang === "id" ? "Pekerjaan pada batch" : "Work on a batch"), sub: `${l.batch_code} · ${formatMinutes(l.minutes, lang)}`, link: `/erp/batch/${l.batch_id}` }));
  const changes = audit.map((e): Activity => ({ key: `a${e.id}`, at: e.at, title: `${auditActionLabel(e.action, lang)}: ${auditTableLabel(e.table_name, lang)}`, sub: auditSubject(e, lang), link: null }));
  return [...work, ...changes].sort((a, b) => b.at.localeCompare(a.at));
}

function ActivityList({ items, limit }: { items: Activity[]; limit?: number }) {
  const t = useT();
  const lang = useLang();
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) return <p className="px-4 py-6 text-center text-[14px] text-[#4F6B73]">{t({ en: "No activity recorded yet.", id: "Belum ada aktivitas tercatat." })}</p>;
  return (
    <ol>
      {shown.map((a) => {
        const inner = (
          <>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#14919B]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-[#0F2F36]">{a.title}</span>
              <span className="block truncate text-[13px] text-[#4F6B73]">{a.sub}</span>
            </span>
            <span className="shrink-0 text-[12.5px] tabular-nums text-[#4F6B73]">{a.key.startsWith("l") ? formatLongDate(a.at.slice(0, 10), lang) : formatDateTime(a.at, lang)}</span>
          </>
        );
        const cls = "flex items-start gap-3 border-t border-[#EDF2F2] px-4 py-2.5 first:border-0";
        return <li key={a.key}>{a.link ? <Link to={a.link} className={`${cls} hover:bg-[#F3F7F6]`}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
      })}
    </ol>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white p-4">
      <p className="text-[12px] font-medium tracking-[0.03em] text-[#4F6B73]">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-[#0F2F36]">{value}</p>
      <p className="mt-1.5 text-[12.5px] text-[#4F6B73]">{sub}</p>
    </div>
  );
}

function hoursText(minutes: number, lang: Lang) {
  return `${Math.round(minutes / 60).toLocaleString(lang === "id" ? "id-ID" : "en-GB")} ${lang === "id" ? "jam" : "h"}`;
}

export default function PersonProfilePage({ id }: { id: string }) {
  const today = jakartaToday();
  const t = useT();
  const lang = useLang();
  const { canManagePeople, canReadPeople, canReadPrivate, canWriteContracts } = useErpAccess();
  const base = useLoad(async () => {
    const [people, members] = await Promise.all([fetchPeople(), fetchMembers().catch(() => [] as LabMember[])]);
    return { people, members };
  }, []);
  const person = base.data?.people.find((p) => p.id === id) ?? null;
  const profileId = person?.profile_id ?? null;
  const records = useLoad(async () => {
    const [own, labor, audit, contracts] = await Promise.all([
      fetchPersonRecords(id),
      fetchPersonLabor(id),
      profileId ? fetchActorAudit(profileId) : Promise.resolve([] as AuditEntry[]),
      canReadPrivate ? fetchContracts(id).catch(() => [] as Contract[]) : Promise.resolve([] as Contract[]),
    ]);
    return { ...own, labor, audit, contracts };
  }, [id, profileId, canReadPrivate]);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState<"person" | "details" | null>(null);

  const activity = useMemo(() => activityOf(records.data?.labor ?? [], records.data?.audit ?? [], lang), [records.data, lang]);

  const back = <Link to="/erp/people" className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> {t({ en: "All people", id: "Semua personel" })}</Link>;

  if (!canReadPeople) {
    return <ErpPage eyebrow={t({ en: "Team", id: "Tim" })} title={t({ en: "Profile", id: "Profil" })}><Note>{t({ en: "This page is for HR staff, Production managers, Admins and Leadership.", id: "Halaman ini untuk Staf SDM, Manajer produksi, Admin, dan Pimpinan." })}</Note></ErpPage>;
  }

  return (
    <ErpPage eyebrow={t({ en: "Team", id: "Tim" })} title={person?.full_name ?? t({ en: "Profile", id: "Profil" })} actions={back}>
      <DataState state={base}>
        {({ people, members }) => {
          if (!person) return <Note>{t({ en: "This person could not be found.", id: "Personel ini tidak ditemukan." })}</Note>;
          const member = members.find((m) => m.id === person.profile_id);
          const skills = (person.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
          const from = addDays(today, -WINDOW_DAYS);
          return (
            <div className="space-y-4">
              <Card className="p-4 md:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <PersonAvatar name={person.full_name} url={member?.avatar_url} size={72} />
                  <div className="min-w-0 flex-1 basis-[260px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip label={person.status === "aktif" ? t({ en: "Active", id: "Aktif" }) : t({ en: "Inactive", id: "Nonaktif" })} className={person.status === "aktif" ? "bg-[#E3F7F0] text-[#0E7A5C]" : undefined} />
                      <span className="text-[14px] text-[#36525A]">{personTypeLabel(person.person_type, lang)}</span>
                      {records.data && (() => { const c = currentContract(records.data.contracts, today); return c?.position ? <span className="text-[14px] text-[#36525A]">· {c.position}</span> : null; })()}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-[#36525A]">
                      {person.phone && <a href={`tel:${person.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#0B6477]"><Phone className="h-3.5 w-3.5" /><span className="tabular-nums">{person.phone}</span></a>}
                      {person.email && <a href={`mailto:${person.email}`} className="inline-flex items-center gap-1.5 hover:text-[#0B6477]"><Mail className="h-3.5 w-3.5" />{person.email}</a>}
                      {person.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{person.address}</span>}
                    </div>
                    {skills.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{skills.map((s) => <span key={s} className="rounded-full bg-[#EEF5F5] px-2.5 py-1 text-xs font-medium text-[#0B6477]">{s}</span>)}</div>}
                  </div>
                  {canManagePeople && editing === null && (
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton onClick={() => setEditing("details")}>{t({ en: "Edit details", id: "Ubah detail" })}</SecondaryButton>
                      <SecondaryButton onClick={() => setEditing("person")}>{t({ en: "Edit employment", id: "Ubah kepegawaian" })}</SecondaryButton>
                    </div>
                  )}
                </div>
              </Card>

              {editing === "person" && <PersonEditor person={person} people={people} members={members} onDone={(saved) => { setEditing(null); if (saved) void base.reload(); }} />}
              {editing === "details" && <DetailsEditor person={person} onDone={(saved) => { setEditing(null); if (saved) void base.reload(); }} />}

              <DataState state={records}>
                {({ attendance, shifts, leaves, labor }) => {
                  const recent = attendance.filter((a) => a.work_date >= from);
                  const days = new Set(recent.map((a) => a.work_date)).size;
                  const late = recent.filter(cameLate).length;
                  const worked = recent.reduce((n, a) => n + (workedMinutes(a) ?? 0), 0);
                  const onBatches = labor.filter((l) => l.work_date >= from).reduce((n, l) => n + l.minutes, 0);
                  const upcoming = shifts.filter((s) => s.work_date >= today).sort((a, b) => a.work_date.localeCompare(b.work_date));
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-px overflow-clip rounded-2xl border border-[#0B6477]/12 bg-[#0B6477]/12 lg:grid-cols-4">
                        <Stat label={t({ en: "Days present", id: "Hari hadir" })} value={`${days}`} sub={t({ en: `last ${WINDOW_DAYS} days`, id: `${WINDOW_DAYS} hari terakhir` })} />
                        <Stat label={t({ en: "Late arrivals", id: "Terlambat" })} value={`${late}`} sub={t({ en: `last ${WINDOW_DAYS} days`, id: `${WINDOW_DAYS} hari terakhir` })} />
                        <Stat label={t({ en: "Hours worked", id: "Jam kerja" })} value={hoursText(worked, lang)} sub={t({ en: "from clock-in and clock-out", id: "dari absen masuk dan pulang" })} />
                        <Stat label={t({ en: "Hours on batches", id: "Jam di batch" })} value={hoursText(onBatches, lang)} sub={t({ en: "logged against a batch", id: "dicatat pada batch" })} />
                      </div>

                      <Segmented value={tab} onChange={setTab} options={[{ key: "overview", label: t({ en: "Overview", id: "Ringkasan" }) }, { key: "attendance", label: t({ en: "Attendance", id: "Presensi" }) }, { key: "schedule", label: t({ en: "Schedule and leave", id: "Jadwal dan izin" }) }, { key: "activity", label: t({ en: "Activity", id: "Aktivitas" }) }, { key: "contracts", label: t({ en: "Contracts", id: "Kontrak" }) }]} />

                      {tab === "overview" && (
                        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                          <Card className="p-4">
                            <h2 className={`${sectionTitle} mb-3`}>{t({ en: "Details", id: "Detail" })}</h2>
                            <Rows rows={[
                              [t({ en: "Type", id: "Jenis" }), personTypeLabel(person.person_type, lang)],
                              [t({ en: "Supervisor", id: "Atasan" }), person.supervisor_name ?? "-"],
                              [t({ en: "Joined", id: "Bergabung" }), person.joined_on ? formatLongDate(person.joined_on, lang) : "-"],
                              [t({ en: "Left", id: "Keluar" }), person.left_on ? formatLongDate(person.left_on, lang) : "-"],
                              [t({ en: "Login", id: "Login" }), person.has_account ? t({ en: "Connected", id: "Terhubung" }) : t({ en: "None", id: "Tidak ada" })],
                              [t({ en: "Emergency contact", id: "Kontak darurat" }), person.emergency_contact || "-"],
                            ]} />
                            {person.notes && <p className="mt-3 border-t border-[#EDF2F2] pt-3 text-[13.5px] leading-[1.5] text-[#36525A]">{person.notes}</p>}
                          </Card>
                          <div className="min-w-0 space-y-4">
                            <Card>
                              <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2">
                                <h2 className={sectionTitle}>{t({ en: "Recent activity", id: "Aktivitas terbaru" })}</h2>
                                {activity.length > 5 && <button type="button" onClick={() => setTab("activity")} className="text-[13px] font-medium text-[#0B6477] hover:underline">{t({ en: "See all", id: "Lihat semua" })}</button>}
                              </div>
                              <div className="border-t border-[#EDF2F2]"><ActivityList items={activity} limit={5} /></div>
                            </Card>
                            <Card>
                              <h2 className={`${sectionTitle} px-4 pt-3 pb-2`}>{t({ en: "Next shifts", id: "Shift berikutnya" })}</h2>
                              {upcoming.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">{t({ en: "Nothing scheduled.", id: "Belum ada jadwal." })}</p> : (
                                <ul>
                                  {upcoming.slice(0, 5).map((s) => (
                                    <li key={s.id} className="flex items-center justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                                      <span className="text-[#0F2F36]">{formatLongDate(s.work_date, lang)}</span>
                                      <span className="tabular-nums text-[#4F6B73]">{clockText(s.start_at)}–{clockText(s.end_at)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </Card>
                          </div>
                        </div>
                      )}

                      {tab === "attendance" && <DataTable rows={attendance} rowKey={(a) => a.id} noun={t({ en: "records", id: "catatan" })} columns={attendanceColumns(t, lang)} empty={t({ en: "No attendance recorded yet.", id: "Belum ada presensi tercatat." })} pills={[{ key: "late", label: t({ en: "Late", id: "Terlambat" }), dot: "#E0A100", match: cameLate }, { key: "missed", label: t({ en: "Missed clock-out", id: "Lupa absen pulang" }), dot: "#E0A100", match: (a) => a.missed_out }]} />}

                      {tab === "schedule" && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h2 className={sectionTitle}>{t({ en: "Shifts", id: "Shift" })}</h2>
                            <DataTable rows={shifts} rowKey={(s) => s.id} noun={t({ en: "shifts", id: "shift" })} columns={shiftColumns(t, lang)} empty={t({ en: "No shifts yet.", id: "Belum ada shift." })} initialPill="next" pills={[{ key: "next", label: t({ en: "Coming up", id: "Mendatang" }), dot: "#14919B", match: (s) => s.work_date >= today }, { key: "past", label: t({ en: "Past", id: "Lewat" }), dot: "#8FA3A8", match: (s) => s.work_date < today }]} />
                          </div>
                          <div className="space-y-2">
                            <h2 className={sectionTitle}>{t({ en: "Leave", id: "Izin" })}</h2>
                            <DataTable rows={leaves} rowKey={(l) => l.id} noun={t({ en: "requests", id: "pengajuan" })} columns={leaveColumns(t, lang)} empty={t({ en: "No leave requests yet.", id: "Belum ada pengajuan izin." })} />
                          </div>
                        </div>
                      )}

                      {tab === "activity" && <Card><ActivityList items={activity} /></Card>}

                      {tab === "contracts" && (canReadPrivate ? (
                        <Card className="p-4"><ContractSection person={person} canEdit={canWriteContracts} /></Card>
                      ) : <Note>{t({ en: "Contracts open only for HR staff, Leadership and the person themselves.", id: "Kontrak hanya terbuka untuk Staf SDM, Pimpinan, dan personel itu sendiri." })}</Note>)}
                    </div>
                  );
                }}
              </DataState>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
