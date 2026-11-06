import { useState } from "react";
import { Plus } from "lucide-react";
import { fetchPartners, savePartner, type Partner, type PartnerKind } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";

// The people and businesses who buy from the lab. Never deleted: orders point at
// them, so one that stops buying is marked inactive instead.

type Form = Omit<Partner, "id">;

const blank: Form = { name: "", kind: "pelanggan", contact_name: "", phone: "", email: "", address: "", tax_id: "", notes: "", active: true };

function PartnerEditor({ partner, onDone }: { partner: Partner | null; onDone: (saved: boolean) => void }) {
  const [form, setForm] = useState<Form>(partner ?? blank);
  const action = useAction();
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim()) return action.setError("Nama wajib diisi.");
    if (await action.run(() => savePartner(partner?.id ?? null, form).then(() => undefined))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{partner ? `Ubah ${partner.name}` : "Pelanggan baru"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Nama usaha atau orang"><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama kontak"><input className={inputClass} value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} /></Field>
          <Field label="Telepon"><input className={inputClass} type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        </div>
        <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Alamat" hint="Muncul di invoice dan surat jalan."><textarea className={inputClass} rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="NPWP"><input className={inputClass} value={form.tax_id} onChange={(e) => set({ tax_id: e.target.value })} /></Field>
          <Field label="Jenis">
            <select className={inputClass} value={form.kind} onChange={(e) => set({ kind: e.target.value as PartnerKind })}>
              <option value="pelanggan">Pelanggan</option>
              <option value="keduanya">Pelanggan dan pemasok</option>
              <option value="pemasok">Pemasok</option>
            </select>
          </Field>
        </div>
        <Field label="Catatan"><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Aktif</label>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Simpan"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Batal</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

export default function PartnersPage() {
  const state = useLoad(fetchPartners);
  const { canSell } = useErpAccess();
  const [editing, setEditing] = useState<string | null>(null);

  const done = async (saved: boolean) => {
    if (saved) await state.reload();
    setEditing(null);
  };

  return (
    <ErpPage
      eyebrow="Penjualan"
      title="Pelanggan"
      sub="Siapa yang membeli hasil panen, dan ke mana dikirim."
      actions={canSell && editing === null && !state.error?.notInstalled ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Pelanggan baru</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {(partners) => (
          <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
            <div className="min-w-0 space-y-3">
              {!canSell && <ReadOnlyNote who="Staf penjualan" />}
              <Card>
                {partners.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Belum ada pelanggan.</p>
                ) : (
                  <ul>
                    {partners.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 border-t border-[#EDF2F2] px-4 py-3 first:border-0">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 text-[14px] font-medium text-[#0F2F36]">
                            {p.name}
                            {!p.active && <span className="rounded-md bg-[#EEF3F4] px-1.5 py-0.5 text-[12.5px] font-medium text-[#4F6B73]">Nonaktif</span>}
                          </span>
                          <span className="block truncate text-[13px] text-[#4F6B73]">{[p.contact_name, p.phone, p.email].filter(Boolean).join(" · ") || "Kontak belum diisi"}</span>
                          {p.address && <span className="block truncate text-[13px] text-[#4F6B73]">{p.address}</span>}
                        </span>
                        {canSell && <button type="button" onClick={() => setEditing(p.id)} className="min-h-[44px] shrink-0 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Ubah</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
            {editing && <PartnerEditor key={editing} partner={partners.find((p) => p.id === editing) ?? null} onDone={(saved) => void done(saved)} />}
          </div>
        )}
      </DataState>
    </ErpPage>
  );
}
