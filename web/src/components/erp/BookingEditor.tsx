import { useState, type ReactNode } from "react";
import { AlertTriangle, Building2, CalendarClock, FileText, ListChecks, MapPin, Plus, UserRound, Users, Video, X } from "lucide-react";
import { ANSWERS, BOOKING_KINDS, BOOKING_SPACES, answerLabel, busyTimes, checkBookingForm, clashesFor, countdownLabel, fmtDay, kindLabel, kindOf, optionLabel, spaceLabel, type Booking, type BookingForm, type BookingSpace, type Busy, type TimeOption } from "../../lib/pf/booking";
import type { Leave, Person } from "../../lib/pf/people";
import { display } from "../../lib/fonts";
import { useLang, useT } from "../../lib/i18n";
import { ActionNote, Field, PrimaryButton, inputClass, useAction } from "./page";
import { addDays } from "../../lib/pf/facility";
import { TimeOptionsPicker } from "./TimeOptionsPicker";
import { Card } from "./ui";

// The form for a booking, in three cards: what it is, when it could be, and who
// answers. A bar at the foot keeps the count of times and the one button in view.

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>{title}</h2>
      <p className="text-[13px] text-[#4F6B73]">{sub}</p>
    </div>
  );
}

function AddChip({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#DCE7E8] bg-[#F7FAFA] px-3.5 text-[13.5px] font-medium text-[#36525A] hover:border-[#14919B] hover:text-[#0B6477] sm:min-h-[34px]">
      <Plus className="h-3.5 w-3.5" aria-hidden="true" /> <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </button>
  );
}

function Extra({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-[#E3ECED] bg-[#FAFCFC] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-medium text-[#36525A]">{title}</p>
        <button type="button" onClick={onRemove} aria-label={t({ en: `Remove ${title.toLowerCase()}`, id: `Hapus ${title.toLowerCase()}` })} className="grid h-8 w-8 place-items-center rounded-lg text-[#4F6B73] hover:bg-[#EEF5F5]"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#14919B]" : "bg-[#C9D8DA]"}`}>
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function SettingRow({ icon: Icon, title, sub, control, children }: { icon: typeof Plus; title: string; sub: string; control?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-[#EDF2F2] py-3.5 first:border-t-0 first:pt-0">
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F3F7F7] text-[#36525A]"><Icon className="h-[18px] w-[18px]" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#0F2F36]">{title}</p>
            <p className="text-[13px] text-[#4F6B73]">{sub}</p>
          </div>
          {control}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the summary */

/**
 * Beside the form on a wide screen: the booking as it will read, its times by date with
 * their clashes, and what already holds the same space in the next two weeks.
 */
function Summary({ form, hostName, inviteeCount, busy, today, clashes }: { form: BookingForm; hostName: string | null; inviteeCount: number; busy: Busy[]; today: string; clashes: (o: TimeOption) => string[] }) {
  const t = useT();
  const lang = useLang();
  const kind = kindOf(form.kind);
  const days = [...new Set(form.options.map((o) => o.day))].sort();
  const soon = busy.filter((b) => b.day >= today && b.day <= addDays(today, 14)).sort((a, b) => (a.day + (a.start ?? "")).localeCompare(b.day + (b.start ?? ""))).slice(0, 6);
  const shared = BOOKING_SPACES.find((x) => x.key === form.space)?.shared;
  const line = "flex items-start gap-2 text-[13px] text-[#36525A]";
  return (
    <aside className="hidden space-y-3 xl:sticky xl:top-4 xl:block" aria-label={t({ en: "Summary", id: "Ringkasan" })}>
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: kind.color }} />
        <div className="space-y-2.5 p-4">
          <p className="text-[12px] font-medium text-[#4F6B73]">{t({ en: "How it will read", id: "Tampilannya nanti" })}</p>
          <p className={`text-[16px] font-semibold leading-snug tracking-[-0.02em] ${form.title.trim() ? "text-[#0F2F36]" : "text-[#9DB2B6]"}`} style={display}>{form.title.trim() || t({ en: "Untitled booking", id: "Reservasi tanpa judul" })}</p>
          <p className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#36525A]"><span className="h-2 w-2 rounded-full" style={{ background: kind.color }} />{kindLabel(form.kind, lang)}</p>
          <p className={line}><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{spaceLabel(form.space, lang)}{form.placeNote ? `, ${form.placeNote}` : ""}</p>
          <p className={line}><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{hostName ?? t({ en: "No host yet", id: "Belum ada tuan rumah" })}{inviteeCount > 0 ? ` · ${inviteeCount} ${t({ en: "invited", id: "diundang" })}` : ""}</p>
          {(form.guestCount || form.guestOrg) && <p className={line}><Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{[form.guestCount ? t({ en: `${form.guestCount} guests`, id: `${form.guestCount} tamu` }) : t({ en: "Guests", id: "Tamu" }), form.guestOrg].filter(Boolean).join(t({ en: " from ", id: " dari " }))}</p>}
        </div>
        <div className="border-t border-[#EDF2F2] p-4">
          <p className="mb-2 flex items-center justify-between text-[12px] font-medium text-[#4F6B73]">
            <span>{form.options.length > 1 ? t({ en: "Times people answer", id: "Waktu yang dijawab orang" }) : form.options.length === 1 ? t({ en: "The time it books", id: "Waktu yang dipesan" }) : t({ en: "Times", id: "Waktu" })}</span>
            {form.options.length > 0 && <span className="tabular-nums">{form.options.length}</span>}
          </p>
          {days.length === 0 ? (
            <p className="text-[13px] text-[#6B8187]">{t({ en: "Pick dates on the calendar.", id: "Pilih tanggal di kalender." })}</p>
          ) : (
            <ul className="space-y-2">
              {days.map((d) => (
                <li key={d} className="flex gap-2.5">
                  <span className="w-11 shrink-0 text-center">
                    <span className="block text-[10.5px] font-medium uppercase text-[#4F6B73]">{fmtDay(d, { weekday: "short" }, lang)}</span>
                    <span className="block text-[15px] font-semibold tabular-nums leading-tight text-[#0F2F36]">{Number(d.slice(8))}</span>
                  </span>
                  <span className="flex min-w-0 flex-wrap content-start gap-1">
                    {form.options.filter((o) => o.day === d).map((o) => {
                      const c = clashes(o);
                      return (
                        <span key={`${o.start}-${o.end}`} title={c.join("\n") || undefined} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium tabular-nums ${c.length ? "bg-[#FFF6E5] text-[#8A5A07]" : "bg-[#E3F4F4] text-[#0B6477]"}`}>
                          {c.length > 0 && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}{optionLabel(o, lang)}{c.length > 0 && <span className="sr-only">{t({ en: ", clashes", id: ", bentrok" })}</span>}
                        </span>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <Card className="p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-[#4F6B73]"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> {spaceLabel(form.space, lang)}, {t({ en: "next two weeks", id: "dua minggu ke depan" })}</p>
        {shared ? (
          <p className="text-[13px] text-[#6B8187]">{t({ en: "Not held for one booking, so anything can share it.", id: "Tidak dikhususkan untuk satu reservasi, jadi bisa dipakai bersama." })}</p>
        ) : soon.length === 0 ? (
          <p className="text-[13px] text-[#6B8187]">{t({ en: "Free: nothing booked here yet.", id: "Kosong: belum ada reservasi di sini." })}</p>
        ) : (
          <ul className="space-y-1.5">
            {soon.map((b) => (
              <li key={b.bookingId} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="w-[74px] shrink-0 tabular-nums text-[#4F6B73]">{fmtDay(b.day, { weekday: "short", day: "numeric", month: "short" }, lang)}</span>
                <span className="min-w-0 flex-1 truncate text-[#0F2F36]" title={b.title}>{b.title}</span>
                <span className="shrink-0 tabular-nums text-[#4F6B73]">{optionLabel(b, lang)}</span>
              </li>
            ))}
          </ul>
        )}
        {soon.length > 0 && <p className="mt-2 text-[12px] text-[#6B8187]">{t({ en: `${countdownLabel(soon[0].day, today)} is the next one. Week view shows them striped.`, id: `Berikutnya: ${countdownLabel(soon[0].day, today, lang).toLowerCase()}. Tampilan minggu menandainya bergaris.` })}</p>}
      </Card>
    </aside>
  );
}

const set = <K extends keyof BookingForm>(f: BookingForm, k: K, v: BookingForm[K]): BookingForm => ({ ...f, [k]: v });

export function BookingEditor({ initial, bookingId, people, bookings, leaves, today, onSave, editing = false }: { initial: BookingForm; bookingId?: string; people: Person[]; bookings: Booking[]; leaves: Leave[]; today: string; onSave: (f: BookingForm) => Promise<void>; editing?: boolean }) {
  const [form, setForm] = useState(initial);
  const [open, setOpen] = useState({ guests: !!(initial.guestOrg || initial.guestCount || initial.contactName), video: !!initial.videoLink, about: !!initial.description, place: !!initial.placeNote });
  const action = useAction();
  const active = people.filter((p) => p.status === "aktif");
  const t = useT();
  const lang = useLang();
  const busy = busyTimes(bookings, bookingId).filter((b) => b.space === form.space);
  const involved = [form.hostId, ...form.invitees].filter((id, i, all) => id && all.indexOf(id) === i).map((id) => ({ id, name: people.find((p) => p.id === id)?.full_name ?? t({ en: "Someone", id: "Seseorang" }) }));
  const clashes = (o: TimeOption) => clashesFor(o, form.space, busy, leaves, involved, lang);
  const count = form.options.length;
  const clashing = form.options.filter((o) => clashes(o).length > 0).length;

  const submit = async () => {
    const problem = checkBookingForm(form, today, lang);
    if (problem) return action.setError(problem);
    await action.run(() => onSave(form));
  };

  const button = editing ? t({ en: "Save changes", id: "Simpan perubahan" }) : count === 1 ? t({ en: "Book this time", id: "Pakai waktu ini" }) : count > 1 ? t({ en: "Send poll", id: "Kirim jajak" }) : t({ en: "Pick a time", id: "Pilih waktu" });

  return (
    <form className="grid grid-cols-1 items-start gap-4 pb-4 xl:grid-cols-[minmax(0,920px)_300px]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="min-w-0 max-w-[920px] space-y-4">
      <Card className="p-4">
        <SectionHead title={t({ en: "Booking", id: "Reservasi" })} sub={t({ en: "What it is about, where, and who is coming.", id: "Tentang apa, di mana, dan siapa yang datang." })} />
        <div className="space-y-3">
          <Field label={t({ en: "Title", id: "Judul" })}>
            <input className={inputClass} value={form.title} maxLength={120} placeholder={t({ en: "School visit from SMA 1 Depok…", id: "Kunjungan sekolah dari SMA 1 Depok…" })} onChange={(e) => setForm(set(form, "title", e.target.value))} />
          </Field>
          <fieldset>
            <legend className="mb-1 text-[13px] font-medium text-[#36525A]">{t({ en: "Type", id: "Jenis" })}</legend>
            <div className="flex flex-wrap gap-1.5">
              {BOOKING_KINDS.map((k) => {
                const on = form.kind === k.key;
                return (
                  <button key={k.key} type="button" aria-pressed={on} onClick={() => setForm(set(form, "kind", k.key))} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-medium sm:min-h-[34px] ${on ? "border-[#14919B] bg-[#E3F4F4] text-[#0B6477]" : "border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: k.color }} /> {kindLabel(k.key, lang)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Field label={t({ en: "Space", id: "Tempat" })} hint={BOOKING_SPACES.find((s) => s.key === form.space)?.shared ? t({ en: "This space is not held for one booking, so it never clashes.", id: "Tempat ini tidak dikhususkan untuk satu reservasi, jadi tidak pernah bentrok." }) : t({ en: "Times that clash with another booking here are marked.", id: "Waktu yang bentrok dengan reservasi lain di sini akan ditandai." })}>
            <select className={inputClass} value={form.space} onChange={(e) => setForm(set(form, "space", e.target.value as BookingSpace))}>
              {BOOKING_SPACES.map((s) => <option key={s.key} value={s.key}>{spaceLabel(s.key, lang)}</option>)}
            </select>
          </Field>

          {open.place && (
            <Extra title={t({ en: "Place details", id: "Detail tempat" })} onRemove={() => { setOpen({ ...open, place: false }); setForm(set(form, "placeNote", "")); }}>
              <input className={inputClass} value={form.placeNote} maxLength={200} placeholder={t({ en: "Gate 2, then the second floor…", id: "Gerbang 2, lalu lantai dua…" })} onChange={(e) => setForm(set(form, "placeNote", e.target.value))} />
            </Extra>
          )}
          {open.guests && (
            <Extra title={t({ en: "Guests", id: "Tamu" })} onRemove={() => { setOpen({ ...open, guests: false }); setForm({ ...form, guestOrg: "", guestCount: "", contactName: "", contactPhone: "", contactEmail: "" }); }}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <Field label={t({ en: "From", id: "Dari" })}><input className={inputClass} value={form.guestOrg} maxLength={160} placeholder={t({ en: "School, company or university…", id: "Sekolah, perusahaan, atau universitas…" })} onChange={(e) => setForm(set(form, "guestOrg", e.target.value))} /></Field>
                <Field label={t({ en: "How many", id: "Jumlah" })}><input className={inputClass} inputMode="numeric" value={form.guestCount} placeholder="25" onChange={(e) => setForm(set(form, "guestCount", e.target.value))} /></Field>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label={t({ en: "Contact person", id: "Narahubung" })}><input className={inputClass} autoComplete="off" value={form.contactName} maxLength={120} onChange={(e) => setForm(set(form, "contactName", e.target.value))} /></Field>
                <Field label={t({ en: "Phone", id: "Telepon" })}><input className={inputClass} type="tel" autoComplete="off" value={form.contactPhone} maxLength={40} onChange={(e) => setForm(set(form, "contactPhone", e.target.value))} /></Field>
                <Field label="Email"><input className={inputClass} type="email" autoComplete="off" spellCheck={false} value={form.contactEmail} maxLength={160} onChange={(e) => setForm(set(form, "contactEmail", e.target.value))} /></Field>
              </div>
            </Extra>
          )}
          {open.video && (
            <Extra title={t({ en: "Video call", id: "Panggilan video" })} onRemove={() => { setOpen({ ...open, video: false }); setForm(set(form, "videoLink", "")); }}>
              <input className={inputClass} type="url" spellCheck={false} value={form.videoLink} maxLength={300} placeholder="https://meet.google.com/…" onChange={(e) => setForm(set(form, "videoLink", e.target.value))} />
            </Extra>
          )}
          {open.about && (
            <Extra title={t({ en: "Description", id: "Deskripsi" })} onRemove={() => { setOpen({ ...open, about: false }); setForm(set(form, "description", "")); }}>
              <textarea className={`${inputClass} min-h-[96px]`} value={form.description} maxLength={2000} placeholder={t({ en: "Agenda, what to bring, safety rules for the growing rooms…", id: "Agenda, apa yang perlu dibawa, aturan keselamatan di ruang tanam…" })} onChange={(e) => setForm(set(form, "description", e.target.value))} />
            </Extra>
          )}
          <div className="flex flex-wrap gap-2">
            {!open.guests && <AddChip icon={Users} label={t({ en: "Add guests", id: "Tambah tamu" })} onClick={() => setOpen({ ...open, guests: true })} />}
            {!open.place && <AddChip icon={Building2} label={t({ en: "Add place details", id: "Tambah detail tempat" })} onClick={() => setOpen({ ...open, place: true })} />}
            {!open.video && <AddChip icon={Video} label={t({ en: "Add video call", id: "Tambah panggilan video" })} onClick={() => setOpen({ ...open, video: true })} />}
            {!open.about && <AddChip icon={FileText} label={t({ en: "Add description", id: "Tambah deskripsi" })} onClick={() => setOpen({ ...open, about: true })} />}
          </div>
        </div>
      </Card>

      <TimeOptionsPicker options={form.options} onChange={(options) => setForm(set(form, "options", options))} today={today} busy={busy} clashes={clashes} />

      <Card className="p-4">
        <SectionHead title={t({ en: "Settings", id: "Pengaturan" })} sub={t({ en: "Who looks after it, and who is asked which times suit them.", id: "Siapa yang mengurus, dan siapa yang ditanya waktu mana yang cocok." })} />
        <SettingRow
          icon={UserRound}
          title={t({ en: "Host", id: "Tuan rumah" })}
          sub={t({ en: "The person who looks after the guests on the day.", id: "Orang yang mendampingi tamu pada hari itu." })}
          control={
            <select aria-label={t({ en: "Host", id: "Tuan rumah" })} className={`${inputClass} w-full sm:w-[240px]`} value={form.hostId} onChange={(e) => setForm(set(form, "hostId", e.target.value))}>
              <option value="">{t({ en: "No host yet", id: "Belum ada tuan rumah" })}</option>
              {active.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          }
        />
        <SettingRow icon={Users} title={t({ en: "Who is invited", id: "Siapa yang diundang" })} sub={count > 1 ? t({ en: "They answer which of the times suit them. Anyone in the lab may answer too.", id: "Mereka menjawab waktu mana yang cocok. Siapa pun di lab juga boleh menjawab." }) : t({ en: "They see the booking. With more than one time, they answer which suit them.", id: "Mereka melihat reservasinya. Jika ada lebih dari satu waktu, mereka menjawab mana yang cocok." })}>
          {active.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#4F6B73]">{t({ en: "Only coordinators see the team list. People can still answer the poll themselves.", id: "Hanya koordinator yang melihat daftar tim. Orang lain tetap bisa menjawab jajak waktu sendiri." })}</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {active.map((p) => {
                const on = form.invitees.includes(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => setForm(set(form, "invitees", on ? form.invitees.filter((x) => x !== p.id) : [...form.invitees, p.id]))} className={`min-h-[40px] rounded-full border px-3 text-[13px] font-medium sm:min-h-[32px] ${on ? "border-[#14919B] bg-[#E3F4F4] text-[#0B6477]" : "border-[#DCE7E8] bg-white text-[#36525A] hover:border-[#14919B]"}`}>
                    {p.full_name}
                  </button>
                );
              })}
            </div>
          )}
        </SettingRow>
        <SettingRow
          icon={ListChecks}
          title={t({ en: "Vote options", id: "Pilihan jawaban" })}
          sub={t({ en: "The answers people can give for each time.", id: "Jawaban yang bisa diberikan untuk setiap waktu." })}
          control={
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(["ya", "mungkin", "tidak"] as const).filter((a) => form.allowMaybe || a !== "mungkin").map((a) => <span key={a} className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${ANSWERS[a].className}`}>{answerLabel(a, lang)}</span>)}
              </div>
              <Switch on={form.allowMaybe} onChange={(v) => setForm(set(form, "allowMaybe", v))} label={t({ en: "Allow if need be", id: "Izinkan kalau perlu" })} />
            </div>
          }
        />
      </Card>

      <div className="sticky bottom-3 z-30 mx-auto w-full max-w-[560px] space-y-2">
        {action.error && <div className="rounded-lg bg-white shadow-lg"><ActionNote action={{ error: action.error, saved: false }} /></div>}
        <div className="flex items-center justify-between gap-3 rounded-full border border-[#DCE7E8] bg-white py-1.5 pl-5 pr-1.5 shadow-[0_8px_30px_rgba(15,47,54,0.14)]">
          <p className="min-w-0 text-[14px] text-[#36525A]" aria-live="polite">
            <span className="font-semibold tabular-nums text-[#0F2F36]">{count}</span> {t({ en: `${count === 1 ? "time" : "times"} selected`, id: "waktu dipilih" })}
            {clashing > 0 && <span className="text-[#8A5A07]"> · {clashing} {t({ en: "with a clash", id: "bentrok" })}</span>}
          </p>
          <PrimaryButton type="submit" disabled={action.busy || count === 0} className="rounded-full">{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : button}</PrimaryButton>
        </div>
      </div>
      </div>
      <Summary form={form} hostName={people.find((p) => p.id === form.hostId)?.full_name ?? null} inviteeCount={form.invitees.length} busy={busy} today={today} clashes={clashes} />
    </form>
  );
}
