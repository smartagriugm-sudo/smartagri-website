import { useState } from "react";
import { Plus } from "lucide-react";
import { cropToForm, emptyCropForm, fetchCrops, parseCropForm, saveCrop, type CropForm } from "../../lib/pf/foundation";
import { DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Crops the recipes and, later, the batches point at. A crop is switched off
// instead of deleted, so old records keep their meaning.

function CropEditor({ id, initial, onDone }: { id: string | null; initial: CropForm; onDone: (saved: boolean) => void }) {
  const [form, setForm] = useState(initial);
  const action = useAction();
  const set = <K extends keyof CropForm>(k: K, v: CropForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = parseCropForm(form);
    if (!parsed.fields) return action.setError(parsed.error);
    if (await action.run(() => saveCrop(id, parsed.fields))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{id ? "Ubah tanaman" : "Tanaman baru"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Nama"><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Selada" autoFocus /></Field>
        <Field label="Varietas"><input className={inputClass} value={form.variety} onChange={(e) => set("variety", e.target.value)} placeholder="Romaine" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Siklus (hari)"><input className={inputClass} inputMode="numeric" value={form.cycleDays} onChange={(e) => set("cycleDays", e.target.value)} placeholder="35" /></Field>
          <Field label="Daya kecambah (%)"><input className={inputClass} inputMode="decimal" value={form.germRate} onChange={(e) => set("germRate", e.target.value)} placeholder="90" /></Field>
        </div>
        <Field label="Catatan"><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-[14px] text-[#0F2F36]">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#14919B]" />
          Aktif, bisa dipilih untuk resep baru
        </label>
        {action.error && <Note tone="warn">{action.error}</Note>}
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Simpan"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Batal</SecondaryButton>
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

  const done = async (saved: boolean) => {
    if (saved) await state.reload();
    setEditing(null);
  };

  return (
    <ErpPage
      eyebrow="Budidaya"
      title="Tanaman"
      sub="Daftar tanaman yang dipakai resep dan batch."
      actions={canManageProduction && editing === null && !state.error?.notInstalled ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Tambah tanaman</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {(crops) => (
          <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
            <div className="min-w-0 space-y-3">
              {!canManageProduction && <ReadOnlyNote who="Manajer produksi" />}
              <Card className="overflow-x-auto p-4">
                {crops.length === 0 ? (
                  <p className="py-6 text-center text-[14px] text-[#4F6B73]">Belum ada tanaman.</p>
                ) : (
                  <table className="w-full min-w-[560px] text-left text-[14px]">
                    <thead className="text-[13px] text-[#6B8289]">
                      <tr>
                        <th className="pb-2 font-medium">Tanaman</th>
                        <th className="pb-2 font-medium">Siklus</th>
                        <th className="pb-2 font-medium">Daya kecambah</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody className="text-[#0F2F36]">
                      {crops.map((c) => (
                        <tr key={c.id} className="border-t border-[#E3ECED]">
                          <td className="py-2.5">
                            <span className="font-medium">{c.name}</span>{c.variety && <span className="text-[#4F6B73]"> {c.variety}</span>}
                            {c.notes && <span className="block text-[13px] text-[#6B8289]">{c.notes}</span>}
                          </td>
                          <td className="py-2.5">{c.cycle_days != null ? `${c.cycle_days} hari` : "Belum diisi"}</td>
                          <td className="py-2.5">{c.germ_rate != null ? `${c.germ_rate}%` : "Belum diisi"}</td>
                          <td className="py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-medium ${c.active ? "bg-[#E3F7F0] text-[#0E7A5C]" : "bg-[#EEF3F4] text-[#4F6B73]"}`}>{c.active ? "Aktif" : "Nonaktif"}</span>
                          </td>
                          <td className="py-2.5 text-right">
                            {canManageProduction && <button type="button" onClick={() => setEditing(c.id)} className="text-[14px] font-medium text-[#14919B] hover:underline">Ubah</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
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
