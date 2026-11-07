import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, Trash2, X } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { daysOf, endMinutes, hourRange, minutesOfDay, personColor, placeEvents, step, type CalendarMode } from "../../lib/pf/calendar";
import { addDays } from "../../lib/pf/facility";
import { LEAVE_TYPES, addShifts, clockText, fetchLeaves, fetchPeople, fetchShifts, fetchWorkAreas, parseShiftForm, removeShift, weekStart, type Leave, type Person, type Shift, type WorkArea } from "../../lib/pf/people";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note, Segmented } from "./ui";

// The team's calendar, laid out like a diary: a day or a week has an hour grid with each
// shift as a block at its real time, and a month has a square per day. Clicking an empty
// spot starts a schedule for that day; clicking a shift opens it. Approved leave runs
// across the top of the day, so a gap is seen before it hurts.

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0];
const MODES: { key: CalendarMode; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];
const HOUR_PX = 52;
/** Past this many a month square says "and n more" and opens the day. */
const MONTH_CHIPS = 3;
const LEAVE_TONE = "bg-[#FFF6E5] text-[#8A5A07]";

const dayDate = (d: string) => new Date(`${d}T00:00:00Z`);
const fmt = (d: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(dayDate(d));

function titleOf(mode: CalendarMode, date: string) {
  if (mode === "day") return fmt(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (mode === "month") return fmt(date, { month: "long", year: "numeric" });
  const monday = weekStart(date);
  const sunday = addDays(monday, 6);
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7);
  return `${fmt(monday, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })}–${fmt(sunday, { day: "numeric", month: sameMonth ? "long" : "short", year: "numeric" })}`;
}

const leavesOn = (leaves: Leave[], date: string) => leaves.filter((l) => l.status === "disetujui" && l.start_date <= date && l.end_date >= date);
const leaveLabel = (l: Leave) => LEAVE_TYPES.find((t) => t.key === l.type)?.label ?? "Leave";

/* ------------------------------------------------------------------ the form */

function ShiftForm({ people, areas, start, person: presetPerson, onClose, onDone }: { people: Person[]; areas: WorkArea[]; start: string; person: string; onClose: () => void; onDone: () => Promise<void> }) {
  const active = people.filter((p) => p.status === "aktif");
  const [person, setPerson] = useState(presetPerson || (active[0]?.id ?? ""));
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(start);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
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
      setResult(`${added} ${added === 1 ? "shift" : "shifts"} added${skipped ? `, ${skipped} already there` : ""}.`);
      await onDone();
    });
  };
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Add schedule</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#EEF5F5]"><X className="h-4 w-4" /></button>
      </div>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Person">
          <select className={inputClass} value={person} onChange={(e) => setPerson(e.target.value)}>
            {active.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input type="date" className={inputClass} value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} /></Field>
          <Field label="To"><input type="date" className={inputClass} min={from} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        {from !== to && (
          <fieldset>
            <legend className="mb-1 text-[13px] font-medium text-[#36525A]">Repeat on</legend>
            <div className="flex flex-wrap gap-1">
              {WEEKDAY_VALUES.map((v, i) => {
                const on = days.includes(v);
                return <button key={v} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((d) => d !== v) : [...days, v])} className={`min-h-[44px] min-w-[44px] rounded-lg border text-[13px] font-medium sm:min-h-[32px] ${on ? "border-[#14919B] bg-[#E3F4F4] text-[#0B6477]" : "border-[#DCE7E8] bg-white text-[#4F6B73]"}`}>{WEEKDAY_LABELS[i]}</button>;
              })}
            </div>
          </fieldset>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts"><input type="time" className={inputClass} value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
          <Field label="Ends"><input type="time" className={inputClass} value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
        </div>
        <Field label="Work area" hint={areas.length ? undefined : "No work areas yet. Without one, a clock-in cannot be checked against an area."}>
          <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Any work area</option>
            {areas.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        {result && <p role="status" className="text-[13px] font-medium text-[#0E7A5C]">{result}</p>}
        <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Add"}</PrimaryButton>
      </form>
    </Card>
  );
}

/* ----------------------------------------------------------- one shift, opened */

function ShiftDetail({ shift, canEdit, onClose, reload }: { shift: Shift; canEdit: boolean; onClose: () => void; reload: () => Promise<void> }) {
  const action = useAction();
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: personColor(shift.person_id) }} />
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{shift.full_name}</h2>
            <p className="text-[13px] text-[#4F6B73]">{fmt(shift.work_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#EEF5F5]"><X className="h-4 w-4" /></button>
      </div>
      <dl className="mt-3 space-y-1.5 text-[14px] text-[#0F2F36]">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#4F6B73]" /><span className="tabular-nums">{clockText(shift.start_at)}–{clockText(shift.end_at)}</span></div>
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#4F6B73]" />{shift.area_name ?? "Any work area"}</div>
      </dl>
      {shift.notes && <p className="mt-2 text-[13.5px] text-[#36525A]">{shift.notes}</p>}
      <div className="mt-3 empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
      {canEdit && (
        <SecondaryButton className="mt-3" disabled={action.busy} onClick={() => void action.run(async () => { await removeShift(shift.id); await reload(); onClose(); })}>
          <Trash2 className="h-4 w-4" /> {action.busy ? "Removing..." : "Remove shift"}
        </SecondaryButton>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------- day and week grids */

function sameHours(shifts: Shift[]) {
  const groups = new Map<string, Shift[]>();
  for (const s of [...shifts].sort((a, b) => a.full_name.localeCompare(b.full_name))) {
    const key = `${s.start_at}|${s.end_at}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.values()];
}

function HourGrid({ days, today, shifts, leaves, canEdit, selected, onShift, onEmpty }: { days: string[]; today: string; shifts: Shift[]; leaves: Leave[]; canEdit: boolean; selected: string | null; onShift: (s: Shift) => void; onEmpty: (date: string, hour: number) => void }) {
  const inView = shifts.filter((s) => days.includes(s.work_date));
  const { from, to } = hourRange(inView.map((s) => ({ from: minutesOfDay(s.start_at), to: endMinutes(s.start_at, s.end_at) })));
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const columns = `56px repeat(${days.length}, minmax(${days.length > 1 ? 110 : 0}px, 1fr))`;
  const anyLeave = days.some((d) => leavesOn(leaves, d).length > 0);
  return (
    <Card className="overflow-x-auto">
      <div className={days.length > 1 ? "min-w-[840px]" : ""}>
        <div className="grid border-b border-[#EDF2F2]" style={{ gridTemplateColumns: columns }}>
          <span />
          {days.map((d) => {
            const now = d === today;
            return (
              <div key={d} className="border-l border-[#EDF2F2] px-2 py-2 text-center">
                <p className={`text-[12px] font-medium ${now ? "text-[#0B6477]" : "text-[#4F6B73]"}`}>{fmt(d, { weekday: "short" })}</p>
                <p className={`mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full text-[17px] font-medium tabular-nums ${now ? "bg-[#0B6477] text-white" : "text-[#0F2F36]"}`}>{Number(d.slice(8))}</p>
              </div>
            );
          })}
        </div>
        {anyLeave && (
          <div className="grid border-b border-[#EDF2F2]" style={{ gridTemplateColumns: columns }}>
            <span className="px-1.5 py-1 text-right text-[11px] text-[#4F6B73]">Leave</span>
            {days.map((d) => (
              <div key={d} className="min-w-0 space-y-0.5 border-l border-[#EDF2F2] p-1">
                {leavesOn(leaves, d).map((l) => <p key={l.id} className={`truncate rounded px-1.5 py-0.5 text-[12px] font-medium ${LEAVE_TONE}`} title={`${l.full_name} · ${leaveLabel(l)}`}>{l.full_name}</p>)}
              </div>
            ))}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          <div>
            {hours.map((h) => <div key={h} className="pr-1.5 text-right text-[11px] tabular-nums text-[#6B8187]" style={{ height: HOUR_PX }}><span className="relative -top-1.5">{h === from ? "" : `${String(h).padStart(2, "0")}.00`}</span></div>)}
          </div>
          {days.map((d) => {
            // People on the same hours share one block, so a whole team's shift stays readable.
            const groups = sameHours(shifts.filter((s) => s.work_date === d));
            const placed = placeEvents(groups, (g) => ({ from: minutesOfDay(g[0].start_at), to: endMinutes(g[0].start_at, g[0].end_at) }));
            return (
              <div key={d} className={`relative border-l border-[#EDF2F2] ${d === today ? "bg-[#F6FAFA]" : ""}`} style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h, i) => (
                  <button
                    key={h}
                    type="button"
                    tabIndex={canEdit ? 0 : -1}
                    disabled={!canEdit}
                    aria-label={`Add a schedule on ${d} at ${h}.00`}
                    onClick={() => onEmpty(d, h)}
                    className={`absolute inset-x-0 block ${i > 0 ? "border-t border-[#EDF2F2]" : ""} ${canEdit ? "hover:bg-[#EEF5F5]" : "cursor-default"}`}
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  />
                ))}
                {placed.map(({ item: group, from: a, to: b, lane, lanes }) => {
                  const first = group[0];
                  const height = Math.max(22, ((b - a) / 60) * HOUR_PX - 2);
                  const color = group.length === 1 ? personColor(first.person_id) : "#14919B";
                  const fits = Math.max(1, Math.floor((height - 22) / 22));
                  const hidden = group.length - fits;
                  return (
                    <div
                      key={`${first.start_at}${first.end_at}`}
                      className="absolute z-10 flex flex-col overflow-hidden rounded-md border-l-[3px] px-1 py-1 text-[12px] leading-tight"
                      style={{ top: ((a - from * 60) / 60) * HOUR_PX + 1, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`, background: `${color}1A`, borderColor: color }}
                    >
                      <p className="truncate px-1 pb-0.5 tabular-nums text-[#36525A]">{clockText(first.start_at)}–{clockText(first.end_at)}</p>
                      {group.slice(0, hidden > 0 ? fits - 1 : fits).map((s) => (
                        <button key={s.id} type="button" onClick={() => onShift(s)} aria-pressed={selected === s.id} title={`${s.full_name}, ${clockText(s.start_at)}–${clockText(s.end_at)}`} className={`flex min-h-[22px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded px-1 text-left hover:bg-white/70 ${selected === s.id ? "bg-white ring-1 ring-[#0F2F36]/30" : ""}`}>
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: personColor(s.person_id) }} />
                          <span className="truncate font-medium text-[#0F2F36]">{s.full_name}</span>
                        </button>
                      ))}
                      {hidden > 0 && <p className="truncate px-1 text-[12px] font-medium text-[#0B6477]">{hidden + 1} more</p>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- month grid */

function MonthGrid({ date, today, shifts, leaves, canEdit, selected, onShift, onDay, onAdd }: { date: string; today: string; shifts: Shift[]; leaves: Leave[]; canEdit: boolean; selected: string | null; onShift: (s: Shift) => void; onDay: (d: string) => void; onAdd: (d: string) => void }) {
  const days = daysOf("month", date);
  const month = date.slice(0, 7);
  return (
    <Card className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-[#EDF2F2]">
          {WEEKDAY_LABELS.map((w, i) => <p key={w} className={`px-2 py-2 text-center text-[12px] font-medium text-[#4F6B73] ${i ? "border-l border-[#EDF2F2]" : ""}`}>{w}</p>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const mine = shifts.filter((s) => s.work_date === d).sort((a, b) => a.start_at.localeCompare(b.start_at));
            const off = leavesOn(leaves, d);
            const room = Math.max(0, MONTH_CHIPS - off.length);
            const hidden = mine.length - room;
            const now = d === today;
            return (
              <div key={d} className={`group/day min-h-[118px] min-w-0 border-[#EDF2F2] p-1 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${d.slice(0, 7) === month ? "" : "bg-[#F7F9F9]"} ${now ? "bg-[#F6FAFA]" : ""}`}>
                <div className="mb-0.5 flex items-center justify-between">
                  <button type="button" onClick={() => onDay(d)} aria-label={`Open ${d}`} className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-medium tabular-nums hover:bg-[#EEF5F5] ${now ? "bg-[#0B6477] text-white hover:bg-[#0B6477]" : d.slice(0, 7) === month ? "text-[#0F2F36]" : "text-[#6B8187]"}`}>{Number(d.slice(8))}</button>
                  {canEdit && <button type="button" onClick={() => onAdd(d)} aria-label={`Add a schedule on ${d}`} className="grid h-6 w-6 place-items-center rounded text-[#4F6B73] opacity-0 hover:bg-[#EEF5F5] focus:opacity-100 group-hover/day:opacity-100"><Plus className="h-3.5 w-3.5" /></button>}
                </div>
                <div className="space-y-0.5">
                  {off.slice(0, MONTH_CHIPS).map((l) => <p key={l.id} className={`truncate rounded px-1.5 py-0.5 text-[12px] font-medium ${LEAVE_TONE}`} title={`${l.full_name} · ${leaveLabel(l)}`}>{l.full_name}</p>)}
                  {mine.slice(0, room).map((s) => (
                    <button key={s.id} type="button" onClick={() => onShift(s)} aria-pressed={selected === s.id} title={`${s.full_name}, ${clockText(s.start_at)}–${clockText(s.end_at)}`} className={`flex w-full min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left text-[12px] hover:bg-[#EEF5F5] ${selected === s.id ? "bg-[#E3F4F4]" : ""}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: personColor(s.person_id) }} />
                      <span className="shrink-0 tabular-nums text-[#4F6B73]">{clockText(s.start_at)}</span>
                      <span className="truncate font-medium text-[#0F2F36]">{s.full_name}</span>
                    </button>
                  ))}
                  {hidden > 0 && <button type="button" onClick={() => onDay(d)} className="w-full rounded px-1 py-0.5 text-left text-[12px] font-medium text-[#0B6477] hover:bg-[#EEF5F5]">{hidden} more</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------- page */

export default function SchedulePage() {
  const today = jakartaToday();
  const { canSchedule, canReadPeople } = useErpAccess();
  const state = useLoad(async () => {
    const [people, shifts, areas, leaves] = await Promise.all([fetchPeople(), fetchShifts(), fetchWorkAreas(), fetchLeaves()]);
    return { people, shifts, areas, leaves };
  });
  const [mode, setMode] = useState<CalendarMode>("week");
  const [date, setDate] = useState(today);
  const [person, setPerson] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const data = state.data;
    if (!data) return { shifts: [] as Shift[], leaves: [] as Leave[] };
    return { shifts: data.shifts.filter((s) => !person || s.person_id === person), leaves: data.leaves.filter((l) => !person || l.person_id === person) };
  }, [state.data, person]);

  const opened = state.data?.shifts.find((s) => s.id === openId) ?? null;
  const openShift = (s: Shift) => { setOpenId(s.id); setAdding(null); };
  const startAdding = (d: string) => { setAdding(d); setOpenId(null); };
  const side = adding !== null || opened !== null;

  return (
    <ErpPage
      eyebrow="Team"
      title="Schedule"
      sub="Who works when, with approved leave on the same calendar."
      actions={canSchedule && adding === null && state.data ? <PrimaryButton onClick={() => startAdding(date)}><Plus className="h-4 w-4" /> Add schedule</PrimaryButton> : undefined}
    >
      {!canReadPeople ? <Note>Your own schedule is on the Clock in page. This page is for coordinators.</Note> : (
        <DataState state={state}>
          {({ people, areas }) => {
            const active = people.filter((p) => p.status === "aktif");
            return (
              <div className={`grid grid-cols-1 items-start gap-4 ${side ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
                <div className="min-w-0 space-y-3">
                  {!canSchedule && <ReadOnlyNote who="HR staff or Production manager" />}
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <SecondaryButton onClick={() => setDate(today)}>Today</SecondaryButton>
                      <SecondaryButton aria-label="Previous" className="px-2.5" onClick={() => setDate(step(mode, date, -1))}><ChevronLeft className="h-4 w-4" /></SecondaryButton>
                      <SecondaryButton aria-label="Next" className="px-2.5" onClick={() => setDate(step(mode, date, 1))}><ChevronRight className="h-4 w-4" /></SecondaryButton>
                      <h2 className="ml-1 text-[18px] font-medium tracking-[-0.02em] text-[#0F2F36]" aria-live="polite">{titleOf(mode, date)}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label="Filter by person" className={`${inputClass} w-auto max-w-[220px]`} value={person} onChange={(e) => setPerson(e.target.value)}>
                        <option value="">Everyone</option>
                        {active.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                      <Segmented value={mode} options={MODES} onChange={setMode} />
                    </div>
                  </div>

                  {active.length === 0 ? (
                    <Card className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">No people yet. Add them first on the People page.</Card>
                  ) : mode === "month" ? (
                    <MonthGrid date={date} today={today} shifts={shown.shifts} leaves={shown.leaves} canEdit={canSchedule} selected={openId} onShift={openShift} onDay={(d) => { setDate(d); setMode("day"); }} onAdd={startAdding} />
                  ) : (
                    <HourGrid days={daysOf(mode, date)} today={today} shifts={shown.shifts} leaves={shown.leaves} canEdit={canSchedule} selected={openId} onShift={openShift} onEmpty={(d) => startAdding(d)} />
                  )}
                </div>
                {side && (
                  <div className="min-w-0 xl:sticky xl:top-20">
                    {adding !== null ? (
                      <ShiftForm key={adding} people={people} areas={areas} start={adding} person={person} onClose={() => setAdding(null)} onDone={state.reload} />
                    ) : opened ? (
                      <ShiftDetail key={opened.id} shift={opened} canEdit={canSchedule} onClose={() => setOpenId(null)} reload={state.reload} />
                    ) : null}
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

