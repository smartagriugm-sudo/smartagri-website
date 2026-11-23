import { useState } from "react";
import { Plus } from "lucide-react";
import { cropToForm, emptyCropForm, fetchCrops, parseCropForm, saveCrop, type CropForm, type PfCrop } from "../../lib/pf/foundation";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";
import { useLang, useT } from "../../lib/i18n";

// Crops the recipes and, later, the batches point at. A crop is switched off
// instead of deleted, so old records keep their meaning.

function CropEditor({ id, initial, onDone }: { id: string | null; initial: CropForm; onDone: (saved: boolean) => void }) {
  const [form, setForm] = useState(initial);
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const set = <K extends keyof CropForm>(k: K, v: CropForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = parseCropForm(form, lang);
    if (!parsed.fields) return action.setError(parsed.error);
    if (await action.run(() => saveCrop(id, parsed.fields))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{id ? t({ en: "Edit crop", id: "Ubah tanaman" }) : t({ en: "New crop", id: "Tanaman baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Name", id: "Nama" })}><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t({ en: "Lettuce", id: "Selada" })} autoFocus /></Field>
        <Field label={t({ en: "Variety", id: "Varietas" })}><input className={inputClass} value={form.variety} onChange={(e) => set("variety", e.target.value)} placeholder="Romaine" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Cycle (days)", id: "Siklus (hari)" })}><input className={inputClass} inputMode="numeric" value={form.cycleDays} onChange={(e) => set("cycleDays", e.target.value)} placeholder="35" /></Field>
          <Field label={t({ en: "Germination (%)", id: "Perkecambahan (%)" })}><input className={inputClass} inputMode="decimal" value={form.germRate} onChange={(e) => set("germRate", e.target.value)} placeholder="90" /></Field>
        </div>
        <Field label={t({ en: "Notes", id: "Catatan" })}><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-[14px] text-[#0F2F36]">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#14919B]" />
          {t({ en: "Active, can be chosen for new recipes", id: "Aktif, bisa dipilih untuk resep baru" })}
        </label>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

export default function CropsPage() {
  const state = useLoad(fetchCrops);
  const { canManageProduction } = useErpAccess();
  // null: no form open; "new": a new crop; otherwise the crop's id.
  const [editing, setEditing] = useState<string | null>(null);
  const t = useT();

  const done = async (saved: boolean) => {
    if (saved) await state.reload();
    setEditing(null);
  };

  return (
    <ErpPage
      eyebrow={t({ en: "Master data", id: "Data master" })}
      title={t({ en: "Crops", id: "Tanaman" })}
      sub={t({ en: "The crops that recipes and batches use.", id: "Tanaman yang dipakai resep dan batch." })}
      actions={canManageProduction && editing === null && !state.error?.notInstalled ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> {t({ en: "Add crop", id: "Tambah tanaman" })}</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {(crops) => (
          <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
            <div className="min-w-0 space-y-3">
              {!canManageProduction && <ReadOnlyNote who={t({ en: "Production manager", id: "Manajer produksi" })} />}
              <DataTable
                rows={crops}
                rowKey={(c) => c.id}
                noun={t({ en: "crops", id: "tanaman" })}
                searchText={(c) => `${c.name} ${c.variety ?? ""} ${c.notes ?? ""}`}
                searchLabel={t({ en: "Search by name or variety", id: "Cari nama atau varietas" })}
                pills={[
                  { key: "active", label: t({ en: "Active", id: "Aktif" }), dot: "#0E9B7A", match: (c) => c.active },
                  { key: "inactive", label: t({ en: "Inactive", id: "Nonaktif" }), dot: "#8FA3A8", match: (c) => !c.active },
                ]}
                empty={t({ en: "No crops yet.", id: "Belum ada tanaman." })}
                columns={[
                  { key: "name", label: t({ en: "Crop", id: "Tanaman" }), track: "minmax(0,1.6fr)", phone: "title", sort: (a, b) => a.name.localeCompare(b.name), cell: (c) => <CellTitle title={<>{c.name}{c.variety && <span className="font-normal text-[#4F6B73]"> {c.variety}</span>}</>} sub={c.notes || undefined} muted={!c.active} /> },
                  { key: "cycle", label: t({ en: "Cycle", id: "Siklus" }), track: "110px", align: "right", sort: (a, b) => (a.cycle_days ?? 0) - (b.cycle_days ?? 0), cell: (c) => <span className="tabular-nums">{c.cycle_days != null ? t({ en: `${c.cycle_days} days`, id: `${c.cycle_days} hari` }) : t({ en: "Not set", id: "Belum diatur" })}</span> },
                  { key: "germ", label: t({ en: "Germination", id: "Kecambah" }), track: "120px", align: "right", sort: (a, b) => (a.germ_rate ?? 0) - (b.germ_rate ?? 0), cell: (c) => <span className="tabular-nums">{c.germ_rate != null ? `${c.germ_rate}%` : t({ en: "Not set", id: "Belum diatur" })}</span> },
                  { key: "status", label: "Status", track: "110px", cell: (c) => <Chip label={c.active ? t({ en: "Active", id: "Aktif" }) : t({ en: "Inactive", id: "Nonaktif" })} className={c.active ? "bg-[#E3F7F0] text-[#0E7A5C]" : undefined} /> },
                  { key: "edit", label: "", track: "48px", align: "right", interactive: true, cell: (c) => canManageProduction ? <button type="button" onClick={() => setEditing(c.id)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">{t({ en: "Edit", id: "Ubah" })}</button> : null },
                ] satisfies Column<PfCrop>[]}
              />
            </div>
            {editing && (
              <CropEditor
                key={editing}
                id={editing === "new" ? null : editing}
                initial={editing === "new" ? emptyCropForm : cropToForm(crops.find((c) => c.id === editing)!)}
                onDone={(saved) => void done(saved)}
              />
            )}
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}
