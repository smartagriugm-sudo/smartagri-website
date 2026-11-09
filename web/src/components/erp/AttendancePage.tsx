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
      <h2 className={sectionTitle}>Consent for location and photo</h2>
      <p className="text-[14px] leading-[1.5] text-[#36525A]">Clocking in on the ERP uses your phone's location and a photo. Before you start, here is what you should know:</p>
      <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-[1.5] text-[#36525A]">
        <li><b className="font-medium text-[#0F2F36]">Only when clocking in.</b> Location and a photo are taken when you press clock in or out. Your location is not tracked at any other time.</li>
        <li><b className="font-medium text-[#0F2F36]">The purpose:</b> to record attendance and make sure you clock in at the work site.</li>
        <li><b className="font-medium text-[#0F2F36]">Who can see the photo:</b> You, HR staff and Leadership. Production managers see the times and location flags, without the photo.</li>
        <li><b className="font-medium text-[#0F2F36]">Retention:</b> photos are removed after 90 days. Your clock times stay.</li>
        <li><b className="font-medium text-[#0F2F36]">You can withdraw consent</b> at any time. After that your attendance is recorded by hand by HR staff.</li>
      </ul>
      <ActionNote action={{ error: action.error, saved: false }} />
      <PrimaryButton disabled={action.busy} onClick={() => void action.run(async () => { await acceptConsent(); await onAccepted(); })}>{action.busy ? "Saving…" : "I agree"}</PrimaryButton>
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
      setStep("Processing photo…");
      const photo = await compressPhoto(file);
      setStep("Getting location…");
      const fix = await currentFix();
      setStep("Uploading…");
      const path = await uploadPhoto(person, photo);
      setStep("Saving…");
      if (going) await clockOut(fix, path, "");
      else await clockIn(fix, path, "");
      await onDone();
      setResult(fix ? `${going ? "Clock out" : "Clock in"} recorded.` : `${going ? "Clock out" : "Clock in"} recorded without a location, because the phone did not give one. A coordinator will check it.`);
    });
    setStep(null);
    if (input.current) input.current.value = "";
  };

  return (
    <Card className="space-y-3 p-4">
      {going ? (
        <p className="text-[14px] text-[#36525A]">In at <span className="font-medium tabular-nums text-[#0F2F36]">{timeOfDay(open.clock_in)}</span></p>
      ) : finished?.clock_out ? (
        <p className="text-[14px] text-[#36525A]">Clocked out at <span className="font-medium tabular-nums text-[#0F2F36]">{timeOfDay(finished.clock_out)}</span>. Clock in again only if you are coming back to work today.</p>
      ) : (
        <p className="text-[14px] text-[#36525A]">Not clocked in yet.</p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        aria-label={going ? "Clock-out photo" : "Clock-in photo"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      <PrimaryButton className="w-full py-3 text-[16px]" disabled={action.busy} onClick={() => input.current?.click()}>
        <Camera className="h-5 w-5" /> {step ?? (going ? "Clock out" : "Clock in")}
      </PrimaryButton>
      <p className="text-[13px] text-[#4F6B73]">The camera opens to take a photo, then your location is taken once. The time comes from the server clock.</p>
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
    if (end < start) return action.setError("The end date is before the start date.");
    const saved = await action.run(async () => {
      await requestLeave(null, type, start, end, why);
      await onSaved();
    });
    if (saved) setWhy("");
  };
  return (
    <Card className="p-4">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Type">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
            {LEAVE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts"><input type="date" className={inputClass} value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} /></Field>
          <Field label="To"><input type="date" className={inputClass} min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Reason"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={action} />
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Sending…" : "Submit"}</PrimaryButton>
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
    <ErpPage eyebrow="Team" title="Clock in" sub={formatLongDate(today)}>
      <DataState state={state}>
        {({ person, consent, shifts, records, leaves }) => {
          if (!person) return <Card className="p-4 text-[14px] text-[#4F6B73]">Your account is not in the people records yet. Ask HR staff to connect it.</Card>;
          const agreed = !!consent && !consent.withdrawn_at;
          const todayShifts = shifts.filter((s) => s.work_date === today);
          const open = records.find((r) => !r.clock_out && !r.missed_out) ?? null;
          const upcoming = shifts.filter((s) => s.work_date > today).sort((a, b) => a.work_date.localeCompare(b.work_date)).slice(0, 5);
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <Card className="p-4">
                  <h2 className={`${sectionTitle} mb-1`}>Today's schedule</h2>
                  {todayShifts.length === 0 ? <p className="text-[14px] text-[#4F6B73]">No schedule today. You can still clock in.</p> : todayShifts.map((s) => (
                    <p key={s.id} className="text-[14px] tabular-nums text-[#0F2F36]">{clockText(s.start_at)} to {clockText(s.end_at)}{s.area_name ? ` · ${s.area_name}` : ""}</p>
                  ))}
                </Card>
                {agreed ? <ClockCard person={person} open={open} finished={records.find((r) => r.work_date === today && r.clock_out) ?? null} onDone={state.reload} /> : (
                  <>
                    {consent?.withdrawn_at && <Note>You have withdrawn consent, so your attendance is recorded by hand by HR staff. You can agree again below.</Note>}
                    <ConsentCard onAccepted={state.reload} />
                  </>
                )}
                <Disclosure title="Request leave, sick leave or time off"><LeaveForm onSaved={state.reload} /></Disclosure>
                {agreed && (
                  <Disclosure title="Withdraw consent for location and photo">
                    <Card className="space-y-2 p-4">
                      <p className="text-[14px] text-[#4F6B73]">You will no longer be able to clock in from your phone, and your attendance is recorded by hand by HR staff. Existing photos still follow the 90-day retention.</p>
                      <ActionNote action={{ error: withdraw.error, saved: false }} />
                      <SecondaryButton disabled={withdraw.busy} onClick={() => void withdraw.run(async () => { await withdrawConsent(); await state.reload(); })}>Yes, withdraw consent</SecondaryButton>
                    </Card>
                  </Disclosure>
                )}
              </div>
              <div className="min-w-0 space-y-4">
                <Card>
                  <h2 className={`${sectionTitle} px-4 py-3`}>Attendance history</h2>
                  {records.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">None yet.</p> : (
                    <ul>
                      {records.slice(0, 7).map((r) => (
                        <li key={r.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="font-medium text-[#0F2F36]">{formatLongDate(r.work_date)}</span>
                          <span className="block text-[13px] tabular-nums text-[#4F6B73]">{timeOfDay(r.clock_in)} to {r.clock_out ? timeOfDay(r.clock_out) : r.missed_out ? "not recorded" : "sekarang"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                {leaves.length > 0 && (
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>My requests</h2>
                    <ul>
                      {leaves.slice(0, 6).map((l) => (
                        <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="min-w-0">
                            <span className="font-medium text-[#0F2F36]">{LEAVE_TYPES.find((t) => t.key === l.type)?.label}</span>
                            <span className="block text-[13px] text-[#4F6B73]">{formatLongDate(l.start_date)}{l.end_date !== l.start_date ? ` to ${formatLongDate(l.end_date)}` : ""}{l.decide_note ? ` · ${l.decide_note}` : ""}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${LEAVE_STATUS[l.status].className}`}>{LEAVE_STATUS[l.status].label}</span>
                            {l.status === "diajukan" && <button type="button" disabled={cancel.busy} onClick={() => void cancel.run(async () => { await cancelLeave(l.id); await state.reload(); })} className="min-h-[44px] text-[13px] font-medium text-[#4F6B73] hover:text-[#B3362C] sm:min-h-[24px]">Cancel</button>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {upcoming.length > 0 && (
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>Next shift</h2>
                    <ul>
                      {upcoming.map((s) => (
                        <li key={s.id} className="flex justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
                          <span className="text-[#0F2F36]">{formatLongDate(s.work_date)}</span>
                          <span className="tabular-nums text-[#4F6B73]">{clockText(s.start_at)} to {clockText(s.end_at)}</span>
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
