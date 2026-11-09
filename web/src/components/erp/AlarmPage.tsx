import { useState } from "react";
import { Plus } from "lucide-react";
import { METRICS, ackAlarm, ago, fetchAlarmHistory, fetchAlarmRules, fetchAssetLocations, formatWithUnit, metricInfo, parseRuleForm, saveAlarmRule, type Alarm, type AlarmRule, type AssetLocation, type RuleForm } from "../../lib/pf/monitoring";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Alarms that are open, the rules that raise them, and what happened before. An
// alarm closes by itself when the reading is back in range; acknowledging one only
// records that someone is on it. Alarms show here and on the dashboard: email and
// messaging come later.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

const LEVEL: Record<Alarm["level"], { label: string; className: string }> = {
  kritis: { label: "Critical", className: "bg-[#FDECEA] text-[#B3362C]" },
  peringatan: { label: "Warning", className: "bg-[#FFF6E5] text-[#8A5A07]" },
};

const limit = (low: number | null, high: number | null, metric: string) => {
  if (low === null && high === null) return "-";
  const parts = [low !== null ? `< ${formatWithUnit(metric, low)}` : null, high !== null ? `> ${formatWithUnit(metric, high)}` : null].filter(Boolean);
  return parts.join(" or ");
};

function OpenAlarm({ alarm, canAck }: { alarm: Alarm; canAck: boolean }) {
  const store = useErpStore();
  const action = useAction();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-3 first:border-0">
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12.5px] font-medium ${LEVEL[alarm.level].className}`}>{LEVEL[alarm.level].label}</span>
      <span className="min-w-0 flex-1 basis-[220px]">
        <span className="block text-[14px] font-medium text-[#0F2F36]">{metricInfo(alarm.metric).label} {formatWithUnit(alarm.metric, alarm.value)} at {alarm.location_code}</span>
        <span className="block text-[13px] text-[#4F6B73]">{alarm.asset_code} · since {formatDateTime(alarm.opened_at)} ({ago(alarm.opened_at)}){alarm.ack_at ? ` · handled ${ago(alarm.ack_at)}` : ""}</span>
      </span>
      {canAck && !alarm.ack_at && (
        <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { await ackAlarm(alarm.id); await store.loadMonitoring(); })}>{action.busy ? "Saving…" : "I'll handle it"}</SecondaryButton>
      )}
      <div className="basis-full empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </li>
  );
}

const emptyRule: RuleForm = { warnLow: "", warnHigh: "", critLow: "", critHigh: "", delayMin: "5" };
const text = (v: number | null) => (v === null ? "" : String(v));

function RuleEditor({ places, rule, onDone }: { places: AssetLocation[]; rule: AlarmRule | null; onDone: (saved: boolean) => void }) {
  const [place, setPlace] = useState(rule?.location_id ?? places[0]?.id ?? "");
  const [metric, setMetric] = useState<string>(rule?.metric ?? METRICS[0].key);
  const [form, setForm] = useState<RuleForm>(rule ? { warnLow: text(rule.warn_low), warnHigh: text(rule.warn_high), critLow: text(rule.crit_low), critHigh: text(rule.crit_high), delayMin: String(rule.delay_s / 60) } : emptyRule);
  const [active, setActive] = useState(rule?.active ?? true);
  const action = useAction();
  const set = (patch: Partial<RuleForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    const parsed = parseRuleForm(form);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (await action.run(() => saveAlarmRule(place, metric, parsed, active))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{rule ? "Edit rule" : "New rule"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <select className={inputClass} value={place} disabled={!!rule} onChange={(e) => setPlace(e.target.value)}>
              {places.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </Field>
          <Field label="Reading">
            <select className={inputClass} value={metric} disabled={!!rule} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Warning below"><input className={inputClass} inputMode="decimal" value={form.warnLow} onChange={(e) => set({ warnLow: e.target.value })} /></Field>
          <Field label="Warning above"><input className={inputClass} inputMode="decimal" value={form.warnHigh} onChange={(e) => set({ warnHigh: e.target.value })} /></Field>
          <Field label="Critical below"><input className={inputClass} inputMode="decimal" value={form.critLow} onChange={(e) => set({ critLow: e.target.value })} /></Field>
          <Field label="Critical above"><input className={inputClass} inputMode="decimal" value={form.critHigh} onChange={(e) => set({ critHigh: e.target.value })} /></Field>
        </div>
        <Field label="Wait before alarm (minutes)" hint="A reading must stay out of limits this long, so a brief spike does not raise an alarm."><input className={inputClass} inputMode="decimal" value={form.delayMin} onChange={(e) => set({ delayMin: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active rule</label>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving…" : "Save rule"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Cancel</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

export default function AlarmPage() {
  const store = useErpStore();
  const { canOperate, canMaintain, canManageProduction } = useErpAccess();
  const canSetRules = canMaintain || canManageProduction;
  const state = useLoad(async () => {
    const [rules, places, history] = await Promise.all([fetchAlarmRules(), fetchAssetLocations(), fetchAlarmHistory()]);
    return { rules, places, history };
  });
  // null: no form; "new": a new rule; otherwise the rule's id.
  const [editing, setEditing] = useState<string | null>(null);
  const open = store.monitoring?.alarms ?? [];

  const done = async (saved: boolean) => {
    if (saved) await Promise.all([state.reload(), store.loadMonitoring()]);
    setEditing(null);
  };

  return (
    <ErpPage
      eyebrow="Monitoring"
      title="Alarm"
      sub={open.length ? `${open.length} open alarms, ${open.filter((a) => !a.ack_at).length} not handled yet.` : "No open alarms."}
      actions={canSetRules && editing === null && state.data ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New rule</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ rules, places, history }) => {
          const placeName = new Map(places.map((p) => [p.id, p.code]));
          const editingRule = rules.find((r) => r.id === editing) ?? null;
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-4">
                <Card>
                  <h2 className={`${sectionTitle} px-4 py-3`}>Open</h2>
                  {open.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">No open alarms.</p>
                  ) : (
                    <ul className="border-t border-[#EDF2F2]">{open.map((a) => <OpenAlarm key={a.id} alarm={a} canAck={canOperate || canMaintain} />)}</ul>
                  )}
                </Card>

                <div className="space-y-2">
                  <h2 className={sectionTitle}>Rules</h2>
                  <DataTable
                    rows={rules}
                    rowKey={(r) => r.id}
                    noun="rules"
                    searchText={(r) => `${metricInfo(r.metric).label} ${placeName.get(r.location_id) ?? ""}`}
                    searchLabel="Search by parameter or place"
                    empty="No rules yet, so no reading can raise an alarm."
                    columns={[
                      { key: "metric", label: "Parameter", phone: "title", sort: (a, b) => metricInfo(a.metric).label.localeCompare(metricInfo(b.metric).label), cell: (r) => <CellTitle title={metricInfo(r.metric).label} sub={placeName.get(r.location_id) ?? "-"} muted={!r.active} /> },
                      { key: "warn", label: "Warning", cell: (r) => <span className="text-[13px] tabular-nums">{limit(r.warn_low, r.warn_high, r.metric)}</span> },
                      { key: "crit", label: "Critical", cell: (r) => <span className="text-[13px] tabular-nums">{limit(r.crit_low, r.crit_high, r.metric)}</span> },
                      { key: "delay", label: "Delay", track: "80px", align: "right", sort: (a, b) => a.delay_s - b.delay_s, cell: (r) => <span className="tabular-nums">{r.delay_s / 60} min</span> },
                      { key: "status", label: "Status", track: "110px", cell: (r) => <Chip label={r.active ? "Active" : "Inactive"} className={r.active ? "bg-[#E3F7F0] text-[#0E7A5C]" : undefined} /> },
                      { key: "edit", label: "", track: "48px", align: "right", interactive: true, cell: (r) => canSetRules ? <button type="button" onClick={() => setEditing(r.id)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Edit</button> : null },
                    ] satisfies Column<(typeof rules)[number]>[]}
                  />
                </div>

                <div className="space-y-2">
                  <h2 className={sectionTitle}>History</h2>
                  <DataTable
                    rows={history}
                    rowKey={(a) => a.id}
                    noun="closed alarms"
                    searchText={(a) => `${metricInfo(a.metric).label} ${a.location_code}`}
                    searchLabel="Search by parameter or place"
                    empty="No closed alarms yet."
                    columns={[
                      { key: "level", label: "Level", track: "120px", cell: (a) => <Chip label={LEVEL[a.level].label} className={LEVEL[a.level].className} /> },
                      { key: "metric", label: "Reading", phone: "title", sort: (a, b) => metricInfo(a.metric).label.localeCompare(metricInfo(b.metric).label), cell: (a) => <CellTitle title={`${metricInfo(a.metric).label} ${formatWithUnit(a.metric, a.value)}`} sub={a.location_code} /> },
                      { key: "opened", label: "Opened", sort: (a, b) => a.opened_at.localeCompare(b.opened_at), cell: (a) => <span className="text-[13px]">{formatDateTime(a.opened_at)}</span> },
                      { key: "closed", label: "Closed", phone: "hidden", cell: (a) => <span className="text-[13px]">{a.closed_at ? formatDateTime(a.closed_at) : "-"}</span> },
                    ] satisfies Column<(typeof history)[number]>[]}
                  />
                </div>
                {!canSetRules && <Note>Changing rules needs the Technician or Production manager role.</Note>}
              </div>
              {editing && <RuleEditor key={editing} places={places} rule={editingRule} onDone={(saved) => void done(saved)} />}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
