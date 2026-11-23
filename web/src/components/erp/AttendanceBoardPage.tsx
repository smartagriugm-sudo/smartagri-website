import { useEffect, useState } from "react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { addDays } from "../../lib/pf/facility";
import { useLang, useT } from "../../lib/i18n";
import { LEAVE_STATUS, LEAVE_TYPES, ROSTER_STATE, addManualAttendance, optionLabel, buildRoster, clockText, correctAttendance, decideLeave, fetchAttendance, fetchLeaves, fetchPeople, fetchShifts, photoLink, sweepExpiredPhotos, timeOfDay, type Attendance, type Leave, type RosterRow } from "../../lib/pf/people";
import { ActionNote, DataState, ErpPage, ErrorNote, Field, PrimaryButton, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Disclosure, Note, Segmented } from "./ui";

// Who came, for coordinators. Flags point at what a person should look at: outside the
// area, an unknown location, a missed clock-out. Nothing here decides on its own, because
// a phone's location can be faked and a photo proves nothing without someone looking.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const textButton = "min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";

/** A local datetime box's value for a stored moment, in the lab's time. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return d.toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? `${value}:00+07:00` : "");

function PhotoButton({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const action = useAction();
  const t = useT();
  const lang = useLang();
  if (url) return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="h-24 w-24 rounded-lg border border-[#DCE7E8] object-cover" /></a>;
  return (
    <button type="button" disabled={action.busy} onClick={() => void action.run(async () => setUrl(await photoLink(path, lang)))} className={textButton}>
      {action.busy ? t({ en: "Opening…", id: "Membuka…" }) : label}
      {action.error && <span className="block text-[13px] font-normal text-[#8A5A07]">{action.error}</span>}
    </button>
  );
}

function CorrectForm({ record, onDone }: { record: Attendance; onDone: () => Promise<void> }) {
  const [came, setCame] = useState(toLocalInput(record.clock_in));
  const [went, setWent] = useState(toLocalInput(record.clock_out));
  const [why, setWhy] = useState("");
  const action = useAction();
  const t = useT();
  return (
    <form className="mt-2 space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await correctAttendance(record.id, fromLocalInput(came), fromLocalInput(went), why); await onDone(); }); }}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label={t({ en: "In", id: "Masuk" })}><input type="datetime-local" className={inputClass} value={came} onChange={(e) => setCame(e.target.value)} /></Field>
        <Field label={t({ en: "Out", id: "Pulang" })}><input type="datetime-local" className={inputClass} value={went} onChange={(e) => setWent(e.target.value)} /></Field>
      </div>
      <Field label={t({ en: "Reason for correction", id: "Alasan koreksi" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <SecondaryButton type="submit" disabled={action.busy || !why.trim()}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save correction", id: "Simpan koreksi" })}</SecondaryButton>
    </form>
  );
}

function RosterItem({ row, canManage, canSeePhotos, reload }: { row: RosterRow; canManage: boolean; canSeePhotos: boolean; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const t = useT();
  const lang = useLang();
  const state = ROSTER_STATE[row.state];
  const record = row.attendance;
  const expandable = !!record;
  return (
    <li className="border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 basis-[180px]">
          <span className="block truncate text-[14px] font-medium text-[#0F2F36]">{row.name}</span>
          <span className="block text-[13px] tabular-nums text-[#4F6B73]">
            {row.shift ? t({ en: `Scheduled ${clockText(row.shift.start_at)} to ${clockText(row.shift.end_at)}`, id: `Jadwal ${clockText(row.shift.start_at)} s.d. ${clockText(row.shift.end_at)}` }) : t({ en: "No schedule", id: "Tanpa jadwal" })}
            {record ? ` · ${t({ en: "in", id: "masuk" })} ${timeOfDay(record.clock_in)}${record.clock_out ? `, ${t({ en: "out", id: "pulang" })} ${timeOfDay(record.clock_out)}` : ""}` : ""}
            {row.leave && !record ? ` · ${optionLabel(LEAVE_TYPES.find((o) => o.key === row.leave!.type), lang)}` : ""}
          </span>
        </span>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12.5px] font-medium ${state.className}`}>{optionLabel(state, lang)}</span>
        {expandable && <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={`${textButton} shrink-0`}>{open ? t({ en: "Close", id: "Tutup" }) : t({ en: "Details", id: "Detail" })}</button>}
      </div>
      {row.flags.length > 0 && <p className="mt-1 text-[13px] font-medium text-[#8A5A07]">{row.flags.join(" · ")}</p>}
      {open && record && (
        <div className="mt-2 space-y-2">
          {record.note && <p className="text-[13.5px] text-[#36525A]">{record.note}</p>}
          {canSeePhotos && (
            <div className="flex flex-wrap items-center gap-3">
              {record.in_photo_path && <PhotoButton path={record.in_photo_path} label={t({ en: "View clock-in photo", id: "Lihat foto absen masuk" })} />}
              {record.out_photo_path && <PhotoButton path={record.out_photo_path} label={t({ en: "View clock-out photo", id: "Lihat foto absen pulang" })} />}
              {record.photos_removed_at && <p className="text-[13px] text-[#4F6B73]">{t({ en: "The photo was removed after its retention period.", id: "Foto sudah dihapus setelah masa simpannya." })}</p>}
            </div>
          )}
          {canManage && !fixing && <button type="button" onClick={() => setFixing(true)} className={textButton}>{t({ en: "Correct the times", id: "Koreksi jam" })}</button>}
          {fixing && <CorrectForm record={record} onDone={async () => { setFixing(false); await reload(); }} />}
        </div>
      )}
    </li>
  );
}

function ManualForm({ people, date, onDone }: { people: { id: string; full_name: string; status: string }[]; date: string; onDone: () => Promise<void> }) {
  const active = people.filter((p) => p.status === "aktif");
  const [person, setPerson] = useState(active[0]?.id ?? "");
  const [came, setCame] = useState(`${date}T08:00`);
  const [went, setWent] = useState("");
  const [why, setWhy] = useState("");
  const action = useAction();
  const t = useT();
  return (
    <Card className="p-4">
      <p className="mb-2 text-[13px] text-[#4F6B73]">{t({ en: "For those with no phone or account, or who have not agreed to location and photo.", id: "Untuk yang tidak punya ponsel atau akun, atau belum menyetujui lokasi dan foto." })}</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void action.run(async () => { await addManualAttendance(person, fromLocalInput(came), fromLocalInput(went), why); setWhy(""); await onDone(); }); }}>
        <Field label={t({ en: "Person", id: "Personel" })}>
          <select className={inputClass} value={person} onChange={(e) => setPerson(e.target.value)}>
            {active.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label={t({ en: "In", id: "Masuk" })}><input type="datetime-local" className={inputClass} value={came} onChange={(e) => setCame(e.target.value)} /></Field>
          <Field label={t({ en: "Out", id: "Pulang" })}><input type="datetime-local" className={inputClass} value={went} onChange={(e) => setWent(e.target.value)} /></Field>
        </div>
        <Field label={t({ en: "Reason", id: "Alasan" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy || !why.trim()}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Record attendance", id: "Catat presensi" })}</PrimaryButton>
      </form>
    </Card>
  );
}

function LeaveRow({ leave, reload }: { leave: Leave; reload: () => Promise<void> }) {
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const action = useAction();
  const t = useT();
  const lang = useLang();
  return (
    <li className="border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 text-[14px]">
          <span className="font-medium text-[#0F2F36]">{leave.full_name} · {optionLabel(LEAVE_TYPES.find((o) => o.key === leave.type), lang)}</span>
          <span className="block text-[13px] text-[#4F6B73]">{formatLongDate(leave.start_date, lang)}{leave.end_date !== leave.start_date ? ` ${t({ en: "to", id: "s.d." })} ${formatLongDate(leave.end_date, lang)}` : ""}{leave.reason ? ` · ${leave.reason}` : ""}</span>
        </span>
        {!rejecting && (
          <span className="flex flex-wrap gap-2">
            <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { await decideLeave(leave.id, true, ""); await reload(); })}>{t({ en: "Approve", id: "Setujui" })}</SecondaryButton>
            <SecondaryButton disabled={action.busy} onClick={() => setRejecting(true)}>{t({ en: "Reject", id: "Tolak" })}</SecondaryButton>
          </span>
        )}
      </div>
      {rejecting && (
        <div className="mt-2 space-y-2">
          <Field label={t({ en: "Reason for rejecting", id: "Alasan penolakan" })}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></Field>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={action.busy || !note.trim()} onClick={() => void action.run(async () => { await decideLeave(leave.id, false, note); await reload(); })}>{t({ en: "Yes, reject", id: "Ya, tolak" })}</SecondaryButton>
            <SecondaryButton onClick={() => setRejecting(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
          </div>
        </div>
      )}
      <div className="mt-1 empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </li>
  );
}

export default function AttendanceBoardPage() {
  const today = jakartaToday();
  const t = useT();
  const lang = useLang();
  const { canManagePeople, canReadPeople, canSchedule, canReadPrivate, canSweepPhotos } = useErpAccess();
  const state = useLoad(async () => {
    const [shifts, attendance, leaves, people] = await Promise.all([fetchShifts(), fetchAttendance(), fetchLeaves(), fetchPeople()]);
    return { shifts, attendance, leaves, people };
  });
  const { reload } = state;
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<"hadir" | "izin">("hadir");
  const [swept, setSwept] = useState<string | null>(null);

  // The retention promise, kept without a scheduler: Staf SDM opening this page removes what is past it.
  useEffect(() => {
    if (!canSweepPhotos) return;
    sweepExpiredPhotos(lang)
      .then((n) => {
        if (!n) return;
        setSwept(lang === "id" ? `${n} catatan presensi sudah lewat 90 hari, dan fotonya sudah dihapus.` : `${n} attendance records passed 90 days, and their photos have been removed.`);
        void reload();
      })
      .catch((e: Error) => setSwept(e.message));
  }, [canSweepPhotos, reload, lang]);

  return (
    <ErpPage eyebrow={t({ en: "Team", id: "Tim" })} title={t({ en: "Attendance", id: "Presensi" })} sub={t({ en: "Location flags and photos help a person check, they do not decide. A phone's location can be faked.", id: "Tanda lokasi dan foto membantu orang memeriksa, bukan memutuskan. Lokasi ponsel bisa dipalsukan." })}>
      {!canReadPeople ? <Note>{t({ en: "This page is for HR staff, Production managers, Admins and Leadership.", id: "Halaman ini untuk Staf SDM, Manajer produksi, Admin, dan Pimpinan." })}</Note> : (
        <DataState state={state}>
          {({ shifts, attendance, leaves, people }) => {
            const roster = buildRoster(date, today, new Date(), shifts, attendance, leaves, lang);
            const pending = leaves.filter((l) => l.status === "diajukan");
            const decided = leaves.filter((l) => l.status !== "diajukan").slice(0, 10);
            const missed = attendance.filter((a) => a.missed_out);
            const counts = { hadir: roster.filter((r) => r.state === "hadir" || r.state === "terlambat" || r.state === "tanpa_jadwal").length, kurang: roster.filter((r) => r.state === "tidak_hadir").length };
            return (
              <div className="space-y-3">
                {swept && <Note>{swept}</Note>}
                <Segmented value={tab} options={[{ key: "hadir" as const, label: t({ en: "Attendance", id: "Presensi" }) }, { key: "izin" as const, label: t({ en: `Leave requests (${pending.length})`, id: `Pengajuan izin (${pending.length})` }) }]} onChange={setTab} />
                {tab === "hadir" ? (
                  <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <SecondaryButton onClick={() => setDate(addDays(date, -1))}>{t({ en: "Previous", id: "Sebelumnya" })}</SecondaryButton>
                        <input type="date" aria-label={t({ en: "Date", id: "Tanggal" })} className={`${inputClass} max-w-[170px]`} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
                        <SecondaryButton disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>{t({ en: "Next", id: "Berikutnya" })}</SecondaryButton>
                        {date !== today && <SecondaryButton onClick={() => setDate(today)}>{t({ en: "Today", id: "Hari ini" })}</SecondaryButton>}
                      </div>
                      <Card>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-3">
                          <h2 className={sectionTitle}>{formatLongDate(date, lang)}</h2>
                          <p className="text-[13px] tabular-nums text-[#4F6B73]">{counts.hadir} {t({ en: "present", id: "hadir" })}{counts.kurang ? `, ${counts.kurang} ${t({ en: "not clocked in", id: "belum absen" })}` : ""}</p>
                        </div>
                        {roster.length === 0 ? (
                          <p className="border-t border-[#EDF2F2] px-4 py-6 text-center text-[14px] text-[#4F6B73]">{t({ en: "No schedules or attendance on this date.", id: "Tidak ada jadwal atau presensi di tanggal ini." })}</p>
                        ) : (
                          <ul className="border-t border-[#EDF2F2]">{roster.map((r) => <RosterItem key={r.key} row={r} canManage={canManagePeople} canSeePhotos={canReadPrivate} reload={state.reload} />)}</ul>
                        )}
                      </Card>
                    </div>
                    <div className="min-w-0 space-y-4">
                      {missed.length > 0 && (
                        <Card>
                          <h2 className={`${sectionTitle} px-4 py-3`}>{t({ en: "Missed clock-out", id: "Lupa absen pulang" })}</h2>
                          <ul>
                            {missed.slice(0, 8).map((a) => (
                              <li key={a.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                                <button type="button" onClick={() => setDate(a.work_date)} className="text-left font-medium text-[#0B6477] hover:underline">{a.full_name}</button>
                                <span className="block text-[13px] text-[#4F6B73]">{formatLongDate(a.work_date, lang)}</span>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      )}
                      {canManagePeople && <Disclosure title={t({ en: "Record attendance by hand", id: "Catat presensi manual" })}><ManualForm key={date} people={people} date={date} onDone={state.reload} /></Disclosure>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <h2 className={`${sectionTitle} px-4 py-3`}>{t({ en: "Waiting for a decision", id: "Menunggu keputusan" })}</h2>
                      {pending.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">{t({ en: "No requests.", id: "Tidak ada pengajuan." })}</p> : (
                        canSchedule ? <ul className="border-t border-[#EDF2F2]">{pending.map((l) => <LeaveRow key={l.id} leave={l} reload={state.reload} />)}</ul> : <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">{t({ en: `${pending.length} requests waiting for HR staff or a Production manager.`, id: `${pending.length} pengajuan menunggu Staf SDM atau Manajer produksi.` })}</p>
                      )}
                    </Card>
                    {decided.length > 0 && (
                      <Card>
                        <h2 className={`${sectionTitle} px-4 py-3`}>{t({ en: "Already decided", id: "Sudah diputuskan" })}</h2>
                        <ul className="border-t border-[#EDF2F2]">
                          {decided.map((l) => (
                            <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px] first:border-0">
                              <span className="min-w-0"><span className="font-medium text-[#0F2F36]">{l.full_name}</span><span className="block text-[13px] text-[#4F6B73]">{optionLabel(LEAVE_TYPES.find((o) => o.key === l.type), lang)} · {formatLongDate(l.start_date, lang)}{l.decide_note ? ` · ${l.decide_note}` : ""}</span></span>
                              <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${LEAVE_STATUS[l.status].className}`}>{optionLabel(LEAVE_STATUS[l.status], lang)}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                )}
                {state.error && <ErrorNote message={state.error.message} onRetry={state.reload} />}
              </div>
            );
          }}
        </DataState>
      )}
    </ErpPage>
  );
}
