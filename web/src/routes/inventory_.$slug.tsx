import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import { ArrowLeft, Loader2, Microscope, Pencil } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import AuthGate from "../components/AuthGate";
import { EASE, MaskLine, META } from "../components/NoteParts";
import { supabase } from "../lib/auth/supabase";
import { useAuth } from "../lib/auth/auth";
import { headLang, localeOf, useLang, useT, type Lang } from "../lib/i18n";
import {
  type Instrument,
  type InstrumentStatus,
  type PaymentStatus,
  type UsageLog,
  formatIDR,
  fmtDateTime,
  logStatusLabel,
  logStatusMeta,
  overdueDays,
  paymentLabel,
  paymentMeta,
  statusLabel,
  statusMeta,
} from "../lib/inventory";
import { inventoryErrorText, labMemberNames, setPayment } from "../lib/inventory-data";
import InstrumentForm from "../components/inventory/InstrumentForm";
import Supporters from "../components/inventory/Supporters";
import { Field, FormError, PrimaryButton, inputClass } from "../components/inventory/FormParts";
import {
  BookingList,
  ContactLink,
  Panel,
  RequestPanel,
  ReturnPanel,
  StatusControl,
} from "../components/inventory/LoanPanels";

export const Route = createFileRoute("/inventory_/$slug")({
  component: InstrumentPage,
  head: ({ matches }) => ({
    meta: [
      { title: headLang(matches) === "id" ? "Instrumen | smartagri" : "Instrument | smartagri" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

// One instrument: photo and rates on the left (sticky), the name, status and
// the action that fits its state on the right (book or check out, return,
// or log an inspection for an installed unit), upcoming bookings, then the
// usage or inspection history. Lab admins also edit the instrument here.
function InstrumentPage() {
  return (
    <AuthGate>
      <InstrumentPageInner />
    </AuthGate>
  );
}

function InstrumentPageInner() {
  const { user, account } = useAuth();
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <SiteHeader />
        <div className="relative overflow-clip bg-white">
          <AmbientWash count={4} />
          <div className="relative">
            <InstrumentDetail
              userId={user?.id ?? null}
              userName={account?.name || meta?.full_name || meta?.name || ""}
              isAdmin={!!account?.isAdmin}
            />
          </div>
        </div>
        <Footer />
      </main>
    </MotionConfig>
  );
}

function InstrumentDetail({ userId, userName, isAdmin }: { userId: string | null; userName: string; isAdmin: boolean }) {
  const t = useT();
  const lang = useLang();
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [all, setAll] = useState<Instrument[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);

  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    labMemberNames()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    let active = true;
    // Only the first load shows the spinner; a refresh after an action keeps
    // the page where it is.
    if (reloadKey === 0) setLoading(true);
    setError(null);
    if (!supabase) {
      setError(inventoryErrorText("Inventory storage is not configured on this environment.", lang));
      setLoading(false);
      return;
    }
    const db = supabase;
    (async () => {
      const { data: inst, error: e1 } = await db.from("instruments").select("*").eq("slug", slug).maybeSingle();
      if (!active) return;
      if (e1) {
        setError(e1.message);
        setLoading(false);
        return;
      }
      if (!inst) {
        setInstrument(null);
        setLoading(false);
        return;
      }
      const found = inst as Instrument;
      setInstrument(found);
      const [{ data: rows, error: e2 }, everyone] = await Promise.all([
        db.from("usage_logs").select("*").eq("instrument_id", found.id).order("checkout_at", { ascending: false }),
        isAdmin ? db.from("instruments").select("*") : Promise.resolve({ data: [] as Instrument[] }),
      ]);
      if (!active) return;
      if (e2) setError(e2.message);
      else setLogs((rows ?? []) as UsageLog[]);
      setAll((everyone.data ?? []) as Instrument[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug, reloadKey, isAdmin]);

  if (loading) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
      </section>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="rounded-[20px] border border-dashed border-[#0B6477]/25 bg-white/70 p-8 text-center text-sm text-neutral-500" style={body}>
          {error}
        </div>
      </Shell>
    );
  }

  if (!instrument) {
    return (
      <Shell>
        <p className="text-neutral-600" style={body}>
          {t({ en: "Instrument not found.", id: "Instrumen tidak ditemukan." })}
        </p>
      </Shell>
    );
  }

  const borrowLogs = logs.filter((l) => l.log_type !== "check");
  const activeLog = borrowLogs.find((l) => l.status === "ongoing") ?? null;
  const bookings = borrowLogs.filter((l) => l.status === "booked");
  const meta = statusMeta[instrument.status as InstrumentStatus];
  const installed = instrument.kind === "installed";
  const now = new Date();

  return (
    <Shell
      action={
        isAdmin ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`inline-flex items-center gap-2 rounded-lg border border-[#0B6477]/20 px-3.5 py-2 text-[#0B6477] transition-colors hover:bg-[#F3F7F6] ${META}`}
            style={body}
          >
            <Pencil className="h-3.5 w-3.5" /> {t({ en: "Edit instrument", id: "Ubah instrumen" })}
          </button>
        ) : null
      }
    >
      {isAdmin && (
        <InstrumentForm
          open={editing}
          instrument={instrument}
          all={all}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            if (next !== slug) navigate({ to: "/inventory/$slug", params: { slug: next } });
            else refresh();
          }}
        />
      )}
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Photo, rates and notes */}
        <div className="lg:col-span-5">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[110px]">
            <motion.div
              initial={{ clipPath: "inset(0% 0% 100% 0% round 24px)" }}
              animate={{ clipPath: "inset(0% 0% 0% 0% round 24px)" }}
              transition={{ delay: 0.15, duration: 1, ease: EASE }}
              className="relative overflow-hidden rounded-[24px] border border-[#0B6477]/10 bg-[#F3F7F6]"
            >
              {instrument.photo ? (
                <motion.img
                  src={instrument.photo}
                  alt={instrument.name}
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, duration: 1.4, ease: EASE }}
                  className="aspect-[4/3] w-full object-contain p-8"
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center">
                  <Microscope className="h-12 w-12 text-[#0B6477]/25" />
                </div>
              )}
              <span className={`absolute left-4 top-4 rounded-md bg-white/90 px-2.5 py-1 text-[#0B6477] ${META}`} style={body}>
                {instrument.code}
              </span>
            </motion.div>

            {!installed && (
              <div className="grid gap-px overflow-hidden rounded-[20px] border border-[#0B6477]/12 bg-[#0B6477]/12 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <RateCard label={t({ en: "Internal, self-operated", id: "Internal, mandiri" })} value={instrument.rate_internal_self} unit={instrument.unit} />
                <RateCard label={t({ en: "Internal, technician", id: "Internal, teknisi" })} value={instrument.rate_internal_tech} unit={instrument.unit} />
                <RateCard label={t({ en: "External", id: "Eksternal" })} value={instrument.rate_external} unit={instrument.unit} />
              </div>
            )}
            {!installed && instrument.rate_tiers && instrument.rate_tiers.length > 0 && <TierTable instrument={instrument} />}
            {instrument.terms && (
              <div className="rounded-[20px] border border-[#0B6477]/12 bg-white/90 p-5" style={body}>
                <p className={`mb-3 text-neutral-500 ${META}`}>
                  {/sampel|sample/i.test(instrument.unit ?? "")
                    ? t({ en: "What counts as one sample", id: "Yang dihitung satu sampel" })
                    : t({ en: "Terms from the rate letter", id: "Ketentuan dari surat tarif" })}
                </p>
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-neutral-700 marker:text-[#14919B]">
                  {instrument.terms
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                </ul>
              </div>
            )}
            {(instrument.pic || instrument.notes) && (
              <div className="rounded-[20px] border border-[#0B6477]/12 bg-white/90 p-5 text-sm text-neutral-700" style={body}>
                {instrument.pic && (
                  <p>
                    <span className="text-neutral-500">{t({ en: "Person in charge: ", id: "Penanggung jawab: " })}</span>
                    <b className="font-medium text-neutral-900">{instrument.pic}</b>
                  </p>
                )}
                {instrument.notes && (
                  <p className={`whitespace-pre-line leading-relaxed ${instrument.pic ? "mt-2" : ""}`}>{instrument.notes}</p>
                )}
              </div>
            )}
            <Supporters compact />
          </div>
        </div>

        {/* Name, status and action */}
        <div className="lg:col-span-7">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`flex items-center gap-2 text-[#14919B] ${META}`}
            style={body}
          >
            <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
            {[instrument.code, instrument.lab].filter(Boolean).join(" · ")}
          </motion.p>
          <motion.h1
            initial="hidden"
            animate="show"
            className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-900 md:text-5xl"
            style={display}
          >
            <MaskLine delay={0.05}>{instrument.name}</MaskLine>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
            className="mt-5 flex flex-wrap items-center gap-2"
          >
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${meta.chip}`} style={body}>
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {statusLabel(instrument.status as InstrumentStatus, lang)}
            </span>
            {installed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B6477]/10 px-3 py-1.5 text-sm font-medium text-[#0B6477]" style={body}>
                {t({ en: "Permanently installed", id: "Terpasang permanen" })}
              </span>
            )}
            {bookings.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0AD1C8]/15 px-3 py-1.5 text-sm font-medium text-[#0B6477]" style={body}>
                {t({
                  en: `${bookings.length} upcoming ${bookings.length === 1 ? "booking" : "bookings"}`,
                  id: `${bookings.length} reservasi mendatang`,
                })}
              </span>
            )}
            <span className="text-[15px] text-neutral-500" style={body}>
              {[instrument.brand, instrument.category].filter(Boolean).join(" · ")}
            </span>
          </motion.div>
          {instrument.spec && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="mt-5 max-w-[60ch] text-base leading-relaxed text-neutral-700 md:text-lg"
              style={body}
            >
              {instrument.spec}
            </motion.p>
          )}

          {/* Action panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
            className="mt-10"
          >
            {installed ? (
              <InspectionPanel instrument={instrument} userId={userId} defaultName={userName} onDone={refresh} />
            ) : activeLog ? (
              <ReturnPanel key={activeLog.id} instrument={instrument} log={activeLog} onDone={refresh} />
            ) : (
              <RequestPanel
                key={`${instrument.id}-${instrument.status}-${logs.length}`}
                instrument={instrument}
                logs={logs}
                defaultName={userName}
                memberNames={members}
                onDone={refresh}
              />
            )}
            {!installed && (
              <BookingList
                bookings={bookings}
                canHandOut={!activeLog && instrument.status === "available"}
                userId={userId}
                isAdmin={isAdmin}
                onDone={refresh}
              />
            )}
            {!activeLog && <StatusControl instrument={instrument} onDone={refresh} />}
          </motion.div>
        </div>
      </div>

      {/* History */}
      <div className="mt-16 border-t border-[#0B6477]/10 pt-12">
        <p className={`mb-3 flex items-center gap-2 text-[#14919B] ${META}`} style={body}>
          <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
          {t({ en: `${logs.length} ${logs.length === 1 ? "entry" : "entries"}`, id: `${logs.length} catatan` })}
        </p>
        <h2 className="mb-6 text-3xl font-semibold tracking-[-0.03em] text-neutral-900 md:text-4xl" style={display}>
          {installed ? (
            <>
              {t({ en: "Inspection", id: "Log" })} <span style={accent}>{t({ en: "log", id: "inspeksi" })}</span>
            </>
          ) : (
            <>
              {t({ en: "Usage", id: "Riwayat" })} <span style={accent}>{t({ en: "history", id: "pemakaian" })}</span>
            </>
          )}
        </h2>
        {logs.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#0B6477]/25 bg-white/70 p-8 text-center text-sm text-neutral-500" style={body}>
            {installed
              ? t({ en: "No inspections logged yet.", id: "Belum ada inspeksi yang dicatat." })
              : t({ en: "No usage logged yet.", id: "Belum ada pemakaian yang dicatat." })}
          </div>
        ) : installed ? (
          <div className="overflow-x-auto rounded-[20px] border border-[#0B6477]/12 bg-white/90">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="bg-[#F3F7F6]/80 text-neutral-400">
                  <Th>{t({ en: "Date", id: "Tanggal" })}</Th>
                  <Th>{t({ en: "Checked by", id: "Diperiksa oleh" })}</Th>
                  <Th>{t({ en: "Type", id: "Jenis" })}</Th>
                  <Th>{t({ en: "Result", id: "Hasil" })}</Th>
                  <Th>{t({ en: "Notes", id: "Catatan" })}</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-[#0B6477]/8 align-top transition-colors hover:bg-[#F3F7F6]/70">
                    <Td className="whitespace-nowrap text-neutral-600">{fmtDate(l.checkout_at, lang)}</Td>
                    <Td className="font-medium text-neutral-800">{l.borrower_name}</Td>
                    <Td className="text-neutral-600">{checkText(l.purpose, lang) || "-"}</Td>
                    <Td className="text-neutral-600">{checkText(l.condition_in || l.condition_out, lang) || "-"}</Td>
                    <Td className="text-neutral-600">{l.notes || "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[20px] border border-[#0B6477]/12 bg-white/90">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="bg-[#F3F7F6]/80 text-neutral-400">
                  <Th>{t({ en: "Borrower", id: "Peminjam" })}</Th>
                  <Th>{t({ en: "From", id: "Mulai" })}</Th>
                  <Th>{t({ en: "Due / returned", id: "Batas / kembali" })}</Th>
                  <Th>{t({ en: "Purpose", id: "Keperluan" })}</Th>
                  <Th className="text-right">{t({ en: "Cost", id: "Biaya" })}</Th>
                  <Th>{t({ en: "Status", id: "Status" })}</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const late = overdueDays(l, now);
                  const st = logStatusMeta[l.status] ?? logStatusMeta.returned;
                  return (
                    <tr
                      key={l.id}
                      className={`border-t border-[#0B6477]/8 align-top transition-colors hover:bg-[#F3F7F6]/70 ${
                        l.status === "cancelled" ? "opacity-60" : ""
                      }`}
                    >
                      <Td>
                        <div className="font-medium text-neutral-800">{l.borrower_name}</div>
                        <div className="text-xs text-neutral-500">
                          {l.borrower_org || "-"} · {l.user_type === "external" ? t({ en: "rental", id: "sewa" }) : t({ en: "internal", id: "internal" })}
                          {l.operator === "technician" ? ` · ${t({ en: "technician", id: "teknisi" })}${l.technician_name ? ` ${l.technician_name}` : ""}` : ""}
                        </div>
                        {l.borrower_contact && (
                          <div className="text-xs">
                            <ContactLink value={l.borrower_contact} />
                          </div>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-neutral-600">{fmtDateTime(l.checkout_at, lang)}</Td>
                      <Td className="whitespace-nowrap text-neutral-600">
                        {l.returned_at ? (
                          fmtDateTime(l.returned_at, lang)
                        ) : l.expected_return ? (
                          <span className={late ? "font-medium text-[#B42318]" : ""}>
                            {t({ en: "due", id: "batas" })} {fmtDateTime(l.expected_return, lang)}
                            {late ? t({ en: ` (${late} d late)`, id: ` (terlambat ${late} hr)` }) : ""}
                          </span>
                        ) : (
                          "-"
                        )}
                      </Td>
                      <Td className="text-neutral-600">{l.purpose || "-"}</Td>
                      <Td className="text-right">
                        <div className="font-medium tabular-nums text-neutral-800">{formatIDR(l.cost)}</div>
                        {l.payment_status && <PaymentCell log={l} isAdmin={isAdmin} onDone={refresh} />}
                      </Td>
                      <Td>
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                            late ? "bg-[#E5484D]/12 text-[#B42318]" : st.chip
                          }`}
                        >
                          {late ? t({ en: "Overdue", id: "Terlambat" }) : logStatusLabel(logStatusMeta[l.status] ? l.status : "returned", lang)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}

function PaymentCell({ log, isAdmin, onDone }: { log: UsageLog; isAdmin: boolean; onDone: () => void }) {
  const t = useT();
  const lang = useLang();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const status = log.payment_status as PaymentStatus;
  const m = paymentMeta[status] ?? paymentMeta.unpaid;
  const mLabel = paymentLabel(paymentMeta[status] ? status : "unpaid", lang);
  if (!isAdmin) {
    return <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${m.chip}`}>{mLabel}</span>;
  }
  return (
    <div className="mt-1 flex flex-col items-end gap-1">
      <select
        aria-label={t({ en: `Payment by ${log.borrower_name}`, id: `Pembayaran oleh ${log.borrower_name}` })}
        value={status}
        disabled={saving}
        onChange={async (e) => {
          setSaving(true);
          setErr(null);
          try {
            await setPayment(log.id, e.target.value as PaymentStatus);
            onDone();
          } catch (e2) {
            setErr(e2 instanceof Error ? inventoryErrorText(e2.message, lang) : String(e2));
          }
          setSaving(false);
        }}
        className={`h-7 rounded-full border-0 px-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#14919B]/40 ${m.chip}`}
      >
        {(Object.keys(paymentMeta) as PaymentStatus[]).map((p) => (
          <option key={p} value={p}>
            {paymentLabel(p, lang)}
          </option>
        ))}
      </select>
      {err && <span className="max-w-[180px] text-[11px] text-[#B42318]">{err}</span>}
    </div>
  );
}

const CHECK_TYPES = [
  "Routine functional check",
  "Periodic inspection",
  "Troubleshooting",
  "Data retrieval & health check",
  "Preventive maintenance",
  "Calibration check",
];
const CHECK_RESULTS = ["All functions normal", "Minor issue resolved", "Needs attention"];

// The values above are what the logbook stores; these are only what the page shows.
const CHECK_TEXT_ID: Record<string, string> = {
  "Routine functional check": "Pemeriksaan fungsi rutin",
  "Periodic inspection": "Inspeksi berkala",
  Troubleshooting: "Penanganan masalah",
  "Data retrieval & health check": "Pengambilan data & cek kondisi",
  "Preventive maintenance": "Pemeliharaan preventif",
  "Calibration check": "Pemeriksaan kalibrasi",
  "All functions normal": "Semua fungsi normal",
  "Minor issue resolved": "Masalah kecil teratasi",
  "Needs attention": "Perlu penanganan",
};

function checkText(value: string | null | undefined, lang: Lang): string {
  if (!value) return "";
  return lang === "id" ? (CHECK_TEXT_ID[value] ?? value) : value;
}

function InspectionPanel({
  instrument,
  userId,
  defaultName,
  onDone,
}: {
  instrument: Instrument;
  userId: string | null;
  defaultName: string;
  onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const today = new Date().toISOString().slice(0, 10);
  const [inspector, setInspector] = useState(defaultName);
  const [date, setDate] = useState(today);
  const [type, setType] = useState(CHECK_TYPES[0]);
  const [result, setResult] = useState(CHECK_RESULTS[0]);
  const [notes, setNotes] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nameErr =
    tried && !inspector.trim() ? t({ en: "Enter who carried out the check.", id: "Isi siapa yang melakukan pemeriksaan." }) : null;
  const dateErr =
    tried && (!date || date > today) ? t({ en: "Pick today or an earlier date.", id: "Pilih hari ini atau tanggal sebelumnya." }) : null;
  const notesErr =
    tried && result === "Needs attention" && !notes.trim()
      ? t({ en: "Describe what needs attention.", id: "Jelaskan apa yang perlu ditangani." })
      : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setErr(null);
    if (!supabase || !inspector.trim() || !date || date > today) return;
    if (result === "Needs attention" && !notes.trim()) return;
    setSaving(true);
    const at = new Date(`${date}T12:00:00`).toISOString();
    const { error } = await supabase.from("usage_logs").insert({
      instrument_id: instrument.id,
      log_type: "check",
      borrower_name: inspector.trim(),
      user_type: "internal",
      operator: "self",
      checkout_at: at,
      returned_at: at,
      status: "returned",
      purpose: type,
      condition_out: result,
      condition_in: result,
      notes: notes.trim() || null,
      created_by: userId,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setNotes("");
    setTried(false);
    onDone();
  };

  const select = (id: string, value: string, set: (v: string) => void, options: string[], name: string) => (
    <select id={id} name={name} value={value} onChange={(e) => set(e.target.value)} className={inputClass} style={body}>
      {options.map((o) => (
        <option key={o} value={o}>
          {checkText(o, lang)}
        </option>
      ))}
    </select>
  );

  return (
    <Panel title={t({ en: "Log an inspection or maintenance check", id: "Catat inspeksi atau pemeliharaan" })}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t({ en: "Checked by", id: "Diperiksa oleh" })} required error={nameErr}>
            {(f) => (
              <input
                id={f.id}
                name="inspector"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                required
                autoComplete="name"
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label={t({ en: "Date", id: "Tanggal" })} required error={dateErr}>
            {(f) => (
              <input
                id={f.id}
                type="date"
                name="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                required
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label={t({ en: "Type", id: "Jenis" })}>{(f) => select(f.id, type, setType, CHECK_TYPES, "type")}</Field>
          <Field label={t({ en: "Result", id: "Hasil" })}>{(f) => select(f.id, result, setResult, CHECK_RESULTS, "result")}</Field>
          <Field label={t({ en: "Notes / findings", id: "Catatan / temuan" })} full required={result === "Needs attention"} error={notesErr}>
            {(f) => (
              <textarea
                id={f.id}
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t({ en: "What was checked, any issues, actions taken", id: "Apa yang diperiksa, masalah yang ditemukan, tindakan yang diambil" })}
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={`${inputClass} h-auto py-3 leading-relaxed`}
                style={body}
              />
            )}
          </Field>
        </div>
        <div className="flex justify-end">
          <PrimaryButton busy={saving}>{t({ en: "Save inspection", id: "Simpan inspeksi" })}</PrimaryButton>
        </div>
        <FormError message={err} />
      </form>
    </Panel>
  );
}

/* ---------- small building blocks ---------- */

function Shell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const t = useT();
  return (
    <section className="mx-auto max-w-[1360px] px-6 pb-20 pt-10 md:px-12 md:pb-28 md:pt-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/inventory"
          className={`group inline-flex items-center gap-2 text-neutral-600 hover:text-[#0B6477] ${META}`}
          style={body}
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {t({ en: "Back to inventory", id: "Kembali ke inventaris" })}
        </Link>
        {action}
      </div>
      {children}
    </section>
  );
}

function RateCard({ label, value, unit }: { label: string; value: number | null; unit: string | null }) {
  return (
    <div className="flex flex-col gap-1 bg-white/90 p-4">
      <span className={`text-neutral-400 ${META}`} style={body}>
        {label}
      </span>
      <span className="text-xl font-semibold tracking-[-0.02em] text-neutral-900" style={display}>
        {formatIDR(value)}
      </span>
      <span className="text-xs text-neutral-400" style={body}>
        {unit}
      </span>
    </div>
  );
}

// The F-750 sample tiers from the rate letter, by user type.
function TierTable({ instrument }: { instrument: Instrument }) {
  const t = useT();
  const tiers = [...(instrument.rate_tiers ?? [])].sort((a, b) => a.from - b.from);
  const bands = [
    { from: 1, self: instrument.rate_internal_self, tech: instrument.rate_internal_tech, ext: instrument.rate_external },
  ];
  for (const tier of tiers) {
    const prev = bands[bands.length - 1];
    bands.push({
      from: tier.from,
      self: tier.internal_self ?? prev.self,
      tech: tier.internal_tech ?? prev.tech,
      ext: tier.external ?? prev.ext,
    });
  }
  const showSelf = bands.some((b) => b.self != null);
  const showTech = bands.some((b) => b.tech != null);
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#0B6477]/12 bg-white/90">
      <table className="w-full border-collapse text-left text-sm" style={body}>
        <caption className={`px-4 pt-4 text-left text-neutral-500 ${META}`}>{t({ en: "Tiered rate per request", id: "Tarif berjenjang per permintaan" })}</caption>
        <thead>
          <tr className="text-neutral-500">
            <th className="px-4 py-2 font-medium">{t({ en: "Samples", id: "Sampel" })}</th>
            {showSelf && <th className="px-4 py-2 text-right font-medium">{t({ en: "Internal, self", id: "Internal, mandiri" })}</th>}
            {showTech && <th className="px-4 py-2 text-right font-medium">Internal</th>}
            <th className="px-4 py-2 text-right font-medium">{t({ en: "External", id: "Eksternal" })}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {bands.map((b, i) => {
            const next = bands[i + 1];
            return (
              <tr key={b.from} className="border-t border-[#0B6477]/8">
                <td className="px-4 py-2 text-neutral-700">{next ? `${b.from}–${next.from - 1}` : t({ en: `${b.from} and up`, id: `${b.from} ke atas` })}</td>
                {showSelf && <td className="px-4 py-2 text-right">{formatIDR(b.self)}</td>}
                {showTech && <td className="px-4 py-2 text-right">{formatIDR(b.tech)}</td>}
                <td className="px-4 py-2 text-right">{formatIDR(b.ext)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {instrument.min_quantity != null && (
        <p className="border-t border-[#0B6477]/8 px-4 py-3 text-xs text-neutral-500" style={body}>
          {t({
            en: `Minimum ${instrument.min_quantity} per request; fewer are charged as ${instrument.min_quantity}.`,
            id: `Minimum ${instrument.min_quantity} per permintaan; jumlah di bawahnya ditagih sebagai ${instrument.min_quantity}.`,
          })}
        </p>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${className}`} style={body}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 align-top text-sm ${className}`} style={body}>
      {children}
    </td>
  );
}

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(localeOf(lang), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
