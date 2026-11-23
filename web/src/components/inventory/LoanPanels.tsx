import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, Loader2, Phone, UserRound } from "lucide-react";
import { body, display } from "../../lib/fonts";
import { META } from "../NoteParts";
import {
  type Instrument,
  type InstrumentStatus,
  type PaymentStatus,
  type UsageLog,
  type UserType,
  type Charge,
  basisNounText,
  billingBasis,
  chargeFor,
  findClash,
  fmtDateTime,
  formatIDR,
  instrumentCharge,
  minimumQuantity,
  operatorChoices,
  overdueDays,
  rateTypeText,
  statusLabel,
  suggestQuantity,
  toLocalInput,
} from "../../lib/inventory";
import {
  cancelBooking,
  inventoryErrorText,
  requestLoan,
  returnLoan,
  setInstrumentStatus,
  startBooking,
} from "../../lib/inventory-data";
import { useLang, useT, type Bi, type Lang } from "../../lib/i18n";
import { Choice, Field, FormError, GhostButton, PrimaryButton, inputClass } from "./FormParts";

// The loan side of an instrument page: book a slot or check out now (internal
// borrowing or external rental, priced from the rate card), hand out or
// cancel bookings, and return what is out.

const errText = (e: unknown, lang: Lang) => (e instanceof Error ? inventoryErrorText(e.message, lang) : String(e));

export function Panel({
  title,
  tone,
  aside,
  children,
}: {
  title: string;
  tone?: "in_use" | "warn";
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[24px] border p-6 shadow-[0_14px_40px_-30px_rgba(8,49,58,0.35)] md:p-8 ${
        tone === "in_use"
          ? "border-[#14919B]/25 bg-[#14919B]/[0.06]"
          : tone === "warn"
            ? "border-[#E5484D]/25 bg-[#E5484D]/[0.04]"
            : "border-[#0B6477]/12 bg-white/90"
      }`}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-medium tracking-[-0.02em] text-neutral-900 md:text-[22px]" style={display}>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

function addHours(d: Date, h: number) {
  return new Date(d.getTime() + h * 3_600_000);
}

function tomorrowAt8() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

/* ---------- book or check out ---------- */

export function RequestPanel({
  instrument,
  logs,
  defaultName,
  memberNames,
  onDone,
}: {
  instrument: Instrument;
  logs: UsageLog[];
  defaultName: string;
  memberNames: string[];
  onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const canCheckout = instrument.status === "available" && !logs.some((l) => l.status === "ongoing" && l.log_type !== "check");
  const [mode, setMode] = useState<"checkout" | "book">(canCheckout ? "checkout" : "book");
  const [userType, setUserType] = useState<UserType>("internal");
  const choices = operatorChoices(instrument, userType, lang);
  const [operator, setOperator] = useState(choices[0].operator);
  const [name, setName] = useState(defaultName);
  const [org, setOrg] = useState("");
  const [contact, setContact] = useState("");
  const [technician, setTechnician] = useState("");
  const [purpose, setPurpose] = useState("");
  const [condition, setCondition] = useState("");
  const [start, setStart] = useState(() => toLocalInput(new Date()));
  const [end, setEnd] = useState(() => toLocalInput(addHours(new Date(), 24)));
  const [qty, setQty] = useState("");
  const [qtyTouched, setQtyTouched] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!canCheckout && mode === "checkout") setMode("book");
  }, [canCheckout, mode]);

  // Keep the operator valid when the user type changes the choices.
  useEffect(() => {
    if (!choices.some((c) => c.operator === operator)) setOperator(choices[0].operator);
  }, [choices, operator]);

  const switchMode = (m: "checkout" | "book") => {
    setMode(m);
    const s = m === "checkout" ? new Date() : tomorrowAt8();
    setStart(toLocalInput(s));
    setEnd(toLocalInput(addHours(s, m === "checkout" ? 24 : 9)));
    setErr(null);
  };

  const startD = new Date(start);
  const endD = new Date(end);
  const datesOk = !Number.isNaN(startD.getTime()) && !Number.isNaN(endD.getTime());
  const now = new Date();

  const basis = billingBasis(instrument.unit);
  const auto = datesOk ? suggestQuantity(instrument.unit, startD, endD) : null;
  const minQty = instrument.min_quantity ?? minimumQuantity(instrument.unit);
  const qtyNum = qtyTouched ? (qty.trim() ? Number(qty) : null) : auto;
  const choice = choices.find((c) => c.operator === operator) ?? choices[0];
  const charge = instrumentCharge(instrument, choice.rateType, choice.unitRate, qtyNum);
  const cost = charge.cost;
  const clash = datesOk && endD > startD ? findClash(logs, startD, endD) : null;

  const errors = {
    name: !name.trim() ? t({ en: "Enter who is borrowing it.", id: "Isi nama peminjam." }) : null,
    contact:
      userType === "external" && !contact.trim()
        ? t({ en: "An external user needs a phone number or email.", id: "Pengguna eksternal wajib mengisi nomor telepon atau email." })
        : null,
    start: !datesOk
      ? t({ en: "Enter a start date and time.", id: "Isi tanggal dan jam mulai." })
      : mode === "book" && startD.getTime() < now.getTime() - 5 * 60_000
        ? t({
            en: "A booking starts in the future. Use Check out now for a loan that has started.",
            id: "Reservasi dimulai di masa depan. Pakai Pinjam sekarang untuk peminjaman yang sudah berjalan.",
          })
        : mode === "checkout" && startD.getTime() > now.getTime() + 5 * 60_000
          ? t({
              en: "A checkout cannot start later than now. Book it instead.",
              id: "Peminjaman tidak bisa dimulai setelah saat ini. Pesan saja untuk nanti.",
            })
          : null,
    end: !datesOk
      ? t({ en: "Enter a return date and time.", id: "Isi tanggal dan jam kembali." })
      : endD <= startD
        ? t({ en: "The return must be after the start.", id: "Waktu kembali harus setelah waktu mulai." })
        : null,
    qty:
      qtyNum != null && (!Number.isFinite(qtyNum) || qtyNum < 0)
        ? t({ en: "Enter a positive number.", id: "Isi angka positif." })
        : null,
  };
  const show = (k: keyof typeof errors) => (tried ? errors[k] : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setErr(null);
    if (Object.values(errors).some(Boolean)) return;
    if (clash) {
      setErr(
        t({
          en: "This slot clashes with another booking or loan. Pick other dates.",
          id: "Slot ini bentrok dengan reservasi atau peminjaman lain. Pilih tanggal lain.",
        }),
      );
      return;
    }
    setSaving(true);
    try {
      await requestLoan(instrument.id, mode, {
        borrower_name: name,
        borrower_org: org,
        borrower_contact: contact,
        user_type: userType,
        operator: choice.operator,
        technician_name: technician,
        purpose,
        checkout_at: startD.toISOString(),
        expected_return: endD.toISOString(),
        quantity: qtyNum,
        condition_out: mode === "checkout" ? condition : "",
        notes: "",
      });
      setSaving(false);
      onDone();
    } catch (e2) {
      setErr(errText(e2, lang));
      setSaving(false);
    }
  };

  const statusNow = statusLabel(instrument.status, lang).toLowerCase();

  return (
    <Panel
      title={
        mode === "checkout"
          ? t({ en: "Borrow or rent this instrument", id: "Pinjam atau sewa instrumen ini" })
          : t({ en: "Book this instrument", id: "Pesan instrumen ini" })
      }
      aside={
        <div className="flex rounded-lg border border-[#0B6477]/15 bg-[#F3F7F6] p-1" role="group" aria-label={t({ en: "Request type", id: "Jenis permintaan" })}>
          {(
            [
              ["checkout", t({ en: "Check out now", id: "Pinjam sekarang" })],
              ["book", t({ en: "Book for later", id: "Pesan untuk nanti" })],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              disabled={m === "checkout" && !canCheckout}
              onClick={() => switchMode(m)}
              title={
                m === "checkout" && !canCheckout
                  ? t({ en: `It is ${statusNow} right now`, id: `Saat ini statusnya ${statusNow}` })
                  : undefined
              }
              className={`h-9 rounded-md px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === m ? "bg-[#08313A] text-white" : "text-neutral-600 hover:text-neutral-900"
              }`}
              style={body}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {!canCheckout && (
        <p className="mb-6 rounded-xl bg-[#F3F7F6] px-4 py-3 text-sm text-neutral-700" style={body}>
          {t({
            en: (
              <>
                It is <b>{statusNow}</b> right now, so it can only be booked for a later slot.
              </>
            ),
            id: (
              <>
                Saat ini statusnya <b>{statusNow}</b>, jadi hanya bisa dipesan untuk slot berikutnya.
              </>
            ),
          })}
        </p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Choice
            legend={t({ en: "Who is it for", id: "Untuk siapa" })}
            name="user_type"
            value={userType}
            onChange={setUserType}
            options={[
              { value: "internal", label: "Internal", note: t({ en: "UGM staff and students", id: "Staf dan mahasiswa UGM" }) },
              {
                value: "external",
                label: t({ en: "External", id: "Eksternal" }),
                note: t({ en: "Users from outside UGM", id: "Pengguna dari luar UGM" }),
              },
            ]}
          />
          <Choice
            legend={t({ en: "Operated by", id: "Dioperasikan oleh" })}
            name="operator"
            value={choice.operator}
            onChange={setOperator}
            options={choices.map((c) => ({
              value: c.operator,
              label: c.label,
              note:
                c.unitRate == null
                  ? t({ en: "Rate by arrangement", id: "Tarif sesuai kesepakatan" })
                  : `${formatIDR(c.unitRate)} ${instrument.unit ?? ""}`,
            }))}
          />

          <Field label={t({ en: "Borrower name", id: "Nama peminjam" })} required error={show("name")}>
            {(f) => (
              <>
                <input
                  id={f.id}
                  name="borrower_name"
                  list="inv-members"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  aria-invalid={f.invalid}
                  aria-describedby={f.describedBy}
                  className={inputClass}
                  style={body}
                />
                <datalist id="inv-members">
                  {memberNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label={t({ en: "Institution / lab", id: "Institusi / lab" })}>
            {(f) => (
              <input
                id={f.id}
                name="borrower_org"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                autoComplete="organization"
                placeholder={
                  userType === "external"
                    ? t({ en: "Company or institution", id: "Perusahaan atau institusi" })
                    : t({ en: "e.g. SmartAgri, Lab TLBP", id: "mis. SmartAgri, Lab TLBP" })
                }
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field
            label={t({ en: "Phone or email", id: "Telepon atau email" })}
            required={userType === "external"}
            error={show("contact")}
            hint={t({ en: "Used to remind them before the return date.", id: "Untuk mengingatkan sebelum tanggal kembali." })}
          >
            {(f) => (
              <input
                id={f.id}
                name="borrower_contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoComplete="tel"
                inputMode="text"
                spellCheck={false}
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          {choice.operator === "technician" ? (
            <Field label={t({ en: "Technician", id: "Teknisi" })}>
              {(f) => (
                <input
                  id={f.id}
                  name="technician_name"
                  list="inv-members"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  autoComplete="off"
                  placeholder={instrument.pic ?? t({ en: "Technician on duty", id: "Teknisi yang bertugas" })}
                  className={inputClass}
                  style={body}
                />
              )}
            </Field>
          ) : (
            <span className="hidden sm:block" />
          )}

          <Field
            label={mode === "checkout" ? t({ en: "Out from", id: "Keluar sejak" }) : t({ en: "Starts", id: "Mulai" })}
            required
            error={show("start")}
          >
            {(f) => (
              <input
                id={f.id}
                type="datetime-local"
                name="checkout_at"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                max={mode === "checkout" ? toLocalInput(addHours(now, 0.1)) : undefined}
                min={mode === "book" ? toLocalInput(now) : undefined}
                required
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label={t({ en: "Due back", id: "Batas kembali" })} required error={show("end")}>
            {(f) => (
              <input
                id={f.id}
                type="datetime-local"
                name="expected_return"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                min={start}
                required
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>

          <Field
            label={t({ en: `Quantity, ${basisNounText(basis, "en")}`, id: `Jumlah, ${basisNounText(basis, "id")}` })}
            error={show("qty")}
            hint={
              auto != null && !qtyTouched
                ? t({ en: "Worked out from the dates. Type to change it.", id: "Dihitung dari tanggal. Ketik untuk mengubahnya." })
                : minQty != null
                  ? t({
                      en: `Minimum ${groupNumber(minQty)} per request; fewer are charged as ${groupNumber(minQty)}.`,
                      id: `Minimum ${groupNumber(minQty)} per permintaan; jumlah di bawahnya ditagih sebagai ${groupNumber(minQty)}.`,
                    })
                  : basis === "sample"
                    ? t({
                        en: "Estimate now; the final count is entered on return. See what counts as one sample.",
                        id: "Perkirakan dulu; jumlah akhir diisi saat pengembalian. Lihat yang dihitung satu sampel.",
                      })
                    : basis === "hectare"
                      ? t({
                          en: "Estimate now; the final area is entered on return.",
                          id: "Perkirakan dulu; luas akhir diisi saat pengembalian.",
                        })
                      : undefined
            }
          >
            {(f) => (
              <input
                id={f.id}
                name="quantity"
                inputMode="decimal"
                autoComplete="off"
                value={qtyTouched ? qty : auto != null ? String(auto) : ""}
                onChange={(e) => {
                  setQtyTouched(true);
                  setQty(e.target.value.replace(",", "."));
                }}
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={`${inputClass} tabular-nums`}
                style={body}
              />
            )}
          </Field>
          <Field label={t({ en: "Purpose / project", id: "Keperluan / proyek" })}>
            {(f) => (
              <input
                id={f.id}
                name="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t({ en: "Short description", id: "Deskripsi singkat" })}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          {mode === "checkout" && (
            <Field
              label={t({ en: "Condition when handed out", id: "Kondisi saat diserahkan" })}
              full
              hint={t({ en: "Accessories included, visible wear, battery level.", id: "Aksesori yang disertakan, keausan yang terlihat, level baterai." })}
            >
              {(f) => (
                <input
                  id={f.id}
                  name="condition_out"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder={t({ en: "e.g. complete set, good working order", id: "mis. set lengkap, berfungsi baik" })}
                  aria-describedby={f.describedBy}
                  className={inputClass}
                  style={body}
                />
              )}
            </Field>
          )}
        </div>

        {clash && (
          <p className="flex items-start gap-2.5 rounded-xl bg-[#F59E0B]/[0.1] px-4 py-3 text-sm text-[#8A5300]" style={body} role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t({
                en: (
                  <>
                    Clashes with {clash.status === "booked" ? "a booking" : "a loan"} by <b>{clash.borrower_name}</b>,{" "}
                    {fmtDateTime(clash.checkout_at)} to {fmtDateTime(clash.expected_return)}.
                  </>
                ),
                id: (
                  <>
                    Bentrok dengan {clash.status === "booked" ? "reservasi" : "peminjaman"} oleh <b>{clash.borrower_name}</b>,{" "}
                    {fmtDateTime(clash.checkout_at, lang)} sampai {fmtDateTime(clash.expected_return, lang)}.
                  </>
                ),
              })}
            </span>
          </p>
        )}

        <div className="flex flex-col gap-4 rounded-2xl bg-[#F3F7F6] p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:flex" style={body}>
            <div>
              <dt className="text-neutral-500">{t({ en: "Rate", id: "Tarif" })}</dt>
              <dd className="font-medium text-neutral-900">{rateTypeText(choice.rateType, lang)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">{t({ en: "Estimated cost", id: "Perkiraan biaya" })}</dt>
              <dd className="font-semibold text-[#0B6477] tabular-nums">
                {cost == null
                  ? t({ en: "By arrangement", id: "Sesuai kesepakatan" })
                  : cost === 0
                    ? t({ en: "No charge", id: "Gratis" })
                    : formatIDR(cost)}
              </dd>
              <ChargeLines charge={charge} unit={basisNounText(basis, lang)} />
            </div>
          </dl>
          <PrimaryButton busy={saving}>
            {mode === "checkout" ? t({ en: "Check out", id: "Pinjam" }) : t({ en: "Book slot", id: "Pesan slot" })}
          </PrimaryButton>
        </div>
        <FormError message={err} />
        {instrument.lab && (
          <p className="text-xs text-neutral-500" style={body}>
            {t({
              en: `Requests are handled by the ${instrument.lab} manager, subject to instrument and technician availability and the lab's operating and safety procedures.`,
              id: `Permintaan ditangani pengelola ${instrument.lab}, bergantung pada ketersediaan instrumen dan teknisi serta prosedur operasional dan keselamatan lab.`,
            })}
          </p>
        )}
      </form>
    </Panel>
  );
}

const groupNumber = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);

// "20 × Rp75.000 + 10 × Rp60.000", and a note when the minimum was applied.
function ChargeLines({ charge, unit }: { charge: Charge; unit: string }) {
  const t = useT();
  if (charge.cost == null || (charge.lines.length < 2 && !charge.raisedToMinimum)) return null;
  return (
    <dd className="mt-0.5 text-xs text-neutral-500 tabular-nums">
      {charge.raisedToMinimum &&
        t({
          en: `Charged as the minimum ${groupNumber(charge.billed ?? 0)} ${unit}. `,
          id: `Ditagih sebagai minimum ${groupNumber(charge.billed ?? 0)} ${unit}. `,
        })}
      {charge.lines.map((l) => `${groupNumber(l.qty)} × ${formatIDR(l.rate)}`).join(" + ")}
    </dd>
  );
}

/* ---------- return ---------- */

// The English label is what the logbook stores when no condition is typed.
const RETURN_CONDITIONS: { value: InstrumentStatus; label: Bi; note: Bi }[] = [
  { value: "available", label: { en: "Good", id: "Baik" }, note: { en: "Back to available", id: "Kembali tersedia" } },
  { value: "maintenance", label: { en: "Needs a check", id: "Perlu dicek" }, note: { en: "Goes to maintenance", id: "Masuk pemeliharaan" } },
  { value: "broken", label: { en: "Damaged", id: "Rusak" }, note: { en: "Marked out of service", id: "Ditandai rusak" } },
];

export function ReturnPanel({
  instrument,
  log,
  onDone,
}: {
  instrument: Instrument;
  log: UsageLog;
  onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const now = new Date();
  const suggested = suggestQuantity(instrument.unit, new Date(log.checkout_at), now);
  const [after, setAfter] = useState<InstrumentStatus>("available");
  const [condition, setCondition] = useState("");
  const [qty, setQty] = useState(() => String(suggested ?? log.quantity ?? ""));
  const [notes, setNotes] = useState(log.notes ?? "");
  const [payment, setPayment] = useState<PaymentStatus>("unpaid");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qtyNum = qty.trim() ? Number(qty) : null;
  const charge = chargeFor(
    log.unit_rate,
    log.rate_type,
    qtyNum,
    instrument.min_quantity ?? minimumQuantity(instrument.unit),
    instrument.rate_tiers,
  );
  const cost = charge.cost;
  const late = overdueDays(log, now);
  const qtyErr =
    qtyNum != null && (!Number.isFinite(qtyNum) || qtyNum < 0) ? t({ en: "Enter a positive number.", id: "Isi angka positif." }) : null;
  const conditionErr =
    after !== "available" && !condition.trim()
      ? t({ en: "Say what is wrong so the technician knows.", id: "Jelaskan kerusakannya agar teknisi tahu." })
      : null;
  const noun = basisNounText(billingBasis(instrument.unit), lang);
  const [tried, setTried] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setErr(null);
    if (qtyErr || conditionErr) return;
    setSaving(true);
    try {
      await returnLoan(log.id, {
        quantity: qtyNum,
        condition: condition || RETURN_CONDITIONS.find((c) => c.value === after)!.label.en,
        notes,
        after,
        payment: cost && cost > 0 ? payment : null,
      });
      setSaving(false);
      onDone();
    } catch (e2) {
      setErr(errText(e2, lang));
      setSaving(false);
    }
  };

  return (
    <Panel
      title={t({ en: "Currently checked out", id: "Sedang dipinjam" })}
      tone={late ? "warn" : "in_use"}
      aside={
        late ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5484D]/12 px-3 py-1 text-sm font-medium text-[#B42318]" style={body}>
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {t({ en: `${late} ${late === 1 ? "day" : "days"} overdue`, id: `Terlambat ${late} hari` })}
          </span>
        ) : null
      }
    >
      <dl className="mb-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2" style={body}>
        <Info icon={<UserRound className="h-4 w-4" />} label={t({ en: "Borrower", id: "Peminjam" })}>
          <b>{log.borrower_name}</b>
          {log.borrower_org ? `, ${log.borrower_org}` : ""}
          <span className="text-neutral-500">
            {" "}
            · {log.user_type === "external" ? t({ en: "external", id: "eksternal" }) : "internal"}
          </span>
        </Info>
        <Info icon={<Phone className="h-4 w-4" />} label={t({ en: "Contact", id: "Kontak" })}>
          {log.borrower_contact ? <ContactLink value={log.borrower_contact} /> : "-"}
        </Info>
        <Info icon={<CalendarClock className="h-4 w-4" />} label={t({ en: "Out since", id: "Dipinjam sejak" })}>
          {fmtDateTime(log.checkout_at, lang)}
        </Info>
        <Info icon={<CalendarClock className="h-4 w-4" />} label={t({ en: "Due back", id: "Batas kembali" })}>
          <span className={late ? "font-medium text-[#B42318]" : ""}>{fmtDateTime(log.expected_return, lang)}</span>
        </Info>
        {log.purpose && (
          <Info label={t({ en: "Purpose", id: "Keperluan" })} full>
            {log.purpose}
          </Info>
        )}
        {log.condition_out && (
          <Info label={t({ en: "Condition when handed out", id: "Kondisi saat diserahkan" })} full>
            {log.condition_out}
          </Info>
        )}
      </dl>

      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Choice
          legend={t({ en: "Condition on return", id: "Kondisi saat kembali" })}
          name="after"
          value={after}
          onChange={setAfter}
          full
          options={RETURN_CONDITIONS.map((c) => ({ value: c.value, label: t(c.label), note: t(c.note) }))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t({ en: `Final quantity, ${noun}`, id: `Jumlah akhir, ${noun}` })}
            error={tried ? qtyErr : null}
            hint={
              suggested != null
                ? t({ en: `Out ${suggested} ${noun} so far.`, id: `Sudah dipinjam ${suggested} ${noun}.` })
                : undefined
            }
          >
            {(f) => (
              <input
                id={f.id}
                name="quantity"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(",", "."))}
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={`${inputClass} tabular-nums`}
                style={body}
              />
            )}
          </Field>
          <Field
            label={t({ en: "What was checked", id: "Yang diperiksa" })}
            required={after !== "available"}
            error={tried ? conditionErr : null}
          >
            {(f) => (
              <input
                id={f.id}
                name="condition_in"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder={
                  after === "available"
                    ? t({ en: "e.g. complete, no damage", id: "mis. lengkap, tidak ada kerusakan" })
                    : t({ en: "e.g. propeller cracked", id: "mis. baling-baling retak" })
                }
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label={t({ en: "Notes", id: "Catatan" })} full>
            {(f) => (
              <input
                id={f.id}
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t({ en: "Anything to flag", id: "Hal yang perlu dicatat" })}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          {cost != null && cost > 0 && (
            <Choice
              legend={t({ en: "Payment", id: "Pembayaran" })}
              name="payment"
              value={payment}
              onChange={setPayment}
              full
              options={[
                { value: "unpaid", label: t({ en: "Not paid yet", id: "Belum dibayar" }) },
                { value: "paid", label: t({ en: "Paid", id: "Lunas" }) },
                { value: "waived", label: t({ en: "Waived", id: "Dibebaskan" }) },
              ]}
            />
          )}
        </div>
        <div className="flex flex-col gap-4 rounded-2xl bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
          <dl className="text-sm text-neutral-600" style={body}>
            <dt className="inline">{t({ en: "Final cost: ", id: "Biaya akhir: " })}</dt>
            <dd className="inline font-semibold text-[#0B6477] tabular-nums">
              {cost == null
                ? t({ en: "By arrangement", id: "Sesuai kesepakatan" })
                : cost === 0
                  ? t({ en: "No charge", id: "Gratis" })
                  : formatIDR(cost)}
            </dd>
            <ChargeLines charge={charge} unit={noun} />
          </dl>
          <PrimaryButton busy={saving} tone="dark">
            {t({ en: "Mark as returned", id: "Tandai sudah kembali" })}
          </PrimaryButton>
        </div>
        <FormError message={err} />
      </form>
    </Panel>
  );
}

/* ---------- upcoming bookings ---------- */

export function BookingList({
  bookings,
  canHandOut,
  userId,
  isAdmin,
  onDone,
}: {
  bookings: UsageLog[];
  canHandOut: boolean;
  userId: string | null;
  isAdmin: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sorted = useMemo(() => [...bookings].sort((a, b) => a.checkout_at.localeCompare(b.checkout_at)), [bookings]);
  if (!sorted.length) return null;

  const run = async (id: string, f: () => Promise<void>) => {
    setBusy(id);
    setErr(null);
    try {
      await f();
      onDone();
    } catch (e) {
      setErr(errText(e, lang));
    }
    setBusy(null);
    setConfirm(null);
  };

  return (
    <div className="mt-6 rounded-[24px] border border-[#0B6477]/12 bg-white/90 p-6 md:p-8">
      <h3 className="mb-4 text-lg font-medium tracking-[-0.02em] text-neutral-900" style={display}>
        {t({ en: "Upcoming bookings", id: "Reservasi mendatang" })}
      </h3>
      <ul className="flex flex-col divide-y divide-[#0B6477]/8">
        {sorted.map((b) => {
          const mine = b.created_by === userId;
          return (
            <li key={b.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm" style={body}>
                <p className="font-medium text-neutral-900">
                  {fmtDateTime(b.checkout_at, lang)} <span className="text-neutral-400">{t({ en: "to", id: "sampai" })}</span>{" "}
                  {fmtDateTime(b.expected_return, lang)}
                </p>
                <p className="mt-0.5 text-neutral-600">
                  {b.borrower_name}
                  {b.borrower_org ? `, ${b.borrower_org}` : ""}
                  {b.user_type === "external" ? ` · ${t({ en: "external", id: "eksternal" })}` : ""}
                  {b.purpose ? ` · ${b.purpose}` : ""}
                </p>
                {b.borrower_contact && (
                  <p className="mt-0.5 text-neutral-500">
                    <ContactLink value={b.borrower_contact} />
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {canHandOut && (
                  <PrimaryButton type="button" busy={busy === b.id && confirm !== b.id} onClick={() => run(b.id, () => startBooking(b.id, ""))}>
                    {t({ en: "Hand out now", id: "Serahkan sekarang" })}
                  </PrimaryButton>
                )}
                {(mine || isAdmin) &&
                  (confirm === b.id ? (
                    <GhostButton danger disabled={busy === b.id} onClick={() => run(b.id, () => cancelBooking(b.id))}>
                      {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t({ en: "Confirm cancel", id: "Ya, batalkan" })}
                    </GhostButton>
                  ) : (
                    <GhostButton onClick={() => setConfirm(b.id)}>{t({ en: "Cancel", id: "Batal" })}</GhostButton>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <FormError message={err} />
      </div>
    </div>
  );
}

/* ---------- manual status ---------- */

export function StatusControl({ instrument, onDone }: { instrument: Instrument; onDone: () => void }) {
  const t = useT();
  const lang = useLang();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const options: InstrumentStatus[] = ["available", "maintenance", "calibration", "broken"];

  const change = async (status: InstrumentStatus) => {
    if (status === instrument.status) return;
    setSaving(true);
    setErr(null);
    try {
      await setInstrumentStatus(instrument.id, status);
      onDone();
    } catch (e) {
      setErr(errText(e, lang));
    }
    setSaving(false);
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-600" style={body}>
      <label htmlFor="inv-status">{t({ en: "Instrument status", id: "Status instrumen" })}</label>
      <select
        id="inv-status"
        value={instrument.status === "in_use" ? "available" : instrument.status}
        onChange={(e) => change(e.target.value as InstrumentStatus)}
        disabled={saving}
        className="h-10 rounded-xl border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-[#14919B]"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s, lang)}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="h-4 w-4 animate-spin text-[#0B6477]" />}
      {err && (
        <span role="alert" className="text-[#B42318]">
          {err}
        </span>
      )}
    </div>
  );
}

/* ---------- bits ---------- */

function Info({ icon, label, full, children }: { icon?: ReactNode; label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={`flex gap-2.5 ${full ? "sm:col-span-2" : ""}`}>
      {icon && <span className="mt-0.5 text-[#14919B]" aria-hidden="true">{icon}</span>}
      <div className="min-w-0">
        <dt className={`text-neutral-500 ${META}`}>{label}</dt>
        <dd className="mt-0.5 text-neutral-800">{children}</dd>
      </div>
    </div>
  );
}

export function ContactLink({ value }: { value: string }) {
  const v = value.trim();
  if (/^\S+@\S+\.\S+$/.test(v)) {
    return (
      <a href={`mailto:${v}`} className="text-[#0B6477] underline decoration-[#0B6477]/30 underline-offset-2 hover:decoration-[#0B6477]">
        {v}
      </a>
    );
  }
  const digits = v.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length >= 8) {
    return (
      <a href={`tel:${digits}`} className="text-[#0B6477] underline decoration-[#0B6477]/30 underline-offset-2 hover:decoration-[#0B6477]">
        {v}
      </a>
    );
  }
  return <>{v}</>;
}
