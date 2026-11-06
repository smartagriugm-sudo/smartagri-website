import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { LEAVE_STATUS, LEAVE_TYPES, acceptConsent, cancelLeave, clockIn, clockOut, clockText, compressPhoto, currentFix, fetchAttendance, fetchConsent, fetchLeaves, fetchMyPersonId, fetchShifts, requestLeave, timeOfDay, uploadPhoto, withdrawConsent, type Attendance, type LeaveType } from "../../lib/pf/people";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, inputClass, useAction, useLoad } from "./page";
import { Card, Disclosure, Note } from "./ui";

// Clocking in and out from a phone, and asking for leave. Location and a photo are
// taken at that moment only, after the person has read what they are for. Coming from
// outside the area is recorded and checked by a person, never refused.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

function ConsentCard({ onAccepted }: { onAccepted: () => Promise<void> }) {
  const action = useAction();
  return (
    <Card className="space-y-3 p-4">
      <h2 className={sectionTitle}>Persetujuan lokasi dan foto</h2>
      <p className="text-[14px] leading-[1.5] text-[#36525A]">Absen di ERP memakai lokasi ponsel dan foto. Sebelum mulai, ini yang perlu Anda ketahui:</p>
      <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-[1.5] text-[#36525A]">
        <li><b className="font-medium text-[#0F2F36]">Hanya saat absen.</b> Lokasi dan foto diambil saat Anda menekan absen masuk atau pulang. Lokasi tidak dilacak di waktu lain.</li>
        <li><b className="font-medium text-[#0F2F36]">Tujuannya</b> mencatat kehadiran dan memastikan absen dilakukan di lokasi kerja.</li>
        <li><b className="font-medium text-[#0F2F36]">Yang bisa melihat foto:</b> Anda sendiri, Staf SDM, dan Pimpinan. Manajer produksi melihat jam dan tanda lokasi, tanpa foto.</li>
        <li><b className="font-medium text-[#0F2F36]">Masa simpan:</b> foto dihapus setelah 90 hari. Catatan jam absen tetap ada.</li>
        <li><b className="font-medium text-[#0F2F36]">Anda bisa menarik persetujuan</b> kapan saja. Setelah itu kehadiran Anda dicatat manual oleh Staf SDM.</li>
      </ul>
      <ActionNote action={{ error: action.error, saved: false }} />
      <PrimaryButton disabled={action.busy} onClick={() => void action.run(async () => { await acceptConsent(); await onAccepted(); })}>{action.busy ? "Menyimpan..." : "Saya setuju"}</PrimaryButton>
    </Card>
  );
}

function ClockCard({ person, open, finished, onDone }: { person: string; open: Attendance | null; finished: Attendance | null; onDone: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const action = useAction();
  const going = !!open;

  const handle = async (file: File) => {
    setResult(null);
    await action.run(async () => {
      setStep("Memproses foto...");
      const photo = await compressPhoto(file);
      setStep("Mengambil lokasi...");
      const fix = await currentFix();
      setStep("Mengunggah...");
      const path = await uploadPhoto(person, photo);
      setStep("Menyimpan...");
      if (going) await clockOut(fix, path, "");
      else await clockIn(fix, path, "");
      await onDone();
      setResult(fix ? `Absen ${going ? "pulang" : "masuk"} tercatat.` : `Absen ${going ? "pulang" : "masuk"} tercatat tanpa lokasi, karena ponsel tidak memberikannya. Koordinator akan memeriksa.`);
    });
    setStep(null);
    if (input.current) input.current.value = "";
  };

  return (
    <Card className="space-y-3 p-4">
      {going ? (
        <p className="text-[14px] text-[#36525A]">Masuk pukul <span className="font-medium tabular-nums text-[#0F2F36]">{timeOfDay(open.clock_in)}</span></p>
      ) : finished?.clock_out ? (
        <p className="text-[14px] text-[#36525A]">Sudah absen pulang pukul <span className="font-medium tabular-nums text-[#0F2F36]">{timeOfDay(finished.clock_out)}</span>. Absen masuk lagi hanya bila Anda kembali bekerja hari ini.</p>
      ) : (
        <p className="text-[14px] text-[#36525A]">Belum absen masuk.</p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        aria-label={going ? "Foto absen pulang" : "Foto absen masuk"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      <PrimaryButton className="w-full py-3 text-[16px]" disabled={action.busy} onClick={() => input.current?.click()}>
        <Camera className="h-5 w-5" /> {step ?? (going ? "Absen pulang" : "Absen masuk")}
      </PrimaryButton>
      <p className="text-[13px] text-[#4F6B73]">Kamera terbuka untuk mengambil foto, lalu lokasi diambil sekali. Waktu absen memakai jam server.</p>
      {result && <p role="status" className="text-[14px] font-medium text-[#0E7A5C]">{result}</p>}
      <ActionNote action={{ error: action.error, saved: false }} />
    </Card>
  );
}

function LeaveForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const today = jakartaToday();
  const [type, setType] = useState<LeaveType>("izin");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [why, setWhy] = useState("");
  const action = useAction();
  const submit = async () => {
    if (end < start) return action.setError("Tanggal selesai sebelum tanggal mulai.");
    const saved = await action.run(async () => {
      await requestLeave(null, type, start, end, why);
      await onSaved();
    });
    if (saved) setWhy("");
  };
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Jenis">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
            {LEAVE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai"><input type="date" className={inputClass} value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} /></Field>
          <Field label="Sampai"><input type="date" className={inputClass} min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Alasan"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Mengirim..." : "Ajukan"}</PrimaryButton>
      </form>
    </Card>
  );
}

export default function AttendancePage() {
  const today = jakartaToday();
  const state = useLoad(async () => {
    const person = await fetchMyPersonId();
    if (!person) return { person: null, consent: null, shifts: [], records: [], leaves: [] };
    const [consent, shifts, records, leaves] = await Promise.all([fetchConsent(person), fetchShifts(), fetchAttendance(), fetchLeaves()]);
    return { person, consent, shifts: shifts.filter((s) => s.person_id === person), records: records.filter((r) => r.person_id === person), leaves: leaves.filter((l) => l.person_id === person) };
  });
  const withdraw = useAction();
  const cancel = useAction();

  return (
    <ErpPage eyebrow="SDM" title="Absen" sub={formatLongDate(today)}>
      <DataState state={state}>
        {({ person, consent, shifts, records, leaves }) => {
          if (!person) return <Card className="p-4 text-[14px] text-[#4F6B73]">Akun Anda belum terdaftar di data orang. Minta Staf SDM menghubungkan akun Anda.</Card>;
          const agreed = !!consent && !consent.withdrawn_at;
          const todayShifts = shifts.filter((s) => s.work_date === today);
          const open = records.find((r) => !r.clock_out && !r.missed_out) ?? null;
          const upcoming = shifts.filter((s) => s.work_date > today).sort((a, b) => a.work_date.localeCompare(b.work_date)).slice(0, 5);
          return (
            <div className="grid max-w-[900px] grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <Card className="p-4">
                  <h2 className={`${sectionTitle} mb-1`}>Jadwal hari ini</h2>
                  {todayShifts.length === 0 ? <p className="text-[14px] text-[#4F6B73]">Tidak ada jadwal hari ini. Absen tetap bisa dilakukan.</p> : todayShifts.map((s) => (
                    <p key={s.id} className="text-[14px] tabular-nums text-[#0F2F36]">{clockText(s.start_at)} sampai {clockText(s.end_at)}{s.area_name ? ` · ${s.area_name}` : ""}</p>
                  ))}
                </Card>
                {agreed ? <ClockCard person={person} open={open} finished={records.find((r) => r.work_date === today && r.clock_out) ?? null} onDone={state.reload} /> : (
                  <>
                    {consent?.withdrawn_at && <Note>Anda sudah menarik persetujuan, jadi kehadiran dicatat manual oleh Staf SDM. Anda bisa menyetujui lagi di bawah.</Note>}
                    <ConsentCard onAccepted={state.reload} />
                  </>
                )}
                <Disclosure title="Ajukan izin, sakit, atau cuti"><LeaveForm onSaved={state.reload} /></Disclosure>
                {agreed && (
                  <Disclosure title="Tarik persetujuan lokasi dan foto">
                    <Card className="space-y-2 p-4">
                      <p className="text-[14px] text-[#4F6B73]">Anda tidak lagi bisa absen dari ponsel, dan kehadiran dicatat manual oleh Staf SDM. Foto yang sudah ada tetap mengikuti masa simpan 90 hari.</p>
                      <ActionNote action={{ error: withdraw.error, saved: false }} />
                      <SecondaryButton disabled={withdraw.busy} onClick={() => void withdraw.run(async () => { await withdrawConsent(); await state.reload(); })}>Ya, tarik persetujuan</SecondaryButton>
                    </Card>
                  </Disclosure>
                )}
              </div>
              <div className="min-w-0 space-y-4">
                <Card>
                  <h2 className={`${sectionTitle} px-4 py-3`}>Riwayat absen</h2>
                  {records.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Belum ada.</p> : (
                    <ul>
                      {records.slice(0, 7).map((r) => (
                        <li key={r.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="font-medium text-[#0F2F36]">{formatLongDate(r.work_date)}</span>
                          <span className="block text-[13px] tabular-nums text-[#4F6B73]">{timeOfDay(r.clock_in)} sampai {r.clock_out ? timeOfDay(r.clock_out) : r.missed_out ? "tidak tercatat" : "sekarang"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                {leaves.length > 0 && (
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>Pengajuan saya</h2>
                    <ul>
                      {leaves.slice(0, 6).map((l) => (
                        <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="min-w-0">
                            <span className="font-medium text-[#0F2F36]">{LEAVE_TYPES.find((t) => t.key === l.type)?.label}</span>
                            <span className="block text-[13px] text-[#4F6B73]">{formatLongDate(l.start_date)}{l.end_date !== l.start_date ? ` sampai ${formatLongDate(l.end_date)}` : ""}{l.decide_note ? ` · ${l.decide_note}` : ""}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${LEAVE_STATUS[l.status].className}`}>{LEAVE_STATUS[l.status].label}</span>
                            {l.status === "diajukan" && <button type="button" disabled={cancel.busy} onClick={() => void cancel.run(async () => { await cancelLeave(l.id); await state.reload(); })} className="min-h-[44px] text-[13px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">Batalkan</button>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {upcoming.length > 0 && (
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>Jadwal berikutnya</h2>
                    <ul>
                      {upcoming.map((s) => (
                        <li key={s.id} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="text-[#0F2F36]">{formatLongDate(s.work_date)}</span>
                          <span className="tabular-nums text-[#4F6B73]">{clockText(s.start_at)} sampai {clockText(s.end_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
