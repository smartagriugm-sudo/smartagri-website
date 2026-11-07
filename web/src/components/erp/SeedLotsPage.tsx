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

// Seed lots, so every harvest can be traced to the seed it came from. Stock moves
// only through recorded movements: receiving, sowing, or a correction with a reason.

const formatQty = (n: number, unit: string) => `${n.toLocaleString("en-GB")} ${unit}`;

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
      <h2 className="mb-3 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">New seed lot</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Crop">
          <select className={inputClass} value={form.cropId} onChange={(e) => set("cropId", e.target.value)}>
            {crops.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{cropLabel(c)}</option>)}
          </select>
        </Field>
        <Field label="Lot number" hint="As on the seed packet."><input className={inputClass} value={form.lotNo} onChange={(e) => set("lotNo", e.target.value)} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity"><input className={inputClass} inputMode="decimal" value={form.qty} onChange={(e) => set("qty", e.target.value)} /></Field>
          <Field label="Unit">
            <select className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value as SeedUnit)}>
              <option value="biji">biji</option>
              <option value="gram">gram</option>
            </select>
          </Field>
          <Field label="Received"><input type="date" className={inputClass} value={form.receivedOn} onChange={(e) => set("receivedOn", e.target.value)} /></Field>
          <Field label="Expires"><input type="date" className={inputClass} value={form.expiryOn} onChange={(e) => set("expiryOn", e.target.value)} /></Field>
        </div>
        <Field label="Supplier"><input className={inputClass} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
        <Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Save"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Cancel</SecondaryButton>
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
    if (qty.trim() === "" || !Number.isFinite(value) || value < 0) return action.setError("Quantity cannot be negative.");
    if (!why.trim()) return action.setError("A reason for the correction is required.");
    if (await action.run(() => adjustSeedLot(lot.id, value, why.trim()))) onDone(true);
  };

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Correct stock {lot.lot_no}</h2>
      <p className="mb-3 text-[13px] text-[#4F6B73]">Enter the physical count. The change is recorded with its reason.</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={`Actual quantity (${unitLabel(lot.unit)})`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Reason"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Recounted, damaged seed" /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Save"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(false)}>Cancel</SecondaryButton>
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
      eyebrow="Inventory"
      title="Seed lots"
      sub="Seed received and what is left. Each batch uses one lot, so a harvest can be traced back to its seed."
      actions={canManageProduction && editing === null && hasCrops ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add lot</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ lots, crops }) => {
          const adjusting = lots.find((l) => l.id === editing);
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${editing ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canManageProduction && <ReadOnlyNote who="Production manager" />}
                {canManageProduction && !hasCrops && (
                  <Note>Add a crop first on the page <Link to="/erp/crops" className="font-medium text-[#0B6477] hover:underline">Crops</Link>.</Note>
                )}
                <DataTable
                  rows={lots}
                  rowKey={(l) => l.id}
                  noun="seed lots"
                  searchText={(l) => `${l.lot_no} ${l.supplier} ${cropLabel({ name: l.crop_name, variety: l.crop_variety })}`}
                  searchLabel="Search by lot, crop or supplier"
                  pills={[
                    { key: "usable", label: "Usable", dot: "#0E9B7A", match: (l) => isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today) },
                    { key: "expired", label: "Expired", dot: "#B3362C", match: (l) => !isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today) },
                  ]}
                  filters={[{ label: "Filter by crop", all: "All crops", value: (l) => cropLabel({ name: l.crop_name, variety: l.crop_variety }) }]}
                  empty="No seed lots yet."
                  columns={[
                    { key: "lot", label: "Lot", phone: "title", sort: (a, b) => a.lot_no.localeCompare(b.lot_no), cell: (l) => <CellTitle title={l.lot_no} sub={l.supplier || undefined} /> },
                    { key: "crop", label: "Crop", sort: (a, b) => a.crop_name.localeCompare(b.crop_name), cell: (l) => cropLabel({ name: l.crop_name, variety: l.crop_variety }) },
                    { key: "qty", label: "Remaining", track: "120px", align: "right", sort: (a, b) => a.qty_on_hand - b.qty_on_hand, cell: (l) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatQty(l.qty_on_hand, l.unit)}</span> },
                    { key: "received", label: "Received", track: "130px", phone: "hidden", sort: (a, b) => a.received_at.localeCompare(b.received_at), cell: (l) => <span className="text-[13px]">{formatLongDate(l.received_at)}</span> },
                    { key: "expiry", label: "Expires", track: "190px", sort: (a, b) => (a.expiry_date ?? "9999").localeCompare(b.expiry_date ?? "9999"), cell: (l) => isLotUsable({ qty_on_hand: 1, expiry_date: l.expiry_date }, today) ? <span className="text-[13px]">{l.expiry_date ? formatLongDate(l.expiry_date) : "Not set"}</span> : <Chip label={`Expired ${l.expiry_date ? formatLongDate(l.expiry_date) : ""}`} className="bg-[#FDECEA] text-[#B3362C]" /> },
                    { key: "edit", label: "", track: "70px", align: "right", interactive: true, cell: (l) => canManageProduction ? <button type="button" onClick={() => setEditing(l.id)} className="min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Correct</button> : null },
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
