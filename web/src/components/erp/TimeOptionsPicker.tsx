import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Globe, MoreVertical, Plus, Rows3, X } from "lucide-react";
import { addMonths, hourRange, monthGrid, placeEvents } from "../../lib/pf/calendar";
import { addDays } from "../../lib/pf/facility";
import { weekStart } from "../../lib/pf/people";
import { DURATIONS, addDay, addTimeTo, clockLabel, copyTimesToAll, durationLabel, fmtDay, optionLabel, removeDay, sharedDuration, slotAt, sortOptions, startChoices, toClock, toMinutes, withDuration, type Busy, type TimeOption } from "../../lib/pf/booking";
import { display } from "../../lib/fonts";
import { Card } from "./ui";

// Picking the times a booking offers, as a scheduling poll does: dates on a month
// calendar, then one or more times on each, all of one length unless changed by hand.
// The week view places times on an hour grid next to what already holds the room.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ------------------------------------------------- the month calendar alone */

/**
 * A month of days to pick from, several at once. Shared with the team schedule, which
 * picks the days of a run of shifts the same way.
 */
export function MultiDateCalendar({ selected, onToggle, today, month, onMonth, marked, allowPast = false }: { selected: ReadonlySet<string>; onToggle: (day: string) => void; today: string; month: string; onMonth: (m: string) => void; marked?: ReadonlySet<string>; allowPast?: boolean }) {
  const days = monthGrid(month);
  const thisMonth = month.slice(0, 7);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))} className="grid h-9 w-9 place-items-center rounded-full border border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display} aria-live="polite">{fmtDay(month, { month: "long", year: "numeric" })}</p>
        <button type="button" aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))} className="grid h-9 w-9 place-items-center rounded-full border border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAYS.map((w) => <p key={w} className="text-center text-[12px] font-medium text-[#4F6B73]">{w}</p>)}
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-[#DCE7E8]">
        {days.map((d, i) => {
          const inMonth = d.slice(0, 7) === thisMonth;
          const past = !allowPast && d < today;
          const on = selected.has(d);
          const now = d === today;
          return (
            <button
              key={d}
              type="button"
              disabled={past}
              aria-pressed={on}
              aria-label={`${fmtDay(d, { weekday: "long", day: "numeric", month: "long" })}${on ? ", picked" : ""}${marked?.has(d) ? ", something already booked" : ""}`}
              onClick={() => onToggle(d)}
              className={`relative flex h-11 items-center justify-center text-[13.5px] tabular-nums transition-colors ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} border-[#E3ECED] ${
                past ? "cursor-not-allowed bg-[#FAFCFC] text-[#B5C4C7]" : on ? "" : inMonth ? "bg-white text-[#0F2F36] hover:bg-[#EEF5F5]" : "bg-[#FAFCFC] text-[#6B8187] hover:bg-[#EEF5F5]"
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-md ${on ? "bg-[#0B6477] font-semibold text-white" : now ? "font-semibold text-[#14919B] ring-1 ring-[#14919B]/40" : ""}`}>{Number(d.slice(8))}</span>
              {marked?.has(d) && <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${on ? "bg-[#45DFB1]" : "bg-[#B26205]"}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------- one day's times */

const pill = "inline-flex min-h-[40px] items-center rounded-lg border border-[#DCE7E8] bg-white px-2.5 text-[16px] font-medium tabular-nums text-[#0F2F36] hover:border-[#14919B] focus:border-[#0B6477] sm:min-h-[36px] sm:text-[14px]";

function DayTimes({ day, options, all, duration, clashes, onChange }: { day: string; options: TimeOption[]; all: TimeOption[]; duration: number; clashes: (o: TimeOption) => string[]; onChange: (next: TimeOption[]) => void }) {
  const starts = startChoices();
  const replace = (old: TimeOption, next: TimeOption) => onChange(sortOptions(all.map((o) => (o === old ? next : o))));
  const remove = (old: TimeOption) => onChange(all.filter((o) => o !== old));
  const allDay = options.some((o) => !o.start);
  return (
    <div className="flex gap-3 border-b border-[#EDF2F2] px-4 py-3 last:border-b-0">
      <div className="w-12 shrink-0 overflow-hidden rounded-lg border border-[#DCE7E8] text-center">
        <p className="bg-[#F3F7F7] py-0.5 text-[11px] font-medium text-[#4F6B73]">{fmtDay(day, { month: "short" })}</p>
        <p className="py-0.5 text-[18px] font-semibold tabular-nums text-[#0F2F36]">{Number(day.slice(8))}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[12.5px] text-[#4F6B73]">{fmtDay(day, { weekday: "long" })}</p>
        {options.map((o) => {
          const notes = clashes(o);
          const ends = o.start ? Array.from({ length: 48 }, (_, i) => toMinutes(o.start as string) + (i + 1) * 15).filter((m) => m <= 24 * 60) : [];
          return (
            <div key={`${o.start}-${o.end}`}>
              <div className="flex flex-wrap items-center gap-2">
                {o.start && o.end ? (
                  <>
                    <select
                      aria-label={`Start on ${fmtDay(day, { weekday: "long", day: "numeric", month: "long" })}`}
                      className={pill}
                      value={o.start}
                      onChange={(e) => replace(o, slotAt(day, toMinutes(e.target.value), toMinutes(o.end as string) - toMinutes(o.start as string)))}
                    >
                      {(starts.includes(o.start) ? starts : [o.start, ...starts].sort()).map((s) =><option key={s} value={s}>{clockLabel(s)}</option>)}
                    </select>
                    <span className="text-[#9DB2B6]" aria-hidden="true">–</span>
                    <select aria-label={`End on ${fmtDay(day, { weekday: "long", day: "numeric", month: "long" })}`} className={pill} value={toMinutes(o.end)} onChange={(e) => replace(o, { ...o, end: toClock(Number(e.target.value)) })}>
                      {ends.map((m) => <option key={m} value={m}>{clockLabel(toClock(m))} · {durationLabel(m - toMinutes(o.start as string))}</option>)}
                    </select>
                  </>
                ) : (
                  <span className={`${pill} cursor-default`}>All day</span>
                )}
                <button type="button" aria-label={`Remove ${optionLabel(o)} on ${fmtDay(day, { day: "numeric", month: "long" })}`} onClick={() => remove(o)} className="grid h-9 w-9 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#EEF5F5] hover:text-[#B3362C]"><X className="h-4 w-4" /></button>
              </div>
              {notes.map((n) => <p key={n} className="mt-1 text-[12.5px] font-medium text-[#8A5A07]">{n}</p>)}
            </div>
          );
        })}
        <div className="flex items-center gap-1">
          {!allDay && duration !== 0 && (
            <button type="button" onClick={() => onChange(addTimeTo(all, day, duration || 60))} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-dashed border-[#C9D8DA] px-3 text-[13.5px] font-medium text-[#36525A] hover:border-[#14919B] hover:text-[#0B6477] sm:min-h-[34px]">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add time option
            </button>
          )}
          <details className="relative">
            <summary aria-label={`More for ${fmtDay(day, { day: "numeric", month: "long" })}`} className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg text-[#4F6B73] hover:bg-[#EEF5F5] [&::-webkit-details-marker]:hidden"><MoreVertical className="h-4 w-4" /></summary>
            <div className="absolute left-0 z-20 mt-1 w-[220px] rounded-lg border border-[#DCE7E8] bg-white p-1 shadow-lg">
              <button type="button" onClick={(e) => { onChange(copyTimesToAll(all, day)); e.currentTarget.closest("details")?.removeAttribute("open"); }} className="block w-full rounded-md px-2.5 py-2 text-left text-[13.5px] text-[#0F2F36] hover:bg-[#EEF5F5]">Use these times on every date</button>
              <button type="button" onClick={() => onChange(removeDay(all, day))} className="block w-full rounded-md px-2.5 py-2 text-left text-[13.5px] text-[#B3362C] hover:bg-[#FDECEA]">Remove this date</button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- the week view */

const HOUR_PX = 44;

function WeekGrid({ week, today, options, busy, duration, onChange }: { week: string; today: string; options: TimeOption[]; busy: Busy[]; duration: number; onChange: (next: TimeOption[]) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const timed = (o: { day: string; start: string | null; end: string | null }) => days.includes(o.day) && !!o.start && !!o.end;
  const ranges = [...options, ...busy].filter(timed).map((o) => ({ from: toMinutes(o.start as string), to: toMinutes(o.end as string) }));
  const { from, to } = hourRange(ranges, 7, 19);
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const columns = "52px repeat(7, minmax(84px, 1fr))";
  const add = (day: string, minutes: number) => {
    const next = slotAt(day, minutes, duration);
    if (options.some((o) => o.day === next.day && o.start === next.start && o.end === next.end)) return;
    // A whole day replaces the times on it; a time replaces a whole day.
    onChange(sortOptions([...options.filter((o) => o.day !== day || (next.start ? !!o.start : false)), next]));
  };
  const anyAllDay = days.some((d) => options.some((o) => o.day === d && !o.start) || busy.some((b) => b.day === d && !b.start));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid border-b border-[#EDF2F2]" style={{ gridTemplateColumns: columns }}>
          <span />
          {days.map((d) => (
            <div key={d} className="border-l border-[#EDF2F2] py-2 text-center">
              <p className={`text-[12px] font-medium ${d === today ? "text-[#0B6477]" : "text-[#4F6B73]"}`}>{fmtDay(d, { weekday: "short" })}</p>
              <p className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-[15px] font-medium tabular-nums ${d === today ? "bg-[#0B6477] text-white" : "text-[#0F2F36]"}`}>{Number(d.slice(8))}</p>
            </div>
          ))}
        </div>
        {anyAllDay && (
          <div className="grid border-b border-[#EDF2F2]" style={{ gridTemplateColumns: columns }}>
            <span className="px-1.5 py-1 text-right text-[11px] text-[#4F6B73]">All day</span>
            {days.map((d) => (
              <div key={d} className="min-w-0 space-y-0.5 border-l border-[#EDF2F2] p-1">
                {busy.filter((b) => b.day === d && !b.start).map((b) => <p key={b.bookingId} className="truncate rounded bg-[#EEF3F4] px-1.5 py-0.5 text-[11.5px] text-[#4F6B73]" title={b.title}>{b.title}</p>)}
                {options.filter((o) => o.day === d && !o.start).map((o) => (
                  <button key="all" type="button" onClick={() => onChange(options.filter((x) => x !== o))} aria-label={`Remove all day on ${fmtDay(d, { day: "numeric", month: "long" })}`} className="flex w-full items-center justify-between rounded bg-[#0B6477] px-1.5 py-0.5 text-[11.5px] font-medium text-white">All day <X className="h-3 w-3" /></button>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          <div>
            {hours.map((h) => <div key={h} className="pr-1.5 text-right text-[11px] tabular-nums text-[#6B8187]" style={{ height: HOUR_PX }}><span className="relative -top-1.5">{h === from ? "" : `${String(h).padStart(2, "0")}.00`}</span></div>)}
          </div>
          {days.map((d) => {
            const past = d < today;
            const mine = options.filter((o) => o.day === d && o.start && o.end);
            const held = busy.filter((b) => b.day === d && b.start && b.end);
            const placed = placeEvents([...held.map((b) => ({ busy: b as Busy | null, option: null as TimeOption | null })), ...mine.map((o) => ({ busy: null, option: o }))], (x) => {
              const o = (x.busy ?? x.option) as TimeOption;
              return { from: toMinutes(o.start as string), to: toMinutes(o.end as string) };
            });
            return (
              <div key={d} className={`relative border-l border-[#EDF2F2] ${past ? "bg-[#FAFCFC]" : d === today ? "bg-[#F6FAFA]" : ""}`} style={{ height: hours.length * HOUR_PX }}>
                {hours.flatMap((h, i) => [0, 30].map((m) => (
                  <button
                    key={`${h}-${m}`}
                    type="button"
                    disabled={past}
                    tabIndex={past ? -1 : 0}
                    aria-label={`Offer ${fmtDay(d, { weekday: "short", day: "numeric", month: "short" })} at ${clockLabel(toClock(h * 60 + m))}`}
                    onClick={() => add(d, h * 60 + m)}
                    className={`absolute inset-x-0 block ${m === 0 && i > 0 ? "border-t border-[#EDF2F2]" : ""} ${past ? "cursor-not-allowed" : "hover:bg-[#E3F4F4]"}`}
                    style={{ top: i * HOUR_PX + (m ? HOUR_PX / 2 : 0), height: HOUR_PX / 2 }}
                  />
                )))}
                {placed.map(({ item, from: a, to: b, lane, lanes }) => {
                  const style = { top: ((a - from * 60) / 60) * HOUR_PX + 1, height: Math.max(20, ((b - a) / 60) * HOUR_PX - 2), left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` };
                  if (item.busy) {
                    return (
                      <div key={`b-${item.busy.bookingId}`} className="absolute z-10 overflow-hidden rounded-md border border-[#DCE7E8] bg-[repeating-linear-gradient(45deg,#F3F7F7,#F3F7F7_6px,#E9EFF0_6px,#E9EFF0_12px)] px-1.5 py-1 text-[11.5px] leading-tight text-[#4F6B73]" style={style} title={`Already booked: ${item.busy.title}`}>
                        <p className="truncate font-medium">{item.busy.title}</p>
                        <p className="truncate tabular-nums">{optionLabel(item.busy)}</p>
                      </div>
                    );
                  }
                  const o = item.option as TimeOption;
                  return (
                    <button key={`o-${o.start}`} type="button" onClick={() => onChange(options.filter((x) => x !== o))} aria-label={`Remove ${optionLabel(o)} on ${fmtDay(d, { day: "numeric", month: "long" })}`} className="group absolute z-10 overflow-hidden rounded-md bg-[#0B6477] px-1.5 py-1 text-left text-[11.5px] font-medium leading-tight text-white shadow-sm hover:bg-[#08313A]" style={style}>
                      <span className="flex items-start justify-between gap-1"><span className="truncate tabular-nums">{optionLabel(o)}</span><X className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" /></span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- picker */

type View = "month" | "week";

export function TimeOptionsPicker({ options, onChange, today, busy = [], clashes = () => [] }: { options: TimeOption[]; onChange: (next: TimeOption[]) => void; today: string; busy?: Busy[]; clashes?: (o: TimeOption) => string[] }) {
  const [view, setView] = useState<View>("month");
  const [month, setMonth] = useState(() => `${(options[0]?.day ?? today).slice(0, 7)}-01`);
  const [week, setWeek] = useState(() => weekStart(options[0]?.day ?? today));
  const [chosen, setChosen] = useState(60);
  const shared = sharedDuration(options);
  const duration = shared ?? (options.length ? -1 : chosen);
  const picked = new Set(options.map((o) => o.day));
  const days = [...picked].sort();
  const marked = new Set(busy.map((b) => b.day));

  const setDuration = (d: number) => {
    setChosen(d);
    onChange(withDuration(options, d));
  };
  const length = duration < 0 ? chosen : duration;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>Calendar</h2>
          <p className="text-[13px] text-[#4F6B73]">Pick the dates, then one or more times on each.</p>
        </div>
        <div className="flex rounded-lg bg-[#EEF3F4] p-0.5 text-[13px] font-medium" role="group" aria-label="Calendar view">
          {([["month", "Month view", CalendarDays], ["week", "Week view", Rows3]] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-3 sm:min-h-[32px] ${view === key ? "bg-white text-[#0F2F36] shadow-sm" : "text-[#4F6B73] hover:text-[#0F2F36]"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3ECED] px-4 py-2.5">
        <p className="text-[14px] font-medium text-[#0F2F36]">Duration</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Duration">
          {DURATIONS.map((d) => (
            <button key={d.key} type="button" aria-pressed={duration === d.key} onClick={() => setDuration(d.key)} className={`min-h-[40px] rounded-full border px-3 text-[13.5px] font-medium sm:min-h-[32px] ${duration === d.key ? "border-[#14919B] bg-[#E3F4F4] text-[#0B6477]" : "border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-1 border-t border-[#E3ECED] md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="p-4 md:border-r md:border-[#E3ECED]">
            <MultiDateCalendar selected={picked} today={today} month={month} onMonth={setMonth} marked={marked} onToggle={(d) => onChange(picked.has(d) ? removeDay(options, d) : addDay(options, d, length))} />
            <button type="button" onClick={() => setMonth(`${today.slice(0, 7)}-01`)} className="mt-3 min-h-[40px] w-full rounded-lg border border-[#DCE7E8] bg-white text-[13.5px] font-medium text-[#0F2F36] hover:border-[#14919B] sm:min-h-[36px]">Today</button>
            {marked.size > 0 && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#4F6B73]"><span className="h-1.5 w-1.5 rounded-full bg-[#B26205]" /> The room is already booked for part of that day</p>}
          </div>
          <div className="min-w-0 border-t border-[#E3ECED] md:border-t-0">
            {days.length === 0 ? (
              <p className="px-4 py-10 text-center text-[14px] text-[#4F6B73]">Pick one or more dates on the calendar.</p>
            ) : (
              days.map((d) => <DayTimes key={d} day={d} options={options.filter((o) => o.day === d)} all={options} duration={length} clashes={clashes} onChange={onChange} />)
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-[#E3ECED]">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <button type="button" aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))} className="grid h-9 w-9 place-items-center rounded-full border border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" aria-label="Next week" onClick={() => setWeek(addDays(week, 7))} className="grid h-9 w-9 place-items-center rounded-full border border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            <p className="text-[14.5px] font-semibold tracking-[-0.02em] text-[#0F2F36]" aria-live="polite">{fmtDay(week, { day: "numeric", month: "short" })}–{fmtDay(addDays(week, 6), { day: "numeric", month: "short", year: "numeric" })}</p>
            <button type="button" onClick={() => setWeek(weekStart(today))} className="ml-auto min-h-[36px] rounded-lg border border-[#DCE7E8] bg-white px-3 text-[13px] font-medium text-[#0F2F36] hover:border-[#14919B]">This week</button>
          </div>
          <p className="px-4 pb-2 text-[12.5px] text-[#4F6B73]">Click an empty spot to offer a time of the chosen length there; click a time to remove it. Striped blocks are already booked.</p>
          <WeekGrid week={week} today={today} options={options} busy={busy} duration={length} onChange={onChange} />
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-[#E3ECED] px-4 py-2.5 text-[13px] text-[#4F6B73]">
        <Globe className="h-4 w-4" aria-hidden="true" /> Times are in WIB (Asia/Jakarta), the lab's time.
      </div>
    </Card>
  );
}
