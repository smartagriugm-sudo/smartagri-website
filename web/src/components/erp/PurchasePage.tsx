import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Plus, Printer, Trash2 } from "lucide-react";
import { jakartaToday } from "../../lib/pf/batch";
import { formatLongDate } from "../../lib/pf/dashboard";
import { PO_STAGE, cancelPurchaseOrder, fetchItems, fetchPoLines, fetchPurchaseOrder, fetchPurchaseOrders, fetchSuppliers, formatQty, parsePoForm, parseReceive, placePurchaseOrder, poFormTotal, poStage, receivePoLine, savePurchaseOrder, saveSupplier, type Item, type PoLine, type PoLineForm, type PurchaseOrder, type Supplier } from "../../lib/pf/inventory";
import { formatRupiah } from "../../lib/pf/sales";
import { ActionNote, DataState, ErpPage, Field, PrimaryButton, ReadOnlyNote, SecondaryButton, inputClass, useAction, useErpAccess, useLoad } from "./page";
import { PaperHead } from "./SalesDocuments";
import { Card, Disclosure, Note, Rows, Segmented } from "./ui";

// Buying: who from, what was ordered, what has arrived. Stock goes up only when a
// delivery is received, one lot at a time, so every lot knows which order it came from.

const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";

function SupplierCard({ suppliers, canManage, reload }: { suppliers: Supplier[]; canManage: boolean; reload: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const action = useAction();
  const submit = async () => {
    if (!name.trim()) return action.setError("Nama wajib diisi.");
    const saved = await action.run(async () => {
      await saveSupplier(null, { name, contact_name: contact, phone, email: "", address: "", tax_id: "", notes: "", active: true });
      await reload();
    });
    if (saved) {
      setAdding(false);
      setName("");
      setContact("");
      setPhone("");
    }
  };
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className={sectionTitle}>Pemasok</h2>
        {canManage && !adding && <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><Plus className="h-4 w-4" /> Tambah</button>}
      </div>
      {adding && (
        <form className="space-y-3 border-t border-[#EDF2F2] p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label="Nama"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kontak"><input className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
            <Field label="Telepon"><input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          </div>
          <ActionNote action={action} />
          <div className="flex gap-2"><PrimaryButton type="submit" disabled={action.busy}>Simpan</PrimaryButton><SecondaryButton onClick={() => setAdding(false)}>Batal</SecondaryButton></div>
        </form>
      )}
      {suppliers.length === 0 ? (
        <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">Belum ada pemasok.</p>
      ) : (
        <ul>
          {suppliers.map((s) => (
            <li key={s.id} className="border-t border-[#EDF2F2] px-4 py-2 text-[14px]">
              <span className="font-medium text-[#0F2F36]">{s.name}</span>
              {(s.contact_name || s.phone) && <span className="block text-[13px] text-[#4F6B73]">{[s.contact_name, s.phone].filter(Boolean).join(" · ")}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PoEditor({ order, initial, suppliers, items, onCancel, onSaved }: { order: PurchaseOrder | null; initial?: PoLineForm[]; suppliers: Supplier[]; items: Item[]; onCancel: () => void; onSaved: (id: string) => void }) {
  const today = jakartaToday();
  const active = suppliers.filter((s) => s.active);
  const usable = items.filter((i) => i.active);
  const blank = (): PoLineForm => ({ itemId: usable[0]?.id ?? "", qty: "", unitPrice: "" });
  const [supplierId, setSupplierId] = useState(order?.supplier_id ?? active[0]?.id ?? "");
  const [orderedOn, setOrderedOn] = useState(order?.ordered_on ?? today);
  const [expectedOn, setExpectedOn] = useState(order?.expected_on ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [rows, setRows] = useState<PoLineForm[]>(initial?.length ? initial : [blank()]);
  const action = useAction();
  const change = (i: number, patch: Partial<PoLineForm>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));

  const submit = async () => {
    const parsed = parsePoForm(supplierId, orderedOn, expectedOn, rows);
    if (parsed.error !== null) return action.setError(parsed.error);
    let saved = "";
    if (await action.run(async () => { saved = await savePurchaseOrder(order?.id ?? null, supplierId, orderedOn, expectedOn, notes, parsed.lines); })) onSaved(saved);
  };

  if (active.length === 0) return <Note>Tambahkan pemasok dulu.</Note>;
  if (usable.length === 0) return <Note>Tambahkan barang dulu di halaman Stok.</Note>;

  return (
    <Card className="p-4">
      <h2 className={`${sectionTitle} mb-3`}>{order ? `Ubah ${order.po_no}` : "Pesanan pembelian baru"}</h2>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Pemasok">
          <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal pesan"><input type="date" className={inputClass} value={orderedOn} onChange={(e) => setOrderedOn(e.target.value)} /></Field>
          <Field label="Perkiraan tiba"><input type="date" className={inputClass} value={expectedOn} onChange={(e) => setExpectedOn(e.target.value)} /></Field>
        </div>
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-[#36525A]">Isi pesanan</p>
          {rows.map((r, i) => {
            const unit = usable.find((x) => x.id === r.itemId)?.unit ?? "";
            return (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-[#E3ECED] p-2">
                <select className={`${inputClass} col-span-2`} aria-label={`Barang baris ${i + 1}`} value={r.itemId} onChange={(e) => change(i, { itemId: e.target.value })}>
                  {usable.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}
                </select>
                <input className={inputClass} inputMode="decimal" aria-label={`Jumlah baris ${i + 1}`} placeholder={`Jumlah (${unit})`} value={r.qty} onChange={(e) => change(i, { qty: e.target.value })} />
                <input className={inputClass} inputMode="numeric" aria-label={`Harga satuan baris ${i + 1}`} placeholder="Harga satuan" value={r.unitPrice} onChange={(e) => change(i, { unitPrice: e.target.value })} />
                <button type="button" disabled={rows.length === 1} onClick={() => setRows((all) => all.filter((_, n) => n !== i))} className="col-span-2 flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-[#4F6B73] hover:bg-[#F3F7F7] disabled:opacity-40 sm:min-h-[28px]"><Trash2 className="h-4 w-4" /> Hapus baris</button>
              </div>
            );
          })}
          <SecondaryButton onClick={() => setRows((all) => [...all, blank()])}><Plus className="h-4 w-4" /> Tambah baris</SecondaryButton>
          <p className="text-[14px] text-[#0F2F36]">Total <span className="font-medium tabular-nums">{formatRupiah(poFormTotal(rows))}</span></p>
        </div>
        <Field label="Catatan"><textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ActionNote action={action} />
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : order ? "Simpan draf" : "Buat draf"}</PrimaryButton>
          <SecondaryButton onClick={onCancel}>Batal</SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

type Show = "berjalan" | "selesai" | "batal";

export function PurchasePage() {
  const state = useLoad(async () => {
    const [orders, suppliers, items] = await Promise.all([fetchPurchaseOrders(), fetchSuppliers(), fetchItems()]);
    return { orders, suppliers, items };
  });
  const { canManageProduction } = useErpAccess();
  const [creating, setCreating] = useState(false);
  const [show, setShow] = useState<Show>("berjalan");
  const navigate = useNavigate();
  const today = jakartaToday();

  return (
    <ErpPage
      eyebrow="Inventory"
      title="Pembelian"
      sub="Stok bertambah saat barang diterima, satu lot demi satu lot."
      actions={canManageProduction && !creating && state.data ? <PrimaryButton onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Pesanan pembelian</PrimaryButton> : undefined}
    >
      <DataState state={state}>
        {({ orders, suppliers, items }) => {
          const groups: Record<Show, PurchaseOrder[]> = {
            berjalan: orders.filter((o) => ["draf", "menunggu", "sebagian"].includes(poStage(o))),
            selesai: orders.filter((o) => poStage(o) === "diterima"),
            batal: orders.filter((o) => poStage(o) === "batal"),
          };
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-3">
                {!canManageProduction && <ReadOnlyNote who="Manajer produksi" />}
                <Segmented value={show} options={[{ key: "berjalan", label: `Berjalan (${groups.berjalan.length})` }, { key: "selesai", label: `Diterima (${groups.selesai.length})` }, { key: "batal", label: `Dibatalkan (${groups.batal.length})` }]} onChange={setShow} />
                <Card>
                  {groups[show].length === 0 ? (
                    <p className="px-4 py-8 text-center text-[14px] text-[#4F6B73]">Tidak ada pesanan pembelian di sini.</p>
                  ) : (
                    <ul>
                      {groups[show].map((o) => {
                        const stage = PO_STAGE[poStage(o)];
                        const late = !!o.expected_on && o.expected_on < today && o.status === "dipesan" && o.open_lines > 0;
                        return (
                          <li key={o.id} className="border-t border-[#EDF2F2] first:border-0">
                            <Link to="/erp/pembelian/$id" params={{ id: o.id }} className="grid items-center gap-x-4 gap-y-0.5 rounded-xl px-4 py-3 hover:bg-[#F6F8F8] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_16px]">
                              <span className="min-w-0">
                                <span className="block text-[15px] font-medium text-[#0F2F36]">{o.po_no}</span>
                                <span className="block truncate text-[13.5px] text-[#36525A]">{o.supplier_name}</span>
                              </span>
                              <span className="min-w-0">
                                <span className={`inline-block rounded-md px-2 py-0.5 text-[12.5px] font-medium ${stage.className}`}>{stage.label}</span>
                                <span className={`block text-[13px] ${late ? "font-medium text-[#B3362C]" : "text-[#4F6B73]"}`}>{o.expected_on ? `${late ? "Terlambat, diperkirakan" : "Perkiraan"} ${formatLongDate(o.expected_on)}` : `Dipesan ${formatLongDate(o.ordered_on)}`}</span>
                              </span>
                              <span className="text-[13.5px] tabular-nums text-[#0F2F36] md:text-right">{formatRupiah(o.total)}</span>
                              <ArrowRight className="hidden h-4 w-4 text-[#0B6477] md:block" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </div>
              <div className="min-w-0 space-y-4">
                {creating && <PoEditor order={null} suppliers={suppliers} items={items} onCancel={() => setCreating(false)} onSaved={(id) => void navigate({ to: "/erp/pembelian/$id", params: { id } })} />}
                <SupplierCard suppliers={suppliers} canManage={canManageProduction} reload={state.reload} />
              </div>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}

function ReceiveLine({ line, reload }: { line: PoLine; reload: () => Promise<void> }) {
  const today = jakartaToday();
  const left = Math.round((line.qty - line.received_qty) * 100) / 100;
  const [lotNo, setLotNo] = useState("");
  const [qty, setQty] = useState("");
  const [receivedOn, setReceivedOn] = useState(today);
  const [expiryOn, setExpiryOn] = useState("");
  const action = useAction();
  const submit = async () => {
    const parsed = parseReceive({ lotNo, qty: qty.trim() || String(left), receivedOn, expiryOn }, today, line.track_expiry, left);
    if (parsed.error !== null) return action.setError(parsed.error);
    await action.run(async () => {
      await receivePoLine(line.id, parsed.qty, lotNo, receivedOn, expiryOn);
      await reload();
    });
  };
  return (
    <form className="mt-2 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_100px_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Field label="Nomor lot"><input className={inputClass} value={lotNo} onChange={(e) => setLotNo(e.target.value)} /></Field>
      <Field label={`Jumlah (${line.unit})`}><input className={inputClass} inputMode="decimal" value={qty} placeholder={String(left).replace(".", ",")} onChange={(e) => setQty(e.target.value)} /></Field>
      <Field label="Tanggal terima"><input type="date" className={inputClass} max={today} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} /></Field>
      <Field label={line.track_expiry ? "Kedaluwarsa" : "Kedaluwarsa (opsional)"}><input type="date" className={inputClass} value={expiryOn} onChange={(e) => setExpiryOn(e.target.value)} /></Field>
      <PrimaryButton type="submit" disabled={action.busy}>{action.busy ? "Menyimpan..." : "Terima"}</PrimaryButton>
      <div className="col-span-full empty:hidden"><ActionNote action={{ error: action.error, saved: false }} /></div>
    </form>
  );
}

function CancelPo({ order, reload }: { order: PurchaseOrder; reload: () => Promise<void> }) {
  const [why, setWhy] = useState("");
  const action = useAction();
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <Field label="Alasan"><input className={inputClass} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <ActionNote action={{ error: action.error, saved: false }} />
        <SecondaryButton disabled={action.busy || !why.trim()} onClick={() => void action.run(async () => { await cancelPurchaseOrder(order.id, why); await reload(); })}>{action.busy ? "Membatalkan..." : "Ya, batalkan"}</SecondaryButton>
      </div>
    </Card>
  );
}

export function PurchaseDetailPage({ id }: { id: string }) {
  const state = useLoad(async () => {
    const [order, lines] = await Promise.all([fetchPurchaseOrder(id), fetchPoLines(id)]);
    return { order, lines };
  }, [id]);
  const editor = useLoad(async () => {
    const [suppliers, items] = await Promise.all([fetchSuppliers(), fetchItems()]);
    return { suppliers, items };
  });
  const { canManageProduction } = useErpAccess();
  const [editing, setEditing] = useState(false);
  const place = useAction();

  return (
    <ErpPage
      eyebrow="Inventory · Pembelian"
      title={state.data ? `${state.data.order.po_no} · ${state.data.order.supplier_name}` : "Pesanan pembelian"}
      sub={state.data ? PO_STAGE[poStage(state.data.order)].label : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Link to="/erp/pembelian" className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-[#0B6477] hover:underline sm:min-h-[24px]"><ArrowLeft className="h-4 w-4" /> Semua pembelian</Link>
          <SecondaryButton onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak atau simpan PDF</SecondaryButton>
        </div>
      }
    >
      <DataState state={state}>
        {({ order, lines }) => {
          const isDraft = order.status === "draf";
          const placed = order.status === "dipesan";
          return (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] print:block">
              <div className="min-w-0 space-y-4">
                {order.status === "batal" && <Note tone="warn">Dibatalkan: {order.cancel_note}</Note>}
                {!canManageProduction && <div className="print:hidden"><ReadOnlyNote who="Manajer produksi" /></div>}
                {isDraft && editing && editor.data ? (
                  <PoEditor
                    order={order}
                    initial={lines.map((l) => ({ itemId: l.item_id, qty: String(l.qty).replace(".", ","), unitPrice: String(l.unit_price) }))}
                    suppliers={editor.data.suppliers}
                    items={editor.data.items}
                    onCancel={() => setEditing(false)}
                    onSaved={() => { setEditing(false); void state.reload(); }}
                  />
                ) : (
                  <>
                    <div className="hidden print:block">
                      <PaperHead kind="PESANAN PEMBELIAN" number={order.po_no}>Tanggal {formatLongDate(order.ordered_on)}</PaperHead>
                      <p className="py-3 text-[14px] text-[#0F2F36]">Kepada {order.supplier_name}</p>
                      <table className="w-full text-left text-[14px]">
                        <thead><tr className="border-b border-[#DCE7E8] text-[#4F6B73]"><th className="pb-2 font-medium">Barang</th><th className="pb-2 text-right font-medium">Jumlah</th><th className="pb-2 text-right font-medium">Harga satuan</th><th className="pb-2 text-right font-medium">Total</th></tr></thead>
                        <tbody>{lines.map((l) => <tr key={l.id} className="border-b border-[#EDF2F2]"><td className="py-2">{l.item_name}</td><td className="py-2 text-right">{formatQty(l.qty, l.unit)}</td><td className="py-2 text-right">{formatRupiah(l.unit_price)}</td><td className="py-2 text-right">{formatRupiah(l.amount)}</td></tr>)}</tbody>
                      </table>
                      <p className="mt-3 text-right font-semibold text-[#0F2F36]">Total {formatRupiah(order.total)}</p>
                      {order.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{order.notes}</p>}
                    </div>
                    <Card className="p-4 print:hidden">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h2 className={sectionTitle}>{placed ? "Terima barang" : "Isi pesanan"}</h2>
                        {isDraft && canManageProduction && <SecondaryButton onClick={() => setEditing(true)}>Ubah</SecondaryButton>}
                      </div>
                      <div className="space-y-2">
                        {lines.map((l) => (
                          <div key={l.id} className="rounded-lg border border-[#E3ECED] p-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
                              <span className="font-medium text-[#0F2F36]">{l.item_name}</span>
                              <span className="tabular-nums text-[#4F6B73]">{isDraft ? `${formatQty(l.qty, l.unit)} × ${formatRupiah(l.unit_price)} = ${formatRupiah(l.amount)}` : `${formatQty(l.received_qty, l.unit)} dari ${formatQty(l.qty, l.unit)}`}</span>
                            </div>
                            {placed && canManageProduction && l.received_qty < l.qty && <ReceiveLine key={l.received_qty} line={l} reload={state.reload} />}
                          </div>
                        ))}
                      </div>
                      {isDraft && canManageProduction && (
                        <div className="mt-3 space-y-2">
                          <ActionNote action={{ error: place.error, saved: false }} />
                          <PrimaryButton disabled={place.busy} onClick={() => void place.run(async () => { await placePurchaseOrder(order.id); await state.reload(); })}>{place.busy ? "Menyimpan..." : "Tandai sudah dipesan"}</PrimaryButton>
                        </div>
                      )}
                    </Card>
                  </>
                )}
                {canManageProduction && order.status !== "batal" && order.received_lines === 0 && <div className="print:hidden"><Disclosure title="Batalkan pesanan pembelian"><CancelPo order={order} reload={state.reload} /></Disclosure></div>}
              </div>
              <Card className="p-4 print:hidden">
                <h2 className={`${sectionTitle} mb-3`}>Ringkasan</h2>
                <Rows rows={[["Pemasok", order.supplier_name], ["Dipesan", formatLongDate(order.ordered_on)], ["Perkiraan tiba", order.expected_on ? formatLongDate(order.expected_on) : "-"], ["Total", formatRupiah(order.total)]]} />
                {order.notes && <p className="mt-3 text-[13.5px] text-[#36525A]">{order.notes}</p>}
              </Card>
            </div>
          );
        }}
      </DataState>
    </ErpPage>
  );
}
