import { useState } from "react";
import { Plus } from "lucide-react";
import { fetchPartners, savePartner, type Partner, type PartnerKind } from "../../lib/pf/sales";
import { useT } from "../../lib/i18n";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// The people and businesses who buy from the lab. Never deleted: orders point at
// them, so one that stops buying is marked inactive instead.

type Form = Omit<Partner, "id">;

const blank: Form = { name: "", kind: "pelanggan", contact_name: "", phone: "", email: "", address: "", tax_id: "", notes: "", active: true };

function PartnerEditor({ partner, onDone }: { partner: Partner | null; onDone: (saved: boolean) => void }) {
  const t = useT();
  const [form, setForm] = useState<Form>(partner ?? blank);
  const action = useAction();
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim()) return action.setError(t({ en: "A name is required.", id: "Nama wajib diisi." }));
    if (await action.run(() => savePartner(partner?.id ?? null, form).then(() => undefined))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{partner ? t({ en: `Edit ${partner.name}`, id: `Ubah ${partner.name}` }) : t({ en: "New customer", id: "Pelanggan baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Business or person's name", id: "Nama usaha atau perorangan" })}><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Contact name", id: "Nama kontak" })}><input className={inputClass} value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} /></Field>
          <Field label={t({ en: "Phone", id: "Telepon" })}><input className={inputClass} type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        </div>
        <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label={t({ en: "Address", id: "Alamat" })} hint={t({ en: "Shows on invoices and delivery notes.", id: "Tampil di invoice dan surat jalan." })}><textarea className={inputClass} rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Tax ID", id: "NPWP" })}><input className={inputClass} value={form.tax_id} onChange={(e) => set({ tax_id: e.target.value })} /></Field>
          <Field label={t({ en: "Type", id: "Jenis" })}>
            <select className={inputClass} value={form.kind} onChange={(e) => set({ kind: e.target.value as PartnerKind })}>
              <option value="pelanggan">{t({ en: "Customers", id: "Pelanggan" })}</option>
              <option value="keduanya">{t({ en: "Customers and suppliers", id: "Pelanggan dan pemasok" })}</option>
            </select>
          </Field>
        </div>
        <Field label={t({ en: "Notes", id: "Catatan" })}><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> {t({ en: "Active", id: "Aktif" })}</label>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

export default function PartnersPage() {
  const state = useLoad(fetchPartners);
  const { canSell } = useErpAccess();
  const [editing, setEditing] = useState<string | null>(null);
  const t = useT();

  const done = async (saved: boolean) => {
    if (saved) await state.reload();
    setEditing(null);
  };

  return (
    <ErpPage
      eyebrow={t({ en: "Sales", id: "Penjualan" })}
      title={t({ en: "Customers", id: "Pelanggan" })}
      sub={t({ en: "Who buys the harvest, and where it goes.", id: "Siapa yang membeli hasil panen, dan ke mana dikirim." })}
      actions={canSell && editing === null && !state.error?.notInstalled ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> {t({ en: "New customer", id: "Pelanggan baru" })}</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {(all) => {
          const partners = all.filter((p) => p.kind !== "pemasok");
          return (
          <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
            <div className="min-w-0 space-y-3">
              {!canSell && <ReadOnlyNote who={t({ en: "Sales staff", id: "Staf penjualan" })} />}
              <DataTable
                rows={partners}
                rowKey={(p) => p.id}
                noun={t({ en: "customers", id: "pelanggan" })}
                searchText={(p) => `${p.name} ${p.contact_name} ${p.phone} ${p.email} ${p.address}`}
                searchLabel={t({ en: "Search by name, contact or address", id: "Cari nama, kontak, atau alamat" })}
                pills={[
                  { key: "active", label: t({ en: "Active", id: "Aktif" }), dot: "#0E9B7A", match: (p) => p.active },
                  { key: "inactive", label: t({ en: "Inactive", id: "Nonaktif" }), dot: "#8FA3A8", match: (p) => !p.active },
                ]}
                empty={t({ en: "No customers yet.", id: "Belum ada pelanggan." })}
                columns={[
                  { key: "name", label: t({ en: "Customer", id: "Pelanggan" }), track: "minmax(0,1.2fr)", phone: "title", sort: (a, b) => a.name.localeCompare(b.name), cell: (p) => <CellTitle title={p.name} sub={p.contact_name || t({ en: "No contact yet", id: "Belum ada kontak" })} muted={!p.active} /> },
                  { key: "phone", label: t({ en: "Phone", id: "Telepon" }), track: "150px", cell: (p) => <span className="text-[13px] tabular-nums">{p.phone || "-"}</span> },
                  { key: "email", label: "Email", cell: (p) => <span className="block truncate text-[13px]">{p.email || "-"}</span> },
                  { key: "address", label: t({ en: "Address", id: "Alamat" }), phone: "hidden", cell: (p) => <span className="block truncate text-[13px]">{p.address || "-"}</span> },
                  { key: "status", label: "Status", track: "110px", cell: (p) => <Chip label={p.active ? t({ en: "Active", id: "Aktif" }) : t({ en: "Inactive", id: "Nonaktif" })} className={p.active ? "bg-[#E3F7F0] text-[#0E7A5C]" : undefined} /> },
                  { key: "edit", label: "", track: "64px", align: "right", interactive: true, cell: (p) => canSell ? <button type="button" onClick={() => setEditing(p.id)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">{t({ en: "Edit", id: "Ubah" })}</button> : null },
                ] satisfies Column<Partner>[]}
              />
            </div>
            {editing && <PartnerEditor key={editing} partner={partners.find((p) => p.id === editing) ?? null} onDone={(saved) => void done(saved)} />}
          </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
