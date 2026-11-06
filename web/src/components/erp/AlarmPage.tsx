import { useState } from "react";
import { Plus } from "lucide-react";
import { METRICS, ackAlarm, ago, fetchAlarmHistory, fetchAlarmRules, fetchAssetLocations, formatWithUnit, metricInfo, parseRuleForm, saveAlarmRule, type Alarm, type AlarmRule, type AssetLocation, type RuleForm } from "../../lib/pf/monitoring";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Alarms that are open, the rules that raise them, and what happened before. An
// alarm closes by itself when the reading is back in range; acknowledging one only
// records that someone is on it. Alarms show here and on the dashboard: email and
// messaging come later.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

const LEVEL: Record<Alarm["level"], { label: string; className: string }> = {
  kritis: { label: "Kritis", className: "bg-[#FDECEA] text-[#B3362C]" },
  peringatan: { label: "Peringatan", className: "bg-[#FFF6E5] text-[#8A5A07]" },
};

const limit = (low: number | null, high: number | null, metric: string) => {
  if (low === null && high === null) return "-";
  const parts = [low !== null ? `< ${formatWithUnit(metric, low)}` : null, high !== null ? `> ${formatWithUnit(metric, high)}` : null].filter(Boolean);
  return parts.join(" atau ");
};

function OpenAlarm({ alarm, canAck }: { alarm: Alarm; canAck: boolean }) {
  const store = useErpStore();
  const action = useAction();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-3 first:border-0">
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12.5px] font-medium ${LEVEL[alarm.level].className}`}>{LEVEL[alarm.level].label}</span>
      <span className="min-w-0 flex-1 basis-[220px]">
        <span className="block text-[14px] font-medium text-[#0F2F36]">{metricInfo(alarm.metric).label} {formatWithUnit(alarm.metric, alarm.value)} di {alarm.location_code}</span>
        <span className="block text-[13px] text-[#4F6B73]">{alarm.asset_code} · sejak {formatDateTime(alarm.opened_at)} ({ago(alarm.opened_at)}){alarm.ack_at ? ` · ditangani ${ago(alarm.ack_at)}` : ""}</span>
      </span>
      {canAck && !alarm.ack_at && (
        <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { await ackAlarm(alarm.id); await store.loadMonitoring(); })}>{action.busy ? "Menyimpan..." : "Saya tangani"}</SecondaryButton>
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
      <h2 className={`${sectionTitle} mb-3`}>{rule ? "Ubah aturan" : "Aturan baru"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lokasi">
            <select className={inputClass} value={place} disabled={!!rule} onChange={(e) => setPlace(e.target.value)}>
              {places.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </Field>
          <Field label="Bacaan">
            <select className={inputClass} value={metric} disabled={!!rule} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Peringatan di bawah"><input className={inputClass} inputMode="decimal" value={form.warnLow} onChange={(e) => set({ warnLow: e.target.value })} /></Field>
          <Field label="Peringatan di atas"><input className={inputClass} inputMode="decimal" value={form.warnHigh} onChange={(e) => set({ warnHigh: e.target.value })} /></Field>
          <Field label="Kritis di bawah"><input className={inputClass} inputMode="decimal" value={form.critLow} onChange={(e) => set({ critLow: e.target.value })} /></Field>
          <Field label="Kritis di atas"><input className={inputClass} inputMode="decimal" value={form.critHigh} onChange={(e) => set({ critHigh: e.target.value })} /></Field>
        </div>
        <Field label="Tunggu sebelum alarm (menit)" hint="Bacaan harus di luar batas selama ini, supaya lonjakan sesaat tidak memicu alarm."><input className={inputClass} inputMode="decimal" value={form.delayMin} onChange={(e) => set({ delayMin: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aturan aktif</label>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Simpan aturan"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Batal</SecondaryButton>
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
      sub={open.length ? `${open.length} alarm terbuka, ${open.filter((a) => !a.ack_at).length} belum ditangani.` : "Tidak ada alarm terbuka."}
      actions={canSetRules && editing === null && state.data ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Aturan baru</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ rules, places, history }) => {
          const placeName = new Map(places.map((p) => [p.id, p.code]));
          const editingRule = rules.find((r) => r.id === editing) ?? null;
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-4">
                <Card>
                  <h2 className={`${sectionTitle} px-4 py-3`}>Terbuka</h2>
                  {open.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">Tidak ada alarm terbuka.</p>
                  ) : (
                    <ul className="border-t border-[#EDF2F2]">{open.map((a) => <OpenAlarm key={a.id} alarm={a} canAck={canOperate || canMaintain} />)}</ul>
                  )}
                </Card>

                <Card>
                  <h2 className={`${sectionTitle} px-4 py-3`}>Aturan</h2>
                  {rules.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">Belum ada aturan, jadi belum ada bacaan yang bisa memicu alarm.</p>
                  ) : (
                    <ul className="border-t border-[#EDF2F2]">
                      {rules.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-medium text-[#0F2F36]">{metricInfo(r.metric).label} di {placeName.get(r.location_id) ?? "-"}{!r.active && <span className="ml-2 rounded-md bg-[#EEF3F4] px-1.5 py-0.5 text-[12.5px] font-medium text-[#4F6B73]">Nonaktif</span>}</span>
                            <span className="block text-[13px] text-[#4F6B73]">Peringatan {limit(r.warn_low, r.warn_high, r.metric)}</span>
                            <span className="block text-[13px] text-[#4F6B73]">Kritis {limit(r.crit_low, r.crit_high, r.metric)} · tunggu {r.delay_s / 60} menit</span>
                          </span>
                          {canSetRules && <button type="button" onClick={() => setEditing(r.id)} className="min-h-[44px] shrink-0 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Ubah</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card>
                  <h2 className={`${sectionTitle} px-4 py-3`}>Riwayat</h2>
                  {history.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">Belum ada alarm yang tertutup.</p>
                  ) : (
                    <ul className="border-t border-[#EDF2F2]">
                      {history.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-x-3 border-t border-[#EDF2F2] px-4 py-2.5 text-[14px] first:border-0">
                          <span className={`rounded-md px-2 py-0.5 text-[12.5px] font-medium ${LEVEL[a.level].className}`}>{LEVEL[a.level].label}</span>
                          <span className="min-w-0 flex-1 basis-[220px]">
                            <span className="block text-[#0F2F36]">{metricInfo(a.metric).label} {formatWithUnit(a.metric, a.value)} di {a.location_code}</span>
                            <span className="block text-[13px] text-[#4F6B73]">{formatDateTime(a.opened_at)}{a.closed_at ? ` sampai ${formatDateTime(a.closed_at)}` : ""}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                {!canSetRules && <Note>Mengubah aturan perlu peran Teknisi atau Manajer produksi.</Note>}
              </div>
              {editing && <RuleEditor key={editing} places={places} rule={editingRule} onDone={(saved) => void done(saved)} />}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
