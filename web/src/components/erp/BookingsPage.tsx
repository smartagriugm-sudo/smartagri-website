import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Plus, UserRound, Users } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { addDays } from "../../lib/pf/facility";
import { BOOKING_STAGE, bookingStage, bookingStageLabel, emptyBookingForm, fetchBookings, fmtDay, kindLabel, kindOf, optionLabel, saveBooking, sortDay, spaceLabel, whenLabel, type Booking, type BookingStage } from "../../lib/pf/booking";
import { useLang, useT } from "../../lib/i18n";
import { fetchLeaves, fetchMyPersonId, fetchPeople } from "../../lib/pf/people";
import { BookingEditor } from "./BookingEditor";
import { DataState, ErpPage, useLoad } from "./page";
import { Card, Kpi, Segmented } from "./ui";

// Bookings: research sessions, visits, trainings and meetings. Booked ones run by
// day, so the week ahead reads like a diary; polls wait in their own list until a
// time is confirmed.

const TABS: { key: BookingStage; label: string; labelId: string }[] = [
  { key: "booked", label: "Upcoming", labelId: "Mendatang" },
  { key: "finding", label: "Finding a time", labelId: "Mencari waktu" },
  { key: "done", label: "Past", labelId: "Lewat" },
  { key: "cancelled", label: "Cancelled", labelId: "Dibatalkan" },
];

function StageBadge({ stage }: { stage: BookingStage }) {
  const lang = useLang();
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium ${BOOKING_STAGE[stage].className}`}>{bookingStageLabel(stage, lang)}</span>;
}

export function KindTag({ kind }: { kind: string }) {
  const k = kindOf(kind);
  const lang = useLang();
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#36525A]">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: k.color }} /> {kindLabel(kind, lang)}
    </span>
  );
}

function Row({ b, stage, showTime }: { b: Booking; stage: BookingStage; showTime: boolean }) {
  const t = useT();
  const lang = useLang();
  return (
    <Link to="/erp/bookings/$id" params={{ id: b.id }} className="flex flex-col gap-2 px-4 py-3 hover:bg-[#F6FAFA] sm:flex-row sm:items-center sm:gap-4">
      {showTime && (
        <p className="w-[104px] shrink-0 text-[14px] font-medium tabular-nums text-[#0F2F36]">{b.chosen_day ? optionLabel({ start: b.chosen_start, end: b.chosen_end }, lang) : ""}</p>
      )}
      <span aria-hidden="true" className="hidden h-9 w-1 shrink-0 rounded-full sm:block" style={{ background: kindOf(b.kind).color }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate text-[14.5px] font-medium text-[#0F2F36]">{b.title}</p>
          <KindTag kind={b.kind} />
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-[#4F6B73]">
          {!showTime && <span>{whenLabel(b, lang)}</span>}
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{spaceLabel(b.space, lang)}</span>
          {b.host_name && <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" aria-hidden="true" />{b.host_name}</span>}
          {(b.guest_org || b.guest_count) && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{[b.guest_count ? t({ en: `${b.guest_count} guests`, id: `${b.guest_count} tamu` }) : "", b.guest_org].filter(Boolean).join(t({ en: " from ", id: " dari " }))}</span>}
          {stage === "finding" && <span>{t({ en: `${b.voter_count} ${b.voter_count === 1 ? "person has" : "people have"} answered`, id: `${b.voter_count} orang sudah menjawab` })}</span>}
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
  const t = useT();
  const lang = useLang();

  const staged = useMemo(() => (state.data ?? []).map((b) => ({ b, stage: bookingStage(b, today) })), [state.data, today]);
  const counts = Object.fromEntries(TABS.map((x) => [x.key, staged.filter((s) => s.stage === x.key).length])) as Record<BookingStage, number>;
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
      eyebrow={t({ en: "Team", id: "Tim" })}
      title={t({ en: "Bookings", id: "Reservasi" })}
      sub={t({ en: "Research sessions, visits, trainings and meetings. Offer one time to book it, or several to let people answer which suit them.", id: "Sesi penelitian, kunjungan, pelatihan, dan rapat. Tawarkan satu waktu untuk langsung memesan, atau beberapa agar orang memilih yang cocok." })}
      actions={<Link to="/erp/bookings/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#45DFB1] px-3.5 py-2 text-[14px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] sm:min-h-0"><Plus className="h-4 w-4" aria-hidden="true" /> {t({ en: "New booking", id: "Reservasi baru" })}</Link>}
    >
      <DataState state={state}>
        {() => (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Kpi label={t({ en: "Booked this week", id: "Terjadwal minggu ini" })} value={String(thisWeek.length)} sub={`${fmtDay(today, { day: "numeric", month: "short" }, lang)}–${fmtDay(weekEnd, { day: "numeric", month: "short" }, lang)}`} />
              <Kpi label={t({ en: "Guests this week", id: "Tamu minggu ini" })} value={String(guestsThisWeek)} sub={t({ en: "From the booked visits and trainings", id: "Dari kunjungan dan pelatihan yang terjadwal" })} />
              <Kpi label={t({ en: "Finding a time", id: "Mencari waktu" })} value={String(counts.finding)} sub={t({ en: "Polls still open", id: "Jajak waktu masih terbuka" })} />
            </div>
            <Segmented value={tab} onChange={setTab} options={TABS.map((x) => ({ key: x.key, label: `${lang === "id" ? x.labelId : x.label} ${counts[x.key]}` }))} />
            {shown.length === 0 ? (
              <Card className="px-4 py-10 text-center">
                <p className="text-[14px] text-[#4F6B73]">{tab === "booked" ? t({ en: "Nothing booked ahead.", id: "Belum ada jadwal ke depan." }) : tab === "finding" ? t({ en: "No polls open.", id: "Tidak ada jajak waktu yang terbuka." }) : tab === "done" ? t({ en: "Nothing in the past yet.", id: "Belum ada yang lewat." }) : t({ en: "Nothing cancelled.", id: "Tidak ada yang dibatalkan." })}</p>
                {(tab === "booked" || tab === "finding") && <Link to="/erp/bookings/new" className="mt-2 inline-block text-[14px] font-medium text-[#0B6477] hover:underline">{t({ en: "Make a booking", id: "Buat reservasi" })}</Link>}
              </Card>
            ) : tab === "booked" ? (
              <div className="space-y-3">
                {byDay.map((day) => (
                  <Card key={day} className="overflow-hidden">
                    <p className="border-b border-[#EDF2F2] bg-[#F7FAFA] px-4 py-2 text-[13px] font-medium text-[#36525A]">
                      {day === today ? t({ en: "Today · ", id: "Hari ini · " }) : day === addDays(today, 1) ? t({ en: "Tomorrow · ", id: "Besok · " }) : ""}{fmtDay(day, { weekday: "long", day: "numeric", month: "long" }, lang)}
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
  const t = useT();
  const state = useLoad(async () => {
    // People and leave are read only as far as the account may; a researcher sees just themselves.
    const [bookings, people, leaves, me] = await Promise.all([fetchBookings(), fetchPeople().catch(() => []), fetchLeaves().catch(() => []), fetchMyPersonId().catch(() => null)]);
    return { bookings, people, leaves, me };
  });
  return (
    <ErpPage eyebrow={t({ en: "Bookings", id: "Reservasi" })} title={t({ en: "New booking", id: "Reservasi baru" })} sub={t({ en: "Offer one time to book it straight away, or several to ask people which suit them.", id: "Tawarkan satu waktu untuk langsung memesan, atau beberapa untuk menanyakan mana yang cocok bagi orang-orang." })}>
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
