import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Boxes, FlaskConical, Layers, Package, Plus, Sprout, Wrench, type LucideIcon } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { useLang, useT } from "../../lib/i18n";
import { ITEM_CATEGORIES, ITEM_UNITS, adjustStock, categoryLabel, fetchItemMoves, fetchItems, fetchOpenShortages, formatQty, formatShort, itemPhotoLinks, moveLabel, unitLabel, parseItemForm, parseQtyInput, parseReceive, receiveStock, resolveShortage, saveItem, useStock, type Item, type ItemCategory, type ItemForm, type Shortage, type StockLotRow } from "../../lib/pf/inventory";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card } from "./ui";
import DataTable, { CellTitle, Chip, type Column } from "./DataTable";

// What is on the shelf: everything from nutrient to spare parts, what runs low, and
// each item's lots. Taking stock out always starts with the lot that expires first.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const textButton = "min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";

export function ItemEditor({ item, onDone }: { item: Item | null; onDone: (saved: string | null) => void }) {
  const t = useT();
  const lang = useLang();
  const [form, setForm] = useState<ItemForm>(item ? { name: item.name, category: item.category, unit: item.unit, reorder: item.reorder_point === null ? "" : String(item.reorder_point), expires: item.track_expiry, notes: item.notes, active: item.active } : { name: "", category: "nutrisi", unit: "liter", reorder: "", expires: true, notes: "", active: true });
  const action = useAction();
  const set = (patch: Partial<ItemForm>) => setForm((f) => ({ ...f, ...patch }));
  const isSeed = item?.category === "benih";

  const submit = async () => {
    const parsed = parseItemForm(form, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    let saved = "";
    if (await action.run(async () => { saved = await saveItem(item?.id ?? null, form, parsed.reorder); })) onDone(saved);
  };

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{item ? t({ en: `Edit ${item.sku}`, id: `Ubah ${item.sku}` }) : t({ en: "New item", id: "Barang baru" })}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={t({ en: "Name", id: "Nama" })}><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t({ en: "Category", id: "Kategori" })}>
            <select className={inputClass} value={form.category} disabled={isSeed} onChange={(e) => set({ category: e.target.value as ItemCategory })}>
              {ITEM_CATEGORIES.filter((c) => isSeed || c.key !== "benih").map((c) => <option key={c.key} value={c.key}>{lang === "id" ? c.labelId : c.label}</option>)}
            </select>
          </Field>
          <Field label={t({ en: "Unit", id: "Satuan" })}>
            <select className={inputClass} value={form.unit} disabled={!!item && item.lots > 0} onChange={(e) => set({ unit: e.target.value })}>
              {ITEM_UNITS.map((u) => <option key={u} value={u}>{unitLabel(u, lang)}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t({ en: "Minimum level", id: "Batas minimum" })} hint={t({ en: "Shows on the dashboard when ready stock reaches this number.", id: "Muncul di dashboard saat stok siap pakai mencapai angka ini." })}><input className={inputClass} inputMode="decimal" value={form.reorder} onChange={(e) => set({ reorder: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.expires} onChange={(e) => set({ expires: e.target.checked })} /> {t({ en: "Has an expiry date", id: "Punya tanggal kedaluwarsa" })}</label>
        <Field label={t({ en: "Notes", id: "Catatan" })}><input className={inputClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        {item && <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> {t({ en: "Active", id: "Aktif" })}</label>}
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? t({ en: "Saving…", id: "Menyimpan…" }) : t({ en: "Save", id: "Simpan" })}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(null)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function ReceiveForm({ item, onSaved, onClose }: { item: Item; onSaved: () => Promise<void>; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const today = jakartaToday();
  const [lotNo, setLotNo] = useState("");
  const [qty, setQty] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [expiryOn, setExpiryOn] = useState("");
  const [supplier, setSupplier] = useState("");
  const action = useAction();
  const submit = async () => {
    const parsed = parseReceive({ lotNo, qty, receivedOn, expiryOn }, today, item.track_expiry, undefined, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (await action.run(async () => { await receiveStock(item.id, lotNo, parsed.qty, receivedOn, expiryOn, supplier); await onSaved(); })) onClose();
  };
  return (
    <form className="space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <p className="text-[13px] text-[#4F6B73]">{t({ en: "For opening stock, donations or samples. Bought goods are received through the Purchasing page.", id: "Untuk stok awal, sumbangan, atau sampel. Barang yang dibeli diterima lewat halaman Pembelian." })}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t({ en: "Lot number", id: "Nomor lot" })}><input className={inputClass} value={lotNo} onChange={(e) => setLotNo(e.target.value)} /></Field>
        <Field label={t({ en: `Quantity (${item.unit})`, id: `Jumlah (${item.unit})` })}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label={t({ en: "Received date", id: "Tanggal terima" })}><input type="date" className={inputClass} max={today} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} /></Field>
        <Field label={t({ en: "Expires", id: "Kedaluwarsa" })}><input type="date" className={inputClass} value={expiryOn} onChange={(e) => setExpiryOn(e.target.value)} /></Field>
      </div>
      <Field label={t({ en: "Source", id: "Sumber" })}><input className={inputClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>{t({ en: "Save", id: "Simpan" })}</PrimaryButton><SecondaryButton onClick={onClose}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton></div>
    </form>
  );
}

function UseForm({ item, onSaved, onClose }: { item: Item; onSaved: () => Promise<void>; onClose: () => void }) {
  const store = useErpStore();
  const t = useT();
  const lang = useLang();
  const batches = [...store.batches.values()].filter((b) => b.id);
  const [qty, setQty] = useState("");
  const [batchId, setBatchId] = useState("");
  const [why, setWhy] = useState("");
  const action = useAction();
  const submit = async () => {
    const parsed = parseQtyInput(qty, lang);
    if (parsed.error !== null) return action.setError(parsed.error);
    if (!batchId && !why.trim()) return action.setError(t({ en: "Write what this item is used for, or choose a batch.", id: "Tulis untuk apa barang ini dipakai, atau pilih batch." }));
    if (await action.run(async () => { await useStock(item.id, parsed.qty, batchId || null, why); await onSaved(); })) onClose();
  };
  return (
    <form className="space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t({ en: `Quantity (${item.unit})`, id: `Jumlah (${item.unit})` })}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label={t({ en: "For batch", id: "Untuk batch" })}>
          <select className={inputClass} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">{t({ en: "Not for a batch", id: "Bukan untuk batch" })}</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.crop}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t({ en: "Description", id: "Keterangan" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t({ en: "Mix tank A", id: "Campur tangki A" })} /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>{t({ en: "Record use", id: "Catat pemakaian" })}</PrimaryButton><SecondaryButton onClick={onClose}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton></div>
    </form>
  );
}

function LotRow({ lot, today, canManage, onSaved }: { lot: StockLotRow; today: string; canManage: boolean; onSaved: () => Promise<void> }) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(lot.qty_on_hand));
  const [why, setWhy] = useState("");
  const action = useAction();
  const expired = !!lot.expiry_date && lot.expiry_date < today;
  const save = async () => {
    const value = Number(qty.trim().replace(",", "."));
    if (qty.trim() === "" || !Number.isFinite(value) || value < 0) return action.setError(t({ en: "Quantity must be a number, not negative.", id: "Jumlah harus berupa angka, tidak boleh negatif." }));
    if (!why.trim()) return action.setError(t({ en: "A reason for the correction is required.", id: "Alasan koreksi wajib diisi." }));
    if (await action.run(async () => { await adjustStock(lot.id, value, why); await onSaved(); })) setOpen(false);
  };
  return (
    <li className="border-t border-[#EDF2F2] py-2 first:border-0">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <span className="min-w-0">
          <span className="font-medium text-[#0F2F36]">{lot.lot_no}</span>
          <span className="tabular-nums text-[#0F2F36]"> · {formatQty(lot.qty_on_hand, lot.unit, lang)}</span>
          <span className={`block text-[13px] ${expired ? "font-medium text-[#B3362C]" : "text-[#4F6B73]"}`}>
            {lot.expiry_date ? `${expired ? t({ en: "Expires", id: "Kedaluwarsa" }) : t({ en: "To", id: "Sampai" })} ${formatLongDate(lot.expiry_date, lang)}` : `${t({ en: "Received", id: "Diterima" })} ${formatLongDate(lot.received_at, lang)}`}{lot.supplier ? ` · ${lot.supplier}` : ""}
          </span>
        </span>
        {canManage && !open && <button type="button" onClick={() => setOpen(true)} className={`${textButton} shrink-0`}>{t({ en: "Correct", id: "Koreksi" })}</button>}
      </div>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label={t({ en: "Actual quantity", id: "Jumlah sebenarnya" })}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label={t({ en: "Reason", id: "Alasan" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t({ en: "Damaged, spilled", id: "Rusak, tumpah" })} /></Field>
          </div>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2"><SecondaryButton disabled={action.busy} onClick={() => void save()}>{t({ en: "Save correction", id: "Simpan koreksi" })}</SecondaryButton><SecondaryButton onClick={() => setOpen(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton></div>
        </div>
      )}
    </li>
  );
}

export function ItemDetail({ item, lots, canManage, canUse, onEdit, reload }: { item: Item; lots: StockLotRow[]; canManage: boolean; canUse: boolean; onEdit: () => void; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const moves = useLoad(() => fetchItemMoves(item.id), [item.id]);
  const t = useT();
  const lang = useLang();
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
          <p className="text-[13px] text-[#4F6B73]">{item.sku} · {categoryLabel(item.category, lang)}{item.reorder_point !== null ? ` · ${t({ en: "minimum", id: "minimum" })} ${formatQty(item.reorder_point, item.unit, lang)}` : ""}</p>
        </div>
        {canManage && <SecondaryButton onClick={onEdit}>{t({ en: "Edit", id: "Ubah" })}</SecondaryButton>}
      </div>
      <p className="text-[#0F2F36]"><span className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">{item.usable_qty.toLocaleString(lang === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 2 })}</span> <span className="text-[13px] text-[#4F6B73]">{unitLabel(item.unit, lang)} {t({ en: "ready to use", id: "siap pakai" })}{item.expired_qty > 0 ? `, ${formatQty(item.expired_qty, item.unit, lang)} ${t({ en: "expired", id: "kedaluwarsa" })}` : ""}</span></p>

      {form === null && (canManage || canUse) && (
        <div className="flex flex-wrap gap-2">
          {canUse && item.usable_qty > 0 && <SecondaryButton onClick={() => setForm("use")}>{t({ en: "Record use", id: "Catat pemakaian" })}</SecondaryButton>}
          {canManage && item.category !== "benih" && <SecondaryButton onClick={() => setForm("receive")}>{t({ en: "Receive stock", id: "Terima stok" })}</SecondaryButton>}
          {item.category === "benih" && canManage && <Link to="/erp/seed-lots" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">{t({ en: "To seed lots", id: "Ke lot benih" })}</Link>}
        </div>
      )}
      {form === "receive" && <ReceiveForm item={item} onSaved={onSaved} onClose={() => setForm(null)} />}
      {form === "use" && <UseForm item={item} onSaved={onSaved} onClose={() => setForm(null)} />}

      <div className="border-t border-[#EDF2F2] pt-3">
        <h3 className="mb-1 text-[14px] font-medium text-[#0F2F36]">Lot</h3>
        {shown.length === 0 ? <p className="text-[13px] text-[#4F6B73]">{t({ en: "No stock yet.", id: "Belum ada stok." })}</p> : <ul>{shown.map((l) => <LotRow key={`${l.id}:${l.qty_on_hand}`} lot={l} today={today} canManage={canManage} onSaved={onSaved} />)}</ul>}
      </div>

      <div className="border-t border-[#EDF2F2] pt-3">
        <h3 className="mb-1 text-[14px] font-medium text-[#0F2F36]">{t({ en: "History", id: "Riwayat" })}</h3>
        <DataState state={moves}>
          {(rows) => rows.length === 0 ? <p className="text-[13px] text-[#4F6B73]">{t({ en: "No movements yet.", id: "Belum ada pergerakan." })}</p> : (
            <ul className="max-h-[260px] space-y-1.5 overflow-y-auto">
              {rows.map((m) => (
                <li key={m.id} className="text-[13px]">
                  <span className="font-medium text-[#0F2F36]">{moveLabel(m.type, lang)}</span>
                  <span className="tabular-nums text-[#0F2F36]"> {m.qty > 0 ? "+" : "-"}{Math.abs(m.qty).toLocaleString(lang === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 2 })} {unitLabel(item.unit, lang)}</span>
                  <span className="block text-[#4F6B73]">{m.lot_no}{m.batch_code ? ` · ${m.batch_code}` : ""}{m.reason ? ` · ${m.reason}` : ""} · {formatDateTime(m.at, lang)}</span>
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
  const t = useT();
  const lang = useLang();
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <li className="border-t border-[#EDF2F2] px-4 py-2.5 first:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-[14px]">
        <span>
          <span className="font-medium text-[#0F2F36]">{shortage.item_name} {t({ en: "short by", id: "kurang" })} {formatShort(shortage.qty_short, shortage.unit, lang)}</span>
          <span className="block text-[13px] text-[#4F6B73]">{t({ en: "For", id: "Untuk" })} {shortage.batch_code} · {formatDateTime(shortage.at, lang)}</span>
        </span>
        {canManage && !asking && <button type="button" onClick={() => setAsking(true)} className={textButton}>{t({ en: "Handle", id: "Tangani" })}</button>}
      </div>
      {asking && (
        <div className="mt-2 space-y-2">
          <Field label={t({ en: "How was it handled?", id: "Bagaimana penanganannya?" })}><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2">
            <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await resolveShortage(shortage.id, why); await reload(); })}>{t({ en: "Save", id: "Simpan" })}</SecondaryButton>
            <SecondaryButton onClick={() => setAsking(false)}>{t({ en: "Cancel", id: "Batal" })}</SecondaryButton>
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
  const t = useT();
  if (!item.active) return <Chip label={t({ en: "Inactive", id: "Nonaktif" })} />;
  if (item.below_reorder) return <Chip label={t({ en: "Running low", id: "Hampir habis" })} className="bg-[#FFF6E5] text-[#8A5A07]" />;
  if (item.expired_qty > 0) return <Chip label={t({ en: "Has expired stock", id: "Ada stok kedaluwarsa" })} className="bg-[#FDECEA] text-[#B3362C]" />;
  return <Chip label={t({ en: "In stock", id: "Tersedia" })} className="bg-[#E3F7F0] text-[#0E7A5C]" />;
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
  const t = useT();
  const lang = useLang();

  const low = state.data?.items.filter((i) => i.active && i.below_reorder).length ?? 0;

  return (
    <ErpPage
      eyebrow={t({ en: "Inventory", id: "Inventaris" })}
      title={t({ en: "Stock", id: "Stok" })}
      sub={state.data ? (low ? t({ en: `${low} ${low === 1 ? "item has" : "items have"} reached the minimum level.`, id: `${low} barang sudah mencapai batas minimum.` }) : t({ en: "Every item is above its minimum level.", id: "Semua barang di atas batas minimumnya." })) : undefined}
      actions={canManageProduction && !adding && state.data ? <PrimaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {t({ en: "New item", id: "Barang baru" })}</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ items, shortages, photos }) => {
          const photo = (i: Item) => (i.photo_path ? photos.get(i.photo_path) : null);
          const active = items.filter((i) => i.active);
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${adding ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canOperate && <ReadOnlyNote who={t({ en: "Operator or Production manager", id: "Operator atau Manajer produksi" })} />}
                {shortages.length > 0 && (
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>{t({ en: "Short when used", id: "Kurang saat dipakai" })}</h2>
                    <ul className="border-t border-[#EDF2F2]">{shortages.map((s) => <ShortageRow key={s.id} shortage={s} canManage={canManageProduction} reload={state.reload} />)}</ul>
                  </Card>
                )}
                <DataTable
                  rows={items}
                  rowKey={(i) => i.id}
                  noun={t({ en: "items", id: "barang" })}
                  rowLink={(i) => `/erp/stock/${i.id}`}
                  searchText={(i) => `${i.sku} ${i.name} ${i.notes}`}
                  searchLabel={t({ en: "Search by SKU, name or notes", id: "Cari SKU, nama, atau catatan" })}
                  figures={[
                    { label: t({ en: "Items", id: "Barang" }), value: active.length, tone: "#0B6477" },
                    { label: t({ en: "Running low", id: "Hampir habis" }), value: active.filter((i) => i.below_reorder).length, tone: "#E0A100", pill: "low" },
                    { label: t({ en: "Has expired stock", id: "Ada stok kedaluwarsa" }), value: active.filter((i) => i.expired_qty > 0).length, tone: "#B3362C", pill: "expired" },
                    { label: t({ en: "Out of stock", id: "Habis" }), value: active.filter((i) => i.usable_qty <= 0).length, tone: "#8FA3A8", pill: "out" },
                  ]}
                  pills={[
                    ...ITEM_CATEGORIES.map((c) => ({ key: c.key as string, label: lang === "id" ? c.labelId : c.label, match: (i: Item) => i.category === c.key })),
                    { key: "low", label: t({ en: "Running low", id: "Hampir habis" }), dot: "#E0A100", match: (i: Item) => i.active && i.below_reorder },
                    { key: "expired", label: t({ en: "Has expired stock", id: "Ada stok kedaluwarsa" }), dot: "#B3362C", match: (i: Item) => i.active && i.expired_qty > 0 },
                    { key: "out", label: t({ en: "Out of stock", id: "Habis" }), dot: "#8FA3A8", match: (i: Item) => i.active && i.usable_qty <= 0 },
                  ]}
                  empty={t({ en: "No items yet.", id: "Belum ada barang." })}
                  card={(i) => (
                    <>
                      <span className="relative block aspect-[4/3] w-full">
                        <ItemPhoto item={i} url={photo(i)} className="absolute inset-0 border-0" />
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-1 text-[12px] font-medium text-[#0B6477]">{i.sku}</span>
                        <span className="absolute right-2.5 top-2.5"><StockChip item={i} /></span>
                      </span>
                      <span className="flex flex-1 flex-col gap-1 p-4">
                        <span className="text-[15px] font-medium leading-snug text-[#0F2F36] transition-colors group-hover:text-[#0B6477]">{i.name}</span>
                        <span className="text-[13px] text-[#4F6B73]">{categoryLabel(i.category, lang)}{i.next_expiry ? ` · ${t({ en: "expires", id: "kedaluwarsa" })} ${formatLongDate(i.next_expiry, lang)}` : ""}</span>
                        <span className="mt-auto pt-3 text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-[#0F2F36]">{formatQty(i.usable_qty, i.unit, lang)}</span>
                      </span>
                    </>
                  )}
                  columns={[
                    { key: "sku", label: "SKU", track: "96px", phone: "hidden", sort: (a, b) => a.sku.localeCompare(b.sku), cell: (i) => <span className="text-[12px] font-medium tracking-[0.03em] text-[#4F6B73]">{i.sku}</span> },
                    { key: "name", label: t({ en: "Item", id: "Barang" }), track: "minmax(0,1.6fr)", phone: "title", sort: (a, b) => a.name.localeCompare(b.name), cell: (i) => (
                      <span className="flex min-w-0 items-center gap-3">
                        <ItemPhoto item={i} url={photo(i)} className="h-11 w-11 shrink-0 rounded-xl" />
                        <CellTitle title={i.name} sub={categoryLabel(i.category, lang)} muted={!i.active} />
                      </span>
                    ) },
                    { key: "expiry", label: t({ en: "Next expiry", id: "Kedaluwarsa terdekat" }), phone: "hidden", sort: (a, b) => (a.next_expiry ?? "9999").localeCompare(b.next_expiry ?? "9999"), cell: (i) => <span className="text-[13px]">{i.next_expiry ? formatLongDate(i.next_expiry, lang) : "-"}</span> },
                    { key: "status", label: "Status", track: "170px", cell: (i) => <StockChip item={i} /> },
                    { key: "qty", label: t({ en: "Ready to use", id: "Siap pakai" }), track: "130px", align: "right", sort: (a, b) => a.usable_qty - b.usable_qty, cell: (i) => <span className="font-medium tabular-nums text-[#0F2F36]">{formatQty(i.usable_qty, i.unit, lang)}</span> },
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
