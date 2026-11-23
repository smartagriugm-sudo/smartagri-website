import { useState } from "react";
import { Plus } from "lucide-react";
import { METRICS, ackAlarm, ago, fetchAlarmHistory, fetchAlarmRules, fetchAssetLocations, formatWithUnit, metricLabel, parseRuleForm, saveAlarmRule, type Alarm, type AlarmRule, type AssetLocation, type RuleForm } from "../../lib/pf/monitoring";
import { useLang, useT, type Bi, type Lang } from "../../lib/i18n";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// Alarms that are open, the rules that raise them, and what happened before. An
// alarm closes by itself when the reading is back in range; acknowledging one only
// records that someone is on it. Alarms show here and on the dashboard: email and
// messaging come later.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

const LEVEL: Record<Alarm["level"], { label: Bi; className: string }> = {
  kritis: { label: { en: "Critical", id: "Kritis" }, className: "bg-[#FDECEA] text-[#B3362C]" },
  peringatan: { label: { en: "Warning", id: "Peringatan" }, className: "bg-[#FFF6E5] text-[#8A5A07]" },
};

const limit = (low: number | null, high: number | null, metric: string, lang: Lang) => {
  if (low === null && high === null) return "-";
  const parts = [low !== null ? `< ${formatWithUnit(metric, low, lang)}` : null, high !== null ? `> ${formatWithUnit(metric, high, lang)}` : null].filter(Boolean);
  return parts.join(lang === "id" ? " atau " : " or ");
};

function OpenAlarm({ alarm, canAck }: { alarm: Alarm; canAck: boolean }) {
  const store = useErpStore();
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const since = (iso: string) => ago(iso, undefined, lang);
  const what = `${metricLabel(alarm.metric, lang)} ${formatWithUnit(alarm.metric, alarm.value, lang)}`;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#EDF2F2] px-4 py-3 first:border-0">
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12.5px] font-medium ${LEVEL[alarm.level].className}`}>{t(LEVEL[alarm.level].label)}</span>
      <span className="min-w-0 flex-1 basis-[220px]">
        <span className="block text-[14px] font-medium text-[#0F2F36]">{t({ en: `${what} at ${alarm.location_code}`, id: `${what} di ${alarm.location_code}` })}</span>
        <span className="block text-[13px] text-[#4F6B73]">
          {alarm.asset_code} · {t({ en: "since", id: "sejak" })} {formatDateTime(alarm.opened_at, lang)} ({since(alarm.opened_at)}){alarm.ack_at ? t({ en: ` · handled ${since(alarm.ack_at)}`, id: ` · ditangani ${since(alarm.ack_at)}` }) : ""}
        </span>
      </span>
      {canAck && !alarm.ack_at && (
        <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { await ackAlarm(alarm.id); await store.loadMonitoring(); })}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "I'll handle it", id: "Saya tangani" })}</SecondaryButton>
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
  const t = useT();
  const lang = useLang();
  const set = (patch: Partial<RuleForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    const parsed = parseRuleForm(form, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (await action.run(() => saveAlarmRule(place, metric, parsed, active))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{rule ? t({ en: "Edit rule", id: "Ubah aturan" }) : t({ en: "New rule", id: "Aturan baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Location", id: "Lokasi" })}>
            <select className={inputClass} value={place} disabled={!!rule} onChange={(e) => setPlace(e.target.value)}>
              {places.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </Field>
          <Field label={t({ en: "Reading", id: "Pembacaan" })}>
            <select className={inputClass} value={metric} disabled={!!rule} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((m) => <option key={m.key} value={m.key}>{metricLabel(m.key, lang)}</option>)}
            </select>
          </Field>
          <Field label={t({ en: "Warning below", id: "Peringatan di bawah" })}><input className={inputClass} inputMode="decimal" value={form.warnLow} onChange={(e) => set({ warnLow: e.target.value })} /></Field>
          <Field label={t({ en: "Warning above", id: "Peringatan di atas" })}><input className={inputClass} inputMode="decimal" value={form.warnHigh} onChange={(e) => set({ warnHigh: e.target.value })} /></Field>
          <Field label={t({ en: "Critical below", id: "Kritis di bawah" })}><input className={inputClass} inputMode="decimal" value={form.critLow} onChange={(e) => set({ critLow: e.target.value })} /></Field>
          <Field label={t({ en: "Critical above", id: "Kritis di atas" })}><input className={inputClass} inputMode="decimal" value={form.critHigh} onChange={(e) => set({ critHigh: e.target.value })} /></Field>
        </div>
        <Field label={t({ en: "Wait before alarm (minutes)", id: "Tunggu sebelum alarm (menit)" })} hint={t({ en: "A reading must stay out of limits this long, so a brief spike does not raise an alarm.", id: "Pembacaan harus di luar batas selama ini, agar lonjakan singkat tidak memicu alarm." })}><input className={inputClass} inputMode="decimal" value={form.delayMin} onChange={(e) => set({ delayMin: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={active} onChange={(e) => setActive(e.target.checked)} /> {t({ en: "Active rule", id: "Aturan aktif" })}</label>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save rule", id: "Simpan aturan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

export default function AlarmPage() {
  const store = useErpStore();
  const { canOperate, canMaintain, canManageProduction } = useErpAccess();
  const canSetRules = canMaintain || canManageProduction;
  const t = useT();
  const lang = useLang();
  const label = (metric: string) => metricLabel(metric, lang);
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
      eyebrow={t({ en: "Monitoring", id: "Pemantauan" })}
      title={t({ en: "Alarms", id: "Alarm" })}
      sub={open.length ? t({ en: `${open.length} open alarms, ${open.filter((a) => !a.ack_at).length} not handled yet.`, id: `${open.length} alarm terbuka, ${open.filter((a) => !a.ack_at).length} belum ditangani.` }) : t({ en: "No open alarms.", id: "Tidak ada alarm terbuka." })}
      actions={canSetRules && editing === null && state.data ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> {t({ en: "New rule", id: "Aturan baru" })}</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ rules, places, history }) => {
          const placeName = new Map(places.map((p) => [p.id, p.code]));
          const editingRule = rules.find((r) => r.id === editing) ?? null;
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-4">
                <Card>
                  <h2 className={`${sectionTitle} px-4 py-3`}>{t({ en: "Open", id: "Terbuka" })}</h2>
                  {open.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-5 text-center text-[14px] text-[#4F6B73]">{t({ en: "No open alarms.", id: "Tidak ada alarm terbuka." })}</p>
                  ) : (
                    <ul className="border-t border-[#EDF2F2]">{open.map((a) => <OpenAlarm key={a.id} alarm={a} canAck={canOperate || canMaintain} />)}</ul>
                  )}
                </Card>

                <div className="space-y-2">
                  <h2 className={sectionTitle}>{t({ en: "Rules", id: "Aturan" })}</h2>
                  <DataTable
                    rows={rules}
                    rowKey={(r) => r.id}
                    noun={t({ en: "rules", id: "aturan" })}
                    searchText={(r) => `${label(r.metric)} ${placeName.get(r.location_id) ?? ""}`}
                    searchLabel={t({ en: "Search by parameter or place", id: "Cari menurut parameter atau tempat" })}
                    empty={t({ en: "No rules yet, so no reading can raise an alarm.", id: "Belum ada aturan, jadi belum ada pembacaan yang bisa memicu alarm." })}
                    columns={[
                      { key: "metric", label: "Parameter", phone: "title", sort: (a, b) => label(a.metric).localeCompare(label(b.metric)), cell: (r) => <CellTitle title={label(r.metric)} sub={placeName.get(r.location_id) ?? "-"} muted={!r.active} /> },
                      { key: "warn", label: t({ en: "Warning", id: "Peringatan" }), cell: (r) => <span className="text-[13px] tabular-nums">{limit(r.warn_low, r.warn_high, r.metric, lang)}</span> },
                      { key: "crit", label: t({ en: "Critical", id: "Kritis" }), cell: (r) => <span className="text-[13px] tabular-nums">{limit(r.crit_low, r.crit_high, r.metric, lang)}</span> },
                      { key: "delay", label: t({ en: "Delay", id: "Jeda" }), track: "80px", align: "right", sort: (a, b) => a.delay_s - b.delay_s, cell: (r) => <span className="tabular-nums">{r.delay_s / 60} {t({ en: "min", id: "mnt" })}</span> },
                      { key: "status", label: "Status", track: "110px", cell: (r) => <Chip label={r.active ? t({ en: "Active", id: "Aktif" }) : t({ en: "Inactive", id: "Nonaktif" })} className={r.active ? "bg-[#E3F7F0] text-[#0E7A5C]" : undefined} /> },
                      { key: "edit", label: "", track: "48px", align: "right", interactive: true, cell: (r) => canSetRules ? <button type="button" onClick={() => setEditing(r.id)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">{t({ en: "Edit", id: "Ubah" })}</button> : null },
                    ] satisfies Column<(typeof rules)[number]>[]}
                  />
                </div>

                <div className="space-y-2">
                  <h2 className={sectionTitle}>{t({ en: "History", id: "Riwayat" })}</h2>
                  <DataTable
                    rows={history}
                    rowKey={(a) => a.id}
                    noun={t({ en: "closed alarms", id: "alarm tertutup" })}
                    searchText={(a) => `${label(a.metric)} ${a.location_code}`}
                    searchLabel={t({ en: "Search by parameter or place", id: "Cari menurut parameter atau tempat" })}
                    empty={t({ en: "No closed alarms yet.", id: "Belum ada alarm tertutup." })}
                    columns={[
                      { key: "level", label: t({ en: "Level", id: "Level" }), track: "120px", cell: (a) => <Chip label={t(LEVEL[a.level].label)} className={LEVEL[a.level].className} /> },
                      { key: "metric", label: t({ en: "Reading", id: "Pembacaan" }), phone: "title", sort: (a, b) => label(a.metric).localeCompare(label(b.metric)), cell: (a) => <CellTitle title={`${label(a.metric)} ${formatWithUnit(a.metric, a.value, lang)}`} sub={a.location_code} /> },
                      { key: "opened", label: t({ en: "Opened", id: "Dibuka" }), sort: (a, b) => a.opened_at.localeCompare(b.opened_at), cell: (a) => <span className="text-[13px]">{formatDateTime(a.opened_at, lang)}</span> },
                      { key: "closed", label: t({ en: "Closed", id: "Ditutup" }), phone: "hidden", cell: (a) => <span className="text-[13px]">{a.closed_at ? formatDateTime(a.closed_at, lang) : "-"}</span> },
                    ] satisfies Column<(typeof history)[number]>[]}
                  />
                </div>
                {!canSetRules && <Note>{t({ en: "Changing rules needs the Technician or Production manager role.", id: "Mengubah aturan butuh peran Teknisi atau Manajer produksi." })}</Note>}
              </div>
              {editing && <RuleEditor key={editing} places={places} rule={editingRule} onDone={(saved) => void done(saved)} />}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
