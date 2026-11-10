import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, Link2 } from "lucide-react";
import { hourRange, placeEvents } from "../../lib/pf/calendar";
import { addDays } from "../../lib/pf/facility";
import { ANSWERS, bookingIcs, bookingMessage, countdownLabel, dayLanes, fmtDay, kindOf, optionLabel, overlaps, toMinutes, type Answer, type Booking, type LaneItem } from "../../lib/pf/booking";
import { display } from "../../lib/fonts";
import { Card } from "./ui";

// The parts of a booking's page around its time: the day it falls on across the lab's
// spaces, who is coming, and ways to pass the booking on.

/* ------------------------------------------------------------ the clock */

const jakartaMinutes = () => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number);
  return h * 60 + m;
};

/** The lab's clock in minutes since midnight, moving once a minute. Null until mounted, so the server and the browser agree. */
function useJakartaMinutes() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(jakartaMinutes());
    const t = window.setInterval(() => setNow(jakartaMinutes()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/* ------------------------------------------------------- the day by space */

const LANE_PX = 52;
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}.${String(m % 60).padStart(2, "0")}`;

/**
 * One day as a row per space, with each booking where it sits in the day. The booking
 * on screen stands out; the others open on a click. Times a poll offers show dashed,
 * with their count of yes answers, and turn amber where the room is already taken.
 */
export function DayTimeline({ days, bookings, focusId, focusSpace, today, offered = [], onOffered, title = "That day across the lab" }: {
  days: string[];
  bookings: readonly Booking[];
  focusId: string;
  focusSpace: string;
  today: string;
  offered?: (LaneItem & { day: string })[];
  onOffered?: (id: string) => void;
  title?: string;
}) {
  const [day, setDay] = useState(days[0]);
  const now = useJakartaMinutes();
  const lanes = dayLanes(day, bookings, focusSpace, offered.filter((o) => o.day === day));
  const timed = lanes.flatMap((l) => l.items).filter((i) => i.start && i.end).map((i) => ({ from: toMinutes(i.start as string), to: toMinutes(i.end as string) }));
  const { from, to } = hourRange(timed, 8, 17);
  const span = (to - from) * 60;
  const at = (m: number) => `${((m - from * 60) / span) * 100}%`;
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const others = lanes.reduce((n, l) => n + l.items.filter((i) => i.id !== focusId && !i.offered).length, 0);
  const nowIn = day === today && now !== null && now >= from * 60 && now <= to * 60;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>{title}</h2>
          <p className="text-[13px] text-[#4F6B73]">
            {fmtDay(day, { weekday: "long", day: "numeric", month: "long" })} · {countdownLabel(day, today)} · {others === 0 ? "nothing else booked" : `${others} other ${others === 1 ? "booking" : "bookings"}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Day before" onClick={() => setDay(addDays(day, -1))} className="grid h-9 w-9 place-items-center rounded-full border border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => setDay(days[0])} disabled={day === days[0] && days.length === 1} className="min-h-[36px] rounded-lg border border-[#DCE7E8] bg-white px-3 text-[13px] font-medium text-[#0F2F36] hover:border-[#14919B] disabled:opacity-50">{days.length > 1 ? "First offered day" : "Its day"}</button>
          <button type="button" aria-label="Day after" onClick={() => setDay(addDays(day, 1))} className="grid h-9 w-9 place-items-center rounded-full border border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>

      {days.length > 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3" role="group" aria-label="Days offered">
          {days.map((d) => (
            <button key={d} type="button" aria-pressed={d === day} onClick={() => setDay(d)} className={`min-h-[36px] rounded-full border px-3 text-[13px] font-medium tabular-nums ${d === day ? "border-[#14919B] bg-[#E3F4F4] text-[#0B6477]" : "border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"}`}>
              {fmtDay(d, { weekday: "short", day: "numeric", month: "short" })}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 overflow-x-auto border-t border-[#E3ECED]">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[132px_minmax(0,1fr)] border-b border-[#EDF2F2]">
            <span />
            <div className="relative h-7">
              {hours.map((h, i) => (
                <span key={h} className="absolute top-1.5 -translate-x-1/2 text-[11px] tabular-nums text-[#6B8187]" style={{ left: at(h * 60) }}>
                  {i === 0 || i === hours.length - 1 ? "" : `${String(h).padStart(2, "0")}.00`}
                </span>
              ))}
            </div>
          </div>

          {lanes.map((lane) => {
            const allDay = lane.items.filter((i) => !i.start);
            const placed = placeEvents(lane.items.filter((i) => i.start && i.end), (i) => ({ from: toMinutes(i.start as string), to: toMinutes(i.end as string) }));
            const rows = Math.max(1, ...placed.map((p) => p.lanes));
            const booked = lane.items.filter((i) => !i.offered && i.id !== focusId);
            return (
              <div key={lane.space} className="grid grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[132px_minmax(0,1fr)] border-b border-[#EDF2F2] last:border-b-0">
                <div className={`flex items-center px-4 text-[13px] ${lane.space === focusSpace ? "font-medium text-[#0F2F36]" : "text-[#4F6B73]"}`}>{lane.label}</div>
                <div className="relative" style={{ height: rows * LANE_PX + (allDay.length ? 22 : 0) }}>
                  {hours.map((h) => <span key={h} aria-hidden="true" className="absolute inset-y-0 border-l border-[#F0F4F4]" style={{ left: at(h * 60) }} />)}
                  {allDay.map((i, n) => (
                    <p key={i.id} className={`absolute inset-x-1 truncate rounded px-2 py-0.5 text-[11.5px] font-medium ${i.id === focusId ? "bg-[#0B6477] text-white" : "bg-[#EEF3F4] text-[#36525A]"}`} style={{ top: 2 + n * 20 }}>All day · {i.title}</p>
                  ))}
                  {placed.map(({ item, from: a, to: b, lane: row, lanes: of }) => {
                    const h = (rows * LANE_PX) / of;
                    const style = { left: `calc(${at(a)} + 1px)`, width: `calc(${((b - a) / span) * 100}% - 2px)`, top: (allDay.length ? 22 : 0) + row * h + 4, height: h - 8 };
                    const label = `${item.title}, ${optionLabel(item)}`;
                    if (item.offered) {
                      const clash = lane.space === focusSpace && booked.some((x) => overlaps({ day, start: item.start, end: item.end }, { day, start: x.start, end: x.end }));
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onOffered?.(item.id)}
                          aria-label={`Offered time ${optionLabel(item)}, ${item.score ?? 0} yes${clash ? ", clashes with a booking" : ""}`}
                          title={`${optionLabel(item)} · ${item.score ?? 0} yes${clash ? " · the room is taken" : ""}${onOffered ? " · click to confirm" : ""}`}
                          className={`absolute z-10 flex min-w-0 items-center gap-1 overflow-hidden rounded-md border-2 border-dashed px-1.5 text-left text-[11.5px] font-medium leading-tight transition-colors ${onOffered ? "" : "cursor-default"} ${clash ? "border-[#D98B1F] bg-[#FFF6E5]/90 text-[#8A5A07] hover:bg-[#FFEBC7]" : "border-[#14919B] bg-[#E3F4F4]/90 text-[#0B6477] hover:bg-[#CDEDED]"}`}
                          style={style}
                        >
                          <span className="truncate tabular-nums">{item.start ? clock(toMinutes(item.start)) : "All day"}</span>
                          <span className="ml-auto inline-flex shrink-0 items-center tabular-nums"><Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />{item.score ?? 0}</span>
                        </button>
                      );
                    }
                    if (item.id === focusId) {
                      return (
                        <div key={item.id} className="absolute z-10 overflow-hidden rounded-md bg-[#0B6477] px-2 py-1 text-[11.5px] leading-tight text-white shadow-sm ring-2 ring-[#45DFB1]/60" style={style} title={label}>
                          <p className="truncate font-semibold">{item.title}</p>
                          <p className="truncate tabular-nums text-white/80">{optionLabel(item)}</p>
                        </div>
                      );
                    }
                    return (
                      <Link key={item.id} to="/erp/bookings/$id" params={{ id: item.id }} title={label} className="absolute z-10 overflow-hidden rounded-md border border-[#DCE7E8] bg-white px-2 py-1 text-[11.5px] leading-tight text-[#36525A] transition-colors hover:border-[#14919B] hover:bg-[#F3FAFA]" style={{ ...style, borderLeft: `3px solid ${kindOf(item.kind).color}` }}>
                        <p className="truncate font-medium text-[#0F2F36]">{item.title}</p>
                        <p className="truncate tabular-nums">{optionLabel(item)}</p>
                      </Link>
                    );
                  })}
                  {nowIn && (
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-[#D9483B]" style={{ left: at(now as number) }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#E3ECED] px-4 py-2.5 text-[12px] text-[#4F6B73]">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[#0B6477]" /> This booking</span>
        {offered.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border-2 border-dashed border-[#14919B]" /> Times offered, with yes answers</span>}
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-[#DCE7E8] bg-white" /> Other bookings, open on a click</span>
        {nowIn && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-0.5 bg-[#D9483B]" /> Now, {clock(now as number)}</span>}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- who comes */

const initials = (name: string) => name.replace(/^Dummy\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

export type Attendee = { id: string; name: string; role: string; answer?: Answer };

/** The lab's people on a booking, with what each said about its time when there was a poll. */
export function WhoIsComing({ people, guests, title = "Who is coming", empty = "Nobody from the lab is on this booking yet." }: { people: Attendee[]; guests?: string; title?: string; empty?: string }) {
  const said = people.filter((p) => p.answer);
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>{title}</h2>
        {said.length > 0 && <p className="text-[12.5px] text-[#4F6B73]">{said.filter((p) => p.answer === "ya").length} of {people.length} said yes to this time</p>}
      </div>
      {people.length === 0 ? (
        <p className="text-[13.5px] text-[#4F6B73]">{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.id} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-[#EDF2F2] px-2.5 py-2">
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E3F4F4] text-[12px] font-semibold text-[#0B6477]">{initials(p.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-[#0F2F36]">{p.name}</p>
                <p className="text-[12px] text-[#4F6B73]">{p.role}</p>
              </div>
              {p.answer && <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${ANSWERS[p.answer].className}`}>{ANSWERS[p.answer].label}</span>}
            </li>
          ))}
        </ul>
      )}
      {guests && <p className="mt-3 border-t border-[#EDF2F2] pt-3 text-[13px] text-[#36525A]">Plus {guests}</p>}
    </Card>
  );
}

/* ---------------------------------------------------------- passing it on */

/** Copies text, and says so for two seconds. */
function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  };
  return { copied, copy };
}

const shareButton = "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#DCE7E8] bg-white px-3 text-[13.5px] font-medium text-[#0F2F36] transition-colors hover:border-[#14919B] sm:min-h-[36px]";

/** Add to a calendar, and copy the details for the guests. */
export function ShareBooked({ booking }: { booking: Booking }) {
  const { copied, copy } = useCopied();
  const download = () => {
    const ics = bookingIcs(booking);
    if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${booking.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "booking"}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={download} className={shareButton}><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to calendar</button>
      <button type="button" onClick={() => void copy("details", bookingMessage(booking))} className={shareButton}>
        {copied === "details" ? <Check className="h-4 w-4 text-[#0E7A5C]" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied === "details" ? "Copied" : "Copy details for guests"}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? "Copied to the clipboard" : ""}</span>
    </div>
  );
}

/** The people asked who have not answered yet, with the link to send them. */
export function StillToAnswer({ names }: { names: string[] }) {
  const { copied, copy } = useCopied();
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>{names.length === 0 ? "Everyone invited has answered" : `Still to answer · ${names.length}`}</h2>
          <p className="text-[13px] text-[#4F6B73]">{names.length === 0 ? "Pick the best time and confirm it, or wait for more answers." : "Send them the link to this poll; they answer once signed in."}</p>
        </div>
        <button type="button" onClick={() => void copy("link", window.location.href)} className={shareButton}>
          {copied === "link" ? <Check className="h-4 w-4 text-[#0E7A5C]" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          {copied === "link" ? "Link copied" : "Copy poll link"}
        </button>
      </div>
      {names.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {names.map((n) => <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#C9D8DA] px-2.5 py-1 text-[12.5px] text-[#36525A]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#C9D8DA]" />{n}</span>)}
        </div>
      )}
      <span className="sr-only" aria-live="polite">{copied ? "Link copied to the clipboard" : ""}</span>
    </Card>
  );
}
