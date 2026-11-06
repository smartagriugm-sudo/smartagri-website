import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate, formatShortDate } from "../../lib/pf/dashboard";
import { addDays } from "../../lib/pf/facility";
import { addShifts, clockText, fetchLeaves, fetchPeople, fetchShifts, fetchWorkAreas, parseShiftForm, removeShift, weekDays, weekStart, type Leave, type Person, type Shift, type WorkArea } from "../../lib/pf/people";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// The team's week. A coordinator fills it in by pattern (Monday to Friday, 08.00 to
// 16.00), and approved leave shows in the same grid so a gap is seen before it hurts.

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

function ShiftForm({ people, areas, start, onDone }: { people: Person[]; areas: WorkArea[]; start: string; onDone: () => Promise<void> }) {
  const active = people.filter((p) => p.status === "aktif");
  const [person, setPerson] = useState(active[0]?.id ?? "");
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(addDays(start, 4));
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startAt, setStartAt] = useState("08:00");
  const [endAt, setEndAt] = useState("16:00");
  const [area, setArea] = useState(areas.find((a) => a.active)?.id ?? "");
  const [result, setResult] = useState<string | null>(null);
  const action = useAction();
  const submit = async () => {
    setResult(null);
    const parsed = parseShiftForm(person, from, to, days, startAt, endAt);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      const added = await addShifts(person, parsed.dates, startAt, endAt, area);
      const skipped = parsed.dates.length - added;
      setResult(`${added} jadwal ditambahkan${skipped ? `, ${skipped} sudah ada` : ""}.`);
      await onDone();
    });
  };
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Tambah jadwal</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Orang">
          <select className={inputClass} value={person} onChange={(e) => setPerson(e.target.value)}>
            {active.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dari"><input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Sampai"><input type="date" className={inputClass} min={from} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium text-[#36525A]">Hari</legend>
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_VALUES.map((v, i) => {
              const on = days.includes(v);
              return <button key={v} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((d) => d !== v) : [...days, v])} className={`min-h-[44px] min-w-[44px] rounded-lg border text-[13px] font-medium sm:min-h-[32px] ${on ? "border-[#14919B] bg-[#E3F4F4] text-[#0B6477]" : "border-[#DCE7E8] bg-white text-[#4F6B73]"}`}>{WEEKDAY_LABELS[i]}</button>;
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai"><input type="time" className={inputClass} value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
          <Field label="Selesai"><input type="time" className={inputClass} value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
        </div>
        <Field label="Lokasi kerja" hint={areas.length ? undefined : "Belum ada lokasi kerja. Tanpa itu, absen tidak bisa dicek terhadap area."}>
          <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Semua lokasi kerja</option>
            {areas.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        {result && <p role="status" className="text-[13px] font-medium text-[#0E7A5C]">{result}</p>}
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Tambahkan"}</PrimaryButton>
      </form>
    </Card>
  );
}

function ShiftChip({ shift, canEdit, reload }: { shift: Shift; canEdit: boolean; reload: () => Promise<void> }) {
  const action = useAction();
  return (
    <span className="flex flex-col rounded-md bg-[#E3F4F4] px-1.5 py-1 text-[12.5px] tabular-nums text-[#0B6477]" title={action.error ?? undefined}>
      <span className="flex items-center justify-between gap-1 whitespace-nowrap">
        {clockText(shift.start_at)}–{clockText(shift.end_at)}
        {canEdit && <button type="button" disabled={action.busy} aria-label={`Hapus jadwal ${shift.full_name} ${shift.work_date}`} onClick={() => void action.run(async () => { await removeShift(shift.id); await reload(); })} className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-white"><X className="h-3 w-3" /></button>}
      </span>
      {action.error && <span className="text-[12px] text-[#8A5A07]">Sudah ada absen</span>}
    </span>
  );
}

const leaveOn = (leaves: Leave[], person: string, date: string) => leaves.find((l) => l.person_id === person && l.status === "disetujui" && l.start_date <= date && l.end_date >= date);

export default function SchedulePage() {
  const today = jakartaToday();
  const { canSchedule, canReadPeople } = useErpAccess();
  const state = useLoad(async () => {
    const [people, shifts, areas, leaves] = await Promise.all([fetchPeople(), fetchShifts(), fetchWorkAreas(), fetchLeaves()]);
    return { people, shifts, areas, leaves };
  });
  const [monday, setMonday] = useState(weekStart(today));
  const [adding, setAdding] = useState(false);
  const days = weekDays(monday);

  return (
    <ErpPage
      eyebrow="SDM"
      title="Jadwal"
      sub={`${formatLongDate(days[0])} sampai ${formatLongDate(days[6])}`}
      actions={canSchedule && !adding && state.data ? <PrimaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Tambah jadwal</PrimaryButton> : undefined}
    >
      {!canReadPeople ? <Note>Jadwal Anda sendiri ada di halaman Absen. Halaman ini untuk koordinator.</Note> : (
        <DataState state={state}>
          {({ people, shifts, areas, leaves }) => {
            const active = people.filter((p) => p.status === "aktif");
            return (
              <div className={`grid grid-cols-1 items-start gap-4 ${adding ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
                <div className="min-w-0 space-y-3">
                  {!canSchedule && <ReadOnlyNote who="Staf SDM atau Manajer produksi" />}
                  <div className="flex flex-wrap items-center gap-2">
                    <SecondaryButton aria-label="Minggu sebelumnya" onClick={() => setMonday(addDays(monday, -7))}><ChevronLeft className="h-4 w-4" /></SecondaryButton>
                    <SecondaryButton onClick={() => setMonday(weekStart(today))}>Minggu ini</SecondaryButton>
                    <SecondaryButton aria-label="Minggu berikutnya" onClick={() => setMonday(addDays(monday, 7))}><ChevronRight className="h-4 w-4" /></SecondaryButton>
                  </div>

                  {active.length === 0 ? (
                    <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Belum ada orang. Tambahkan dulu di halaman Orang.</Card>
                  ) : (
                    <>
                      {/* Below md, one day at a time reads better than seven narrow columns. */}
                      <div className="space-y-3 md:hidden">
                        {days.map((d, i) => {
                          const rows = active.flatMap((p) => {
                            const leave = leaveOn(leaves, p.id, d);
                            const mine = shifts.filter((s) => s.person_id === p.id && s.work_date === d);
                            return mine.length || leave ? [{ p, leave, mine }] : [];
                          });
                          return (
                            <Card key={d}>
                              <h2 className={`px-4 py-2.5 text-[14px] font-medium ${d === today ? "text-[#0B6477]" : "text-[#0F2F36]"}`}>{WEEKDAY_LABELS[i]}, {formatShortDate(d)}</h2>
                              {rows.length === 0 ? <p className="border-t border-[#EDF2F2] px-4 py-2 text-[13px] text-[#4F6B73]">Tidak ada jadwal.</p> : rows.map(({ p, leave, mine }) => (
                                <div key={p.id} className="flex items-center justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2">
                                  <span className="min-w-0 truncate text-[14px] text-[#0F2F36]">{p.full_name}</span>
                                  <span className="flex shrink-0 flex-wrap gap-1">
                                    {leave && <span className="rounded-md bg-[#FFF6E5] px-1.5 py-1 text-[12.5px] text-[#8A5A07]">Izin</span>}
                                    {mine.map((s) => <ShiftChip key={s.id} shift={s} canEdit={canSchedule} reload={state.reload} />)}
                                  </span>
                                </div>
                              ))}
                            </Card>
                          );
                        })}
                      </div>
                      <Card className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[960px] table-fixed text-left text-[13px]">
                          <thead>
                            <tr className="text-[#4F6B73]">
                              <th className="w-[150px] px-4 py-2.5 font-medium">Orang</th>
                              {days.map((d, i) => <th key={d} className={`px-1 py-2.5 font-medium ${d === today ? "text-[#0B6477]" : ""}`}>{WEEKDAY_LABELS[i]} <span className="font-normal tabular-nums">{formatShortDate(d)}</span></th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {active.map((p) => (
                              <tr key={p.id} className="border-t border-[#EDF2F2] align-top">
                                <td className="truncate px-4 py-2 text-[14px] font-medium text-[#0F2F36]">{p.full_name}</td>
                                {days.map((d) => {
                                  const leave = leaveOn(leaves, p.id, d);
                                  return (
                                    <td key={d} className={`space-y-1 px-1 py-2 ${d === today ? "bg-[#F6FAFA]" : ""}`}>
                                      {leave && <span className="block rounded-md bg-[#FFF6E5] px-1.5 py-1 text-[12.5px] text-[#8A5A07]">Izin</span>}
                                      {shifts.filter((s) => s.person_id === p.id && s.work_date === d).map((s) => <ShiftChip key={s.id} shift={s} canEdit={canSchedule} reload={state.reload} />)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    </>
                  )}
                </div>
                {adding && (
                  <div className="min-w-0 space-y-2">
                    <ShiftForm people={people} areas={areas} start={days[0]} onDone={state.reload} />
                    <SecondaryButton onClick={() => setAdding(false)}>Tutup</SecondaryButton>
                  </div>
                )}
              </div>
            );
          }}
        </DataState>
      )}
    </ErpPage>
  );
}
