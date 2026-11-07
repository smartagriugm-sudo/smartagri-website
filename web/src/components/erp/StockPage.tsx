import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Boxes, FlaskConical, Layers, Package, Plus, Sprout, Wrench, type LucideIcon } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { ITEM_CATEGORIES, ITEM_UNITS, MOVE_LABELS, adjustStock, categoryLabel, fetchItemMoves, fetchItems, fetchOpenShortages, formatQty, itemPhotoLinks, unitLabel, parseItemForm, parseQtyInput, parseReceive, receiveStock, resolveShortage, saveItem, useStock, type Item, type ItemCategory, type ItemForm, type Shortage, type StockLotRow } from "../../lib/pf/inventory";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// What is on the shelf: everything from nutrient to spare parts, what runs low, and
// each item's lots. Taking stock out always starts with the lot that expires first.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const textButton = "min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";

export function ItemEditor({ item, onDone }: { item: Item | null; onDone: (saved: string | null) => void }) {
  const [form, setForm] = useState<ItemForm>(item ? { name: item.name, category: item.category, unit: item.unit, reorder: item.reorder_point === null ? "" : String(item.reorder_point), expires: item.track_expiry, notes: item.notes, active: item.active } : { name: "", category: "nutrisi", unit: "liter", reorder: "", expires: true, notes: "", active: true });
  const action = useAction();
  const set = (patch: Partial<ItemForm>) => setForm((f) => ({ ...f, ...patch }));
  const isSeed = item?.category === "benih";

  const submit = async () => {
    const parsed = parseItemForm(form);
    if (parsed.error !== null) return action.setError(parsed.error);
    let saved = "";
    if (await action.run(async () => { saved = await saveItem(item?.id ?? null, form, parsed.reorder); })) onDone(saved);
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{item ? `Edit ${item.sku}` : "New item"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className={inputClass} value={form.category} disabled={isSeed} onChange={(e) => set({ category: e.target.value as ItemCategory })}>
              {ITEM_CATEGORIES.filter((c) => isSeed || c.key !== "benih").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Unit">
            <select className={inputClass} value={form.unit} disabled={!!item && item.lots > 0} onChange={(e) => set({ unit: e.target.value })}>
              {ITEM_UNITS.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Minimum level" hint="Shows on the dashboard when ready stock reaches this number."><input className={inputClass} inputMode="decimal" value={form.reorder} onChange={(e) => set({ reorder: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.expires} onChange={(e) => set({ expires: e.target.checked })} /> Has an expiry date</label>
        <Field label="Notes"><input className={inputClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        {item && <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>}
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Saving..." : "Save"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(null)}>Cancel</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function ReceiveForm({ item, onSaved, onClose }: { item: Item; onSaved: () => Promise<void>; onClose: () => void }) {
  const today = jakartaToday();
  const [lotNo, setLotNo] = useState("");
  const [qty, setQty] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [expiryOn, setExpiryOn] = useState("");
  const [supplier, setSupplier] = useState("");
  const action = useAction();
  const submit = async () => {
    const parsed = parseReceive({ lotNo, qty, receivedOn, expiryOn }, today, item.track_expiry);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (await action.run(async () => { await receiveStock(item.id, lotNo, parsed.qty, receivedOn, expiryOn, supplier); await onSaved(); })) onClose();
  };
  return (
    <form className="space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <p className="text-[13px] text-[#4F6B73]">For opening stock, donations or samples. Bought goods are received through the Purchasing page.</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Lot number"><input className={inputClass} value={lotNo} onChange={(e) => setLotNo(e.target.value)} /></Field>
        <Field label={`Quantity (${item.unit})`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Received date"><input type="date" className={inputClass} max={today} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} /></Field>
        <Field label="Expires"><input type="date" className={inputClass} value={expiryOn} onChange={(e) => setExpiryOn(e.target.value)} /></Field>
      </div>
      <Field label="Source"><input className={inputClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Save</PrimaryButton><SecondaryButton onClick={onClose}>Cancel</SecondaryButton></div>
    </form>
  );
}

function UseForm({ item, onSaved, onClose }: { item: Item; onSaved: () => Promise<void>; onClose: () => void }) {
  const store = useErpStore();
  const batches = [...store.batches.values()].filter((b) => b.id);
  const [qty, setQty] = useState("");
  const [batchId, setBatchId] = useState("");
  const [why, setWhy] = useState("");
  const action = useAction();
  const submit = async () => {
    const parsed = parseQtyInput(qty);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (!batchId && !why.trim()) return action.setError("Write what this item is used for, or choose a batch.");
    if (await action.run(async () => { await useStock(item.id, parsed.qty, batchId || null, why); await onSaved(); })) onClose();
  };
  return (
    <form className="space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Quantity (${item.unit})`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="For batch">
          <select className={inputClass} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Not for a batch</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.crop}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Mix tank A" /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Record use</PrimaryButton><SecondaryButton onClick={onClose}>Cancel</SecondaryButton></div>
    </form>
  );
}

function LotRow({ lot, today, canManage, onSaved }: { lot: StockLotRow; today: string; canManage: boolean; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(lot.qty_on_hand));
  const [why, setWhy] = useState("");
  const action = useAction();
  const expired = !!lot.expiry_date && lot.expiry_date < today;
  const save = async () => {
    const value = Number(qty.trim().replace(",", "."));
    if (qty.trim() === "" || !Number.isFinite(value) || value < 0) return action.setError("Quantity must be a number, not negative.");
    if (!why.trim()) return action.setError("A reason for the correction is required.");
    if (await action.run(async () => { await adjustStock(lot.id, value, why); await onSaved(); })) setOpen(false);
  };
  return (
    <li className="border-t border-[#EDF2F2] py-2 first:border-0">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <span className="min-w-0">
          <span className="font-medium text-[#0F2F36]">{lot.lot_no}</span>
          <span className="tabular-nums text-[#0F2F36]"> · {formatQty(lot.qty_on_hand, lot.unit)}</span>
          <span className={`block text-[13px] ${expired ? "font-medium text-[#B3362C]" : "text-[#4F6B73]"}`}>
            {lot.expiry_date ? `${expired ? "Expires" : "To"} ${formatLongDate(lot.expiry_date)}` : `Received ${formatLongDate(lot.received_at)}`}{lot.supplier ? ` · ${lot.supplier}` : ""}
          </span>
        </span>
        {canManage && !open && <button type="button" onClick={() => setOpen(true)} className={`${textButton} shrink-0`}>Correct</button>}
      </div>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Actual quantity"><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="Reason"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Damaged, spilled" /></Field>
          </div>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2"><SecondaryButton disabled={action.busy} onClick={() => void save()}>Save correction</SecondaryButton><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton></div>
        </div>
      )}
    </li>
  );
}

export function ItemDetail({ item, lots, canManage, canUse, onEdit, reload }: { item: Item; lots: StockLotRow[]; canManage: boolean; canUse: boolean; onEdit: () => void; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const moves = useLoad(() => fetchItemMoves(item.id), [item.id]);
  const [form, setForm] = useState<"receive" | "use" | null>(null);
  const shown = lots.filter((l) => l.qty_on_hand > 0);
  const onSaved = async () => {
    await Promise.all([reload(), moves.reload()]);
  };
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={sectionTitle}>{item.name}</h2>
          <p className="text-[13px] text-[#4F6B73]">{item.sku} · {categoryLabel(item.category)}{item.reorder_point !== null ? ` · minimum ${formatQty(item.reorder_point, item.unit)}` : ""}</p>
        </div>
        {canManage && <SecondaryButton onClick={onEdit}>Edit</SecondaryButton>}
      </div>
      <p className="text-[#0F2F36]"><span className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">{item.usable_qty.toLocaleString("en-GB", { maximumFractionDigits: 2 })}</span> <span className="text-[13px] text-[#4F6B73]">{unitLabel(item.unit)} ready to use{item.expired_qty > 0 ? `, ${formatQty(item.expired_qty, item.unit)} expired` : ""}</span></p>

      {form === null && (canManage || canUse) && (
        <div className="flex flex-wrap gap-2">
          {canUse && item.usable_qty > 0 && <SecondaryButton onClick={() => setForm("use")}>Record use</SecondaryButton>}
          {canManage && item.category !== "benih" && <SecondaryButton onClick={() => setForm("receive")}>Receive stock</SecondaryButton>}
          {item.category === "benih" && canManage && <Link to="/erp/seed-lots" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">To seed lots</Link>}
        </div>
      )}
      {form === "receive" && <ReceiveForm item={item} onSaved={onSaved} onClose={() => setForm(null)} />}
      {form === "use" && <UseForm item={item} onSaved={onSaved} onClose={() => setForm(null)} />}

      <div className="border-t border-[#EDF2F2] pt-3">
        <h3 className="mb-1 text-[14px] font-medium text-[#0F2F36]">Lot</h3>
        {shown.length === 0 ? <p className="text-[13px] text-[#4F6B73]">No stock yet.</p> : <ul>{shown.map((l) => <LotRow key={`${l.id}:${l.qty_on_hand}`} lot={l} today={today} canManage={canManage} onSaved={onSaved} />)}</ul>}
      </div>

      <div className="border-t border-[#EDF2F2] pt-3">
        <h3 className="mb-1 text-[14px] font-medium text-[#0F2F36]">History</h3>
        <DataState state={moves}>
          {(rows) => rows.length === 0 ? <p className="text-[13px] text-[#4F6B73]">No movements yet.</p> : (
            <ul className="max-h-[260px] space-y-1.5 overflow-y-auto">
              {rows.map((m) => (
                <li key={m.id} className="text-[13px]">
                  <span className="font-medium text-[#0F2F36]">{MOVE_LABELS[m.type]}</span>
                  <span className="tabular-nums text-[#0F2F36]"> {m.qty > 0 ? "+" : "-"}{Math.abs(m.qty).toLocaleString("en-GB", { maximumFractionDigits: 2 })} {unitLabel(item.unit)}</span>
                  <span className="block text-[#4F6B73]">{m.lot_no}{m.batch_code ? ` · ${m.batch_code}` : ""}{m.reason ? ` · ${m.reason}` : ""} · {formatDateTime(m.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </div>
    </Card>
  );
}

function ShortageRow({ shortage, canManage, reload }: { shortage: Shortage; canManage: boolean; reload: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <li className="border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-[14px]">
        <span>
          <span className="font-medium text-[#0F2F36]">{shortage.item_name} short by {formatQty(shortage.qty_short, shortage.unit)}</span>
          <span className="block text-[13px] text-[#4F6B73]">For {shortage.batch_code} · {formatDateTime(shortage.at)}</span>
        </span>
        {canManage && !asking && <button type="button" onClick={() => setAsking(true)} className={textButton}>Handle</button>}
      </div>
      {asking && (
        <div className="mt-2 space-y-2">
          <Field label="How was it handled?"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2">
            <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await resolveShortage(shortage.id, why); await reload(); })}>Save</SecondaryButton>
            <SecondaryButton onClick={() => setAsking(false)}>Cancel</SecondaryButton>
          </div>
        </div>
      )}
    </li>
  );
}

const CATEGORY_ICON: Record<string, LucideIcon> = { benih: Sprout, nutrisi: FlaskConical, media: Layers, kemasan: Package, suku_cadang: Wrench, lainnya: Boxes };

/** The product's photo, or its category's icon on the same square until there is one. */
export function ItemPhoto({ item, url, className = "" }: { item: Pick<Item, "category" | "name">; url?: string | null; className?: string }) {
  const Icon = CATEGORY_ICON[item.category] ?? Boxes;
  return (
    <span className={`grid place-items-center overflow-hidden border border-[#0B6477]/10 bg-[#F3F7F6] ${className}`}>
      {url ? <img src={url} alt={item.name} loading="lazy" className="h-full w-full object-contain p-1.5" /> : <Icon className="h-[38%] w-[38%] text-[#0B6477]/35" strokeWidth={1.5} />}
    </span>
  );
}

function StockChip({ item }: { item: Item }) {
  if (!item.active) return <Chip label="Inactive" />;
  if (item.below_reorder) return <Chip label="Running low" className="bg-[#FFF6E5] text-[#8A5A07]" />;
  if (item.expired_qty > 0) return <Chip label="Has expired stock" className="bg-[#FDECEA] text-[#B3362C]" />;
  return <Chip label="In stock" className="bg-[#E3F7F0] text-[#0E7A5C]" />;
}

export default function StockPage() {
  const state = useLoad(async () => {
    const [items, shortages] = await Promise.all([fetchItems(), fetchOpenShortages()]);
    const photos = await itemPhotoLinks(items.flatMap((i) => (i.photo_path ? [i.photo_path] : [])));
    return { items, shortages, photos };
  });
  const { canManageProduction, canOperate } = useErpAccess();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const low = state.data?.items.filter((i) => i.active && i.below_reorder).length ?? 0;

  return (
    <ErpPage
      eyebrow="Inventory"
      title="Stock"
      sub={state.data ? (low ? `${low} ${low === 1 ? "item has" : "items have"} reached the minimum level.` : "Every item is above its minimum level.") : undefined}
      actions={canManageProduction && !adding && state.data ? <PrimaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New item</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ items, shortages, photos }) => {
          const photo = (i: Item) => (i.photo_path ? photos.get(i.photo_path) : null);
          const active = items.filter((i) => i.active);
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${adding ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canOperate && <ReadOnlyNote who="Operator or Production manager" />}
                {shortages.length > 0 && (
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>Short when used</h2>
                    <ul className="border-t border-[#EDF2F2]">{shortages.map((s) => <ShortageRow key={s.id} shortage={s} canManage={canManageProduction} reload={state.reload} />)}</ul>
                  </Card>
                )}
                <DataTable
                  rows={items}
                  rowKey={(i) => i.id}
                  noun="items"
                  rowLink={(i) => `/erp/stock/${i.id}`}
                  searchText={(i) => `${i.sku} ${i.name} ${i.notes}`}
                  searchLabel="Search by SKU, name or notes"
                  figures={[
                    { label: "Items", value: active.length, tone: "#0B6477" },
                    { label: "Running low", value: active.filter((i) => i.below_reorder).length, tone: "#E0A100", pill: "low" },
                    { label: "Has expired stock", value: active.filter((i) => i.expired_qty > 0).length, tone: "#B3362C", pill: "expired" },
                    { label: "Out of stock", value: active.filter((i) => i.usable_qty <= 0).length, tone: "#8FA3A8", pill: "out" },
                  ]}
                  pills={[
                    ...ITEM_CATEGORIES.map((c) => ({ key: c.key as string, label: c.label, match: (i: Item) => i.category === c.key })),
                    { key: "low", label: "Running low", dot: "#E0A100", match: (i: Item) => i.active && i.below_reorder },
                    { key: "expired", label: "Has expired stock", dot: "#B3362C", match: (i: Item) => i.active && i.expired_qty > 0 },
                    { key: "out", label: "Out of stock", dot: "#8FA3A8", match: (i: Item) => i.active && i.usable_qty <= 0 },
                  ]}
                  empty="No items yet."
                  card={(i) => (
                    <>
                      <span className="relative block aspect-[4/3] w-full">
                        <ItemPhoto item={i} url={photo(i)} className="absolute inset-0 border-0" />
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-1 text-[12px] font-medium text-[#0B6477]">{i.sku}</span>
                        <span className="absolute right-2.5 top-2.5"><StockChip item={i} /></span>
                      </span>
                      <span className="flex flex-1 flex-col gap-1 p-4">
                        <span className="text-[15px] font-medium leading-snug text-[#0F2F36] transition-colors group-hover:text-[#0B6477]">{i.name}</span>
                        <span className="text-[13px] text-[#4F6B73]">{categoryLabel(i.category)}{i.next_expiry ? ` · expires ${formatLongDate(i.next_expiry)}` : ""}</span>
                        <span className="mt-auto pt-3 text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-[#0F2F36]">{formatQty(i.usable_qty, i.unit)}</span>
                      </span>
                    </>
                  )}
                  columns={[
                    { key: "sku", label: "SKU", track: "96px", phone: "hidden", sort: (a, b) => a.sku.localeCompare(b.sku), cell: (i) => <span className="text-[12px] font-medium tracking-[0.03em] text-[#4F6B73]">{i.sku}</span> },
                    { key: "name", label: "Item", track: "minmax(0,1.6fr)", phone: "title", sort: (a, b) => a.name.localeCompare(b.name), cell: (i) => (
                      <span className="flex min-w-0 items-center gap-3">
                        <ItemPhoto item={i} url={photo(i)} className="h-11 w-11 shrink-0 rounded-xl" />
                        <CellTitle title={i.name} sub={categoryLabel(i.category)} muted={!i.active} />
                      </span>
                    ) },
                    { key: "expiry", label: "Next expiry", phone: "hidden", sort: (a, b) => (a.next_expiry ?? "9999").localeCompare(b.next_expiry ?? "9999"), cell: (i) => <span className="text-[13px]">{i.next_expiry ? formatLongDate(i.next_expiry) : "-"}</span> },
                    { key: "status", label: "Status", track: "170px", cell: (i) => <StockChip item={i} /> },
                    { key: "qty", label: "Ready to use", track: "130px", align: "right", sort: (a, b) => a.usable_qty - b.usable_qty, cell: (i) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatQty(i.usable_qty, i.unit)}</span> },
                  ] satisfies Column<Item>[]}
                />
              </div>
              {adding && <ItemEditor item={null} onDone={(saved) => { setAdding(false); if (saved) void navigate({ to: "/erp/stock/$id", params: { id: saved } }); }} />}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
