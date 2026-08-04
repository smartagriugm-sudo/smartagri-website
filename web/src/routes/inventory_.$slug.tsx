import { useEffect, useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import { supabase } from "../lib/auth/supabase";
import { useAuth } from "../lib/auth/auth";
import {
  type Instrument,
  type InstrumentStatus,
  type Operator,
  type UsageLog,
  type UserType,
  INSTRUMENT_STATUSES,
  computeCost,
  formatIDR,
  rateTypeLabel,
  resolveRate,
  statusMeta,
} from "../lib/inventory";

export const Route = createFileRoute("/inventory_/$slug")({
  component: InstrumentPage,
  head: () => ({
    meta: [
      { title: "Instrument | smartagri" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function InstrumentPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const router = useRouter();

  const blocked = isConfigured && !authLoading && !user;
  useEffect(() => {
    if (blocked) {
      const here = router.state.location.pathname;
      window.location.assign(`/sign-in?redirect=${encodeURIComponent(here)}`);
    }
  }, [blocked, router]);

  if (isConfigured && (authLoading || !user)) {
    return (
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6]">
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
            <p className="text-sm" style={body}>
              {authLoading ? "Checking access..." : "Redirecting to sign in..."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <SiteHeader />
      <InstrumentDetail userId={user?.id ?? null} />
      <Footer />
    </main>
  );
}

function InstrumentDetail({ userId }: { userId: string | null }) {
  const { slug } = Route.useParams();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("Inventory storage is not configured on this environment.");
      setLoading(false);
      return;
    }
    (async () => {
      const { data: inst, error: e1 } = await supabase
        .from("instruments")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
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
      const instrument = inst as Instrument;
      setInstrument(instrument);
      const { data: rows, error: e2 } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("instrument_id", instrument.id)
        .order("checkout_at", { ascending: false });
      if (!active) return;
      if (e2) setError(e2.message);
      else setLogs((rows ?? []) as UsageLog[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug, reloadKey]);

  if (loading) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
      </section>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-8 text-center text-neutral-500 text-sm" style={body}>
          {error}
        </div>
      </Shell>
    );
  }

  if (!instrument) {
    return (
      <Shell>
        <p className="text-neutral-600" style={body}>
          Instrument not found.
        </p>
      </Shell>
    );
  }

  const activeLog = logs.find((l) => l.status === "ongoing") ?? null;
  const meta = statusMeta[instrument.status as InstrumentStatus];

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div
            className="text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-2"
            style={body}
          >
            {instrument.code} · {instrument.lab}
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.03em] leading-[1.1] text-neutral-900"
            style={display}
          >
            {instrument.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-500" style={body}>
            {instrument.brand} · {instrument.category}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${meta.chip}`}
        >
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {/* Rate card */}
      <div className="mt-8 grid sm:grid-cols-3 gap-3">
        <RateCard label="Internal, self" value={instrument.rate_internal_self} unit={instrument.unit} />
        <RateCard label="Internal, technician" value={instrument.rate_internal_tech} unit={instrument.unit} />
        <RateCard label="External" value={instrument.rate_external} unit={instrument.unit} />
      </div>

      {/* Action panel */}
      <div className="mt-10">
        {activeLog ? (
          <ReturnPanel
            instrument={instrument}
            log={activeLog}
            onDone={refresh}
          />
        ) : instrument.status === "available" ? (
          <CheckoutPanel instrument={instrument} userId={userId} onDone={refresh} />
        ) : (
          <div className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] p-6 text-sm text-neutral-600" style={body}>
            This instrument is currently marked <b>{meta.label.toLowerCase()}</b> and
            is not available for checkout.
          </div>
        )}
        <StatusControl instrument={instrument} disabled={!!activeLog} onDone={refresh} />
      </div>

      {/* History */}
      <div className="mt-12">
        <h2
          className="text-xl font-semibold tracking-[-0.025em] text-neutral-900 mb-4"
          style={display}
        >
          Usage <span style={accent}>history</span>
        </h2>
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#0B6477]/25 bg-[#F3F7F6] p-6 text-center text-sm text-neutral-500" style={body}>
            No usage logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#0B6477]/10">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F3F7F6] text-neutral-500">
                  <Th>Borrower</Th>
                  <Th>Out</Th>
                  <Th>Returned</Th>
                  <Th>Rate</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Cost</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-[#0B6477]/8 align-top">
                    <Td>
                      <div className="font-medium text-neutral-800">{l.borrower_name}</div>
                      <div className="text-xs text-neutral-400">
                        {l.borrower_org || "-"} · {l.user_type}
                        {l.operator === "technician" ? " · technician" : ""}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-neutral-600">{fmtDate(l.checkout_at)}</Td>
                    <Td className="whitespace-nowrap text-neutral-600">{l.returned_at ? fmtDate(l.returned_at) : "-"}</Td>
                    <Td className="text-neutral-600">
                      {l.rate_type ? rateTypeLabel[l.rate_type] : "-"}
                      <div className="text-xs text-neutral-400">{formatIDR(l.unit_rate)} {l.unit}</div>
                    </Td>
                    <Td className="text-right text-neutral-700">{l.quantity ?? "-"}</Td>
                    <Td className="text-right font-medium text-neutral-800">{formatIDR(l.cost)}</Td>
                    <Td>
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          l.status === "ongoing"
                            ? "bg-[#14919B]/15 text-[#0B6477]"
                            : "bg-[#45DFB1]/20 text-[#0B6477]"
                        }`}
                      >
                        {l.status === "ongoing" ? "Ongoing" : "Returned"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}

function CheckoutPanel({
  instrument,
  userId,
  onDone,
}: {
  instrument: Instrument;
  userId: string | null;
  onDone: () => void;
}) {
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerOrg, setBorrowerOrg] = useState("");
  const [userType, setUserType] = useState<UserType>("internal");
  const [operator, setOperator] = useState<Operator>("self");
  const [technician, setTechnician] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expected, setExpected] = useState("");
  const [quantity, setQuantity] = useState("");
  const [conditionOut, setConditionOut] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { rateType, unitRate } = resolveRate(instrument, userType, operator);
  const qtyNum = quantity ? Number(quantity) : null;
  const cost = computeCost(qtyNum, unitRate);

  const submit = async () => {
    if (!supabase) return;
    if (!borrowerName.trim()) {
      setErr("Borrower name is required.");
      return;
    }
    setSaving(true);
    setErr(null);
    const { error: e1 } = await supabase.from("usage_logs").insert({
      instrument_id: instrument.id,
      borrower_name: borrowerName.trim(),
      borrower_org: borrowerOrg.trim() || null,
      user_type: userType,
      operator,
      technician_name: operator === "technician" ? technician.trim() || null : null,
      purpose: purpose.trim() || null,
      checkout_at: new Date().toISOString(),
      expected_return: expected ? new Date(expected).toISOString() : null,
      quantity: qtyNum,
      unit: instrument.unit,
      rate_type: rateType,
      unit_rate: unitRate,
      cost,
      condition_out: conditionOut.trim() || null,
      status: "ongoing",
      created_by: userId,
    });
    if (e1) {
      setErr(e1.message);
      setSaving(false);
      return;
    }
    await supabase.from("instruments").update({ status: "in_use" }).eq("id", instrument.id);
    setSaving(false);
    onDone();
  };

  return (
    <Panel title="Log a checkout">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Borrower name" required>
          <Input value={borrowerName} onChange={setBorrowerName} placeholder="Full name" />
        </Field>
        <Field label="Institution / lab">
          <Input value={borrowerOrg} onChange={setBorrowerOrg} placeholder="e.g. SmartAgri, external company" />
        </Field>
        <Field label="User type">
          <SelectInput
            value={userType}
            onChange={(v) => setUserType(v as UserType)}
            options={[["internal", "Internal"], ["external", "External"]]}
          />
        </Field>
        <Field label="Operator">
          <SelectInput
            value={operator}
            onChange={(v) => setOperator(v as Operator)}
            options={[["self", "Self-operated"], ["technician", "With technician"]]}
            disabled={userType === "external"}
          />
        </Field>
        {operator === "technician" && userType === "internal" && (
          <Field label="Technician name">
            <Input value={technician} onChange={setTechnician} placeholder="Technician" />
          </Field>
        )}
        <Field label={`Quantity (${instrument.unit ?? "unit"})`}>
          <Input value={quantity} onChange={setQuantity} placeholder="e.g. 2" type="number" />
        </Field>
        <Field label="Expected return">
          <Input value={expected} onChange={setExpected} type="datetime-local" />
        </Field>
        <Field label="Purpose / project" full>
          <Input value={purpose} onChange={setPurpose} placeholder="Short description" />
        </Field>
        <Field label="Condition at checkout" full>
          <Input value={conditionOut} onChange={setConditionOut} placeholder="e.g. complete, good working order" />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-neutral-600" style={body}>
          Rate: <b>{rateTypeLabel[rateType]}</b> · {formatIDR(unitRate)} {instrument.unit}
          {" · "}Estimated cost: <b className="text-[#0B6477]">{cost == null ? "by arrangement" : formatIDR(cost)}</b>
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 h-11 px-6 bg-[#45DFB1] rounded-xl text-[#0B2A22] text-sm font-medium hover:bg-[#80ED99] transition-colors disabled:opacity-60"
          style={body}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Check out
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-[#B42318]" style={body}>{err}</p>}
    </Panel>
  );
}

function ReturnPanel({
  instrument,
  log,
  onDone,
}: {
  instrument: Instrument;
  log: UsageLog;
  onDone: () => void;
}) {
  const [conditionIn, setConditionIn] = useState("");
  const [quantity, setQuantity] = useState(log.quantity != null ? String(log.quantity) : "");
  const [notes, setNotes] = useState(log.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qtyNum = quantity ? Number(quantity) : null;
  const cost = computeCost(qtyNum, log.unit_rate);

  const submit = async () => {
    if (!supabase) return;
    setSaving(true);
    setErr(null);
    const { error: e1 } = await supabase
      .from("usage_logs")
      .update({
        returned_at: new Date().toISOString(),
        status: "returned",
        quantity: qtyNum,
        cost,
        condition_in: conditionIn.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", log.id);
    if (e1) {
      setErr(e1.message);
      setSaving(false);
      return;
    }
    await supabase.from("instruments").update({ status: "available" }).eq("id", instrument.id);
    setSaving(false);
    onDone();
  };

  return (
    <Panel title="Currently checked out" tone="in_use">
      <div className="text-sm text-neutral-600 mb-4" style={body}>
        <b>{log.borrower_name}</b>
        {log.borrower_org ? ` · ${log.borrower_org}` : ""} · out since {fmtDate(log.checkout_at)}
        {log.expected_return ? ` · due ${fmtDate(log.expected_return)}` : ""}
        {log.purpose ? ` · ${log.purpose}` : ""}
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={`Final quantity (${instrument.unit ?? "unit"})`}>
          <Input value={quantity} onChange={setQuantity} type="number" placeholder="e.g. 2" />
        </Field>
        <Field label="Condition on return">
          <Input value={conditionIn} onChange={setConditionIn} placeholder="e.g. complete, no damage" />
        </Field>
        <Field label="Notes">
          <Input value={notes} onChange={setNotes} placeholder="Anything to flag" />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-neutral-600" style={body}>
          Final cost: <b className="text-[#0B6477]">{cost == null ? "by arrangement" : formatIDR(cost)}</b>
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 h-11 px-6 bg-[#0B6477] rounded-xl text-white text-sm font-medium hover:bg-[#14919B] transition-colors disabled:opacity-60"
          style={body}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Mark as returned
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-[#B42318]" style={body}>{err}</p>}
    </Panel>
  );
}

function StatusControl({
  instrument,
  disabled,
  onDone,
}: {
  instrument: Instrument;
  disabled: boolean;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  // Manual statuses (in_use is driven by checkout/return, not set here).
  const options = INSTRUMENT_STATUSES.filter((s) => s !== "in_use");

  const change = async (status: InstrumentStatus) => {
    if (!supabase || status === instrument.status) return;
    setSaving(true);
    await supabase.from("instruments").update({ status }).eq("id", instrument.id);
    setSaving(false);
    onDone();
  };

  if (disabled) return null;

  return (
    <div className="mt-4 flex items-center gap-3 text-sm text-neutral-500" style={body}>
      <span>Set status:</span>
      <select
        value={instrument.status === "in_use" ? "available" : instrument.status}
        onChange={(e) => change(e.target.value as InstrumentStatus)}
        disabled={saving}
        className="h-10 px-3 rounded-xl border border-[#0B6477]/15 bg-white text-sm text-neutral-700 outline-none focus:border-[#14919B]"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {statusMeta[s].label}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="w-4 h-4 animate-spin text-[#0B6477]" />}
    </div>
  );
}

/* ---------- small building blocks ---------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white">
      <div className="max-w-[900px] mx-auto px-6 md:px-12 pt-10 md:pt-14 pb-16 md:pb-24">
        <Link
          to="/inventory"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0B6477] hover:underline mb-8"
          style={body}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inventory
        </Link>
        {children}
      </div>
    </section>
  );
}

function RateCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[#0B6477]/10 bg-[#F3F7F6] px-4 py-3">
      <div className="text-xs font-normal text-neutral-500" style={body}>
        {label}
      </div>
      <div className="text-lg font-semibold text-neutral-900 mt-0.5" style={display}>
        {formatIDR(value)}
      </div>
      <div className="text-xs text-neutral-400" style={body}>
        {unit}
      </div>
    </div>
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "in_use";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 md:p-7 ${
        tone === "in_use"
          ? "border-[#14919B]/25 bg-[#14919B]/5"
          : "border-[#0B6477]/12 bg-white"
      }`}
    >
      <h3
        className="text-lg font-medium text-neutral-900 mb-5"
        style={display}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-neutral-500" style={body}>
        {label}
        {required && <span className="text-[#E5484D]"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="h-11 px-3.5 rounded-xl border border-[#0B6477]/15 bg-[#F3F7F6] text-sm text-neutral-800 outline-none focus:border-[#14919B]"
      style={body}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-11 px-3 rounded-xl border border-[#0B6477]/15 bg-white text-sm text-neutral-700 outline-none focus:border-[#14919B] disabled:opacity-50"
      style={body}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 text-xs font-medium ${className}`} style={body}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 text-sm align-top ${className}`} style={body}>
      {children}
    </td>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
