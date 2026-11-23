import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatLongDate } from "../../lib/pf/dashboard";
import { Plus } from "lucide-react";
import { unitLabel } from "../../lib/pf/inventory";
import { addSeedLot, adjustSeedLot, fetchSeedLots, isLotUsable, jakartaToday, parseSeedLotForm, type SeedLot, type SeedLotForm, type SeedUnit } from "../../lib/pf/batch";
import { cropLabel, fetchCrops, type PfCrop } from "../../lib/pf/foundation";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Note } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";
import { localeOf, useLang, useT, type Lang } from "../../lib/i18n";

// Seed lots, so every harvest can be traced to the seed it came from. Stock moves
// only through recorded movements: receiving, sowing, or a correction with a reason.

const formatQty = (n: number, unit: string, lang: Lang) => `${n.toLocaleString(lang === "id" ? localeOf(lang) : "en-GB")} ${unitLabel(unit, lang)}`;

function LotEditor({ crops, onDone }: { crops: PfCrop[]; onDone: (saved: boolean) => void }) {
  const today = jakartaToday();
  const [form, setForm] = useState<SeedLotForm>({ cropId: crops.find((c) => c.active)?.id ?? "", unit: "biji", lotNo: "", qty: "", receivedOn: today, expiryOn: "", supplier: "", notes: "" });
  const action = useAction();
  const t = useT();
  const lang = useLang();
  const set = <K extends keyof SeedLotForm>(k: K, v: SeedLotForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = parseSeedLotForm(form, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (await action.run(() => addSeedLot(form, parsed.qty))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "New seed lot", id: "Lot benih baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Crop", id: "Tanaman" })}>
          <select className={inputClass} value={form.cropId} onChange={(e) => set("cropId", e.target.value)}>
            {crops.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}
          </select>
        </Field>
        <Field label={t({ en: "Lot number", id: "Nomor lot" })} hint={t({ en: "As on the seed packet.", id: "Sesuai yang tertera di kemasan benih." })}><input className={inputClass} value={form.lotNo} onChange={(e) => set("lotNo", e.target.value)} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Quantity", id: "Jumlah" })}><input className={inputClass} inputMode="decimal" value={form.qty} onChange={(e) => set("qty", e.target.value)} /></Field>
          <Field label={t({ en: "Unit", id: "Satuan" })}>
            <select className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value as SeedUnit)}>
              <option value="biji">{t({ en: "seeds", id: "biji" })}</option>
              <option value="gram">gram</option>
            </select>
          </Field>
          <Field label={t({ en: "Received", id: "Diterima" })}><input type="date" className={inputClass} value={form.receivedOn} onChange={(e) => set("receivedOn", e.target.value)} /></Field>
          <Field label={t({ en: "Expires", id: "Kedaluwarsa" })}><input type="date" className={inputClass} value={form.expiryOn} onChange={(e) => set("expiryOn", e.target.value)} /></Field>
        </div>
        <Field label={t({ en: "Supplier", id: "Pemasok" })}><input className={inputClass} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
        <Field label={t({ en: "Notes", id: "Catatan" })}><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function AdjustEditor({ lot, onDone }: { lot: SeedLot; onDone: (saved: boolean) => void }) {
  const [qty, setQty] = useState(String(lot.qty_on_hand));
  const [why, setWhy] = useState("");
  const action = useAction();
  const t = useT();
  const lang = useLang();

  const submit = async () => {
    const value = Number(qty.trim().replace(",", "."));
    if (qty.trim() === "" || !Number.isFinite(value) || value < 0) return action.setError(t({ en: "Quantity cannot be negative.", id: "Jumlah tidak boleh negatif." }));
    if (!why.trim()) return action.setError(t({ en: "A reason for the correction is required.", id: "Alasan koreksi wajib diisi." }));
    if (await action.run(() => adjustSeedLot(lot.id, value, why.trim()))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">{t({ en: "Correct stock", id: "Koreksi stok" })} {lot.lot_no}</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">{t({ en: "Enter the physical count. The change is recorded with its reason.", id: "Isi hasil hitung fisik. Perubahannya dicatat bersama alasannya." })}</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={`${t({ en: "Actual quantity", id: "Jumlah sebenarnya" })} (${unitLabel(lot.unit, lang)})`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label={t({ en: "Reason", id: "Alasan" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t({ en: "Recounted, damaged seed", id: "Dihitung ulang, benih rusak" })} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
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
  const t = useT();
  const lang = useLang();

  const done = async (saved: boolean) => {
    if (saved) await state.reload();
    setEditing(null);
  };

  const hasCrops = !!state.data?.crops.some((c) => c.active);

  return (
    <ErpPage
      eyebrow={t({ en: "Inventory", id: "Inventaris" })}
      title={t({ en: "Seed lots", id: "Lot benih" })}
      sub={t({ en: "Seed received and what is left. Each batch uses one lot, so a harvest can be traced back to its seed.", id: "Benih yang diterima dan sisanya. Setiap batch memakai satu lot, jadi panen bisa ditelusuri sampai ke benihnya." })}
      actions={canManageProduction && editing === null && hasCrops ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> {t({ en: "Add lot", id: "Tambah lot" })}</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ lots, crops }) => {
          const adjusting = lots.find((l) => l.id === editing);
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canManageProduction && <ReadOnlyNote who={t({ en: "Production manager", id: "Manajer produksi" })} />}
                {canManageProduction && !hasCrops && (
                  <Note>{t({ en: "Add a crop first on the page", id: "Tambahkan tanaman dulu di halaman" })} <Link to="/erp/crops" className="font-medium text-[#0B6477] hover:underline">{t({ en: "Crops", id: "Tanaman" })}</Link>.</Note>
                )}
                <DataTable
                  rows={lots}
                  rowKey={(l) => l.id}
                  noun={t({ en: "seed lots", id: "lot benih" })}
                  searchText={(l) => `${l.lot_no} ${l.supplier} ${cropLabel({ name: l.crop_name, variety: l.crop_variety })}`}
                  searchLabel={t({ en: "Search by lot, crop or supplier", id: "Cari lot, tanaman, atau pemasok" })}
                  pills={[
                    { key: "usable", label: t({ en: "Usable", id: "Layak pakai" }), dot: "#0E9B7A", match: (l) => isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today) },
                    { key: "expired", label: t({ en: "Expired", id: "Kedaluwarsa" }), dot: "#B3362C", match: (l) => !isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today) },
                  ]}
                  filters={[{ label: t({ en: "Filter by crop", id: "Filter tanaman" }), all: t({ en: "All crops", id: "Semua tanaman" }), value: (l) => cropLabel({ name: l.crop_name, variety: l.crop_variety }) }]}
                  empty={t({ en: "No seed lots yet.", id: "Belum ada lot benih." })}
                  columns={[
                    { key: "lot", label: "Lot", phone: "title", sort: (a, b) => a.lot_no.localeCompare(b.lot_no), cell: (l) => <CellTitle title={l.lot_no} sub={l.supplier || undefined} /> },
                    { key: "crop", label: t({ en: "Crop", id: "Tanaman" }), sort: (a, b) => a.crop_name.localeCompare(b.crop_name), cell: (l) => cropLabel({ name: l.crop_name, variety: l.crop_variety }) },
                    { key: "qty", label: t({ en: "Remaining", id: "Sisa" }), track: "120px", align: "right", sort: (a, b) => a.qty_on_hand - b.qty_on_hand, cell: (l) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatQty(l.qty_on_hand, l.unit, lang)}</span> },
                    { key: "received", label: t({ en: "Received", id: "Diterima" }), track: "130px", phone: "hidden", sort: (a, b) => a.received_at.localeCompare(b.received_at), cell: (l) => <span className="text-[13px]">{formatLongDate(l.received_at, lang)}</span> },
                    { key: "expiry", label: t({ en: "Expires", id: "Kedaluwarsa" }), track: "190px", sort: (a, b) => (a.expiry_date ?? "9999").localeCompare(b.expiry_date ?? "9999"), cell: (l) => isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today) ? <span className="text-[13px]">{l.expiry_date ? formatLongDate(l.expiry_date, lang) : t({ en: "Not set", id: "Belum diatur" })}</span> : <Chip label={`${t({ en: "Expired", id: "Kedaluwarsa" })} ${l.expiry_date ? formatLongDate(l.expiry_date, lang) : ""}`} className="bg-[#FDECEA] text-[#B3362C]" /> },
                    { key: "edit", label: "", track: "70px", align: "right", interactive: true, cell: (l) => canManageProduction ? <button type="button" onClick={() => setEditing(l.id)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">{t({ en: "Correct", id: "Koreksi" })}</button> : null },
                  ] satisfies Column<SeedLot>[]}
                />
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
