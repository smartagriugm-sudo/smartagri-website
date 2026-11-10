import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Plus, UserRound, Users } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { addDays } from "../../lib/pf/facility";
import { BOOKING_STAGE, bookingStage, emptyBookingForm, fetchBookings, fmtDay, kindOf, optionLabel, saveBooking, sortDay, spaceLabel, whenLabel, type Booking, type BookingStage } from "../../lib/pf/booking";
import { fetchLeaves, fetchMyPersonId, fetchPeople } from "../../lib/pf/people";
import { BookingEditor } from "./BookingEditor";
import { DataState, ErpPage, useLoad } from "./page";
import { Card, Kpi, Segmented } from "./ui";

// Bookings: research sessions, visits, trainings and meetings. Booked ones run by
// day, so the week ahead reads like a diary; polls wait in their own list until a
// time is confirmed.

const TABS: { key: BookingStage; label: string }[] = [
  { key: "booked", label: "Upcoming" },
  { key: "finding", label: "Finding a time" },
  { key: "done", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

function StageBadge({ stage }: { stage: BookingStage }) {
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ${BOOKING_STAGE[stage].className}`}>{BOOKING_STAGE[stage].label}</span>;
}

export function KindTag({ kind }: { kind: string }) {
  const k = kindOf(kind);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#36525A]">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: k.color }} /> {k.label}
    </span>
  );
}

function Row({ b, stage, showTime }: { b: Booking; stage: BookingStage; showTime: boolean }) {
  return (
    <Link to="/erp/bookings/$id" params={{ id: b.id }} className="flex flex-col gap-2 px-4 py-3 hover:bg-[#F6FAFA] sm:flex-row sm:items-center sm:gap-4">
      {showTime && (
        <p className="w-[104px] shrink-0 text-[14px] font-medium tabular-nums text-[#0F2F36]">{b.chosen_day ? optionLabel({ start: b.chosen_start, end: b.chosen_end }) : ""}</p>
      )}
      <span aria-hidden="true" className="hidden h-9 w-1 shrink-0 rounded-full sm:block" style={{ background: kindOf(b.kind).color }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate text-[14.5px] font-medium text-[#0F2F36]">{b.title}</p>
          <KindTag kind={b.kind} />
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-[#4F6B73]">
          {!showTime && <span>{whenLabel(b)}</span>}
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{spaceLabel(b.space)}</span>
          {b.host_name && <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" aria-hidden="true" />{b.host_name}</span>}
          {(b.guest_org || b.guest_count) && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{[b.guest_count ? `${b.guest_count} guests` : "", b.guest_org].filter(Boolean).join(" from ")}</span>}
          {stage === "finding" && <span>{b.voter_count} {b.voter_count === 1 ? "person has" : "people have"} answered</span>}
        </p>
      </div>
      <StageBadge stage={stage} />
    </Link>
  );
}

export default function BookingsPage() {
  const today = jakartaToday();
  const state = useLoad(fetchBookings);
  const [tab, setTab] = useState<BookingStage>("booked");

  const staged = useMemo(() => (state.data ?? []).map((b) => ({ b, stage: bookingStage(b, today) })), [state.data, today]);
  const counts = Object.fromEntries(TABS.map((t) => [t.key, staged.filter((x) => x.stage === t.key).length])) as Record<BookingStage, number>;
  const shown = staged.filter((x) => x.stage === tab).sort((x, y) => {
    const dir = tab === "booked" || tab === "finding" ? 1 : -1;
    return dir * (sortDay(x.b).localeCompare(sortDay(y.b)) || (x.b.chosen_start ?? "").localeCompare(y.b.chosen_start ?? ""));
  });
  const weekEnd = addDays(today, 6);
  const thisWeek = staged.filter((x) => x.stage === "booked" && (x.b.chosen_day ?? "") <= weekEnd);
  const guestsThisWeek = thisWeek.reduce((n, x) => n + (x.b.guest_count ?? 0), 0);

  // Booked ones by day, with the day as a heading, so the list reads like a diary.
  const byDay = tab === "booked" ? [...new Set(shown.map((x) => x.b.chosen_day as string))] : [];

  return (
    <ErpPage
      eyebrow="Team"
      title="Bookings"
      sub="Research sessions, visits, trainings and meetings. Offer one time to book it, or several to let people answer which suit them."
      actions={<Link to="/erp/bookings/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#45DFB1] px-3.5 py-2 text-[14px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] sm:min-h-0"><Plus className="h-4 w-4" aria-hidden="true" /> New booking</Link>}
    >
      <DataState state={state}>
        {() => (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Kpi label="Booked this week" value={String(thisWeek.length)} sub={`${fmtDay(today, { day: "numeric", month: "short" })}–${fmtDay(weekEnd, { day: "numeric", month: "short" })}`} />
              <Kpi label="Guests this week" value={String(guestsThisWeek)} sub="From the booked visits and trainings" />
              <Kpi label="Finding a time" value={String(counts.finding)} sub="Polls still open" />
            </div>
            <Segmented value={tab} onChange={setTab} options={TABS.map((t) => ({ key: t.key, label: `${t.label} ${counts[t.key]}` }))} />
            {shown.length === 0 ? (
              <Card className="px-4 py-10 text-center">
                <p className="text-[14px] text-[#4F6B73]">{tab === "booked" ? "Nothing booked ahead." : tab === "finding" ? "No polls open." : tab === "done" ? "Nothing in the past yet." : "Nothing cancelled."}</p>
                {(tab === "booked" || tab === "finding") && <Link to="/erp/bookings/new" className="mt-2 inline-block text-[14px] font-medium text-[#0B6477] hover:underline">Make a booking</Link>}
              </Card>
            ) : tab === "booked" ? (
              <div className="space-y-3">
                {byDay.map((day) => (
                  <Card key={day} className="overflow-hidden">
                    <p className="border-b border-[#EDF2F2] bg-[#F7FAFA] px-4 py-2 text-[13px] font-medium text-[#36525A]">
                      {day === today ? "Today · " : day === addDays(today, 1) ? "Tomorrow · " : ""}{fmtDay(day, { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <div className="divide-y divide-[#EDF2F2]">
                      {shown.filter((x) => x.b.chosen_day === day).map((x) => <Row key={x.b.id} b={x.b} stage={x.stage} showTime />)}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="divide-y divide-[#EDF2F2] overflow-hidden">
                {shown.map((x) => <Row key={x.b.id} b={x.b} stage={x.stage} showTime={false} />)}
              </Card>
            )}
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}

/* ----------------------------------------------------------------- new one */

export function NewBookingPage() {
  const today = jakartaToday();
  const navigate = useNavigate();
  const state = useLoad(async () => {
    // People and leave are read only as far as the account may; a researcher sees just themselves.
    const [bookings, people, leaves, me] = await Promise.all([fetchBookings(), fetchPeople().catch(() => []), fetchLeaves().catch(() => []), fetchMyPersonId().catch(() => null)]);
    return { bookings, people, leaves, me };
  });
  return (
    <ErpPage eyebrow="Bookings" title="New booking" sub="Offer one time to book it straight away, or several to ask people which suit them.">
      <DataState state={state}>
        {({ bookings, people, leaves, me }) => (
          <BookingEditor
            initial={emptyBookingForm(me ?? "")}
            people={people}
            bookings={bookings}
            leaves={leaves}
            today={today}
            onSave={async (f) => {
              const id = await saveBooking(null, f);
              await navigate({ to: "/erp/bookings/$id", params: { id } });
            }}
          />
        )}
      </DataState>
    </ErpPage>
  );
}
