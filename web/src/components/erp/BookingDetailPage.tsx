import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CalendarCheck, Check, Mail, MapPin, Pencil, Phone, UserRound, Users, Video, X } from "lucide-react";
import { useAuth } from "../../lib/auth/auth";
import { jakartaToday } from "../../lib/pf/batch";
import { ANSWERS, BOOKING_STAGE, bestOptions, bookingStage, countdownLabel, bookingToForm, busyTimes, cancelBooking, clashesFor, confirmBooking, fetchBooking, fetchBookings, fmtDay, nextAnswer, optionLabel, reopenBooking, saveBooking, saveVotes, spaceLabel, tally, type Answer, type Booking, type BookingOption, type Invitee, type Vote } from "../../lib/pf/booking";
import { fetchLeaves, fetchMyPersonId, fetchPeople, type Leave } from "../../lib/pf/people";
import { display } from "../../lib/fonts";
import { BookingEditor } from "./BookingEditor";
import { DayTimeline, ShareBooked, StillToAnswer, WhoIsComing, type Attendee } from "./BookingDay";
import { KindTag } from "./BookingsPage";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// One booking: its time once confirmed, or the poll while people answer. The
// organiser sees each time's count and what clashes with it, and confirms one.

const optionOf = (o: BookingOption) => ({ day: o.day, start: o.start_at?.slice(0, 5) ?? null, end: o.end_at?.slice(0, 5) ?? null });

function AnswerMark({ answer }: { answer: Answer | undefined }) {
  if (!answer) return <span className="text-[#C9D8DA]" role="img" aria-label="No answer">·</span>;
  const icon = answer === "ya" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : answer === "tidak" ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="text-[14px] font-bold leading-none">~</span>;
  return <span className={`grid h-6 w-6 place-items-center rounded-md ${ANSWERS[answer].className}`} role="img" aria-label={ANSWERS[answer].label} title={ANSWERS[answer].label}>{icon}</span>;
}

/* ----------------------------------------------------------------- the poll */

function Poll({ booking, options, votes, invitees, me, canEdit, clashes, reload, confirming, setConfirming }: { booking: Booking; options: BookingOption[]; votes: Vote[]; invitees: Invitee[]; me: string | null; canEdit: boolean; clashes: (o: BookingOption) => string[]; reload: () => Promise<void>; confirming: string | null; setConfirming: (id: string | null) => void }) {
  const mineSaved = Object.fromEntries(votes.filter((v) => v.person_id === me).map((v) => [v.option_id, v.answer])) as Record<string, Answer>;
  const [mine, setMine] = useState<Record<string, Answer>>(mineSaved);
  const action = useAction();
  const dirty = JSON.stringify(Object.entries(mine).sort()) !== JSON.stringify(Object.entries(mineSaved).sort());
  const tallies = tally(options, votes);
  const best = bestOptions(tallies);
  // Everyone invited, and anyone else who answered, by name; the signed-in person first.
  const names = new Map<string, string>();
  for (const i of invitees) names.set(i.person_id, i.full_name);
  for (const v of votes) names.set(v.person_id, v.full_name);
  const others = [...names.entries()].filter(([id]) => id !== me).sort((a, b) => a[1].localeCompare(b[1]));
  const answerOf = (person: string, option: string) => votes.find((v) => v.person_id === person && v.option_id === option)?.answer;
  const cols = `minmax(112px, 1fr) repeat(${options.length}, minmax(84px, 96px))`;
  const clashing = options.map((o) => ({ o, notes: clashes(o) })).filter((x) => x.notes.length > 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>Which times suit you?</h2>
          <p className="text-[13px] text-[#4F6B73]">Click your cells to answer. {booking.allow_maybe ? "Yes counts one, if need be counts a half." : "Yes or no only."}</p>
        </div>
        <div className="flex gap-1.5">
          {(["ya", "mungkin", "tidak"] as const).filter((a) => booking.allow_maybe || a !== "mungkin").map((a) => <span key={a} className="inline-flex items-center gap-1 text-[12.5px] text-[#4F6B73]"><AnswerMark answer={a} /> {ANSWERS[a].label}</span>)}
        </div>
      </div>
      <div className="overflow-x-auto border-t border-[#E3ECED]">
        <div className="min-w-fit" role="table" aria-label="Answers per time">
          <div className="grid border-b border-[#E3ECED] bg-[#F7FAFA]" style={{ gridTemplateColumns: cols }} role="row">
            <div className="flex min-w-0 flex-col justify-between gap-2 px-4 py-2" role="columnheader">
              <span className="text-[12.5px] text-[#4F6B73]">{names.size + (me && !names.has(me) ? 1 : 0)} people</span>
              {(() => {
                const top = options.filter((o) => best.has(o.id));
                const t = top.length === 1 ? tallies.find((x) => x.optionId === top[0].id) : undefined;
                if (!t || t.score === 0) return <span className="text-[12.5px] text-[#6B8187]">No clear favourite yet.</span>;
                return (
                  <span className="hidden min-w-0 sm:block">
                    <span className="block text-[11.5px] font-medium text-[#0E7A5C]">Best so far</span>
                    <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-[#0F2F36]">{fmtDay(top[0].day, { weekday: "short", day: "numeric", month: "short" })}, {optionLabel(optionOf(top[0]))}</span>
                    <span className="block text-[12px] text-[#4F6B73]">{t.ya} yes{t.mungkin ? `, ${t.mungkin} if need be` : ""}{clashes(top[0]).length ? " · has a clash" : ""}</span>
                  </span>
                );
              })()}
            </div>
            {options.map((o) => {
              const notes = clashes(o);
              return (
                <div key={o.id} role="columnheader" className={`border-l border-[#E3ECED] px-1 py-2 text-center ${best.has(o.id) ? "bg-[#E9F8F2]" : ""}`}>
                  <p className="text-[11px] font-medium uppercase text-[#4F6B73]">{fmtDay(o.day, { weekday: "short" })}</p>
                  <p className="text-[18px] font-semibold leading-tight tabular-nums text-[#0F2F36]">{Number(o.day.slice(8))}</p>
                  <p className="text-[11px] text-[#4F6B73]">{fmtDay(o.day, { month: "short" })}</p>
                  <p className="mt-0.5 text-[12px] font-medium tabular-nums text-[#36525A]">{optionLabel(optionOf(o))}</p>
                  {notes.length > 0 && (
                    <p className="mt-0.5 flex justify-center text-[#B26205]" title={notes.join("\n")}>
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">{notes.join(". ")}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {me && (
            <div className="grid border-b border-[#E3ECED] bg-[#FBFDFD]" style={{ gridTemplateColumns: cols }} role="row">
              <p className="flex items-center px-4 py-2 text-[14px] font-medium text-[#0F2F36]" role="rowheader">You</p>
              {options.map((o) => (
                <div key={o.id} role="cell" className={`flex items-center justify-center border-l border-[#E3ECED] py-1.5 ${best.has(o.id) ? "bg-[#E9F8F2]" : ""}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = nextAnswer(mine[o.id], booking.allow_maybe);
                      const copy = { ...mine };
                      if (next) copy[o.id] = next;
                      else delete copy[o.id];
                      setMine(copy);
                    }}
                    aria-label={`Your answer for ${fmtDay(o.day, { day: "numeric", month: "short" })} ${optionLabel(optionOf(o))}: ${mine[o.id] ? ANSWERS[mine[o.id]].label : "none"}. Click to change.`}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-dashed border-[#C9D8DA] hover:border-[#14919B]"
                  >
                    <AnswerMark answer={mine[o.id]} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {others.map(([id, name]) => (
            <div key={id} className="grid border-b border-[#EDF2F2]" style={{ gridTemplateColumns: cols }} role="row">
              <p className="truncate px-4 py-2 text-[13.5px] text-[#0F2F36]" role="rowheader">{name}</p>
              {options.map((o) => (
                <div key={o.id} role="cell" className={`flex items-center justify-center border-l border-[#EDF2F2] py-2 ${best.has(o.id) ? "bg-[#E9F8F2]" : ""}`}><AnswerMark answer={answerOf(id, o.id)} /></div>
              ))}
            </div>
          ))}

          <div className="grid" style={{ gridTemplateColumns: cols }} role="row">
            <p className="px-4 py-2 text-[12.5px] font-medium text-[#4F6B73]" role="rowheader">Total</p>
            {options.map((o) => {
              const t = tallies.find((x) => x.optionId === o.id);
              return (
                <div key={o.id} role="cell" className={`border-l border-[#E3ECED] px-1 py-2 text-center ${best.has(o.id) ? "bg-[#E9F8F2]" : ""}`}>
                  <p className="text-[13px] font-semibold tabular-nums text-[#0E7A5C]"><Check className="mr-0.5 inline h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /><span className="sr-only">Yes: </span>{t?.ya ?? 0}{t?.mungkin ? <span className="font-medium text-[#B26205]"> +{t.mungkin}<span className="sr-only"> if need be</span></span> : null}</p>
                  {best.has(o.id) && <p className="text-[11px] font-medium text-[#0E7A5C]">Best</p>}
                  {canEdit && (
                    <button type="button" onClick={() => setConfirming(o.id)} aria-label={`Confirm ${fmtDay(o.day, { weekday: "short", day: "numeric", month: "short" })}, ${optionLabel(optionOf(o))}`} className={`mt-1 rounded-md px-2 py-1 text-[12px] font-medium ${confirming === o.id ? "bg-[#0B6477] text-white hover:bg-[#08313A]" : "text-[#0B6477] hover:bg-[#E3F4F4]"}`}>Confirm</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-[#E3ECED] px-4 py-3">
        {clashing.length > 0 && (
          <div className="rounded-lg bg-[#FFF6E5] px-3 py-2 text-[12.5px] text-[#8A5A07]">
            {clashing.map(({ o, notes }) => <p key={o.id}><span className="font-medium">{fmtDay(o.day, { weekday: "short", day: "numeric", month: "short" })}, {optionLabel(optionOf(o))}:</span> {notes.join("; ")}</p>)}
          </div>
        )}
        {!me && <Note>Your account is not linked to a person on the People page yet, so you cannot answer. Ask HR staff to link it.</Note>}
        {confirming && (() => {
          const o = options.find((x) => x.id === confirming) as BookingOption;
          const notes = clashes(o);
          return (
            <div id="confirm-time" className="scroll-mt-24 rounded-lg border border-[#14919B]/40 bg-[#F3FAFA] p-3">
              <p className="text-[14px] text-[#0F2F36]">Book <strong>{fmtDay(o.day, { weekday: "long", day: "numeric", month: "long" })}, {optionLabel(optionOf(o))}</strong>? The poll closes and everyone sees this time.</p>
              {notes.map((n) => <p key={n} className="mt-1 text-[12.5px] font-medium text-[#8A5A07]">{n}</p>)}
              <div className="mt-2 flex flex-wrap gap-2">
                <PrimaryButton disabled={action.busy} onClick={() => void action.run(async () => { await confirmBooking(booking.id, o.id); setConfirming(null); await reload(); })}>{action.busy ? "Booking…" : "Book this time"}</PrimaryButton>
                <SecondaryButton onClick={() => setConfirming(null)}>Not yet</SecondaryButton>
              </div>
            </div>
          );
        })()}
        <ActionNote action={action} />
        {me && (
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton disabled={!dirty || action.busy} onClick={() => void action.run(async () => { await saveVotes(booking.id, mine); await reload(); })}>
              {action.busy ? "Saving…" : "Save my answers"}
            </PrimaryButton>
            <p className="text-[12.5px] text-[#4F6B73]" aria-live="polite">{dirty ? "Your answers are not saved yet." : Object.keys(mineSaved).length ? "Your answers are saved." : "Click a cell in your row to answer."}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- the details */

function Details({ booking, invitees }: { booking: Booking; invitees: Invitee[] }) {
  const line = "flex items-start gap-2.5 text-[14px] text-[#0F2F36]";
  const icon = "mt-0.5 h-4 w-4 shrink-0 text-[#4F6B73]";
  return (
    <Card className="space-y-3 p-4">
      <KindTag kind={booking.kind} />
      <div className={line}><MapPin className={icon} /><div>{spaceLabel(booking.space)}{booking.place_note && <p className="text-[13px] text-[#4F6B73]">{booking.place_note}</p>}</div></div>
      <div className={line}><UserRound className={icon} /><div>{booking.host_name ?? <span className="text-[#4F6B73]">No host yet</span>}<p className="text-[12.5px] text-[#4F6B73]">Host</p></div></div>
      {(booking.guest_org || booking.guest_count) && (
        <div className={line}><Users className={icon} /><div>{[booking.guest_count ? `${booking.guest_count} guests` : "", booking.guest_org].filter(Boolean).join(" from ")}</div></div>
      )}
      {booking.contact_name && <div className={line}><UserRound className={icon} /><div>{booking.contact_name}<p className="text-[12.5px] text-[#4F6B73]">Guests' contact</p></div></div>}
      {booking.contact_phone && <div className={line}><Phone className={icon} /><a className="text-[#0B6477] hover:underline" href={`tel:${booking.contact_phone.replace(/[^\d+]/g, "")}`}>{booking.contact_phone}</a></div>}
      {booking.contact_email && <div className={line}><Mail className={icon} /><a className="break-all text-[#0B6477] hover:underline" href={`mailto:${booking.contact_email}`}>{booking.contact_email}</a></div>}
      {booking.video_link && <div className={line}><Video className={icon} /><a className="break-all text-[#0B6477] hover:underline" href={booking.video_link} target="_blank" rel="noreferrer">Join the video call</a></div>}
      {booking.description && <p className="whitespace-pre-line border-t border-[#EDF2F2] pt-3 text-[13.5px] leading-[1.55] text-[#36525A]">{booking.description}</p>}
      {invitees.length > 0 && (
        <div className="border-t border-[#EDF2F2] pt-3">
          <p className="mb-1.5 text-[13px] font-medium text-[#36525A]">Invited</p>
          <div className="flex flex-wrap gap-1.5">{invitees.map((i) => <span key={i.person_id} className="rounded-full bg-[#F3F7F7] px-2.5 py-1 text-[12.5px] text-[#0F2F36]">{i.full_name}</span>)}</div>
        </div>
      )}
      <p className="border-t border-[#EDF2F2] pt-3 text-[12px] text-[#6B8187]">Made {formatDateTime(booking.created_at)}</p>
    </Card>
  );
}

/* ----------------------------------------------------------- who is coming */

function attendees(b: Booking, invitees: Invitee[], votes: Vote[], chosen: string | null): Attendee[] {
  const answer = (id: string) => (chosen ? votes.find((v) => v.person_id === id && v.option_id === chosen)?.answer : undefined);
  const out: Attendee[] = [];
  if (b.host_id) out.push({ id: b.host_id, name: b.host_name ?? "The host", role: "Host", answer: answer(b.host_id) });
  for (const i of invitees) if (i.person_id !== b.host_id) out.push({ id: i.person_id, name: i.full_name, role: "Invited", answer: answer(i.person_id) });
  return out;
}

const guestLine = (b: Booking) => (b.guest_count || b.guest_org ? [b.guest_count ? `${b.guest_count} guests` : "guests", b.guest_org].filter(Boolean).join(" from ") : undefined);

/* --------------------------------------------------------------------- page */

export default function BookingDetailPage({ id }: { id: string }) {
  const today = jakartaToday();
  const { user } = useAuth();
  const access = useErpAccess();
  const state = useLoad(async () => {
    const [one, bookings, leaves, me, people] = await Promise.all([fetchBooking(id), fetchBookings(), fetchLeaves().catch(() => [] as Leave[]), fetchMyPersonId().catch(() => null), fetchPeople().catch(() => [])]);
    return { ...one, bookings, leaves, me, people };
  }, [id]);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [why, setWhy] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const action = useAction();

  const booking = state.data?.booking ?? null;
  const stage = booking ? bookingStage(booking, today) : null;
  const canEdit = !!booking && (access.canSchedule || booking.created_by === user?.id);

  return (
    <ErpPage
      eyebrow="Bookings"
      title={booking?.title ?? "Booking"}
      actions={
        booking && canEdit && !editing && stage !== "cancelled" && stage !== "done" ? (
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</SecondaryButton>
            <SecondaryButton onClick={() => setCancelling(true)}><X className="h-4 w-4" aria-hidden="true" /> Cancel booking</SecondaryButton>
          </div>
        ) : undefined
      }
    >
      <Link to="/erp/bookings" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#0B6477] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All bookings</Link>
      <DataState state={state}>
        {({ booking: b, options, votes, invitees, bookings, leaves, me, people }) => {
          if (!b) return <Card className="p-5 text-[14px] text-[#4F6B73]">This booking does not exist, or was removed.</Card>;
          const s = bookingStage(b, today);
          const busy = busyTimes(bookings, b.id).filter((x) => x.space === b.space);
          const involved = [...(b.host_id ? [{ id: b.host_id, name: b.host_name ?? "The host" }] : []), ...invitees.filter((i) => i.person_id !== b.host_id).map((i) => ({ id: i.person_id, name: i.full_name }))];
          const clashes = (o: BookingOption) => clashesFor(optionOf(o), b.space, busy, leaves, involved);

          if (editing) {
            return (
              <div>
                <div className="mb-3 flex max-w-[920px] flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] text-[#4F6B73]">{s === "booked" ? "Offering more than one time opens the poll again." : "Answers to times you keep stay; answers to times you remove go with them."}</p>
                  <SecondaryButton onClick={() => setEditing(false)}>Close</SecondaryButton>
                </div>
                <BookingEditor
                  editing
                  bookingId={b.id}
                  initial={bookingToForm(b, options, invitees)}
                  people={people}
                  bookings={bookings}
                  leaves={leaves}
                  today={today}
                  onSave={async (f) => { await saveBooking(b.id, f); setEditing(false); await state.reload(); }}
                />
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${BOOKING_STAGE[s].className}`}>{BOOKING_STAGE[s].label}</span>
                  {s === "finding" && <span className="text-[13px] text-[#4F6B73]">{options.length} times offered · {b.voter_count} answered</span>}
                </div>

                {cancelling && (
                  <Card className="space-y-3 p-4">
                    <p className="text-[14px] text-[#0F2F36]">Cancel this booking? It stays in the list as cancelled, with the reason.</p>
                    <Field label="Reason (optional)"><input className={inputClass} value={why} maxLength={300} onChange={(e) => setWhy(e.target.value)} placeholder="The school moved the trip…" /></Field>
                    <ActionNote action={action} />
                    <div className="flex flex-wrap gap-2">
                      <PrimaryButton disabled={action.busy} onClick={() => void action.run(async () => { await cancelBooking(b.id, why); setCancelling(false); await state.reload(); })}>{action.busy ? "Cancelling…" : "Cancel booking"}</PrimaryButton>
                      <SecondaryButton onClick={() => setCancelling(false)}>Keep it</SecondaryButton>
                    </div>
                  </Card>
                )}

                {s === "cancelled" && <Note tone="warn">Cancelled{b.cancel_note ? `: ${b.cancel_note}` : "."}</Note>}

                {(s === "booked" || (s === "done" && b.chosen_day)) && b.chosen_day ? (
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="w-16 shrink-0 overflow-hidden rounded-xl border border-[#DCE7E8] text-center">
                        <p className="bg-[#0B6477] py-1 text-[12px] font-medium text-white">{fmtDay(b.chosen_day, { month: "short" })}</p>
                        <p className="py-1 text-[26px] font-semibold tabular-nums text-[#0F2F36]">{Number(b.chosen_day.slice(8))}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-[#0E7A5C]">
                          <CalendarCheck className="h-4 w-4" aria-hidden="true" /> {s === "done" ? "Took place" : "Booked"}
                          <span className={`rounded-full px-2 py-0.5 text-[12px] ${b.chosen_day === today ? "bg-[#45DFB1] text-[#0B2A22]" : "bg-[#F3F7F7] text-[#36525A]"}`}>{countdownLabel(b.chosen_day, today)}</span>
                        </p>
                        <p className="text-[20px] font-semibold tracking-[-0.025em] text-[#0F2F36]" style={display}>{fmtDay(b.chosen_day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                        <p className="text-[15px] tabular-nums text-[#36525A]">{optionLabel({ start: b.chosen_start, end: b.chosen_end })} WIB · {spaceLabel(b.space)}</p>
                        {(() => {
                          const chosen = options.find((o) => o.id === b.chosen_option);
                          const notes = chosen && s === "booked" ? clashes(chosen) : [];
                          return notes.map((n) => <p key={n} className="mt-1 text-[12.5px] font-medium text-[#8A5A07]">{n}</p>);
                        })()}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF2F2] pt-3">
                      <ShareBooked booking={b} />
                      {canEdit && s === "booked" && options.length > 1 && (
                        <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { await reopenBooking(b.id); await state.reload(); })}>Open the poll again</SecondaryButton>
                      )}
                    </div>
                    {action.error && <div className="mt-2"><ActionNote action={action} /></div>}
                  </Card>
                ) : null}

                {(s === "booked" || s === "done") && b.chosen_day && (
                  <>
                    <DayTimeline key={b.chosen_day} days={[b.chosen_day]} bookings={bookings} focusId={b.id} focusSpace={b.space} today={today} />
                    <WhoIsComing people={attendees(b, invitees, votes, b.chosen_option)} guests={guestLine(b)} title={s === "done" ? "Who came" : "Who is coming"} />
                  </>
                )}

                {s === "finding" && (
                  <>
                    <Poll key={votes.length + options.length} booking={b} options={options} votes={votes} invitees={invitees} me={me} canEdit={canEdit} clashes={clashes} reload={state.reload} confirming={confirming} setConfirming={setConfirming} />
                    {options.length > 0 && (
                      <DayTimeline
                        key={options.map((o) => o.id).join()}
                        days={[...new Set(options.map((o) => o.day))].sort()}
                        bookings={bookings}
                        focusId={b.id}
                        focusSpace={b.space}
                        today={today}
                        title="The times offered, next to the day"
                        offered={options.map((o) => ({ id: o.id, day: o.day, title: b.title, kind: b.kind, start: o.start_at?.slice(0, 5) ?? null, end: o.end_at?.slice(0, 5) ?? null, offered: true, score: tally(options, votes).find((t) => t.optionId === o.id)?.ya ?? 0 }))}
                        onOffered={canEdit ? (oid) => {
                          setConfirming(oid);
                          window.requestAnimationFrame(() => document.getElementById("confirm-time")?.scrollIntoView({ behavior: "smooth", block: "center" }));
                        } : undefined}
                      />
                    )}
                    <StillToAnswer names={invitees.filter((i) => !votes.some((v) => v.person_id === i.person_id)).map((i) => i.full_name).sort()} />
                  </>
                )}

                {s === "done" && !b.chosen_day && <Note>The times offered have passed without one being confirmed.</Note>}
              </div>
              <Details booking={b} invitees={invitees} />
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
