import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { ITEM_CATEGORIES, ITEM_UNITS, MOVE_LABELS, adjustStock, categoryLabel, fetchItemMoves, fetchItems, fetchOpenShortages, fetchStockLots, formatQty, parseItemForm, parseQtyInput, parseReceive, receiveStock, resolveShortage, saveItem, useStock, type Item, type ItemCategory, type ItemForm, type Shortage, type StockLotRow } from "../../lib/pf/inventory";
import { useErpStore } from "./ErpContext";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, formatDateTime, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { Card, Segmented } from "./ui";

// What is on the shelf: everything from nutrient to spare parts, what runs low, and
// each item's lots. Taking stock out always starts with the lot that expires first.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const textButton = "min-h-[44px] text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]";

function ItemEditor({ item, onDone }: { item: Item | null; onDone: (saved: string | null) => void }) {
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
      <h2 className={`${sectionTitle} mb-3`}>{item ? `Ubah ${item.sku}` : "Barang baru"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Nama"><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <select className={inputClass} value={form.category} disabled={isSeed} onChange={(e) => set({ category: e.target.value as ItemCategory })}>
              {ITEM_CATEGORIES.filter((c) => isSeed || c.key !== "benih").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Satuan">
            <select className={inputClass} value={form.unit} disabled={!!item && item.lots > 0} onChange={(e) => set({ unit: e.target.value })}>
              {ITEM_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Batas minimum" hint="Muncul di dashboard saat stok siap pakai sampai di angka ini."><input className={inputClass} inputMode="decimal" value={form.reorder} onChange={(e) => set({ reorder: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.expires} onChange={(e) => set({ expires: e.target.checked })} /> Punya tanggal kedaluwarsa</label>
        <Field label="Catatan"><input className={inputClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        {item && <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-[#0F2F36] sm:min-h-0"><input type="checkbox" className="h-4 w-4 accent-[#14919B]" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Aktif</label>}
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Simpan"}</PrimaryButton>
          <SecondaryButton onClick={() => onDone(null)}>Batal</SecondaryButton>
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
      <p className="text-[13px] text-[#4F6B73]">Untuk stok awal, hibah, atau contoh. Barang yang dibeli diterima lewat halaman Pembelian.</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nomor lot"><input className={inputClass} value={lotNo} onChange={(e) => setLotNo(e.target.value)} /></Field>
        <Field label={`Jumlah (${item.unit})`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Tanggal terima"><input type="date" className={inputClass} max={today} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} /></Field>
        <Field label="Kedaluwarsa"><input type="date" className={inputClass} value={expiryOn} onChange={(e) => setExpiryOn(e.target.value)} /></Field>
      </div>
      <Field label="Asal"><input className={inputClass} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Simpan</PrimaryButton><SecondaryButton onClick={onClose}>Batal</SecondaryButton></div>
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
    if (!batchId && !why.trim()) return action.setError("Tulis untuk apa barang ini dipakai, atau pilih batch.");
    if (await action.run(async () => { await useStock(item.id, parsed.qty, batchId || null, why); await onSaved(); })) onClose();
  };
  return (
    <form className="space-y-2 rounded-lg bg-[#F3F7F7] p-2.5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Jumlah (${item.unit})`}><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Untuk batch">
          <select className={inputClass} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Bukan untuk batch</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.crop}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Keterangan"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Campur tandon A" /></Field>
      <ActionNote action={{ error: action.error, saved: false }} />
      <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Catat pemakaian</PrimaryButton><SecondaryButton onClick={onClose}>Batal</SecondaryButton></div>
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
    if (qty.trim() === "" || !Number.isFinite(value) || value < 0) return action.setError("Jumlah harus angka, tidak boleh negatif.");
    if (!why.trim()) return action.setError("Alasan koreksi wajib diisi.");
    if (await action.run(async () => { await adjustStock(lot.id, value, why); await onSaved(); })) setOpen(false);
  };
  return (
    <li className="border-t border-[#EDF2F2] py-2 first:border-0">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <span className="min-w-0">
          <span className="font-medium text-[#0F2F36]">{lot.lot_no}</span>
          <span className="tabular-nums text-[#0F2F36]"> · {formatQty(lot.qty_on_hand, lot.unit)}</span>
          <span className={`block text-[13px] ${expired ? "font-medium text-[#B3362C]" : "text-[#4F6B73]"}`}>
            {lot.expiry_date ? `${expired ? "Kedaluwarsa" : "Sampai"} ${formatLongDate(lot.expiry_date)}` : `Diterima ${formatLongDate(lot.received_at)}`}{lot.supplier ? ` · ${lot.supplier}` : ""}
          </span>
        </span>
        {canManage && !open && <button type="button" onClick={() => setOpen(true)} className={`${textButton} shrink-0`}>Koreksi</button>}
      </div>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-[#FFF6E5] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Jumlah sebenarnya"><input className={inputClass} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="Alasan"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Rusak, tumpah" /></Field>
          </div>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2"><SecondaryButton disabled={action.busy} onClick={() => void save()}>Simpan koreksi</SecondaryButton><SecondaryButton onClick={() => setOpen(false)}>Batal</SecondaryButton></div>
        </div>
      )}
    </li>
  );
}

function ItemDetail({ item, lots, canManage, canUse, onEdit, reload }: { item: Item; lots: StockLotRow[]; canManage: boolean; canUse: boolean; onEdit: () => void; reload: () => Promise<void> }) {
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
        {canManage && <SecondaryButton onClick={onEdit}>Ubah</SecondaryButton>}
      </div>
      <p className="text-[#0F2F36]"><span className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">{item.usable_qty.toLocaleString("id-ID", { maximumFractionDigits: 2 })}</span> <span className="text-[13px] text-[#4F6B73]">{item.unit} siap pakai{item.expired_qty > 0 ? `, ${formatQty(item.expired_qty, item.unit)} kedaluwarsa` : ""}</span></p>

      {form === null && (canManage || canUse) && (
        <div className="flex flex-wrap gap-2">
          {canUse && item.usable_qty > 0 && <SecondaryButton onClick={() => setForm("use")}>Catat pemakaian</SecondaryButton>}
          {canManage && item.category !== "benih" && <SecondaryButton onClick={() => setForm("receive")}>Terima stok</SecondaryButton>}
          {item.category === "benih" && canManage && <Link to="/erp/benih" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]">Ke Lot benih</Link>}
        </div>
      )}
      {form === "receive" && <ReceiveForm item={item} onSaved={onSaved} onClose={() => setForm(null)} />}
      {form === "use" && <UseForm item={item} onSaved={onSaved} onClose={() => setForm(null)} />}

      <div className="border-t border-[#EDF2F2] pt-3">
        <h3 className="mb-1 text-[14px] font-medium text-[#0F2F36]">Lot</h3>
        {shown.length === 0 ? <p className="text-[13px] text-[#4F6B73]">Belum ada stok.</p> : <ul>{shown.map((l) => <LotRow key={`${l.id}:${l.qty_on_hand}`} lot={l} today={today} canManage={canManage} onSaved={onSaved} />)}</ul>}
      </div>

      <div className="border-t border-[#EDF2F2] pt-3">
        <h3 className="mb-1 text-[14px] font-medium text-[#0F2F36]">Riwayat</h3>
        <DataState state={moves}>
          {(rows) => rows.length === 0 ? <p className="text-[13px] text-[#4F6B73]">Belum ada pergerakan.</p> : (
            <ul className="max-h-[260px] space-y-1.5 overflow-y-auto">
              {rows.map((m) => (
                <li key={m.id} className="text-[13px]">
                  <span className="font-medium text-[#0F2F36]">{MOVE_LABELS[m.type]}</span>
                  <span className="tabular-nums text-[#0F2F36]"> {m.qty > 0 ? "+" : "-"}{Math.abs(m.qty).toLocaleString("id-ID", { maximumFractionDigits: 2 })} {item.unit}</span>
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
          <span className="font-medium text-[#0F2F36]">{shortage.item_name} kurang {formatQty(shortage.qty_short, shortage.unit)}</span>
          <span className="block text-[13px] text-[#4F6B73]">Untuk {shortage.batch_code} · {formatDateTime(shortage.at)}</span>
        </span>
        {canManage && !asking && <button type="button" onClick={() => setAsking(true)} className={textButton}>Tangani</button>}
      </div>
      {asking && (
        <div className="mt-2 space-y-2">
          <Field label="Bagaimana ditangani?"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
          <ActionNote action={{ error: action.error, saved: false }} />
          <div className="flex gap-2">
            <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await resolveShortage(shortage.id, why); await reload(); })}>Simpan</SecondaryButton>
            <SecondaryButton onClick={() => setAsking(false)}>Batal</SecondaryButton>
          </div>
        </div>
      )}
    </li>
  );
}

export default function StockPage() {
  const state = useLoad(async () => {
    const [items, lots, shortages] = await Promise.all([fetchItems(), fetchStockLots(), fetchOpenShortages()]);
    return { items, lots, shortages };
  });
  const { canManageProduction, canOperate } = useErpAccess();
  const [category, setCategory] = useState<ItemCategory | "semua">("semua");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<"new" | "current" | null>(null);

  const low = state.data?.items.filter((i) => i.active && i.below_reorder).length ?? 0;

  return (
    <ErpPage
      eyebrow="Inventory"
      title="Stok"
      sub={state.data ? (low ? `${low} barang sudah sampai batas minimum.` : "Semua barang di atas batas minimum.") : undefined}
      actions={canManageProduction && editing === null && state.data ? <PrimaryButton onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Barang baru</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ items, lots, shortages }) => {
          const list = items.filter((i) => category === "semua" || i.category === category);
          const current = items.find((i) => i.id === selected) ?? null;
          const side = editing !== null || current;
          return (
            <div className={`grid grid-cols-1 items-start gap-4 ${side ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
              <div className="min-w-0 space-y-3">
                {!canOperate && <ReadOnlyNote who="Operator atau Manajer produksi" />}
                {shortages.length > 0 && (
                  <Card>
                    <h2 className={`${sectionTitle} px-4 py-3`}>Stok kurang saat dipakai</h2>
                    <ul className="border-t border-[#EDF2F2]">{shortages.map((s) => <ShortageRow key={s.id} shortage={s} canManage={canManageProduction} reload={state.reload} />)}</ul>
                  </Card>
                )}
                <Segmented value={category} options={[{ key: "semua" as const, label: "Semua" }, ...ITEM_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))]} onChange={setCategory} />
                <Card>
                  {list.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Belum ada barang di kategori ini.</p>
                  ) : (
                    <ul>
                      {list.map((i) => (
                        <li key={i.id} className="border-t border-[#EDF2F2] first:border-0">
                          <button type="button" aria-pressed={selected === i.id} onClick={() => { setSelected(i.id); setEditing(null); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-[#F6F8F8] ${selected === i.id ? "bg-[#F1F8F8]" : ""}`}>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-[14px] font-medium ${i.active ? "text-[#0F2F36]" : "text-[#4F6B73]"}`}>{i.name}{!i.active ? " (nonaktif)" : ""}</span>
                              <span className="block truncate text-[13px] text-[#4F6B73]">{i.sku} · {categoryLabel(i.category)}{i.next_expiry ? ` · kedaluwarsa terdekat ${formatLongDate(i.next_expiry)}` : ""}</span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-[14px] font-medium tabular-nums text-[#0F2F36]">{formatQty(i.usable_qty, i.unit)}</span>
                              {i.below_reorder && i.active ? <span className="block text-[12.5px] font-medium text-[#8A5A07]">Menipis</span> : i.expired_qty > 0 ? <span className="block text-[12.5px] font-medium text-[#B3362C]">Ada yang kedaluwarsa</span> : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
              {editing !== null ? (
                <ItemEditor key={editing === "new" ? "new" : current?.id} item={editing === "new" ? null : current} onDone={(saved) => { setEditing(null); if (saved) { setSelected(saved); void state.reload(); } }} />
              ) : current ? (
                <ItemDetail key={current.id} item={current} lots={lots.filter((l) => l.item_id === current.id)} canManage={canManageProduction} canUse={canOperate} onEdit={() => setEditing("current")} reload={state.reload} />
              ) : null}
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
