import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatLongDate } from "../../lib/pf/dashboard";
import { Plus } from "lucide-react";
import { addSeedLot, adjustSeedLot, fetchSeedLots, isLotUsable, jakartaToday, parseSeedLotForm, type SeedLot, type SeedLotForm, type SeedUnit } from "../../lib/pf/batch";
import { cropLabel, fetchCrops, type PfCrop } from "../../lib/pf/foundation";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";

// Seed lots, so every harvest can be traced to the seed it came from. Stock moves
// only through recorded movements: receiving, sowing, or a correction with a reason.

const formatQty = (n: number, unit: string) => `${n.toLocaleString("id-ID")} ${unit}`;

function LotEditor({ crops, onDone }: { crops: PfCrop[]; onDone: (saved: boolean) => void }) {
  const today = jakartaToday();
  const [form, setForm] = useState<SeedLotForm>({ cropId: crops.find((c) => c.active)?.id ?? "", unit: "biji", lotNo: "", qty: "", receivedOn: today, expiryOn: "", supplier: "", notes: "" });
  const action = useAction();
  const set = <K extends keyof SeedLotForm>(k: K, v: SeedLotForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = parseSeedLotForm(form);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (await action.run(() => addSeedLot(form, parsed.qty))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Lot benih baru</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Tanaman">
          <select className={inputClass} value={form.cropId} onChange={(e) => set("cropId", e.target.value)}>
            {crops.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}
          </select>
        </Field>
        <Field label="Nomor lot" hint="Sesuai kemasan benih."><input className={inputClass} value={form.lotNo} onChange={(e) => set("lotNo", e.target.value)} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah"><input className={inputClass} inputMode="decimal" value={form.qty} onChange={(e) => set("qty", e.target.value)} /></Field>
          <Field label="Satuan">
            <select className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value as SeedUnit)}>
              <option value="biji">biji</option>
              <option value="gram">gram</option>
            </select>
          </Field>
          <Field label="Diterima"><input type="date" className={inputClass} value={form.receivedOn} onChange={(e) => set("receivedOn", e.target.value)} /></Field>
          <Field label="Kedaluwarsa"><input type="date" className={inputClass} value={form.expiryOn} onChange={(e) => set("expiryOn", e.target.value)} /></Field>
        </div>
        <Field label="Pemasok"><input className={inputClass} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
        <Field label="Catatan"><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Simpan"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Batal</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function AdjustEditor({ lot, onDone }: { lot: SeedLot; onDone: (saved: boolean) => void }) {
  const [qty, setQty] = useState(String(lot.qty_on_hand));
  const [why, setWhy] = useState("");
  const action = useAction();

  const submit = async () => {
    const value = Number(qty.trim().replace(",", "."));
    if (qty.trim() === "" || !Number.isFinite(value) || value < 0) return action.setError("Jumlah tidak boleh negatif.");
    if (!why.trim()) return action.setError("Alasan koreksi wajib diisi.");
    if (await action.run(() => adjustSeedLot(lot.id, value, why.trim()))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Koreksi stok {lot.lot_no}</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">Isi jumlah hasil hitung fisik. Perubahannya tercatat bersama alasan.</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={`Jumlah sebenarnya (${lot.unit})`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Alasan"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Hitung ulang, benih rusak" /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Simpan"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Batal</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

export default function SeedLotsPage() {
  const state = useLoad(async () => {
    const [lots, crops] = await Promise.all([fetchSeedLots(), fetchCrops()]);
    return { lots, crops };
  });
  const { canManageProduction } = useErpAccess();
  // null: no form open; "new": a new lot; otherwise the lot being corrected.
  const [editing, setEditing] = useState<string | null>(null);
  const today = jakartaToday();

  const done = async (saved: boolean) => {
    if (saved) await state.reload();
    setEditing(null);
  };

  const hasCrops = !!state.data?.crops.some((c) => c.active);

  return (
    <ErpPage
      eyebrow="Budidaya"
      title="Lot benih"
      sub="Benih yang diterima dan sisanya. Setiap batch memakai satu lot, supaya hasil panen bisa ditelusuri sampai benihnya."
      actions={canManageProduction && editing === null && hasCrops ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Tambah lot</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ lots, crops }) => {
          const adjusting = lots.find((l) => l.id === editing);
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canManageProduction && <ReadOnlyNote who="Manajer produksi" />}
                {canManageProduction && !hasCrops && (
                  <Note>Tambahkan tanaman dulu di halaman <Link to="/erp/tanaman" className="font-medium text-[#0B6477] hover:underline">Tanaman</Link>.</Note>
                )}
                <Card className="p-4">
                  {lots.length === 0 ? (
                    <p className="py-6 text-center text-[14px] text-[#4F6B73]">Belum ada lot benih.</p>
                  ) : (
                    <>
                    <ul className="-my-2 md:hidden">
                      {lots.map((l) => {
                        const expired = !isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today);
                        return (
                          <li key={l.id} className="flex items-center gap-3 border-t border-[#E3ECED] py-2 first:border-0">
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-x-2 text-[14px] font-medium text-[#0F2F36]">
                                {l.lot_no}
                                {expired && <span className="rounded-full bg-[#FDECEA] px-2 py-0.5 text-[12.5px] font-medium text-[#B3362C]">Kedaluwarsa</span>}
                              </span>
                              <span className="block text-[13px] text-[#4F6B73]">{cropLabel({ name: l.crop_name, variety: l.crop_variety })} · sisa {formatQty(l.qty_on_hand, l.unit)}</span>
                              <span className="block text-[13px] text-[#4F6B73]">Sampai {l.expiry_date ? formatLongDate(l.expiry_date) : "-"}</span>
                            </span>
                            {canManageProduction && <button type="button" onClick={() => setEditing(l.id)} className="min-h-[44px] shrink-0 text-[14px] font-medium text-[#0B6477] hover:underline">Koreksi</button>}
                          </li>
                        );
                      })}
                    </ul>
                    <table className="hidden w-full text-left text-[14px] md:table">
                      <thead className="text-[13px] text-[#4F6B73]">
                        <tr>
                          <th className="pb-2 font-medium">Lot</th>
                          <th className="pb-2 font-medium">Tanaman</th>
                          <th className="pb-2 pr-6 text-right font-medium">Sisa</th>
                          <th className="pb-2 font-medium">Diterima</th>
                          <th className="pb-2 font-medium">Kedaluwarsa</th>
                          <th className="pb-2" />
                        </tr>
                      </thead>
                      <tbody className="text-[#0F2F36]">
                        {lots.map((l) => (
                          <tr key={l.id} className="border-t border-[#E3ECED]">
                            <td className="py-2.5">
                              <span className="font-medium">{l.lot_no}</span>
                              {l.supplier && <span className="block text-[13px] text-[#4F6B73]">{l.supplier}</span>}
                            </td>
                            <td className="py-2.5">{cropLabel({ name: l.crop_name, variety: l.crop_variety })}</td>
                            <td className="py-2.5 pr-6 text-right tabular-nums">{formatQty(l.qty_on_hand, l.unit)}</td>
                            <td className="py-2.5">{formatLongDate(l.received_at)}</td>
                            <td className="py-2.5">
                              {l.expiry_date ? formatLongDate(l.expiry_date) : "Belum diisi"}
                              {!isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today) && <span className="ml-1.5 rounded-full bg-[#FDECEA] px-2 py-0.5 text-[12.5px] font-medium text-[#B3362C]">Kedaluwarsa</span>}
                            </td>
                            <td className="py-2.5 text-right">
                              {canManageProduction && <button type="button" onClick={() => setEditing(l.id)} className="min-h-[24px] text-[14px] font-medium text-[#0B6477] hover:underline">Koreksi</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </>
                  )}
                </Card>
              </div>
              {editing === "new" && <LotEditor crops={crops} onDone={(saved) => void done(saved)} />}
              {adjusting && <AdjustEditor key={adjusting.id} lot={adjusting} onDone={(saved) => void done(saved)} />}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
