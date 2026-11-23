import { useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { formatLongDate } from "../../lib/pf/dashboard";
import { jakartaToday } from "../../lib/pf/batch";
import { LINK_STATES, METRICS, addCalibration, ago, fetchAssetLocations, fetchAssets, fetchCalibrations, issueToken, linkStateLabel, metricLabel, parseAssetForm, parseCalibrationForm, saveAsset, type Asset, type AssetForm, type AssetKind, type AssetLocation } from "../../lib/pf/monitoring";
import { useLang, useT } from "../../lib/i18n";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, ErrorNote, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";
import DataTable, { CellTitle, type Column } from "./DataTable";

// The sensor devices: where each hangs, what it sends, its calibration and its
// token. A token is shown once, when issued; only its hash is kept. How often a
// device reports is its own setting here, so firmware can change it freely.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

const blank = (locationId: string): AssetForm => ({ code: "", name: "", kind: "iklim", model: "", serial: "", locationId, metrics: [], intervalS: "300", status: "aktif", notes: "" });

const toForm = (a: Asset): AssetForm => ({ code: a.code, name: a.name, kind: a.kind, model: a.model, serial: a.serial, locationId: a.location_id, metrics: a.metrics, intervalS: String(a.interval_s), status: a.status, notes: a.notes });

function AssetEditor({ asset, places, onDone }: { asset: Asset | null; places: AssetLocation[]; onDone: (saved: string | null) => void }) {
  const [form, setForm] = useState<AssetForm>(asset ? toForm(asset) : blank(places[0]?.id ?? ""));
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const set = (patch: Partial<AssetForm>) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key: string) => set({ metrics: form.metrics.includes(key) ? form.metrics.filter((m) => m !== key) : [...form.metrics, key] });

  const submit = async () => {
    const parsed = parseAssetForm(form, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    let saved = "";
    if (await action.run(async () => { saved = await saveAsset(asset?.id ?? null, form, parsed.interval); })) onDone(saved);
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{asset ? t({ en: `Edit ${asset.code}`, id: `Ubah ${asset.code}` }) : t({ en: "New device", id: "Perangkat baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Code", id: "Kode" })}><input className={inputClass} value={form.code} onChange={(e) => set({ code: e.target.value })} placeholder="ENV-PF01-1" /></Field>
          <Field label={t({ en: "Type", id: "Jenis" })}>
            <select className={inputClass} value={form.kind} onChange={(e) => set({ kind: e.target.value as AssetKind })}>
              <option value="iklim">{t({ en: "Microclimate", id: "Iklim mikro" })}</option>
              <option value="nutrisi">{t({ en: "Nutrients", id: "Nutrisi" })}</option>
            </select>
          </Field>
        </div>
        <Field label={t({ en: "Name", id: "Nama" })}><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={t({ en: "Grow room climate sensor", id: "Sensor iklim ruang tanam" })} /></Field>
        <Field label={t({ en: "Location", id: "Lokasi" })}>
          <select className={inputClass} value={form.locationId} onChange={(e) => set({ locationId: e.target.value })}>
            {places.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
        </Field>
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium text-[#36525A]">{t({ en: "Readings sent", id: "Pembacaan yang dikirim" })}</legend>
          <div className="grid grid-cols-2 gap-x-3">
            {METRICS.map((m) => (
              <label key={m.key} className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-[28px]">
                <input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.metrics.includes(m.key)} onChange={() => toggle(m.key)} /> {metricLabel(m.key, lang)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Brand and model", id: "Merek dan model" })}><input className={inputClass} value={form.model} onChange={(e) => set({ model: e.target.value })} /></Field>
          <Field label={t({ en: "Serial number", id: "Nomor seri" })}><input className={inputClass} value={form.serial} onChange={(e) => set({ serial: e.target.value })} /></Field>
          <Field label={t({ en: "Send interval (seconds)", id: "Interval kirim (detik)" })} hint={t({ en: "Counted as stopped after 3 intervals.", id: "Dianggap berhenti setelah 3 interval." })}><input className={inputClass} inputMode="numeric" value={form.intervalS} onChange={(e) => set({ intervalS: e.target.value })} /></Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set({ status: e.target.value as Asset["status"] })}>
              <option value="aktif">{t({ en: "Active", id: "Aktif" })}</option>
              <option value="perawatan">{t({ en: "Maintenance (no alarms)", id: "Pemeliharaan (tanpa alarm)" })}</option>
              <option value="pensiun">{t({ en: "Retired (token refused)", id: "Pensiun (token ditolak)" })}</option>
            </select>
          </Field>
        </div>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(null)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function TokenBlock({ asset, canEdit }: { asset: Asset; canEdit: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);
  const action = useAction();
  const t = useT();
  if (!canEdit) return null;
  return (
    <div className="border-t border-[#EDF2F2] pt-3">
      <h3 className="mb-1 text-[14px] font-medium text-[#0F2F36]">{t({ en: "Device token", id: "Token perangkat" })}</h3>
      {token ? (
        <div className="space-y-2">
          <Note tone="warn">{t({ en: "Copy it now. This token will not be shown again.", id: "Salin sekarang. Token ini tidak akan ditampilkan lagi." })}</Note>
          <code className="block break-all rounded-lg bg-[#F3F7F7] p-2 text-[12.5px] text-[#0F2F36]">{token}</code>
          <SecondaryButton onClick={() => { void navigator.clipboard?.writeText(token).then(() => setCopied(true)); }}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t({ en: "Copied", id: "Tersalin" }) : t({ en: "Copy token", id: "Salin token" })}
          </SecondaryButton>
        </div>
      ) : asking ? (
        <div className="space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <p className="text-[13.5px] text-[#4F6B73]">{t({ en: "A new token stops the old one at once. The device stops sending until its firmware uses the new token.", id: "Token baru langsung menghentikan token lama. Perangkat berhenti mengirim sampai firmware-nya memakai token baru." })}</p>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={action.busy} onClick={() => void action.run(async () => { setToken(await issueToken(asset.id)); setAsking(false); })}>{action.busy ? t({ en: "Creating…", id: "Membuat…" }) : t({ en: "Yes, create a new token", id: "Ya, buat token baru" })}</SecondaryButton>
            <SecondaryButton disabled={action.busy} onClick={() => setAsking(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-2 text-[13px] text-[#4F6B73]">{t({ en: "Used by the device to send readings to", id: "Dipakai perangkat untuk mengirim pembacaan ke" })} <code>/api/pf/ingest</code>.</p>
          <SecondaryButton onClick={() => setAsking(true)}>{t({ en: "Create token", id: "Buat token" })}</SecondaryButton>
        </>
      )}
      <div className="mt-2 empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </div>
  );
}

function CalibrationBlock({ asset, canEdit, onSaved }: { asset: Asset; canEdit: boolean; onSaved: () => Promise<void> }) {
  const list = useLoad(() => fetchCalibrations(asset.id), [asset.id]);
  const [metric, setMetric] = useState(asset.metrics[0] ?? "");
  const [offset, setOffset] = useState("");
  const [slope, setSlope] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const action = useAction();
  const t = useT();
  const lang = useLang();

  const submit = async () => {
    const parsed = parseCalibrationForm(offset, slope, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    const saved = await action.run(async () => {
      await addCalibration(asset.id, metric, parsed.offsetValue, parsed.slopeValue, due, notes);
      await Promise.all([list.reload(), onSaved()]);
    });
    if (saved) {
      setAdding(false);
      setOffset("");
      setSlope("");
      setNotes("");
    }
  };

  return (
    <div className="border-t border-[#EDF2F2] pt-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-medium text-[#0F2F36]">{t({ en: "Calibration", id: "Kalibrasi" })}</h3>
        {canEdit && !adding && <button type="button" onClick={() => setAdding(true)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">{t({ en: "Record", id: "Catat" })}</button>}
      </div>
      {adding && (
        <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label={t({ en: "Reading", id: "Pembacaan" })}>
            <select className={inputClass} value={metric} onChange={(e) => setMetric(e.target.value)}>
              {asset.metrics.map((m) => <option key={m} value={m}>{metricLabel(m, lang)}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Offset (+/-)"><input className={inputClass} inputMode="decimal" value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="0" /></Field>
            <Field label={t({ en: "Multiplier", id: "Pengali" })}><input className={inputClass} inputMode="decimal" value={slope} onChange={(e) => setSlope(e.target.value)} placeholder="1" /></Field>
          </div>
          <p className="text-[12.5px] text-[#4F6B73]">{t({ en: "Applies to the next readings: value = raw × multiplier + offset. Older readings do not change.", id: "Berlaku untuk pembacaan berikutnya: nilai = mentah × pengali + offset. Pembacaan lama tidak berubah." })}</p>
          <Field label={t({ en: "Next calibration", id: "Kalibrasi berikutnya" })}><input type="date" className={inputClass} min={jakartaToday()} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label={t({ en: "Notes", id: "Catatan" })}><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <ActionNote action={action} />
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
            <SecondaryButton onClick={() => setAdding(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
          </div>
        </form>
      )}
      <DataState state={list}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="text-[13px] text-[#4F6B73]">{t({ en: "Never calibrated.", id: "Belum pernah dikalibrasi." })}</p>
          ) : (
            <ul className="space-y-2">
              {rows.slice(0, 6).map((c) => (
                <li key={c.id} className="text-[13px]">
                  <span className="font-medium text-[#0F2F36]">{metricLabel(c.metric, lang)}</span>
                  <span className="text-[#4F6B73]"> · × {c.slope} {c.offset_value >= 0 ? "+" : "-"} {Math.abs(c.offset_value)}</span>
                  <span className="block text-[#4F6B73]">{formatDateTime(c.calibrated_at, lang)}{c.next_due ? t({ en: ` · next ${formatLongDate(c.next_due)}`, id: ` · berikutnya ${formatLongDate(c.next_due, lang)}` }) : ""}</span>
                </li>
              ))}
            </ul>
          )
        }
      </DataState>
    </div>
  );
}

function AssetDetail({ asset, canEdit, onEdit, onSaved }: { asset: Asset; canEdit: boolean; onEdit: () => void; onSaved: () => Promise<void> }) {
  const t = useT();
  const lang = useLang();
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={sectionTitle}>{asset.code}</h2>
          <p className="text-[13px] text-[#4F6B73]">{asset.name}</p>
        </div>
        {canEdit && <SecondaryButton onClick={onEdit}>{t({ en: "Edit", id: "Ubah" })}</SecondaryButton>}
      </div>
      <dl className="space-y-1.5 text-[13.5px]">
        <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">{t({ en: "Location", id: "Lokasi" })}</dt><dd className="text-right font-medium text-[#0F2F36]">{asset.location_code}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">{t({ en: "Reading", id: "Pembacaan" })}</dt><dd className="text-right font-medium text-[#0F2F36]">{asset.metrics.map((m) => metricLabel(m, lang)).join(", ")}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">{t({ en: "Send interval", id: "Interval kirim" })}</dt><dd className="text-right font-medium tabular-nums text-[#0F2F36]">{asset.interval_s} {t({ en: "seconds", id: "detik" })}</dd></div>
        {asset.model && <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">Model</dt><dd className="text-right font-medium text-[#0F2F36]">{asset.model}</dd></div>}
        {asset.serial && <div className="flex justify-between gap-3"><dt className="text-[#4F6B73]">{t({ en: "Serial number", id: "Nomor seri" })}</dt><dd className="text-right font-medium text-[#0F2F36]">{asset.serial}</dd></div>}
      </dl>
      <TokenBlock key={`t-${asset.id}`} asset={asset} canEdit={canEdit} />
      <CalibrationBlock key={`c-${asset.id}`} asset={asset} canEdit={canEdit} onSaved={onSaved} />
    </Card>
  );
}

export default function DevicesPage() {
  const store = useErpStore();
  const { canMaintain } = useErpAccess();
  const t = useT();
  const lang = useLang();
  const state = useLoad(async () => {
    const [assets, places] = await Promise.all([fetchAssets(), fetchAssetLocations()]);
    return { assets, places };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<"new" | "current" | null>(null);
  const today = jakartaToday();

  const reload = async () => {
    await Promise.all([state.reload(), store.loadMonitoring()]);
  };

  const done = async (saved: string | null) => {
    if (saved) {
      await reload();
      setSelected(saved);
    }
    setEditing(null);
  };

  return (
    <ErpPage
      eyebrow={t({ en: "Monitoring", id: "Pemantauan" })}
      title={t({ en: "Devices", id: "Perangkat" })}
      sub={t({ en: "The sensors that send readings to the ERP. The ERP only monitors and sends no commands to equipment.", id: "Sensor yang mengirim pembacaan ke ERP. ERP hanya memantau dan tidak mengirim perintah ke peralatan." })}
      actions={canMaintain && editing === null && state.data ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> {t({ en: "New device", id: "Perangkat baru" })}</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ assets, places }) => {
          const current = assets.find((a) => a.id === selected) ?? null;
          const side = editing !== null || current;
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${side ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canMaintain && <ReadOnlyNote who={t({ en: "Technician or System admin", id: "Teknisi atau Admin sistem" })} />}
                {state.error && <ErrorNote message={state.error.message} onRetry={state.reload} />}
                <DataTable
                  rows={assets}
                  rowKey={(a) => a.id}
                  noun={t({ en: "devices", id: "perangkat" })}
                  onOpen={(a) => { setSelected(a.id); setEditing(null); }}
                  selected={selected}
                  searchText={(a) => `${a.code} ${a.name} ${a.location_code}`}
                  searchLabel={t({ en: "Search by code, name or place", id: "Cari menurut kode, nama, atau tempat" })}
                  filters={[{ label: t({ en: "Filter by place", id: "Filter per tempat" }), all: t({ en: "All places", id: "Semua tempat" }), value: (a) => a.location_code }]}
                  empty={t({ en: "No devices yet. Register the first sensor, then give its token to the firmware.", id: "Belum ada perangkat. Daftarkan sensor pertama, lalu berikan tokennya ke firmware." })}
                  columns={[
                    { key: "code", label: t({ en: "Device", id: "Perangkat" }), track: "minmax(0,1.3fr)", phone: "title", sort: (a, b) => a.code.localeCompare(b.code), cell: (a) => <CellTitle title={a.code} sub={`${a.name} · ${a.location_code}`} /> },
                    { key: "link", label: t({ en: "Connection", id: "Koneksi" }), cell: (a) => (
                      <span className="block min-w-0 text-[13px]">
                        <span className="flex items-center gap-1.5"><span className={`h-2 w-2 shrink-0 rounded-full ${LINK_STATES[a.link_state].dot}`} />{linkStateLabel(a.link_state, lang)}</span>
                        <span className="block truncate text-[#4F6B73]">{a.last_seen_at ? t({ en: `Last ${ago(a.last_seen_at)}`, id: `Terakhir ${ago(a.last_seen_at, undefined, lang)}` }) : t({ en: "Has never sent", id: "Belum pernah mengirim" })}</span>
                      </span>
                    ) },
                    { key: "cal", label: t({ en: "Calibration", id: "Kalibrasi" }), sort: (a, b) => (a.next_due ?? "9999").localeCompare(b.next_due ?? "9999"), cell: (a) => {
                      const overdue = !!a.next_due && a.next_due < today;
                      return <span className={`text-[13px] ${overdue ? "font-medium text-[#8A5A07]" : ""}`}>{a.next_due ? `${overdue ? t({ en: "Overdue since", id: "Terlambat sejak" }) : t({ en: "Due", id: "Jatuh tempo" })} ${formatLongDate(a.next_due, lang)}` : a.calibrated ? t({ en: "No schedule", id: "Tanpa jadwal" }) : t({ en: "Not calibrated", id: "Belum dikalibrasi" })}</span>;
                    } },
                  ] satisfies Column<(typeof assets)[number]>[]}
                />
              </div>
              {editing !== null ? (
                <AssetEditor key={editing === "new" ? "new" : current?.id} asset={editing === "new" ? null : current} places={places} onDone={(saved) => void done(saved)} />
              ) : current ? (
                <AssetDetail key={current.id} asset={current} canEdit={canMaintain} onEdit={() => setEditing("current")} onSaved={reload} />
              ) : null}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
